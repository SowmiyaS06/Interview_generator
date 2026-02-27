"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { getVapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { completeInterviewSession } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface GenerateInterviewPayload {
  role: string;
  level?: string;
  type?: string;
  techstack?: string | string[];
  amount?: number;
  questions?: string | string[];
}

const RESERVED_MESSAGE_ROLES = new Set(["user", "assistant", "system", "tool", "function"]);
const RESERVED_MESSAGE_TYPES = new Set([
  "transcript",
  "function-call",
  "function-call-result",
  "add-message",
  "status-update",
]);

const VAPI_DEBUG_ENABLED = process.env.NEXT_PUBLIC_VAPI_DEBUG === "true";

const debugLog = (label: string, payload?: unknown) => {
  if (!VAPI_DEBUG_ENABLED) return;
  if (payload === undefined) {
    console.log(`[VAPI_DEBUG] ${label}`);
    return;
  }
  console.log(`[VAPI_DEBUG] ${label}`, payload);
};

const readStringValue = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }

  return "";
};

const readNumberValue = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (value === undefined || value === null) continue;

    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue > 0) {
      return numberValue;
    }
  }

  return undefined;
};

const readTechstackValue = (source: Record<string, unknown>) => {
  const techstack =
    source.techstack ??
    source.techStack ??
    source.technologies ??
    source.skills ??
    source.stack ??
    source.tools;

  if (Array.isArray(techstack)) {
    const values = techstack.map((item) => String(item).trim()).filter(Boolean);
    return values.length ? values : undefined;
  }

  if (typeof techstack === "string") {
    const normalized = techstack.trim();
    return normalized || undefined;
  }

  return undefined;
};

const readQuestionsValue = (source: Record<string, unknown>) => {
  const questions =
    source.questions ??
    source.customQuestions ??
    source.questionList ??
    source.questionsList;

  const numberedQuestions = Object.entries(source)
    .filter(([key, value]) => /^question\d+$/i.test(key) && value !== undefined && value !== null)
    .map(([, value]) => String(value).trim())
    .filter(Boolean);

  if (numberedQuestions.length) {
    return numberedQuestions;
  }

  if (Array.isArray(questions)) {
    const values = questions.map((item) => String(item).trim()).filter(Boolean);
    return values.length ? values : undefined;
  }

  if (typeof questions === "string") {
    const normalized = questions.trim();
    return normalized || undefined;
  }

  return undefined;
};

const toGeneratePayload = (value: unknown): GenerateInterviewPayload | null => {
  if (!value || typeof value !== "object") return null;

  const source = value as Record<string, unknown>;

  const hasInterviewSpecificKeys =
    "jobRole" in source ||
    "position" in source ||
    "targetRole" in source ||
    "desiredRole" in source ||
    "interviewRole" in source ||
    "level" in source ||
    "experienceLevel" in source ||
    "seniority" in source ||
    "expertiseLevel" in source ||
    "techstack" in source ||
    "techStack" in source ||
    "technologies" in source ||
    "skills" in source ||
    "stack" in source ||
    "tools" in source ||
    "amount" in source ||
    "questionCount" in source ||
    "numberOfQuestions" in source ||
    "totalQuestions" in source ||
    "questions" in source ||
    "customQuestions" in source ||
    "questionList" in source ||
    "questionsList" in source;

  if (!hasInterviewSpecificKeys) {
    return null;
  }

  const roleValue = readStringValue(source, [
    "role",
    "jobRole",
    "position",
    "targetRole",
    "desiredRole",
    "interviewRole",
  ]);

  const levelValue = readStringValue(source, [
    "level",
    "experienceLevel",
    "seniority",
    "expertiseLevel",
  ]);

  const typeValue = readStringValue(source, ["type", "interviewType", "focus", "questionType"]);

  const techstack = readTechstackValue(source);
  const questions = readQuestionsValue(source);
  const amountValue =
    readNumberValue(source, [
      "amount",
      "questionCount",
      "numberOfQuestions",
      "totalQuestions",
    ]);

  const hasMeaningfulData =
    !!roleValue ||
    !!levelValue ||
    !!typeValue ||
    !!techstack ||
    !!questions ||
    !!amountValue;

  if (!hasMeaningfulData) {
    return null;
  }

  if (roleValue && RESERVED_MESSAGE_ROLES.has(roleValue.toLowerCase())) {
    return null;
  }

  if (typeValue && RESERVED_MESSAGE_TYPES.has(typeValue.toLowerCase())) {
    return null;
  }

  const role = roleValue || "General";
  const level = levelValue || undefined;
  const type = typeValue || undefined;
  const amount = amountValue;

  return {
    role,
    level,
    type,
    techstack,
    amount,
    questions,
  };
};

const extractPayloadFromUnknown = (
  value: unknown
): GenerateInterviewPayload | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        const payload = extractPayloadFromUnknown(parsed);
        if (payload) return payload;
      } catch {
        // continue fallback path
      }
    }
  }

  const direct = toGeneratePayload(value);
  if (direct) return direct;

  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const payload = extractPayloadFromUnknown(nested);
      if (payload) return payload;
    }
  }

  return null;
};

const extractPayloadFromMessage = (message: unknown): GenerateInterviewPayload | null => {
  if (!message || typeof message !== "object") return null;

  const source = message as Record<string, unknown>;
  const functionCall =
    source.functionCall && typeof source.functionCall === "object"
      ? (source.functionCall as Record<string, unknown>)
      : undefined;

  const functionCallResult =
    source.functionCallResult && typeof source.functionCallResult === "object"
      ? (source.functionCallResult as Record<string, unknown>)
      : undefined;

  const candidates: unknown[] = [
    source,
    source.payload,
    source.data,
    source.content,
    source.message,
    functionCall,
    functionCall?.parameters,
    functionCall?.arguments,
    functionCall?.payload,
    functionCallResult,
    functionCallResult?.result,
    functionCallResult?.output,
    functionCallResult?.payload,
  ];

  for (const candidate of candidates) {
    const payload = extractPayloadFromUnknown(candidate);
    if (payload) return payload;
  }

  return null;
};

const isMeetingEndedEjection = (message?: string) => {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("meeting ended due to ejection") ||
    lower.includes("meeting has ended")
  );
};

const isTransportDisconnected = (message?: string) => {
  if (!message) return false;
  const lower = message.toLowerCase();

  return (
    lower.includes("recv transport changed to disconnected") ||
    lower.includes("transport changed to disconnected") ||
    lower.includes("transport disconnected") ||
    lower.includes("ice connection state") && lower.includes("disconnected")
  );
};

const isKnownBenignCallEndMessage = (message?: string) => {
  if (!message) return false;

  return isMeetingEndedEjection(message) || isTransportDisconnected(message);
};

const isGenerateClosingPhrase = (text?: string) => {
  if (!text) return false;

  const normalized = text.toLowerCase().trim();

  return [
    "thank you",
    "thanks",
    "thankyou",
    "bye",
    "goodbye",
    "see you",
    "that's all",
    "thats all",
    "done",
  ].some((phrase) => normalized.includes(phrase));
};

const isInterviewClosingPhrase = (text?: string) => {
  if (!text) return false;

  const normalized = text.toLowerCase().trim();

  // Must contain the SPECIFIC concluding phrase, not just "thank you"
  // The interviewer ends with: "Thank you for your time. This concludes the interview."
  return (
    normalized.includes("this concludes the interview") ||
    normalized.includes("that concludes the interview") ||
    normalized.includes("interview is complete") ||
    normalized.includes("interview is now complete") ||
    (normalized.includes("thank you for your time") && normalized.includes("concludes"))
  );
};

const isInterviewClosurePrompt = (text?: string) => {
  if (!text) return false;

  const normalized = text.toLowerCase().trim();

  return [
    "would you like to end",
    "would you like to conclude",
    "shall we end",
    "shall we conclude",
    "do you want to end",
    "do you want to finish",
    "can we wrap up",
    "ready to conclude",
  ].some((phrase) => normalized.includes(phrase));
};

const isInterviewEndConfirmation = (text?: string) => {
  if (!text) return false;

  const normalized = text.toLowerCase().trim();

  return [
    "let's end",
    "lets end",
    "end the interview",
    "you can end the interview",
    "yes end the interview",
    "yes, end the interview",
    "please end the interview",
    "we can end",
    "finish the interview",
    "conclude the interview",
    "you may conclude the interview",
  ].some((phrase) => normalized.includes(phrase));
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const extractErrorMessage = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (!value || typeof value !== "object") return "";

  const source = value as Record<string, unknown>;
  const candidates = [
    source.message,
    source.errorMsg,
    source.reason,
    source.details,
    source.error,
  ];

  for (const candidate of candidates) {
    const message = extractErrorMessage(candidate);
    if (message) return message;
  }

  try {
    const serialized = JSON.stringify(source);
    return serialized === "{}" ? "" : serialized;
  } catch {
    return "";
  }
};

const getErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    const maybeCode = (error as Error & { code?: string }).code;
    return {
      message: error.message,
      code: maybeCode ?? "N/A",
    };
  }

  if (typeof error === "object" && error !== null) {
    const maybeCode = "code" in error ? String((error as { code?: unknown }).code) : "N/A";
    const maybeMessage = extractErrorMessage(error) || JSON.stringify(error);

    return {
      message: maybeMessage,
      code: maybeCode,
    };
  }

  return {
    message: String(error),
    code: "N/A",
  };
};

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  level,
}: AgentProps) => {
  const router = useRouter();
  const vapi = useMemo(() => getVapi(), []);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [lastMessage, setLastMessage] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingInterview, setIsGeneratingInterview] = useState(false);
  const [generatedPayload, setGeneratedPayload] = useState<GenerateInterviewPayload | null>(null);
  const generatedPayloadRef = useRef<GenerateInterviewPayload | null>(null);
  const generationRequestIdRef = useRef<string | null>(null);
  const generateHandledForSessionRef = useRef(false);
  const transcriptMessagesRef = useRef<SavedMessage[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const lastUserTranscriptAtRef = useRef<number | null>(null);
  const callStatusRef = useRef<CallStatus>(CallStatus.INACTIVE);
  const suppressFinishRef = useRef(false);
  const autoStopTriggeredRef = useRef(false);
  const endingGenerateCallRef = useRef(false);
  const endingInterviewCallRef = useRef(false);
  const awaitingInterviewEndConfirmationRef = useRef(false);
  const interviewEndPromptedAtRef = useRef<number | null>(null);
  const lastEjectionToastAtRef = useRef(0);
  const hasUserSpokenRef = useRef(false);
  const activeSessionTypeRef = useRef<AgentProps["type"]>(type);
  const createdInterviewIdRef = useRef<string | null>(null);
  const createInterviewInvokedRef = useRef(false);

  const hasCompleteInterviewPayload = useCallback((payload: GenerateInterviewPayload | null) => {
    if (!payload) return false;

    const role = payload.role?.trim().toLowerCase();
    if (!role || RESERVED_MESSAGE_ROLES.has(role)) return false;

    const level = payload.level?.trim();
    if (!level) return false;

    const hasTechstack =
      (Array.isArray(payload.techstack) && payload.techstack.length > 0) ||
      (typeof payload.techstack === "string" && payload.techstack.trim().length > 0);

    const hasAmount = typeof payload.amount === "number" && Number.isFinite(payload.amount) && payload.amount > 0;

    return hasTechstack && hasAmount;
  }, []);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);


  const resetCallState = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    setCallStatus(CallStatus.INACTIVE);
    setIsSpeaking(false);
  };

  const handleEjectionGracefully = useCallback((message?: string) => {
    if (!isMeetingEndedEjection(message)) return false;

    suppressFinishRef.current = true;

    const now = Date.now();
    if (now - lastEjectionToastAtRef.current > 1500) {
      lastEjectionToastAtRef.current = now;
      toast.error("Call ended by meeting host/workflow. Please start again.");
    }

    if (type === "generate") {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }

      setIsSpeaking(false);
      setCallStatus(CallStatus.FINISHED);
      return true;
    }

    resetCallState();
    return true;
  }, [type]);

  const handleTransportDisconnectGracefully = useCallback((message?: string) => {
    if (!isTransportDisconnected(message)) return false;

    const callIsEndingByIntent = endingGenerateCallRef.current || endingInterviewCallRef.current;
    const isNonActiveState = callStatusRef.current !== CallStatus.ACTIVE;

    if (callIsEndingByIntent || isNonActiveState) {
      suppressFinishRef.current = true;

      if (type === "generate" && autoStopTriggeredRef.current) {
        setCallStatus(CallStatus.FINISHED);
        return true;
      }

      resetCallState();
      return true;
    }

    toast.error("Call disconnected unexpectedly. Please reconnect and continue.");
    resetCallState();
    return true;
  }, [type]);

  const saveGeneratedInterview = useCallback(async () => {
    const payloadToSave = generatedPayloadRef.current ?? generatedPayload;

    if (!payloadToSave) {
      debugLog("No generated payload captured from workflow messages.");
      return null;
    }

    debugLog("Saving generated interview payload", {
      role: payloadToSave.role,
      level: payloadToSave.level,
      type: payloadToSave.type,
      amount: payloadToSave.amount,
      hasTechstack: !!payloadToSave.techstack,
      hasQuestions: !!payloadToSave.questions,
    });

    const requestBody = {
      ...payloadToSave,
      userId,
      generationRequestId: generationRequestIdRef.current,
    };

    const postGenerate = () =>
      fetch("/api/vapi/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

    let response: Response;
    try {
      response = await postGenerate();
    } catch {
      response = await postGenerate();
    }

    if (!response.ok && response.status >= 500) {
      response = await postGenerate();
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Failed to save generated interview.");
    }

    const body = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      interviewId?: string;
    };
    debugLog("Generate API response", body);
    return body.success ? (body.interviewId ?? null) : null;
  }, [generatedPayload, userId]);

  const createInterview = useCallback(async () => {
    if (isGeneratingInterview) return;

    if (activeSessionTypeRef.current !== "generate") {
      return;
    }

    if (createInterviewInvokedRef.current) {
      debugLog("Create interview already invoked for this session");
      return;
    }

    if (createdInterviewIdRef.current) {
      debugLog("Interview already created for this session", {
        interviewId: createdInterviewIdRef.current,
      });
      return;
    }

    const payloadReady = generatedPayloadRef.current ?? generatedPayload;

    if (!hasCompleteInterviewPayload(payloadReady)) {
      toast.error("Interview details were not captured correctly. Please try the call again.");
      resetCallState();
      return;
    }

    createInterviewInvokedRef.current = true;
    setIsGeneratingInterview(true);

    try {
      generatedPayloadRef.current = payloadReady;
      setGeneratedPayload(payloadReady);

      const generatedInterviewId = await saveGeneratedInterview();
      if (generatedInterviewId) {
        createdInterviewIdRef.current = generatedInterviewId;
        toast.success("Interview generated and saved.");
        router.push("/");
        router.refresh();
        return;
      }

      toast.error("Failed to generate interview.");
    } catch (error) {
      const details = getErrorDetails(error);
      console.log("Failed to persist generated interview:", details);
      toast.error(`Interview save failed: ${details.message}`);
      createInterviewInvokedRef.current = false;
    } finally {
      setIsGeneratingInterview(false);
      resetCallState();
    }
  }, [generatedPayload, hasCompleteInterviewPayload, isGeneratingInterview, router, saveGeneratedInterview]);

  const completeInterview = useCallback(
    async (targetInterviewId: string, messages: SavedMessage[]) => {
      const { success, feedbackId: id, error } = await completeInterviewSession({
        interviewId: targetInterviewId,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        router.push(`/interview/${targetInterviewId}/feedback`);
        return;
      }

      console.log("Error completing interview", error ?? "Unknown error");
      router.push("/");
    },
    [feedbackId, router]
  );

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const extractedMessage = extractErrorMessage(event.reason);
      const fallbackMessage = String(event.reason ?? "");
      const message = extractedMessage || fallbackMessage;

      if (isKnownBenignCallEndMessage(message)) {
        if (handleEjectionGracefully(message) || handleTransportDisconnectGracefully(message)) {
          event.preventDefault();
          return;
        }
      }

      if (handleEjectionGracefully(message)) {
        event.preventDefault();
        return;
      }

      if (handleTransportDisconnectGracefully(message)) {
        event.preventDefault();
      }
    };

    const onWindowError = (event: ErrorEvent) => {
      const extractedMessage =
        event.message ||
        extractErrorMessage(event.error);
      const fallbackMessage = String(event.error ?? event.message ?? "");
      const message = extractedMessage || fallbackMessage;

      if (isKnownBenignCallEndMessage(message)) {
        if (handleEjectionGracefully(message) || handleTransportDisconnectGracefully(message)) {
          event.preventDefault();
          return;
        }
      }

      if (handleEjectionGracefully(message)) {
        event.preventDefault();
        return;
      }

      if (handleTransportDisconnectGracefully(message)) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onWindowError, true);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onWindowError, true);
    };
  }, [handleEjectionGracefully, handleTransportDisconnectGracefully]);

  useEffect(() => {
    if (!vapi) return;

    const completeGenerationFlow = () => {
      if (
        type !== "generate" ||
        autoStopTriggeredRef.current ||
        callStatusRef.current !== CallStatus.ACTIVE
      ) {
        return;
      }

      if (!hasUserSpokenRef.current) {
        debugLog("Skipping auto-stop because user details are not captured from speech yet");
        return;
      }

      autoStopTriggeredRef.current = true;
      debugLog("Auto-stop trigger set after usable payload capture");
    };

    const endGenerateCallAndContinue = () => {
      if (
        type !== "generate" ||
        !autoStopTriggeredRef.current ||
        callStatusRef.current !== CallStatus.ACTIVE ||
        endingGenerateCallRef.current
      ) {
        return;
      }

      endingGenerateCallRef.current = true;
      suppressFinishRef.current = true;
      setCallStatus(CallStatus.FINISHED);
      debugLog("Ending generate call and continuing to save");

      try {
        vapi.stop();
      } catch {
        // no-op: FINISHED state already advances generation flow
      }
    };

    const endInterviewCallAndContinue = () => {
      if (
        type !== "interview" ||
        callStatusRef.current !== CallStatus.ACTIVE ||
        endingInterviewCallRef.current
      ) {
        return;
      }

      endingInterviewCallRef.current = true;
      debugLog("Ending interview call after assistant closing phrase");

      try {
        vapi.stop();
      } catch {
        setCallStatus(CallStatus.FINISHED);
      }
    };

    const onCallStart = () => {
      if (callStatusRef.current === CallStatus.ACTIVE) {
        debugLog("Ignoring duplicate call-start event", { type });
        return;
      }

      suppressFinishRef.current = false;
      autoStopTriggeredRef.current = false;
      endingGenerateCallRef.current = false;
      endingInterviewCallRef.current = false;
      generateHandledForSessionRef.current = false;
      createInterviewInvokedRef.current = false;
      generationRequestIdRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      awaitingInterviewEndConfirmationRef.current = false;
      interviewEndPromptedAtRef.current = null;
      hasUserSpokenRef.current = false;
      activeSessionTypeRef.current = type;
      createdInterviewIdRef.current = null;
      transcriptMessagesRef.current = [];
      setLastMessage("");
      generatedPayloadRef.current = null;
      setGeneratedPayload(null);
      setCallStatus(CallStatus.ACTIVE);
      debugLog("Call started", { type });
    };

    const onCallEnd = () => {
      if (suppressFinishRef.current) {
        suppressFinishRef.current = false;

        if (type === "generate" && autoStopTriggeredRef.current) {
          setCallStatus(CallStatus.FINISHED);
          return;
        }

        resetCallState();
        return;
      }

      if (callStatusRef.current === CallStatus.INACTIVE) {
        return;
      }
      setCallStatus(CallStatus.FINISHED);
      debugLog("Call ended", { type, finalStatus: callStatusRef.current });
    };

    const onMessage = (message: Message) => {
      debugLog("Incoming Vapi message", {
        type: (message as { type?: string }).type,
        role: (message as { role?: string }).role,
        transcriptType: (message as { transcriptType?: string }).transcriptType,
        keys: Object.keys(message as unknown as Record<string, unknown>),
      });

      if (message.type === "transcript") {
        if (message.role === "user") {
          lastUserTranscriptAtRef.current = Date.now();
          if (message.transcriptType === "final") {
            hasUserSpokenRef.current = true;
          }
        }

        if (message.transcriptType !== "final") {
          if (message.transcript?.trim()) {
            setLastMessage(message.transcript);
          }
          return;
        }

        const newMessage = { role: message.role, content: message.transcript };
        transcriptMessagesRef.current.push(newMessage);
        setLastMessage(newMessage.content);

        if (
          message.role === "user" &&
          type === "generate" &&
          autoStopTriggeredRef.current &&
          isGenerateClosingPhrase(message.transcript)
        ) {
          endGenerateCallAndContinue();
        }

        if (
          message.role === "assistant" &&
          type === "interview" &&
          isInterviewClosingPhrase(message.transcript)
        ) {
          awaitingInterviewEndConfirmationRef.current = true;
          interviewEndPromptedAtRef.current = Date.now();
          debugLog("Interview closing phrase detected. Awaiting user's closing confirmation.");
        }

        if (
          message.role === "assistant" &&
          type === "interview" &&
          isInterviewClosurePrompt(message.transcript)
        ) {
          awaitingInterviewEndConfirmationRef.current = true;
          interviewEndPromptedAtRef.current = Date.now();
          debugLog("Awaiting user confirmation to end interview");
        }

        if (
          message.role === "user" &&
          type === "interview" &&
          awaitingInterviewEndConfirmationRef.current &&
          (interviewEndPromptedAtRef.current
            ? Date.now() - interviewEndPromptedAtRef.current <= 45000
            : false) &&
          isInterviewEndConfirmation(message.transcript)
        ) {
          awaitingInterviewEndConfirmationRef.current = false;
          interviewEndPromptedAtRef.current = null;
          endInterviewCallAndContinue();
        }
      }

      const payload = extractPayloadFromMessage(message);
      if (payload) {
        debugLog("Captured interview payload from workflow message", payload);
        generatedPayloadRef.current = payload;
        setGeneratedPayload(payload);

        if (hasCompleteInterviewPayload(payload)) {
          debugLog("Payload marked usable for generation", {
            role: payload.role,
            level: payload.level,
            type: payload.type,
            amount: payload.amount,
          });
          completeGenerationFlow();
        } else {
          debugLog("Payload ignored as not usable", payload);
        }
      }
    };

    const onSpeechStart = () => {
      console.log("speech start");
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      console.log("speech end");
      setIsSpeaking(false);
    };

    const onError = (error: unknown) => {
      const details = getErrorDetails(error);

      const fallbackMessage = String(error ?? "");
      const message = details.message || fallbackMessage;

      if (isKnownBenignCallEndMessage(message)) {
        if (handleEjectionGracefully(message) || handleTransportDisconnectGracefully(message)) {
          return;
        }
      }

      if (handleEjectionGracefully(message)) {
        return;
      }

      if (handleTransportDisconnectGracefully(message)) {
        return;
      }

      console.log("Vapi error details:", {
        raw: error,
        ...details,
      });

      toast.error(`Vapi error (${details.code}): ${message}`);
      resetCallState();
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, [handleEjectionGracefully, handleTransportDisconnectGracefully, hasCompleteInterviewPayload, createInterview, type, vapi]);

  useEffect(() => {
    if (callStatus !== CallStatus.ACTIVE) return;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const lastHeardAt = lastUserTranscriptAtRef.current;
      const idleMs = lastHeardAt ? Date.now() - lastHeardAt : Date.now() - startedAt;

      if (idleMs > 30000) {
        toast.error("No audio detected for 30 seconds. Please check your microphone and speak clearly.");
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [callStatus]);

  useEffect(() => {
    if (callStatus === CallStatus.FINISHED) {
      if (activeSessionTypeRef.current === "generate") {
        if (generateHandledForSessionRef.current) {
          return;
        }
        generateHandledForSessionRef.current = true;
        createInterview();
      } else {
        if (!interviewId) {
          router.push("/");
          return;
        }
        completeInterview(interviewId, transcriptMessagesRef.current);
      }
    }
  }, [
    callStatus,
    interviewId,
    createInterview,
    completeInterview,
    router,
  ]);

  const handleCall = async () => {
    if (isGeneratingInterview) {
      return;
    }

    if (callStatus === CallStatus.CONNECTING || callStatus === CallStatus.ACTIVE) {
      return;
    }

    setCallStatus(CallStatus.CONNECTING);

    if (type === "generate") {
      createInterviewInvokedRef.current = false;
      createdInterviewIdRef.current = null;
      generationRequestIdRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    const connectingTimeout = setTimeout(() => {
      if (callStatusRef.current === CallStatus.CONNECTING) {
        toast.error("Call connection timed out. Please try again.");
        try {
          if (vapi) vapi.stop();
        } catch {
          console.log("No active Vapi call to stop after timeout.");
        }
        resetCallState();
      }
    }, 15000);

    try {
      if (!vapi) {
        throw new Error("Missing NEXT_PUBLIC_VAPI_WEB_TOKEN in environment variables.");
      }

      const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID?.trim();

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Your browser does not support microphone access.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = stream;

      const [audioTrack] = stream.getAudioTracks();
      if (!audioTrack) {
        throw new Error("No microphone detected.");
      }

      if (!audioTrack.enabled) {
        toast.error("Microphone is disabled. Please enable it and try again.");
      }

      audioTrack.onmute = () => {
        toast.error("Microphone muted.");
      };
      audioTrack.onended = () => {
        toast.error("Microphone disconnected.");
      };

      if (type === "generate") {
        if (!workflowId) {
          throw new Error("Missing NEXT_PUBLIC_VAPI_WORKFLOW_ID in environment variables.");
        }

        if (!isUuid(workflowId)) {
          throw new Error(
            "Invalid NEXT_PUBLIC_VAPI_WORKFLOW_ID. It must be a UUID (example: 123e4567-e89b-12d3-a456-426614174000)."
          );
        }

        debugLog("Starting generate workflow", {
          workflowId,
          hasUserName: !!userName,
          hasUserId: !!userId,
        });

        await vapi.start(undefined, undefined, undefined, workflowId, {
          variableValues: {
            username: userName,
            userid: userId,
            userId,
            language: process.env.NEXT_PUBLIC_VAPI_TRANSCRIBER_LANGUAGE?.trim() || "en-IN",
            locale: process.env.NEXT_PUBLIC_VAPI_TRANSCRIBER_LANGUAGE?.trim() || "en-IN",
            accent: "indian-english",
          },
        });
      } else {
        const formattedQuestions = questions?.length
          ? questions.map((question) => `- ${question}`).join("\n")
          : "- Introduce yourself.\n- Tell me about your technical experience.";

        await vapi.start(interviewer, {
          variableValues: {
            questions: formattedQuestions,
            level: level ?? "Mid",
          },
        });
      }
    } catch (error) {
      const details = getErrorDetails(error);
      console.log("Failed to start call details:", {
        raw: error,
        ...details,
      });
      toast.error(`Start call failed (${details.code}): ${details.message}`);
      resetCallState();
    } finally {
      clearTimeout(connectingTimeout);
    }
  };

  const handleDisconnect = () => {
    if (!vapi) {
      resetCallState();
      return;
    }

    setCallStatus(CallStatus.CONNECTING);
    try {
      vapi.stop();
    } catch (error) {
      const details = getErrorDetails(error);
      if (!handleEjectionGracefully(details.message)) {
        toast.error(`Stop call failed (${details.code}): ${details.message}`);
        resetCallState();
      }
    }
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <div className="size-30 rounded-full bg-primary-100/20 flex items-center justify-center text-4xl font-bold text-primary-100">
              {userName?.charAt(0).toUpperCase() || "U"}
            </div>
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {lastMessage && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button
            className={cn("relative btn-call", isGeneratingInterview && "opacity-80")}
            onClick={() => handleCall()}
            disabled={isGeneratingInterview}
          >
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />

            <span className="relative">
              {isGeneratingInterview
                ? "Generating..."
                : callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>

      {isGeneratingInterview && (
        <p className="interview-text mt-3">Generating interview and redirecting...</p>
      )}
    </>
  );
};

export default Agent;
