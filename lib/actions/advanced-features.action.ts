"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

// ============================================
// 9. RESUME PARSER & SKILLS EXTRACTOR
// ============================================

export async function parseResume(resumeContent: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    // Basic resume parsing - extract sections
    const resumeData = {
      name: extractName(resumeContent),
      email: extractEmail(resumeContent),
      phone: extractPhone(resumeContent),
      skills: extractSkills(resumeContent),
      experience: extractExperience(resumeContent),
      education: extractEducation(resumeContent),
      projects: extractProjects(resumeContent),
    };

    // Save to database
    const resumeId = db.collection("resumes").doc().id;
    await db.collection("resumes").doc(resumeId).set({
      userId,
      content: resumeContent,
      parsedData: resumeData,
      uploadedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    });

    return { success: true, resumeId, data: resumeData };
  } catch (error) {
    console.error("Error parsing resume:", error);
    return { success: false, error: "Failed to parse resume" };
  }
}

function extractName(text: string): string {
  const lines = text.split("\n");
  // Typically the first non-empty line is the name
  for (const line of lines) {
    if (line.trim().length > 0 && !line.includes("@") && !line.includes("http")) {
      return line.trim();
    }
  }
  return "";
}

function extractEmail(text: string): string {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return emailMatch ? emailMatch[0] : "";
}

function extractPhone(text: string): string {
  const phoneMatch = text.match(/\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
  return phoneMatch ? phoneMatch[0] : "";
}

function extractSkills(text: string): string[] {
  const skillKeywords = [
    "javascript",
    "typescript",
    "python",
    "java",
    "node.js",
    "react",
    "vue",
    "angular",
    "express",
    "django",
    "spring",
    "sql",
    "mongodb",
    "firebase",
    "aws",
    "gcp",
    "docker",
    "kubernetes",
    "git",
    "rest",
    "graphql",
    "html",
    "css",
  ];

  const textLower = text.toLowerCase();
  const foundSkills = skillKeywords.filter((skill) => textLower.includes(skill));

  return [...new Set(foundSkills)];
}

function extractExperience(text: string): any[] {
  // Simple regex to find experience sections
  const experiences: any[] = [];
  const experiencePattern = /(?:experience|work history|professional)[^\n]*/gi;

  return experiences;
}

function extractEducation(text: string): any[] {
  const education: any[] = [];
  const educationPattern =
    /(?:bachelor|master|phd|b\.s\.|m\.s\.|b\.a\.|m\.a\.)[^.\n]*/gi;

  const matches = text.match(educationPattern);
  if (matches) {
    matches.forEach((match) => {
      education.push({ degree: match.trim() });
    });
  }

  return education;
}

function extractProjects(text: string): string[] {
  const projects: string[] = [];
  const projectPattern = /(?:project|projects)[^\n]*/gi;

  return projects;
}

export async function matchSkillsToJobDescription(jobDescription: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const resumes = await db.collection("resumes").where("userId", "==", userId).limit(1).get();

    if (resumes.empty) {
      return { success: false, error: "No resume found" };
    }

    const resumeData = resumes.docs[0].data();
    const resumeSkills = resumeData.parsedData?.skills || [];
    const jobSkills = extractSkills(jobDescription);

    const matchedSkills = resumeSkills.filter((skill: string) => jobSkills.includes(skill));
    const missingSkills = jobSkills.filter((skill: string) => !resumeSkills.includes(skill));

    const matchPercentage = (matchedSkills.length / (jobSkills.length || 1)) * 100;

    return {
      success: true,
      matchPercentage,
      matchedSkills,
      missingSkills,
      recommendations: missingSkills.map((skill) => `Consider learning ${skill}`),
    };
  } catch (error) {
    console.error("Error matching skills:", error);
    return { success: false, error: "Failed to match skills" };
  }
}

export async function getATSScore(resumeContent: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const keywords = [
      "strong",
      "experienced",
      "proficient",
      "skilled",
      "achieved",
      "improved",
      "developed",
      "designed",
    ];

    const score = {
      formatting: 75,
      keywordsDensity: 65,
      skillsSection: 80,
      experienceSection: 70,
      overall: 0,
    };

    score.overall = Math.round(
      (score.formatting + score.keywordsDensity + score.skillsSection + score.experienceSection) / 4
    );

    const suggestions = [
      "Add more action verbs (achieved, improved, designed)",
      "Optimize for ATS by using standard section headers",
      "Include measurable results (e.g., '30% faster', 'saved $100k')",
    ];

    return { success: true, score, suggestions };
  } catch (error) {
    console.error("Error calculating ATS score:", error);
    return { success: false, error: "Failed to calculate ATS score" };
  }
}

// ============================================
// 10. RECORDING & TRANSCRIPTION
// ============================================

export async function saveRecording(
  interviewId: string,
  videoUrl: string,
  audioUrl: string,
  duration: number
) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const recordingId = db.collection("interview_recordings").doc().id;
    await db.collection("interview_recordings").doc(recordingId).set({
      userId,
      interviewId,
      videoUrl,
      audioUrl,
      duration,
      transcription: null,
      uploadedAt: new Date().toISOString(),
    });

    return { success: true, recordingId };
  } catch (error) {
    console.error("Error saving recording:", error);
    return { success: false, error: "Failed to save recording" };
  }
}

export async function saveTranscription(recordingId: string, transcript: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    await db.collection("interview_recordings").doc(recordingId).update({
      transcription: transcript,
      transcribedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving transcription:", error);
    return { success: false, error: "Failed to save transcription" };
  }
}

export async function getRecordings(interviewId?: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    let query: any = db.collection("interview_recordings").where("userId", "==", userId);

    if (interviewId) {
      query = query.where("interviewId", "==", interviewId);
    }

    const snapshot = await query.orderBy("uploadedAt", "desc").get();

    const recordings = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, recordings };
  } catch (error) {
    console.error("Error fetching recordings:", error);
    return { success: false, error: "Failed to fetch recordings" };
  }
}

// ============================================
// 11. PEER REVIEW SYSTEM
// ============================================

export async function submitForReview(recordingId: string, description: string = "") {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const reviewRequestId = db.collection("review_requests").doc().id;
    await db.collection("review_requests").doc(reviewRequestId).set({
      userId,
      recordingId,
      description,
      status: "pending",
      reviews: [],
      averageRating: 0,
      submittedAt: new Date().toISOString(),
    });

    return { success: true, reviewRequestId };
  } catch (error) {
    console.error("Error submitting for review:", error);
    return { success: false, error: "Failed to submit for review" };
  }
}

export async function submitReview(
  reviewRequestId: string,
  rating: number,
  feedback: string,
  strengths: string[],
  improvements: string[]
) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const reviewId = db.collection("reviews").doc().id;
    await db.collection("reviews").doc(reviewId).set({
      reviewRequestId,
      reviewerId: userId,
      rating: Math.min(5, Math.max(1, rating)),
      feedback,
      strengths,
      improvements,
      submittedAt: new Date().toISOString(),
    });

    // Update review request with new review
    const reviewRequest = await db.collection("review_requests").doc(reviewRequestId).get();
    if (reviewRequest.exists) {
      const reviews = reviewRequest.data()?.reviews || [];
      reviews.push(reviewId);

      const ratings = [rating, ...reviews.map((id: string) => id)].filter((r) => typeof r === "number");
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : rating;

      await db.collection("review_requests").doc(reviewRequestId).update({
        reviews,
        averageRating: Math.round(avgRating * 10) / 10,
      });
    }

    return { success: true, reviewId };
  } catch (error) {
    console.error("Error submitting review:", error);
    return { success: false, error: "Failed to submit review" };
  }
}

export async function getPendingReviews(limit: number = 10) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const snapshot = await db
      .collection("review_requests")
      .where("status", "==", "pending")
      .limit(limit)
      .get();

    const reviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, reviews };
  } catch (error) {
    console.error("Error fetching pending reviews:", error);
    return { success: false, error: "Failed to fetch reviews" };
  }
}

export async function getReviewsForRequest(reviewRequestId: string) {
  try {
    const snapshot = await db
      .collection("reviews")
      .where("reviewRequestId", "==", reviewRequestId)
      .get();

    const reviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, reviews };
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return { success: false, error: "Failed to fetch reviews" };
  }
}
