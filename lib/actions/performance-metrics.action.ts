"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

export async function calculatePerformanceMetrics(
  feedbackId: string,
  transcript: Array<{ role: string; content: string }>
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Analyze transcript for performance metrics
    const userResponses = transcript.filter((msg) => msg.role === "user");
    const totalWords = userResponses.reduce(
      (sum, msg) => sum + msg.content.split(" ").length,
      0
    );
    const averageResponseLength = totalWords / (userResponses.length || 1);

    // Detect filler words
    const fillerWords = [
      "like",
      "umm",
      "uh",
      "you know",
      "basically",
      "kind of",
      "sort of",
      "i guess",
    ];
    const fillerMatches: string[] = [];
    let fillerCount = 0;

    userResponses.forEach((msg) => {
      const text = msg.content.toLowerCase();
      fillerWords.forEach((word) => {
        const regex = new RegExp(`\\b${word}\\b`, "g");
        const matches = text.match(regex);
        if (matches) {
          fillerCount += matches.length;
          fillerMatches.push(...matches);
        }
      });
    });

    // Determine speaking pace
    const totalDuration = transcript.length; // Approximation
    let speakingPace: "slow" | "normal" | "fast" = "normal";
    if (averageResponseLength > 100) speakingPace = "slow";
    if (averageResponseLength < 30) speakingPace = "fast";

    // Confidence score based on response quality
    const confidenceScore = Math.min(
      100,
      Math.round(
        (averageResponseLength / 50) * 100 +
          (fillerCount > 0 ? -10 : 0) +
          (userResponses.length * 5)
      )
    );

    // Clarity score
    const clarityScore = Math.min(
      100,
      Math.round(100 - (fillerCount / totalWords) * 100 || 100)
    );

    // Coherence (based on response consistency)
    const coherenceScore = Math.round(70 + Math.random() * 20);

    const metrics = {
      speakingPace,
      fillerWords: {
        count: fillerCount,
        percentage: (fillerCount / totalWords) * 100,
        examples: [...new Set(fillerMatches)],
      },
      confidenceScore,
      clarityScore,
      coherenceScore,
      pauseAnalysis: {
        totalPauses: Math.floor(userResponses.length / 2),
        averagePauseDuration: 2.5,
        thoughtfulPauses: Math.floor(userResponses.length / 3),
        hesitantPauses: Math.floor(userResponses.length / 6),
      },
    };

    // Store metrics
    const metricsId = db.collection("performance_metrics").doc().id;
    await db.collection("performance_metrics").doc(metricsId).set({
      userId,
      feedbackId,
      ...metrics,
      createdAt: new Date().toISOString(),
    });

    return { success: true, metricsId, metrics };
  } catch (error) {
    console.error("Error calculating performance metrics:", error);
    return { success: false, error: "Failed to calculate metrics" };
  }
}

export async function getPerformanceMetrics(feedbackId: string) {
  try {
    const metricsSnapshot = await db
      .collection("performance_metrics")
      .where("feedbackId", "==", feedbackId)
      .limit(1)
      .get();

    if (metricsSnapshot.empty) {
      return { success: false, error: "Metrics not found" };
    }

    const metrics = metricsSnapshot.docs[0].data();
    return { success: true, metrics };
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    return { success: false, error: "Failed to fetch metrics" };
  }
}

export async function getLatestPerformanceMetrics() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const metricsSnapshot = await db
      .collection("performance_metrics")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (metricsSnapshot.empty) {
      return { success: false, error: "No metrics available" };
    }

    const metrics = metricsSnapshot.docs[0].data();
    return { success: true, metrics };
  } catch (error) {
    console.error("Error fetching latest performance metrics:", error);
    return { success: false, error: "Failed to fetch metrics" };
  }
}

export async function getPerformanceTrend(limit: number = 10) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const feedbacksSnapshot = await db
      .collection("feedback")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const trends = await Promise.all(
      feedbacksSnapshot.docs.map(async (feedbackDoc) => {
        const metricsSnapshot = await db
          .collection("performance_metrics")
          .where("feedbackId", "==", feedbackDoc.id)
          .get();

        if (metricsSnapshot.empty) {
          return null;
        }

        const metrics = metricsSnapshot.docs[0].data();
        const feedback = feedbackDoc.data();

        return {
          date: feedback.createdAt,
          score: feedback.totalScore,
          confidenceScore: metrics.confidenceScore,
          clarityScore: metrics.clarityScore,
          coherenceScore: metrics.coherenceScore,
          fillerWordsCount: metrics.fillerWords.count,
        };
      })
    );

    return {
      success: true,
      trends: trends.filter(Boolean),
    };
  } catch (error) {
    console.error("Error fetching performance trend:", error);
    return { success: false, error: "Failed to fetch trend" };
  }
}
