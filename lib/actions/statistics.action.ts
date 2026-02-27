"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

export interface UserStatistics {
  totalInterviews: number;
  totalFeedbacks: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  improvementTrend: "improving" | "stable" | "declining" | "insufficient-data";
  categoryAverages: {
    communicationSkills: number;
    technicalKnowledge: number;
    problemSolving: number;
    culturalFit: number;
    confidenceAndClarity: number;
  };
  weakAreas: Array<{ category: string; averageScore: number }>;
  strongAreas: Array<{ category: string; averageScore: number }>;
  recentPerformance: Array<{
    date: string;
    score: number;
    role: string;
    interviewId: string;
  }>;
  roleBreakdown: Array<{
    role: string;
    count: number;
    averageScore: number;
  }>;
}

/**
 * Calculate user statistics from interviews and feedback
 */
export async function getUserStatistics(userId?: string): Promise<UserStatistics | null> {
  try {
    const currentUserId = userId || (await getCurrentUserId());
    if (!currentUserId) {
      return null;
    }

    // Get all user's feedbacks
    const feedbacksSnapshot = await db
      .collection("feedback")
      .where("userId", "==", currentUserId)
      .get();

    if (feedbacksSnapshot.empty) {
      return {
        totalInterviews: 0,
        totalFeedbacks: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        improvementTrend: "insufficient-data",
        categoryAverages: {
          communicationSkills: 0,
          technicalKnowledge: 0,
          problemSolving: 0,
          culturalFit: 0,
          confidenceAndClarity: 0,
        },
        weakAreas: [],
        strongAreas: [],
        recentPerformance: [],
        roleBreakdown: [],
      };
    }

    // Get all user's interviews
    const interviewsSnapshot = await db
      .collection("interviews")
      .where("userId", "==", currentUserId)
      .get();

    const feedbacks: Array<{
      totalScore: number;
      categoryScores: Array<{ name: string; score: number; comment: string }>;
      createdAt: string;
      interviewId: string;
    }> = [];

    feedbacksSnapshot.forEach((doc) => {
      const data = doc.data();
      feedbacks.push({
        totalScore: data.totalScore,
        categoryScores: data.categoryScores,
        createdAt: data.createdAt,
        interviewId: data.interviewId,
      });
    });

    // Sort by date
    feedbacks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Calculate basic stats
    const scores = feedbacks.map((f) => f.totalScore);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    // Calculate improvement trend (compare first half vs second half)
    let improvementTrend: "improving" | "stable" | "declining" | "insufficient-data" =
      "insufficient-data";

    if (feedbacks.length >= 4) {
      const midPoint = Math.floor(feedbacks.length / 2);
      const firstHalf = feedbacks.slice(0, midPoint);
      const secondHalf = feedbacks.slice(midPoint);

      const firstHalfAvg =
        firstHalf.reduce((sum, f) => sum + f.totalScore, 0) / firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, f) => sum + f.totalScore, 0) / secondHalf.length;

      const difference = secondHalfAvg - firstHalfAvg;

      if (difference > 5) {
        improvementTrend = "improving";
      } else if (difference < -5) {
        improvementTrend = "declining";
      } else {
        improvementTrend = "stable";
      }
    }

    // Calculate category averages
    const categoryScoresMap = new Map<string, number[]>();

    feedbacks.forEach((feedback) => {
      feedback.categoryScores.forEach((category) => {
        const normalizedName = category.name.toLowerCase().replace(/\s+/g, "");
        if (!categoryScoresMap.has(normalizedName)) {
          categoryScoresMap.set(normalizedName, []);
        }
        categoryScoresMap.get(normalizedName)!.push(category.score);
      });
    });

    const getAverage = (key: string) => {
      const scores = categoryScoresMap.get(key) || [];
      return scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
    };

    const categoryAverages = {
      communicationSkills: getAverage("communicationskills"),
      technicalKnowledge: getAverage("technicalknowledge"),
      problemSolving: getAverage("problemsolving"),
      culturalFit: getAverage("culturalfit"),
      confidenceAndClarity: getAverage("confidenceandclarity"),
    };

    // Find weak and strong areas
    const categoryEntries = Object.entries(categoryAverages).map(([key, score]) => ({
      category: key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim(),
      averageScore: Math.round(score * 100) / 100,
    }));

    const weakAreas = categoryEntries.filter((c) => c.averageScore < 70).sort((a, b) => a.averageScore - b.averageScore);
    const strongAreas = categoryEntries.filter((c) => c.averageScore >= 80).sort((a, b) => b.averageScore - a.averageScore);

    // Get recent performance (last 10 interviews)
    const recentPerformance = await Promise.all(
      feedbacks.slice(-10).map(async (feedback) => {
        const interviewDoc = await db
          .collection("interviews")
          .doc(feedback.interviewId)
          .get();

        const interviewData = interviewDoc.data();

        return {
          date: feedback.createdAt,
          score: feedback.totalScore,
          role: interviewData?.role || "Unknown",
          interviewId: feedback.interviewId,
        };
      })
    );

    // Calculate role breakdown
    const roleScoresMap = new Map<string, { scores: number[]; count: number }>();

    await Promise.all(
      feedbacks.map(async (feedback) => {
        const interviewDoc = await db
          .collection("interviews")
          .doc(feedback.interviewId)
          .get();

        const role = interviewDoc.data()?.role || "Unknown";

        if (!roleScoresMap.has(role)) {
          roleScoresMap.set(role, { scores: [], count: 0 });
        }

        const entry = roleScoresMap.get(role)!;
        entry.scores.push(feedback.totalScore);
        entry.count++;
      })
    );

    const roleBreakdown = Array.from(roleScoresMap.entries())
      .map(([role, data]) => ({
        role,
        count: data.count,
        averageScore: Math.round((data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length) * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalInterviews: interviewsSnapshot.size,
      totalFeedbacks: feedbacksSnapshot.size,
      averageScore: Math.round(averageScore * 100) / 100,
      highestScore: Math.round(highestScore * 100) / 100,
      lowestScore: Math.round(lowestScore * 100) / 100,
      improvementTrend,
      categoryAverages: {
        communicationSkills: Math.round(categoryAverages.communicationSkills * 100) / 100,
        technicalKnowledge: Math.round(categoryAverages.technicalKnowledge * 100) / 100,
        problemSolving: Math.round(categoryAverages.problemSolving * 100) / 100,
        culturalFit: Math.round(categoryAverages.culturalFit * 100) / 100,
        confidenceAndClarity: Math.round(categoryAverages.confidenceAndClarity * 100) / 100,
      },
      weakAreas,
      strongAreas,
      recentPerformance,
      roleBreakdown,
    };
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    return null;
  }
}

export async function getLeaderboard(limit: number = 10): Promise<
  Array<{ userId: string; name: string; averageScore: number; interviewCount: number }>
> {
  const feedbacksSnapshot = await db.collection("feedback").get();
  if (feedbacksSnapshot.empty) return [];

  const totals = new Map<string, { total: number; count: number }>();
  feedbacksSnapshot.forEach((doc) => {
    const data = doc.data() as Feedback;
    const current = totals.get(data.userId) ?? { total: 0, count: 0 };
    totals.set(data.userId, {
      total: current.total + (data.totalScore || 0),
      count: current.count + 1,
    });
  });

  const userIds = Array.from(totals.keys());
  const userDocs = await Promise.all(
    userIds.map((id) => db.collection("users").doc(id).get())
  );

  const leaderboard = userIds.map((id, index) => {
    const stats = totals.get(id)!;
    const userDoc = userDocs[index];
    const name = (userDoc.exists ? (userDoc.data()?.name as string) : "Anonymous") || "Anonymous";

    return {
      userId: id,
      name,
      averageScore: Math.round((stats.total / stats.count) * 10) / 10,
      interviewCount: stats.count,
    };
  });

  return leaderboard
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, Math.max(1, limit));
}
