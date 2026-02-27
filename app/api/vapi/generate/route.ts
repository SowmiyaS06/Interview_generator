import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth, db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { checkInterviewRateLimit } from "@/lib/rate-limiter";
import { trackApiCost } from "@/lib/cost-tracking";
import { getCachedQuestions, cacheQuestions } from "@/lib/question-cache";
import { generateChatCompletionWithFailover } from "@/lib/ai-client";

const SERVER_VAPI_DEBUG = process.env.VAPI_DEBUG === "true";

// Constants
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.4;
const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 20;
const DEFAULT_QUESTIONS = 5;
const MIN_TECHSTACK_ITEMS = 1;

// Fallback questions when AI service is unavailable
const FALLBACK_QUESTIONS: Record<string, Record<string, string[]>> = {
  Technical: {
    "Frontend Developer": [
      "Explain the difference between state and props in React.",
      "How do you optimize component rendering performance?",
      "Describe how you would structure a large application.",
      "What are hooks and why are they useful?",
      "How do you handle forms and validation?",
      "Explain the virtual DOM and its benefits.",
      "How do you manage global state in your applications?",
      "What testing strategies do you use for UI components?",
    ],
    "Backend Developer": [
      "How do you design RESTful endpoints for a new feature?",
      "What strategies do you use for error handling in APIs?",
      "How do you secure an API against common vulnerabilities?",
      "Explain how you would handle database transactions.",
      "How would you implement pagination in a large dataset?",
      "Describe your approach to API versioning.",
      "How do you handle authentication and authorization?",
      "What caching strategies do you implement?",
    ],
    "Fullstack Engineer": [
      "How do you ensure data consistency across services?",
      "Explain your caching strategy for a high-traffic app.",
      "How do you monitor performance across the stack?",
      "What trade-offs influence your choice of database?",
      "How do you handle deployments and rollbacks?",
      "Describe your approach to microservices architecture.",
      "How do you optimize API response times?",
      "Explain your testing strategy for full-stack features.",
    ],
    default: [
      "Describe a challenging technical problem you solved recently.",
      "How do you approach debugging complex issues?",
      "Explain your process for learning new technologies.",
      "How do you ensure code quality in your projects?",
      "Describe your experience with version control and collaboration.",
      "How do you handle technical debt?",
      "What design patterns do you commonly use?",
      "How do you approach performance optimization?",
    ],
  },
  Behavioral: {
    default: [
      "Tell me about a time you had to resolve a conflict on a team.",
      "Describe a project you led and what you learned.",
      "How do you prioritize tasks when everything is urgent?",
      "Tell me about a failure and how you responded.",
      "How do you handle feedback from peers or managers?",
      "Describe a situation where you had to learn quickly.",
      "How do you communicate technical concepts to non-technical stakeholders?",
      "Tell me about a time you went above and beyond.",
    ],
  },
  Mixed: {
    default: [
      "Describe your approach to solving complex technical problems.",
      "Tell me about a time you had to make a difficult technical decision.",
      "How do you balance technical debt with feature development?",
      "Describe a project where you collaborated across teams.",
      "How do you stay current with industry trends?",
      "Tell me about a time you improved a process or system.",
      "How do you handle disagreements about technical approaches?",
      "Describe your ideal development workflow.",
    ],
  },
};

const getFallbackQuestions = (type: string, role: string, amount: number): string[] => {
  const typeQuestions = FALLBACK_QUESTIONS[type] || FALLBACK_QUESTIONS.Technical;
  const roleQuestions = typeQuestions[role] || typeQuestions.default || FALLBACK_QUESTIONS.Technical.default;
  return roleQuestions.slice(0, amount);
};

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
  const hasOpenRouter =
    !!process.env.OPENROUTER_API_KEY?.trim() || !!process.env.OPENROUTER_API_KEYS?.trim();
  const hasOpenAi =
    !!process.env.OPENAI_API_KEY?.trim() || !!process.env.OPENAI_API_KEYS?.trim();

  if (!hasOpenRouter && !hasOpenAi) {
    throw new Error("AI service not configured");
  }

  const result = await generateChatCompletionWithFailover({
    messages: [{ role: "user", content: prompt }],
    temperature: DEFAULT_TEMPERATURE,
  });

  return result.content;
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
  generationRequestId?: string;
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

  const type = pickString([payload.type], "Technical");
  const role = pickString([payload.role, payload.jobRole, payload.position], "General");
  const level = pickString([payload.level, payload.experienceLevel, payload.seniority], "Mid");
  const difficulty = pickString([payload.difficulty], "Medium");
  const templateId = typeof payload.templateId === "string" ? payload.templateId.trim() : undefined;
  const generationRequestId =
    typeof payload.generationRequestId === "string"
      ? payload.generationRequestId.trim()
      : "";
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
    let usedFallback = false;

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
        // Try to generate new questions with AI
        try {
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
        } catch (aiError) {
          // AI service failed, use fallback questions
          serverDebugLog("AI service failed, using fallback questions", {
            error: aiError instanceof Error ? aiError.message : "Unknown error",
          });
          
          questions = getFallbackQuestions(type, role, amount);
          usedFallback = true;
          
          serverDebugLog("Using fallback questions", {
            count: questions.length,
            type,
            role,
          });
        }
      }
    }

    // Final fallback if still no questions
    if (!questions.length) {
      questions = getFallbackQuestions(type, role, amount);
      usedFallback = true;
      
      serverDebugLog("Final fallback - using default questions", {
        count: questions.length,
      });
    }

    if (!questions.length) {
      return Response.json(
        { success: false, error: "Failed to generate interview questions. Please try again." },
        { status: 500 }
      );
    }

    // Update amount to match actual questions generated
    const actualAmount = questions.length;

    const interview: Record<string, unknown> = {
      role,
      type,
      level,
      difficulty,
      techstack: techStackList,
      questions,
      amount: actualAmount,
      userId,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    // Only add templateId if it's defined (Firestore doesn't accept undefined)
    if (templateId) {
      interview.templateId = templateId;
    }

    let interviewRef: FirebaseFirestore.DocumentReference;

    if (generationRequestId) {
      const deterministicId = `gen_${userId}_${generationRequestId}`;
      interviewRef = db.collection("interviews").doc(deterministicId);
      const existingDoc = await interviewRef.get();

      if (!existingDoc.exists) {
        interview.generationRequestId = generationRequestId;
        await interviewRef.set(interview);
      }
    } else {
      interviewRef = await db.collection("interviews").add(interview);
    }

    serverDebugLog("Interview saved", {
      interviewId: interviewRef.id,
      role,
      level,
      type,
      requestedAmount: amount,
      actualAmount,
      userId,
      cacheHit,
      usedFallback,
    });

    // Track API cost only if not from cache and not fallback (async, don't wait)
    if (!cacheHit && !usedFallback && generatedPrompt && generatedText) {
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

    // Revalidate homepage to show the new interview in "Your Interviews"
    revalidatePath("/");

    return Response.json(
      {
        success: true,
        interviewId: interviewRef.id,
        amount: actualAmount,
        usedFallback,
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
