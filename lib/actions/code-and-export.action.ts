"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

// ============================================
// 12. CODE JUDGE & DSA PROBLEMS
// ============================================

export async function createDSAProblem(
  title: string,
  description: string,
  difficulty: "easy" | "medium" | "hard",
  category: string,
  examples: { input: string; output: string; explanation: string }[],
  constraints: string,
  testCases: { input: string; expectedOutput: string }[]
) {
  try {
    const problemId = db.collection("dsa_problems").doc().id;
    await db.collection("dsa_problems").doc(problemId).set({
      title,
      description,
      difficulty,
      category,
      examples,
      constraints,
      testCases,
      submissionCount: 0,
      acceptedCount: 0,
      createdAt: new Date().toISOString(),
    });

    return { success: true, problemId };
  } catch (error) {
    console.error("Error creating DSA problem:", error);
    return { success: false, error: "Failed to create problem" };
  }
}

export async function getDSAProblems(
  difficulty?: string,
  category?: string,
  limit: number = 50
) {
  try {
    let query: any = db.collection("dsa_problems");

    if (difficulty) {
      query = query.where("difficulty", "==", difficulty);
    }
    if (category) {
      query = query.where("category", "==", category);
    }

    const snapshot = await query.limit(limit).get();

    const problems = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, problems };
  } catch (error) {
    console.error("Error fetching problems:", error);
    return { success: false, error: "Failed to fetch problems" };
  }
}

export async function submitCodeSolution(
  problemId: string,
  code: string,
  language: "python" | "javascript" | "java" | "cpp"
) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const submissionId = db.collection("code_submissions").doc().id;

    // In production, you'd actually execute the code here
    const result = await executeCode(code, language, problemId);

    await db.collection("code_submissions").doc(submissionId).set({
      userId,
      problemId,
      code,
      language,
      result: result.passed ? "accepted" : "rejected",
      passedTests: result.passed ? result.testCount : 0,
      totalTests: result.testCount,
      runtime: result.runtime,
      memory: result.memory,
      submittedAt: new Date().toISOString(),
    });

    // Update problem stats
    const problem = await db.collection("dsa_problems").doc(problemId).get();
    if (problem.exists) {
      await db
        .collection("dsa_problems")
        .doc(problemId)
        .update({
          submissionCount: (problem.data()?.submissionCount || 0) + 1,
          acceptedCount: result.passed ? (problem.data()?.acceptedCount || 0) + 1 : problem.data()?.acceptedCount || 0,
        });
    }

    return {
      success: true,
      submissionId,
      passed: result.passed,
      passedTests: result.passedTests,
      totalTests: result.testCount,
    };
  } catch (error) {
    console.error("Error submitting code:", error);
    return { success: false, error: "Failed to submit code" };
  }
}

async function executeCode(
  code: string,
  language: string,
  problemId: string
): Promise<{ passed: boolean; testCount: number; passedTests: number; runtime: number; memory: number }> {
  // This is a placeholder - in production, you'd use an actual code execution service
  // like Judge0, HackerRank API, or LeetCode's API

  // For now, simulate the execution
  return {
    passed: true,
    testCount: 5,
    passedTests: 5,
    runtime: 45,
    memory: 12,
  };
}

export async function getCodeSubmissions(problemId?: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    let query: any = db.collection("code_submissions").where("userId", "==", userId);

    if (problemId) {
      query = query.where("problemId", "==", problemId);
    }

    const snapshot = await query.orderBy("submittedAt", "desc").get();

    const submissions = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, submissions };
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return { success: false, error: "Failed to fetch submissions" };
  }
}

export async function getDSAProgress() {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const submissions = await db
      .collection("code_submissions")
      .where("userId", "==", userId)
      .where("result", "==", "accepted")
      .get();

    const acceptedCount = submissions.size;

    // Get unique problems solved
    const uniqueProblems = new Set(submissions.docs.map((doc: any) => doc.data().problemId));

    // Get attempts by difficulty
    const difficulties = { easy: 0, medium: 0, hard: 0 };

    for (const problemId of uniqueProblems) {
      const problem = await db.collection("dsa_problems").doc(problemId as string).get();
      if (problem.exists) {
        const difficulty = problem.data()?.difficulty || "medium";
        difficulties[difficulty as keyof typeof difficulties]++;
      }
    }

    return {
      success: true,
      progress: {
        totalSolved: uniqueProblems.size,
        totalAttempts: submissions.size,
        byDifficulty: difficulties,
      },
    };
  } catch (error) {
    console.error("Error fetching DSA progress:", error);
    return { success: false, error: "Failed to fetch progress" };
  }
}

// ============================================
// 13. VIDEO COACH FEEDBACK
// ============================================

export async function analyzeVideoPerformance(recordingId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const recording = await db.collection("interview_recordings").doc(recordingId).get();
    if (!recording.exists) {
      return { success: false, error: "Recording not found" };
    }

    const recordingData = recording.data();
    if (recordingData?.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Analyze video performance (placeholder - would use real video analysis in production)
    const analysis = {
      eyeContact: { score: 75, feedback: "Good eye contact maintained" },
      speakingPace: { score: 80, feedback: "Speaking pace is appropriate" },
      clarity: { score: 85, feedback: "Excellent clarity in speech" },
      fillerWords: {
        count: 5,
        rate: 2.5,
        examples: ["um", "like", "actually"],
      },
      confidence: { score: 78, feedback: "Confident tone with occasional hesitation" },
      posture: { score: 82, feedback: "Good posture and presence" },
    };

    const analysisId = db.collection("video_analyses").doc().id;
    await db.collection("video_analyses").doc(analysisId).set({
      userId,
      recordingId,
      analysis,
      createdAt: new Date().toISOString(),
    });

    return { success: true, analysisId, analysis };
  } catch (error) {
    console.error("Error analyzing video:", error);
    return { success: false, error: "Failed to analyze video" };
  }
}

export async function getVideoAnalyses() {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const snapshot = await db
      .collection("video_analyses")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const analyses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, analyses };
  } catch (error) {
    console.error("Error fetching video analyses:", error);
    return { success: false, error: "Failed to fetch analyses" };
  }
}

// ============================================
// 14. PROGRESS EXPORT
// ============================================

export async function generateProgressReport() {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    // Gather user data
    const gamification = await db.collection("user_gamification").doc(userId).get();
    const submissions = await db.collection("code_submissions").where("userId", "==", userId).get();
    const interviews = await db.collection("interview_sessions").where("userId", "==", userId).get();
    const flashcards = await db.collection("flashcards").where("userId", "==", userId).get();

    const reportData = {
      generatedAt: new Date().toISOString(),
      user: {
        userId,
        level: gamification.data()?.level || 1,
        totalXP: gamification.data()?.totalXP || 0,
        streak: gamification.data()?.streak || 0,
      },
      coding: {
        submissions: submissions.size,
        problems: new Set(submissions.docs.map((d) => d.data().problemId)).size,
      },
      interviews: {
        total: interviews.size,
        averageScore: calculateAverageScore(interviews),
      },
      learning: {
        flashcardsCreated: flashcards.size,
        reviewsDone: flashcards.docs.reduce((sum, doc) => sum + (doc.data().reviewCount || 0), 0),
      },
    };

    // Save report
    const reportId = db.collection("progress_reports").doc().id;
    await db.collection("progress_reports").doc(reportId).set({
      userId,
      data: reportData,
      createdAt: new Date().toISOString(),
    });

    return { success: true, reportId, data: reportData };
  } catch (error) {
    console.error("Error generating report:", error);
    return { success: false, error: "Failed to generate report" };
  }
}

function calculateAverageScore(interviews: any): number {
  if (interviews.size === 0) return 0;

  const scores = interviews.docs
    .map((doc: any) => doc.data().overallScore || doc.data().score || 0)
    .filter((score: number) => score > 0);

  if (scores.length === 0) return 0;
  return Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10;
}

export async function exportReportAsPDF(reportId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const report = await db.collection("progress_reports").doc(reportId).get();

    if (!report.exists) return { success: false, error: "Report not found" };

    if (report.data()?.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    // In production, you'd use a library like pdfkit or html-to-pdf to generate actual PDF
    // For now, just return that it's ready for download
    const downloadUrl = `/api/export/report/${reportId}?format=pdf`;

    return { success: true, downloadUrl };
  } catch (error) {
    console.error("Error exporting report:", error);
    return { success: false, error: "Failed to export report" };
  }
}

export async function exportReportAsCSV(reportId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const report = await db.collection("progress_reports").doc(reportId).get();

    if (!report.exists) return { success: false, error: "Report not found" };

    if (report.data()?.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const downloadUrl = `/api/export/report/${reportId}?format=csv`;

    return { success: true, downloadUrl };
  } catch (error) {
    console.error("Error exporting report:", error);
    return { success: false, error: "Failed to export report" };
  }
}

export async function getProgressReports() {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const snapshot = await db
      .collection("progress_reports")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const reports = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, reports };
  } catch (error) {
    console.error("Error fetching reports:", error);
    return { success: false, error: "Failed to fetch reports" };
  }
}
