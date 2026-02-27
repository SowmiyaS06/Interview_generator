"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

// Achievement definitions
const ACHIEVEMENTS: Record<
  string,
  {
    id: string;
    name: string;
    description: string;
    icon: string;
    criteria: { type: string; threshold: number };
    points: number;
  }
> = {
  first_interview: {
    id: "first_interview",
    name: "Getting Started",
    description: "Complete your first interview",
    icon: "🚀",
    criteria: { type: "interviews", threshold: 1 },
    points: 10,
  },
  five_interviews: {
    id: "five_interviews",
    name: "Consistent Learner",
    description: "Complete 5 interviews",
    icon: "📚",
    criteria: { type: "interviews", threshold: 5 },
    points: 25,
  },
  perfect_score: {
    id: "perfect_score",
    name: "Perfect Performance",
    description: "Achieve a perfect score",
    icon: "⭐",
    criteria: { type: "score", threshold: 100 },
    points: 50,
  },
  high_performer: {
    id: "high_performer",
    name: "High Performer",
    description: "Maintain average score above 80",
    icon: "🏆",
    criteria: { type: "average_score", threshold: 80 },
    points: 40,
  },
  streak_7: {
    id: "streak_7",
    name: "On Fire",
    description: "7 day interview streak",
    icon: "🔥",
    criteria: { type: "streak", threshold: 7 },
    points: 35,
  },
};

export async function unlockAchievement(achievementId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) {
      return { success: false, error: "Achievement not found" };
    }

    // Check if already unlocked
    const existingSnapshot = await db
      .collection("user_achievements")
      .where("userId", "==", userId)
      .where("achievementId", "==", achievementId)
      .get();

    if (!existingSnapshot.empty) {
      return { success: false, error: "Achievement already unlocked" };
    }

    const unlockedId = db.collection("user_achievements").doc().id;
    await db.collection("user_achievements").doc(unlockedId).set({
      userId,
      achievementId,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      unlockedAt: new Date().toISOString(),
    });

    // Add points to user level
    await addPointsToUser(userId, achievement.points);

    return { success: true, unlockedId, points: achievement.points };
  } catch (error) {
    console.error("Error unlocking achievement:", error);
    return { success: false, error: "Failed to unlock achievement" };
  }
}

export async function getUserAchievements() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const snapshot = await db
      .collection("user_achievements")
      .where("userId", "==", userId)
      .orderBy("unlockedAt", "desc")
      .get();

    const achievements = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, achievements };
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return { success: false, error: "Failed to fetch achievements" };
  }
}

async function addPointsToUser(userId: string, points: number) {
  try {
    const levelDoc = await db.collection("user_levels").doc(userId).get();
    const currentData = levelDoc.exists ? levelDoc.data() : null;

    const totalPoints = (currentData?.totalPoints || 0) + points;
    const level = Math.floor(totalPoints / 100) + 1;
    const currentLevelPoints = totalPoints % 100;
    const nextLevelPoints = 100;
    const progress = (currentLevelPoints / nextLevelPoints) * 100;

    await db.collection("user_levels").doc(userId).set({
      userId,
      totalPoints,
      level,
      currentLevelPoints,
      nextLevelPoints,
      progress,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error adding points:", error);
  }
}

export async function getUserLevel() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const levelDoc = await db.collection("user_levels").doc(userId).get();

    const level = levelDoc.exists
      ? levelDoc.data()
      : {
          userId,
          totalPoints: 0,
          level: 1,
          currentLevelPoints: 0,
          nextLevelPoints: 100,
          progress: 0,
        };

    return { success: true, level };
  } catch (error) {
    console.error("Error fetching user level:", error);
    return { success: false, error: "Failed to fetch level" };
  }
}

export async function getStreaks() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const streakDoc = await db.collection("user_streaks").doc(userId).get();

    const streak = streakDoc.exists
      ? streakDoc.data()
      : {
          userId,
          type: "daily",
          currentCount: 0,
          longestCount: 0,
          lastActivityDate: null,
        };

    return { success: true, streak };
  } catch (error) {
    console.error("Error fetching streaks:", error);
    return { success: false, error: "Failed to fetch streaks" };
  }
}

export async function updateStreak() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const streakDoc = await db.collection("user_streaks").doc(userId).get();
    const currentStreak = streakDoc.exists ? streakDoc.data() : null;

    const today = new Date().toDateString();
    const lastActivity = currentStreak?.lastActivityDate
      ? new Date(currentStreak.lastActivityDate).toDateString()
      : null;

    let currentCount = currentStreak?.currentCount || 0;
    let longestCount = currentStreak?.longestCount || 0;

    if (lastActivity === today) {
      // Already visited today
      return { success: true, streak: { currentCount, longestCount } };
    } else if (lastActivity === new Date(Date.now() - 86400000).toDateString()) {
      // Streak continues
      currentCount = (currentCount || 0) + 1;
    } else {
      // Streak broken, start new one
      currentCount = 1;
    }

    longestCount = Math.max(currentCount, longestCount);

    await db.collection("user_streaks").doc(userId).set({
      userId,
      type: "daily",
      currentCount,
      longestCount,
      lastActivityDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true, streak: { currentCount, longestCount } };
  } catch (error) {
    console.error("Error updating streak:", error);
    return { success: false, error: "Failed to update streak" };
  }
}
