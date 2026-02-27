"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

export async function createScoringRubric(
  name: string,
  category: string,
  criteria: Array<{
    name: string;
    weight: number;
    description: string;
    scoreRange: { min: number; max: number };
  }>,
  industry?: string,
  isDefault: boolean = false
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Calculate total weight
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

    if (totalWeight !== 100) {
      return {
        success: false,
        error: "Total weight must equal 100",
      };
    }

    const rubricId = db.collection("scoring_rubrics").doc().id;
    await db.collection("scoring_rubrics").doc(rubricId).set({
      createdBy: userId,
      name,
      category,
      industry,
      criteria,
      totalWeight,
      isDefault,
      createdAt: new Date().toISOString(),
    });

    return { success: true, rubricId };
  } catch (error) {
    console.error("Error creating rubric:", error);
    return { success: false, error: "Failed to create rubric" };
  }
}

export async function getScoringRubrics(category?: string) {
  try {
    let query = db.collection("scoring_rubrics") as any;

    if (category) {
      query = query.where("category", "==", category);
    }

    const snapshot = await query.orderBy("isDefault", "desc").get();

    const rubrics = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, rubrics };
  } catch (error) {
    console.error("Error fetching rubrics:", error);
    return { success: false, error: "Failed to fetch rubrics" };
  }
}

export async function applyRubric(
  feedbackId: string,
  rubricId: string,
  scores: Array<{ criteriaName: string; score: number }>
) {
  try {
    const rubricDoc = await db.collection("scoring_rubrics").doc(rubricId).get();
    if (!rubricDoc.exists) {
      return { success: false, error: "Rubric not found" };
    }

    const rubric = rubricDoc.data();
    if (!rubric) {
      return { success: false, error: "Rubric not found" };
    }

    const criteria = rubric.criteria || [];

    // Calculate final score based on weights
    let finalScore = 0;
    const scoringData = scores.map((score) => {
      const criterion = criteria.find((c: any) => c.name === score.criteriaName);
      const weight = criterion?.weight || 0;
      finalScore += (score.score * weight) / 100;

      return {
        criteriaName: score.criteriaName,
        score: score.score,
        weight,
      };
    });

    const applicationId = db.collection("rubric_applications").doc().id;
    await db.collection("rubric_applications").doc(applicationId).set({
      feedbackId,
      rubricId,
      scores: scoringData,
      finalScore: Math.round(finalScore),
      appliedAt: new Date().toISOString(),
    });

    return { success: true, applicationId, finalScore: Math.round(finalScore) };
  } catch (error) {
    console.error("Error applying rubric:", error);
    return { success: false, error: "Failed to apply rubric" };
  }
}
