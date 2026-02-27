"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

type ToggleLearningResourceCompletionParams = {
  interviewId: string;
  resourceUrl: string;
  completed: boolean;
};

export async function toggleLearningResourceCompletion(
  params: ToggleLearningResourceCompletionParams
) {
  const { interviewId, resourceUrl, completed } = params;

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const interviewRef = db.collection("interviews").doc(interviewId);
    const interviewDoc = await interviewRef.get();

    if (!interviewDoc.exists) {
      return { success: false, error: "Interview not found" };
    }

    const interviewData = interviewDoc.data() as Interview;
    if (interviewData.userId !== userId) {
      return { success: false, error: "Forbidden" };
    }

    const currentCompletedResources = Array.isArray(interviewData.completedLearningResources)
      ? interviewData.completedLearningResources
      : [];

    let nextCompletedResources: string[];
    if (completed) {
      nextCompletedResources = Array.from(new Set([...currentCompletedResources, resourceUrl]));
    } else {
      nextCompletedResources = currentCompletedResources.filter((url) => url !== resourceUrl);
    }

    const totalResources = (interviewData.learningModules || []).reduce(
      (acc, module) => acc + (module.resources?.length || 0),
      0
    );

    const completionPercentage = totalResources
      ? Number(((nextCompletedResources.length / totalResources) * 100).toFixed(2))
      : 0;

    await interviewRef.set(
      {
        completedLearningResources: nextCompletedResources,
        learningCompletionPercentage: completionPercentage,
        learningProgressUpdatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    revalidatePath(`/learning/${interviewId}`);
    revalidatePath(`/interview/${interviewId}/feedback`);

    return {
      success: true,
      completedResourceUrls: nextCompletedResources,
      completionPercentage,
    };
  } catch (error) {
    console.error("Error toggling learning resource completion:", error);
    return { success: false, error: "Failed to update learning progress" };
  }
}
