"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

export async function createGoal(
  title: string,
  description: string,
  targetScore: number,
  deadline: string,
  priority: "low" | "medium" | "high" = "medium",
  category?: string
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const goalId = db.collection("interview_goals").doc().id;
    await db.collection("interview_goals").doc(goalId).set({
      userId,
      title,
      description,
      targetScore,
      deadline,
      priority,
      category,
      progress: 0,
      status: "pending",
      milestones: [],
      createdAt: new Date().toISOString(),
    });

    return { success: true, goalId };
  } catch (error) {
    console.error("Error creating goal:", error);
    return { success: false, error: "Failed to create goal" };
  }
}

export async function addMilestone(
  goalId: string,
  name: string,
  target: number
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const goalDoc = await db.collection("interview_goals").doc(goalId).get();
    if (!goalDoc.exists) {
      return { success: false, error: "Goal not found" };
    }

    const goal = goalDoc.data();
    if (!goal) {
      return { success: false, error: "Invalid goal data" };
    }
    if (goal.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const milestones = goal.milestones || [];
    milestones.push({
      name,
      target,
      achieved: false,
    });

    await db.collection("interview_goals").doc(goalId).update({
      milestones,
    });

    return { success: true };
  } catch (error) {
    console.error("Error adding milestone:", error);
    return { success: false, error: "Failed to add milestone" };
  }
}

export async function updateGoalProgress(goalId: string, currentScore: number) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const goalDoc = await db.collection("interview_goals").doc(goalId).get();
    if (!goalDoc.exists) {
      return { success: false, error: "Goal not found" };
    }

    const goal = goalDoc.data();
    if (!goal) {
      return { success: false, error: "Invalid goal data" };
    }
    if (goal.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const progress = Math.min(100, (currentScore / goal.targetScore) * 100);
    const status = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "pending";

    // Update milestones
    const milestones = (goal.milestones || []).map((m: any) => ({
      ...m,
      achieved: currentScore >= m.target ? true : m.achieved,
      achievedAt:
        currentScore >= m.target && !m.achieved
          ? new Date().toISOString()
          : m.achievedAt,
    }));

    const updates: Record<string, any> = {
      progress,
      status,
      milestones,
    };

    if (status === "completed") {
      updates.completedAt = new Date().toISOString();
    }

    await db.collection("interview_goals").doc(goalId).update(updates);

    return { success: true, progress };
  } catch (error) {
    console.error("Error updating goal progress:", error);
    return { success: false, error: "Failed to update goal" };
  }
}

export async function getUserGoals() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const snapshot = await db
      .collection("interview_goals")
      .where("userId", "==", userId)
      .orderBy("deadline", "asc")
      .get();

    const goals = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, goals };
  } catch (error) {
    console.error("Error fetching goals:", error);
    return { success: false, error: "Failed to fetch goals" };
  }
}

export async function createLearningPlan(
  goalId: string,
  topics: string[],
  resources: Array<{ title: string; url: string; type: string }>
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const planId = db.collection("learning_plans").doc().id;
    await db.collection("learning_plans").doc(planId).set({
      userId,
      goalId,
      topics,
      resources,
      practiceInterviews: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true, planId };
  } catch (error) {
    console.error("Error creating learning plan:", error);
    return { success: false, error: "Failed to create learning plan" };
  }
}

export async function getLearningPlan(goalId: string) {
  try {
    const snapshot = await db
      .collection("learning_plans")
      .where("goalId", "==", goalId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: false, error: "Plan not found" };
    }

    const plan = snapshot.docs[0].data();
    return { success: true, plan };
  } catch (error) {
    console.error("Error fetching learning plan:", error);
    return { success: false, error: "Failed to fetch plan" };
  }
}
