"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

export async function saveInterviewRecording(
  interviewId: string,
  audioUrl: string,
  videoUrl: string | null,
  duration: number,
  format: "audio" | "video",
  transcript: Array<{ role: string; content: string; timestamp: number }>,
  fileSize: number
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const recordingId = db.collection("interview_recordings").doc().id;
    await db.collection("interview_recordings").doc(recordingId).set({
      interviewId,
      userId,
      audioUrl,
      videoUrl: videoUrl || null,
      duration,
      format,
      transcript,
      fileSize,
      isProcessed: true,
      createdAt: new Date().toISOString(),
    });

    return { success: true, recordingId };
  } catch (error) {
    console.error("Error saving recording:", error);
    return { success: false, error: "Failed to save recording" };
  }
}

export async function getInterviewRecording(interviewId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const recordingSnapshot = await db
      .collection("interview_recordings")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (recordingSnapshot.empty) {
      return { success: false, error: "Recording not found" };
    }

    const recording = recordingSnapshot.docs[0].data();
    return { success: true, recording };
  } catch (error) {
    console.error("Error fetching recording:", error);
    return { success: false, error: "Failed to fetch recording" };
  }
}

export async function deleteInterviewRecording(recordingId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const recordingDoc = await db
      .collection("interview_recordings")
      .doc(recordingId)
      .get();
    if (!recordingDoc.exists) {
      return { success: false, error: "Recording not found" };
    }

    const recording = recordingDoc.data();
    if (!recording || recording.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await db.collection("interview_recordings").doc(recordingId).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting recording:", error);
    return { success: false, error: "Failed to delete recording" };
  }
}
