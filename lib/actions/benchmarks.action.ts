"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

export async function getBenchmarkData(role: string, level: string) {
  try {
    const benchmarkSnapshot = await db
      .collection("benchmark_data")
      .where("role", "==", role)
      .where("level", "==", level)
      .limit(1)
      .get();

    if (benchmarkSnapshot.empty) {
      // Return default benchmarks if none exist
      return {
        success: true,
        benchmark: {
          role,
          level,
          averageScore: 65,
          medianScore: 65,
          percentiles: {
            p10: 30,
            p25: 45,
            p50: 65,
            p75: 80,
            p90: 90,
          },
          categoryAverages: {
            communication: 65,
            technical: 65,
            problem_solving: 65,
            cultural_fit: 65,
          },
          sampleSize: 0,
        },
      };
    }

    const benchmark = benchmarkSnapshot.docs[0].data();
    return { success: true, benchmark };
  } catch (error) {
    console.error("Error fetching benchmark data:", error);
    return { success: false, error: "Failed to fetch benchmark" };
  }
}

export async function getUserBenchmark(
  role: string,
  level: string,
  userScore: number
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const benchmarkData = await getBenchmarkData(role, level);
    if (!benchmarkData.success) {
      return benchmarkData;
    }

    const benchmark = benchmarkData.benchmark;
    if (!benchmark) {
      return { success: false, error: "Benchmark data not found" };
    }

    // Calculate percentile
    const percentile = Math.round(
      ((userScore - 0) / 100) * 100
    );

    // Get ranking (would be more sophisticated in production)
    const allScoresSnapshot = await db
      .collection("feedback")
      .where("userId", "!=", userId)
      .get();

    const ranking =
      allScoresSnapshot.docs.filter((doc) => doc.data().totalScore > userScore)
        .length + 1;

    return {
      success: true,
      userBenchmark: {
        userId,
        role,
        level,
        userScore,
        benchmarkScore: benchmark.averageScore,
        percentile,
        ranking,
        comparisonMetrics: {
          vs_average:
            userScore - benchmark.averageScore,
          vs_median: userScore - benchmark.medianScore,
          performance_level:
            userScore >= 80
              ? "Excellent"
              : userScore >= 60
                ? "Good"
                : "Needs Improvement",
        },
      },
    };
  } catch (error) {
    console.error("Error calculating user benchmark:", error);
    return { success: false, error: "Failed to calculate benchmark" };
  }
}
