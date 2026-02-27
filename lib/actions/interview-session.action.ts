"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

export async function createInterviewSession(interviewId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Check if session already exists
    const existingSession = await db
      .collection("interview_sessions")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .get();

    let sessionId: string;

    if (!existingSession.empty) {
      // Session exists, return it
      sessionId = existingSession.docs[0].id;
    } else {
      // Create new session
      sessionId = db.collection("interview_sessions").doc().id;
      await db.collection("interview_sessions").doc(sessionId).set({
        interviewId,
        userId,
        totalAttempts: 0,
        currentAttemptId: null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true, sessionId };
  } catch (error) {
    console.error("Error creating interview session:", error);
    return { success: false, error: "Failed to create session" };
  }
}

export async function startInterviewAttempt(
  sessionId: string,
  interviewId: string
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Get current session
    const sessionDoc = await db.collection("interview_sessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return { success: false, error: "Session not found" };
    }

    const sessionData = sessionDoc.data();
    const attemptNumber = (sessionData?.totalAttempts || 0) + 1;

    // Create new attempt
    const attemptId = db.collection("interview_attempts").doc().id;
    await db.collection("interview_attempts").doc(attemptId).set({
      interviewId,
      userId,
      sessionId,
      attemptNumber,
      status: "in-progress",
      transcript: [],
      startedAt: new Date().toISOString(),
    });

    // Update session
    await db.collection("interview_sessions").doc(sessionId).update({
      currentAttemptId: attemptId,
      totalAttempts: attemptNumber,
      status: "active",
      updatedAt: new Date().toISOString(),
    });

    return { success: true, attemptId };
  } catch (error) {
    console.error("Error starting interview attempt:", error);
    return { success: false, error: "Failed to start attempt" };
  }
}

export async function saveInterviewProgress(
  attemptId: string,
  transcript: Array<{ role: string; content: string }>
) {
  try {
    await db.collection("interview_attempts").doc(attemptId).update({
      transcript,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving interview progress:", error);
    return { success: false, error: "Failed to save progress" };
  }
}

export async function completeInterviewAttempt(
  attemptId: string,
  feedbackId: string
) {
  try {
    // Get attempt to get session ID
    const attemptDoc = await db.collection("interview_attempts").doc(attemptId).get();
    if (!attemptDoc.exists) {
      return { success: false, error: "Attempt not found" };
    }

    const attempt = attemptDoc.data();
    if (!attempt) {
      return { success: false, error: "Invalid attempt data" };
    }

    // Get feedback score
    const feedbackDoc = await db.collection("feedback").doc(feedbackId).get();
    const score = feedbackDoc.exists ? feedbackDoc.data()?.totalScore : 0;

    // Update attempt
    await db.collection("interview_attempts").doc(attemptId).update({
      status: "completed",
      completedAt: new Date().toISOString(),
      feedbackId,
      score,
    });

    // Update session with best attempt if this is the best score
    const sessionDoc = await db
      .collection("interview_sessions")
      .doc(attempt.sessionId)
      .get();
    const sessionData = sessionDoc.data();

    if (!sessionData?.bestScore || score > sessionData.bestScore) {
      await db.collection("interview_sessions").doc(attempt.sessionId).update({
        bestAttemptId: attemptId,
        bestScore: score,
        status: "completed",
      });
    }

    return { success: true, score };
  } catch (error) {
    console.error("Error completing interview attempt:", error);
    return { success: false, error: "Failed to complete attempt" };
  }
}

export async function resumeInterviewSession(sessionId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const sessionDoc = await db.collection("interview_sessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return { success: false, error: "Session not found" };
    }

    const session = sessionDoc.data();
    if (!session) {
      return { success: false, error: "Invalid session data" };
    }

    // Check authorization
    if (session.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    // If session is paused or abandoned, create new attempt
    if (session.status === "paused" || session.status === "abandoned") {
      return startInterviewAttempt(sessionId, session.interviewId);
    }

    return { success: true, attemptId: session.currentAttemptId };
  } catch (error) {
    console.error("Error resuming interview session:", error);
    return { success: false, error: "Failed to resume session" };
  }
}

export async function getSessionHistory(interviewId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const attempts = await db
      .collection("interview_attempts")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .orderBy("attemptNumber", "desc")
      .get();

    const attemptsData = attempts.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      ...doc.data(),
      id: doc.id,
    }));

    return { success: true, attempts: attemptsData };
  } catch (error) {
    console.error("Error fetching session history:", error);
    return { success: false, error: "Failed to fetch history" };
  }
}
