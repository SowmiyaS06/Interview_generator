"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

export async function requestMentorReview(
  interviewId: string,
  feedbackId: string
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const requestId = db.collection("mentor_review_requests").doc().id;
    await db.collection("mentor_review_requests").doc(requestId).set({
      userId,
      interviewId,
      feedbackId,
      status: "pending",
      requestedAt: new Date().toISOString(),
    });

    return { success: true, requestId };
  } catch (error) {
    console.error("Error requesting mentor review:", error);
    return { success: false, error: "Failed to request review" };
  }
}

export async function getMentorReviewRequests() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const snapshot = await db
      .collection("mentor_review_requests")
      .where("userId", "==", userId)
      .orderBy("requestedAt", "desc")
      .get();

    const requests = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, requests };
  } catch (error) {
    console.error("Error fetching mentor requests:", error);
    return { success: false, error: "Failed to fetch requests" };
  }
}

export async function submitMentorFeedback(
  requestId: string,
  feedback: string,
  rating: number
) {
  try {
    const requestDoc = await db
      .collection("mentor_review_requests")
      .doc(requestId)
      .get();
    if (!requestDoc.exists) {
      return { success: false, error: "Request not found" };
    }

    await db.collection("mentor_review_requests").doc(requestId).update({
      status: "completed",
      feedback,
      rating,
      completedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error submitting mentor feedback:", error);
    return { success: false, error: "Failed to submit feedback" };
  }
}

export async function createMentorProfile(
  expertise: string[],
  bio: string,
  experience_years: number,
  hourlyRate: number
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db.collection("mentor_profiles").doc(userId).set({
      userId,
      expertise,
      bio,
      experience_years,
      hourlyRate,
      availability: [],
      totalReviews: 0,
      rating: 0,
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating mentor profile:", error);
    return { success: false, error: "Failed to create profile" };
  }
}

export async function getMentorProfile(mentorId: string) {
  try {
    const mentorDoc = await db.collection("mentor_profiles").doc(mentorId).get();
    if (!mentorDoc.exists) {
      return { success: false, error: "Mentor not found" };
    }

    const mentor = mentorDoc.data();
    return { success: true, mentor };
  } catch (error) {
    console.error("Error fetching mentor profile:", error);
    return { success: false, error: "Failed to fetch mentor" };
  }
}

export async function getMentors(expertise?: string[]) {
  try {
    let query = db.collection("mentor_profiles") as any;

    if (expertise && expertise.length > 0) {
      // This would need a more sophisticated query in production
      // For now, fetch all and filter in-memory
    }

    const snapshot = await query.orderBy("rating", "desc").get();

    const mentors = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, mentors };
  } catch (error) {
    console.error("Error fetching mentors:", error);
    return { success: false, error: "Failed to fetch mentors" };
  }
}
