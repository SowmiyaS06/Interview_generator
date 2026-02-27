"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

// Parse resume PDF/text content for structured data
const parseResumeContent = async (text: string) => {
  const telegramBotToken = process.env.OPENROUTER_API_KEY?.trim();
  if (!telegramBotToken) {
    throw new Error("AI service not configured");
  }

  const prompt = `Extract structured information from this resume and return as JSON:
${text}

Return ONLY valid JSON with this exact structure:
{
  "summary": "professional summary if available",
  "skills": ["skill1", "skill2"],
  "experience": [{"company": "name", "title": "position", "duration": "years", "description": "brief"}],
  "education": [{"school": "name", "degree": "B.S.", "field": "Computer Science", "year": "2020"}],
  "languages": ["English", "Spanish"]
}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${telegramBotToken}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
      "X-Title": "PrepWise Resume Parser",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to parse resume");
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Failed to extract resume data");
  }

  return JSON.parse(content);
};

// Analyze resume strengths, weaknesses, and recommendations
const analyzeResume = async (parsedData: Record<string, any>) => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("AI service not configured");
  }

  const prompt = `Analyze this resume data and provide structured feedback:
${JSON.stringify(parsedData, null, 2)}

Return ONLY valid JSON:
{
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendedRoles": ["role1", "role2"],
  "recommendedSkills": ["skill1", "skill2"],
  "overallScore": 75
}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
      "X-Title": "PrepWise Resume Analyzer",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to analyze resume");
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Failed to generate analysis");
  }

  return JSON.parse(content);
};

export async function uploadAndAnalyzeResume(fileUrl: string, fileName: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Download file content from URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    // For now, treat as text (in production, parse PDF with pdfjs)
    const content = await response.text();

    // Parse resume
    const parsedContent = await parseResumeContent(content);

    // Analyze resume
    const analysis = await analyzeResume(parsedContent);

    // Store in Firestore
    const resumeId = db.collection("resumes").doc().id;
    await db.collection("resumes").doc(resumeId).set({
      userId,
      fileName,
      fileUrl,
      parsedContent,
      aiAnalysis: analysis,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      resumeId,
      analysis,
    };
  } catch (error) {
    console.error("Resume analysis error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze resume",
    };
  }
}

export async function matchResumeWithJob(jobDescription: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Get latest resume
    const resumeSnapshot = await db
      .collection("resumes")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (resumeSnapshot.empty) {
      return { success: false, error: "No resume found" };
    }

    const resume = resumeSnapshot.docs[0].data();
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();

    const prompt = `Compare this resume with the job description and provide a match score (0-100) and recommended interview topics:

Resume Summary:
${JSON.stringify(resume.parsedContent, null, 2)}

Job Description:
${jobDescription}

Return ONLY valid JSON:
{
  "matchScore": 85,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3"],
  "recommendedTopics": ["topic1", "topic2"],
  "strengths": ["strength1"],
  "improvementAreas": ["area1"],
  "suggestedInterviewQuestions": ["question1", "question2"]
}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
        "X-Title": "PrepWise Job Matcher",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to match resume with job");
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Failed to generate match analysis");
    }

    const matchResult = JSON.parse(content);

    // Store job description and match result
    const jobId = db.collection("job_descriptions").doc().id;
    await db.collection("job_descriptions").doc(jobId).set({
      userId,
      title: jobDescription.split("\n")[0],
      description: jobDescription,
      requiredSkills: matchResult.matchedSkills || [],
      preferredSkills: matchResult.missingSkills || [],
      matchScore: matchResult.matchScore,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      jobId,
      ...matchResult,
    };
  } catch (error) {
    console.error("Job matching error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to match resume",
    };
  }
}

export async function getUserResumes() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const snapshot = await db
      .collection("resumes")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const resumes = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, resumes };
  } catch (error) {
    console.error("Error fetching resumes:", error);
    return { success: false, error: "Failed to fetch resumes" };
  }
}
