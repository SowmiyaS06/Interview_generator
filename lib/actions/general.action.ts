"use server";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
import { getCurrentUserId } from "./auth.action";

const generateFeedbackWithOpenRouter = async (
  formattedTranscript: string
): Promise<{
  totalScore: number;
  categoryScores: Array<{ name: string; score: number; comment: string }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
}> => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";

  const systemPrompt = `You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Return ONLY valid JSON with no markdown formatting.`;

  const userPrompt = `You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.

Transcript:
${formattedTranscript}

Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
- Communication Skills: Clarity, articulation, structured responses.
- Technical Knowledge: Understanding of key concepts for the role.
- Problem-Solving: Ability to analyze problems and propose solutions.
- Cultural Fit: Alignment with company values and job role.
- Confidence and Clarity: Confidence in responses, engagement, and clarity.

Return your evaluation as a JSON object with this exact structure:
{
  "totalScore": <number 0-100>,
  "categoryScores": [
    {"name": "Communication Skills", "score": <number 0-100>, "comment": "<string>"},
    {"name": "Technical Knowledge", "score": <number 0-100>, "comment": "<string>"},
    {"name": "Problem Solving", "score": <number 0-100>, "comment": "<string>"},
    {"name": "Cultural Fit", "score": <number 0-100>, "comment": "<string>"},
    {"name": "Confidence and Clarity", "score": <number 0-100>, "comment": "<string>"}
  ],
  "strengths": ["<string>", "<string>", ...],
  "areasForImprovement": ["<string>", "<string>", ...],
  "finalAssessment": "<string>"
}

Return ONLY the JSON object, no markdown code blocks or extra text.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
      "X-Title": "PrepWise",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!response.ok) {
    const providerMessage = body.error?.message || "OpenRouter request failed";
    throw new Error(providerMessage);
  }

  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenRouter returned empty content");
  }

  // Parse the JSON response
  const cleaned = content
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  return feedbackSchema.parse(parsed);
};

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, transcript, feedbackId } = params;

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (!transcript?.length) {
      return { success: false, error: "Transcript is required" };
    }

    const interview = await getInterviewById(interviewId);
    if (!interview) {
      return { success: false, error: "Interview not found" };
    }

    const canAccessInterview = interview.userId === userId || interview.finalized;
    if (!canAccessInterview) {
      return { success: false, error: "Forbidden" };
    }

    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const object = await generateFeedbackWithOpenRouter(formattedTranscript);

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();
  if (!interview.exists) return null;

  return {
    id: interview.id,
    ...interview.data(),
  } as Interview;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .limit(limit * 5)
    .get();

  return interviews.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }) as Interview)
    .filter((interview) => interview.finalized && interview.userId !== userId)
    .slice(0, limit) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .get();

  return interviews.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }) as Interview)
    .sort((a, b) => {
      const aTime = new Date(String(a.createdAt ?? 0)).getTime();
      const bTime = new Date(String(b.createdAt ?? 0)).getTime();
      return bTime - aTime;
    }) as Interview[];
}


export async function deleteInterview(interviewId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify ownership
    const interview = await getInterviewById(interviewId);
    if (!interview) {
      return { success: false, error: "Interview not found" };
    }

    if (interview.userId !== userId) {
      return { success: false, error: "You can only delete your own interviews" };
    }

    // Delete associated feedback
    const feedbackQuery = await db
      .collection("feedback")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .get();

    const batch = db.batch();
    feedbackQuery.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete interview
    batch.delete(db.collection("interviews").doc(interviewId));

    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error("Error deleting interview:", error);
    return { success: false, error: "Failed to delete interview" };
  }
}

export async function enableFeedbackShare(interviewId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const feedback = await getFeedbackByInterviewId({ interviewId, userId });
  if (!feedback) return { success: false, error: "Feedback not found" };

  const shareId = feedback.shareId ?? crypto.randomUUID();

  await db.collection("feedback").doc(feedback.id).set(
    {
      shareId,
    },
    { merge: true }
  );

  return { success: true, shareId };
}

export async function disableFeedbackShare(interviewId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const feedback = await getFeedbackByInterviewId({ interviewId, userId });
  if (!feedback) return { success: false, error: "Feedback not found" };

  await db.collection("feedback").doc(feedback.id).set(
    {
      shareId: null,
    },
    { merge: true }
  );

  return { success: true };
}

export async function getFeedbackByShareId(shareId: string): Promise<Feedback | null> {
  const snapshot = await db
    .collection("feedback")
    .where("shareId", "==", shareId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Feedback;
}
