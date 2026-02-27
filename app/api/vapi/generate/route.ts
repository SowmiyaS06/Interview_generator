import { cookies } from "next/headers";

import { auth, db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { checkInterviewRateLimit } from "@/lib/rate-limiter";
import { trackApiCost } from "@/lib/cost-tracking";
import { getCachedQuestions, cacheQuestions } from "@/lib/question-cache";

const SERVER_VAPI_DEBUG = process.env.VAPI_DEBUG === "true";

// Constants
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.4;
const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 20;
const DEFAULT_QUESTIONS = 5;
const MIN_TECHSTACK_ITEMS = 1;

const serverDebugLog = (label: string, payload?: unknown) => {
  if (!SERVER_VAPI_DEBUG) return;
  if (payload === undefined) {
    console.log(`[VAPI_SERVER_DEBUG] ${label}`);
    return;
  }
  console.log(`[VAPI_SERVER_DEBUG] ${label}`, payload);
};

const buildInterviewPrompt = ({
  role,
  level,
  techStackList,
  type,
  amount,
  difficulty,
}: {
  role: string;
  level: string;
  techStackList: string[];
  type: string;
  amount: number;
  difficulty: string;
}) => `Prepare questions for a job interview.
The job role is ${role}.
The job experience level is ${level}.
The tech stack used in the job is: ${techStackList.join(", ")}.
The focus between behavioural and technical questions should lean towards: ${type}.
The difficulty of questions should be: ${difficulty}.
The amount of questions required is: ${amount}.
Please return only the questions, without any additional text.
The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
Return the questions formatted like this:
["Question 1", "Question 2", "Question 3"]
`;

const generateQuestionsWithOpenRouter = async (prompt: string) => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("AI service not configured");
  }

  const model = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": appUrl,
      "X-Title": "PrepWise",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: DEFAULT_TEMPERATURE,
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as {
      error?: { message?: string; code?: number | string };
    };
    
    serverDebugLog("OpenRouter error", { status: response.status, error: errorBody });

    // User-friendly error messages
    if (response.status === 401) {
      throw new Error("Authentication failed with AI service");
    }
    if (response.status === 402) {
      throw new Error("AI service requires additional credits");
    }
    if (response.status === 429) {
      throw new Error("Too many requests. Please try again in a moment");
    }

    throw new Error("Failed to generate interview questions");
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI service returned empty response");
  }

  return content;
};

type GeneratePayload = {
  type?: string;
  role?: string;
  jobRole?: string;
  position?: string;
  level?: string;
  experienceLevel?: string;
  seniority?: string;
  difficulty?: string;
  templateId?: string;
  techstack?: string | string[];
  techStack?: string | string[];
  amount?: number | string;
  userid?: string;
  userId?: string;
  uid?: string;
  questions?: string[] | string;
};

const normalizeTechstack = (techstack: GeneratePayload["techstack"]) => {
  if (Array.isArray(techstack)) {
    return techstack.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof techstack === "string") {
    return techstack
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const pickString = (values: Array<unknown>, fallback = "") => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }

  return fallback;
};

const parseQuestions = (input: string | string[] | undefined) => {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof input !== "string") return [];

  const cleaned = input
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    const arrayLikeMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayLikeMatch) {
      try {
        const parsed = JSON.parse(arrayLikeMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // continue to line-split fallback
      }
    }
  }

  return cleaned
    .split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);
};

const getRequestUserId = async (payload: GeneratePayload) => {
  const sessionCookie = (await cookies()).get("session")?.value;
  if (sessionCookie) {
    try {
      const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
      if (decodedClaims.uid) return decodedClaims.uid;
    } catch {
      // fallback to payload user id
    }
  }

  const fallbackId = String(payload.userId ?? payload.userid ?? payload.uid ?? "").trim();
  if (fallbackId) return fallbackId;

  if (process.env.NODE_ENV !== "production") {
    return process.env.DEV_FALLBACK_USER_ID?.trim() || "dev-anonymous-user";
  }

  return "";
};

export async function POST(request: Request) {
  let payload: GeneratePayload;

  try {
    payload = (await request.json()) as GeneratePayload;
  } catch {
    return Response.json(
      { success: false, error: "Invalid request format" },
      { status: 400 }
    );
  }

  // Check API key early
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return Response.json(
      { success: false, error: "AI service not configured" },
      { status: 503 }
    );
  }

  const type = pickString([payload.type], "Technical");
  const role = pickString([payload.role, payload.jobRole, payload.position], "General");
  const level = pickString([payload.level, payload.experienceLevel, payload.seniority], "Mid");
  const difficulty = pickString([payload.difficulty], "Medium");
  const templateId = typeof payload.templateId === "string" ? payload.templateId.trim() : undefined;
  let amount = Number(payload.amount ?? DEFAULT_QUESTIONS);
  const userId = await getRequestUserId(payload);
  const techStackList = normalizeTechstack(payload.techstack ?? payload.techStack);

  // Validate amount
  if (!Number.isFinite(amount) || amount < MIN_QUESTIONS) {
    amount = DEFAULT_QUESTIONS;
  } else if (amount > MAX_QUESTIONS) {
    amount = MAX_QUESTIONS;
  }

  serverDebugLog("Incoming payload normalized", {
    role,
    level,
    type,
      difficulty,
      templateId,
    amount,
    userId,
    techstackCount: techStackList.length,
    hasQuestionsFromClient: !!payload.questions,
  });

  try {
    if (!userId) {
      return Response.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitResult = checkInterviewRateLimit(userId);
    if (!rateLimitResult.success) {
      const resetDate = new Date(rateLimitResult.resetAt);
      const resetTimeString = resetDate.toLocaleTimeString();
      
      return Response.json(
        { 
          success: false, 
          error: `Rate limit exceeded. You can generate more interviews after ${resetTimeString}`,
          resetAt: rateLimitResult.resetAt,
          remaining: 0
        },
        { status: 429 }
      );
    }

    serverDebugLog("Rate limit check passed", {
      remaining: rateLimitResult.remaining,
      resetAt: new Date(rateLimitResult.resetAt).toISOString(),
    });

    // Validate tech stack
    if (techStackList.length < MIN_TECHSTACK_ITEMS && !payload.questions) {
      return Response.json(
        { 
          success: false, 
          error: "Please specify at least one technology or provide custom questions" 
        },
        { status: 400 }
      );
    }

    let questions = parseQuestions(payload.questions);
    let generatedPrompt = "";
    let generatedText = "";
    let cacheHit = false;

    if (!questions.length) {
      // Try to get from cache first
      const cachedQuestions = await getCachedQuestions({
        role,
        level,
        techstack: techStackList,
        type,
        amount,
      });

      if (cachedQuestions && cachedQuestions.length > 0) {
        questions = cachedQuestions;
        cacheHit = true;
        
        serverDebugLog("Questions from cache", {
          cachedQuestionsCount: questions.length,
        });
      } else {
        // Generate new questions
        generatedPrompt = buildInterviewPrompt({
          role,
          level,
          techStackList,
          type,
          amount,
          difficulty,
        });

        generatedText = await generateQuestionsWithOpenRouter(generatedPrompt);
        
        serverDebugLog("Questions generated", {
          model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL,
        });

        questions = parseQuestions(generatedText);
        
        serverDebugLog("Questions parsed", {
          parsedQuestionsCount: questions.length,
        });

        // Cache the generated questions for future use
        if (questions.length > 0) {
          cacheQuestions(
            {
              role,
              level,
              techstack: techStackList,
              type,
              amount: questions.length,
            },
            questions
          ).catch((error) => {
            console.error("Failed to cache questions:", error);
          });
        }
      }
    }

    if (!questions.length) {
      return Response.json(
        { success: false, error: "Failed to generate interview questions. Please try again." },
        { status: 500 }
      );
    }

    // Update amount to match actual questions generated
    const actualAmount = questions.length;

    const interview = {
      role,
      type,
      level,
      difficulty,
      templateId,
      techstack: techStackList,
      questions,
      amount: actualAmount,
      userId,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    const interviewRef = await db.collection("interviews").add(interview);

    serverDebugLog("Interview saved", {
      interviewId: interviewRef.id,
      role,
      level,
      type,
      requestedAmount: amount,
      actualAmount,
      userId,
      cacheHit,
    });

    // Track API cost only if not from cache (async, don't wait)
    if (!cacheHit && generatedPrompt && generatedText) {
      trackApiCost({
        userId,
        model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL,
        operation: "interview-generation",
        inputText: generatedPrompt,
        outputText: generatedText,
        interviewId: interviewRef.id,
      }).catch((error) => {
        console.error("Cost tracking failed:", error);
      });
    }

    return Response.json(
      {
        success: true,
        interviewId: interviewRef.id,
        role,
        level,
        type,
        amount: actualAmount,
        techstack: techStackList,
        userId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Interview generation error:", error);
    const message = error instanceof Error ? error.message : "Server error occurred";
    serverDebugLog("Generate route failed", { message });
    
    // Return user-friendly error
    return Response.json(
      { 
        success: false, 
        error: message.includes("AI service") || message.includes("Authentication") || message.includes("credits")
          ? message 
          : "Failed to generate interview. Please try again."
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
