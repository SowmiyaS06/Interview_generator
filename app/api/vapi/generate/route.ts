import { generateText } from "ai";
import { cookies } from "next/headers";

import { auth, db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

const SERVER_VAPI_DEBUG = process.env.VAPI_DEBUG === "true";

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
}: {
  role: string;
  level: string;
  techStackList: string[];
  type: string;
  amount: number;
}) => `Prepare questions for a job interview.
The job role is ${role}.
The job experience level is ${level}.
The tech stack used in the job is: ${techStackList.join(", ")}.
The focus between behavioural and technical questions should lean towards: ${type}.
The amount of questions required is: ${amount}.
Please return only the questions, without any additional text.
The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
Return the questions formatted like this:
["Question 1", "Question 2", "Question 3"]
`;

const generateQuestionsWithOpenRouter = async (prompt: string) => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";

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
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number | string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!response.ok) {
    const providerMessage = body.error?.message || "OpenRouter request failed";
    const normalizedProviderMessage = providerMessage.toLowerCase();

    if (response.status === 401 || normalizedProviderMessage.includes("user not found")) {
      throw new Error(
        "OpenRouter authentication failed. Check OPENROUTER_API_KEY in .env.local and ensure the key is active."
      );
    }

    if (response.status === 402) {
      throw new Error(
        "OpenRouter credits are required for this model. Add credits or switch to a free OpenRouter model."
      );
    }

    const message = providerMessage;
    throw new Error(message);
  }

  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenRouter returned empty content");
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
      { success: false, error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const type = pickString([payload.type], "Technical");
  const role = pickString([payload.role, payload.jobRole, payload.position], "General");
  const level = pickString([payload.level, payload.experienceLevel, payload.seniority], "Mid");
  const amount = Number(payload.amount ?? 5);
  const userId = await getRequestUserId(payload);
  const techStackList = normalizeTechstack(payload.techstack ?? payload.techStack);

  serverDebugLog("Incoming payload normalized", {
    role,
    level,
    type,
    amount,
    userId,
    techstackCount: techStackList.length,
    hasQuestionsFromClient: !!payload.questions,
  });

  try {
    if (!userId) {
      return Response.json(
        {
          success: false,
          error:
            "Missing required user identity. Provide session cookie or one of: userId, userid, uid.",
        },
        { status: 400 }
      );
    }

    let questions = parseQuestions(payload.questions);

    if (!questions.length) {
      const prompt = buildInterviewPrompt({
        role,
        level,
        techStackList,
        type,
        amount,
      });

      if (!process.env.OPENROUTER_API_KEY?.trim()) {
        return Response.json(
          {
            success: false,
            error: "Missing OPENROUTER_API_KEY. Configure OpenRouter in .env.local.",
          },
          { status: 500 }
        );
      }

      const generatedText = await generateQuestionsWithOpenRouter(prompt);
      serverDebugLog("Questions generated via OpenRouter", {
        model: process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini",
      });

      questions = parseQuestions(generatedText);
      serverDebugLog("Questions parsed", {
        parsedQuestionsCount: questions.length,
      });
    }

    if (!questions.length) {
      return Response.json(
        { success: false, error: "Failed to generate valid interview questions" },
        { status: 500 }
      );
    }

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techStackList,
      questions,
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
      amount,
      userId,
      questionsCount: questions.length,
    });

    return Response.json(
      {
        success: true,
        interviewId: interviewRef.id,
        role,
        level,
        type,
        amount,
        techstack: techStackList,
        userId,
        questionsCount: questions.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown server error";
    serverDebugLog("Generate route failed", { message });
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
