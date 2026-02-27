"use server";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
import { getCurrentUserId } from "./auth.action";
import { checkFeedbackRateLimit } from "@/lib/rate-limiter";
import { trackApiCost } from "@/lib/cost-tracking";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, transcript, feedbackId } = params;

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Check rate limit
    const rateLimitResult = checkFeedbackRateLimit(userId);
    if (!rateLimitResult.success) {
      const resetDate = new Date(rateLimitResult.resetAt);
      const resetTimeString = resetDate.toLocaleTimeString();
      
      return { 
        success: false, 
        error: `Rate limit exceeded. You can generate more feedback after ${resetTimeString}`,
      };
    }

    if (!transcript?.length) {
      return { success: false, error: "Transcript is required" };
    }

    const interview = await getInterviewById(interviewId);
    if (!interview) {
      return { success: false, error: "Interview not found" };
    }

    const canAccessInterview = interview.userId === userId || interview.finalized;
    if (!canAccessInterview) {
      return { success: false, error: "Forbidden" };
    }

    // Check for existing feedback to avoid duplicates
    const existingFeedback = await db
      .collection("feedback")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (!existingFeedback.empty && !feedbackId) {
      return {
        success: true,
        feedbackId: existingFeedback.docs[0].id,
        message: "Feedback already exists",
      };
    }

    // Validate transcript has meaningful content
    if (transcript.length < 3) {
      return { 
        success: false, 
        error: "Interview too short. Please have a meaningful conversation before requesting feedback." 
      };
    }

    const totalWords = transcript.reduce((sum, msg) => sum + msg.content.split(" ").length, 0);
    if (totalWords < 50) {
      return { 
        success: false, 
        error: "Interview transcript is too brief. Please conduct a more detailed interview." 
      };
    }

    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      return { 
        success: false, 
        error: "AI service not configured. Please contact administrator." 
      };
    }

    const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";

    const promptContent = `Analyze this interview transcript and provide structured feedback.

Transcript:
${formattedTranscript}

Respond with ONLY a JSON object (no markdown, no extra text) in this EXACT format:
{
  "totalScore": <number 0-100>,
  "categoryScores": [
    {"name": "Communication Skills", "score": <0-100>, "comment": "<detailed comment>"},
    {"name": "Technical Knowledge", "score": <0-100>, "comment": "<detailed comment>"},
    {"name": "Problem Solving", "score": <0-100>, "comment": "<detailed comment>"},
    {"name": "Cultural Fit", "score": <0-100>, "comment": "<detailed comment>"},
    {"name": "Confidence and Clarity", "score": <0-100>, "comment": "<detailed comment>"}
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "areasForImprovement": ["<area 1>", "<area 2>", "<area 3>"],
  "finalAssessment": "<2-3 sentence overall assessment>"
}

Be thorough and honest. Point out both strengths and areas for improvement.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
        "X-Title": "PrepWise Interview Feedback",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are a professional interviewer analyzing mock interviews. Respond ONLY with valid JSON matching the exact schema provided. Do not include any other text.",
          },
          {
            role: "user",
            content: promptContent,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error("OpenRouter feedback error:", errorBody);
      return { 
        success: false, 
        error: "Failed to generate feedback. Please try again." 
      };
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { success: false, error: "Failed to generate feedback content." };
    }

    let object: {
      totalScore: number;
      categoryScores: Array<{ name: string; score: number; comment: string }>;
      strengths: string[];
      areasForImprovement: string[];
      finalAssessment: string;
    };

    try {
      object = JSON.parse(content);
      
      // Validate the structure
      const validated = feedbackSchema.parse(object);
      object = validated;
    } catch (parseError) {
      console.error("Failed to parse feedback JSON:", parseError);
      return { 
        success: false, 
        error: "Failed to parse feedback. Please try again." 
      };
    }

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      transcript,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    // Track API cost (async, don't wait)
    trackApiCost({
      userId,
      model,
      operation: "feedback-generation",
      inputText: promptContent,
      outputText: content,
      interviewId,
      feedbackId: feedbackRef.id,
    }).catch((error) => {
      console.error("Cost tracking failed:", error);
    });

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();
  if (!interview.exists) return null;

  return {
    id: interview.id,
    ...interview.data(),
  } as Interview;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .limit(limit * 5)
    .get();

  return interviews.docs
    .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }) as Interview)
    .filter((interview) => interview.finalized && interview.userId !== userId)
    .slice(0, limit) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .get();

  return interviews.docs
    .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }) as Interview)
    .sort((a, b) => {
      const aTime = new Date(String(a.createdAt ?? 0)).getTime();
      const bTime = new Date(String(b.createdAt ?? 0)).getTime();
      return bTime - aTime;
    }) as Interview[];
}

export async function deleteInterview(interviewId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify ownership
    const interview = await getInterviewById(interviewId);
    if (!interview) {
      return { success: false, error: "Interview not found" };
    }

    if (interview.userId !== userId) {
      return { success: false, error: "You can only delete your own interviews" };
    }

    // Delete associated feedback
    const feedbackQuery = await db
      .collection("feedback")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .get();

    const batch = db.batch();
    feedbackQuery.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete interview
    batch.delete(db.collection("interviews").doc(interviewId));

    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error("Error deleting interview:", error);
    return { success: false, error: "Failed to delete interview" };
  }
}

export async function enableFeedbackShare(interviewId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const feedback = await getFeedbackByInterviewId({ interviewId, userId });
  if (!feedback) return { success: false, error: "Feedback not found" };

  const shareId = feedback.shareId ?? crypto.randomUUID();

  await db.collection("feedback").doc(feedback.id).set(
    {
      shareId,
    },
    { merge: true }
  );

  return { success: true, shareId };
}

export async function disableFeedbackShare(interviewId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const feedback = await getFeedbackByInterviewId({ interviewId, userId });
  if (!feedback) return { success: false, error: "Feedback not found" };

  await db.collection("feedback").doc(feedback.id).set(
    {
      shareId: null,
    },
    { merge: true }
  );

  return { success: true };
}

export async function getFeedbackByShareId(shareId: string): Promise<Feedback | null> {
  const snapshot = await db
    .collection("feedback")
    .where("shareId", "==", shareId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Feedback;
}
