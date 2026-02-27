"use server";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
import { getCurrentUserId } from "./auth.action";
import { calculatePerformanceMetrics } from "./performance-metrics.action";
import { generateChatCompletionWithFailover } from "@/lib/ai-client";
import { buildLearningModules, extractWeakTopics } from "@/lib/learning-recommendations";

const IN_QUERY_LIMIT = 10;
const FEEDBACK_AI_TIMEOUT_MS = 18000;

const chunkArray = <T>(items: T[], size: number): T[][] => {
  if (!items.length) return [];

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

type FeedbackPromptContext = {
  role?: string;
  level?: string;
  type?: string;
  difficulty?: string;
  questions?: string[];
  questionAnswerSummary?: string;
  overallScoreHint?: number;
  perQuestionScoresHint?: Array<{ question: string; score: number }>;
};

const formatQuestionAnswerSummary = (
  questions: string[] | undefined,
  transcript: Array<{ role: string; content: string }>
) => {
  const questionList = Array.isArray(questions) ? questions.filter(Boolean) : [];
  const userAnswers = transcript
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.content?.trim())
    .filter(Boolean);

  if (!questionList.length && !userAnswers.length) {
    return "Not available";
  }

  if (!questionList.length) {
    return userAnswers
      .map((answer, index) => `Q${index + 1}: [Question unavailable]\nA${index + 1}: ${answer}`)
      .join("\n\n");
  }

  return questionList
    .map((question, index) => {
      const answer = userAnswers[index] || "[No answer captured]";
      return `Q${index + 1}: ${question}\nA${index + 1}: ${answer}`;
    })
    .join("\n\n");
};

const generateFeedbackWithOpenRouter = async (
  formattedTranscript: string,
  interviewContext?: FeedbackPromptContext
): Promise<{
  totalScore: number;
  categoryScores: Array<{ name: string; score: number; comment: string; keyHighlights?: string[] }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  overallScorePoints: {
    maxPoints: number;
    earnedPoints: number;
    breakdown: Array<{ category: string; maxPoints: number; earnedPoints: number }>;
  };
  criticalHighlights: Array<{ type: "strength" | "improvement" | "critical"; text: string; priority: "high" | "medium" | "low" }>;
}> => {
  const hasOpenRouter =
    !!process.env.OPENROUTER_API_KEY?.trim() || !!process.env.OPENROUTER_API_KEYS?.trim();
  const hasOpenAi =
    !!process.env.OPENAI_API_KEY?.trim() || !!process.env.OPENAI_API_KEYS?.trim();

  if (!hasOpenRouter && !hasOpenAi) {
    throw new Error("Missing AI provider key");
  }

  const systemPrompt = `You are an elite-level technical interview assessor with extensive experience at top-tier companies (FAANG/MAANG). Your evaluations are known for being:
- BRUTALLY HONEST - Never inflate scores to be polite or encouraging
- Evidence-based - Every assessment MUST cite specific quotes or behaviors from the transcript
- Precise and data-driven with exact scoring (use decimal points, e.g., 73.5, 82.25)
- Deeply specific with concrete examples from the transcript
- Professionally critical yet constructive
- Industry-standard aligned with real hiring bar expectations

CRITICAL TRUTHFULNESS RULES:
1. If the candidate gave a weak, incomplete, or wrong answer - SAY SO and score accordingly
2. If the candidate avoided a question or gave a generic response - score LOW
3. If the transcript is short or lacks substance - scores should reflect that (likely 40-60 range)
4. Do NOT assume competence not demonstrated in the transcript
5. Generic or vague answers = low scores
6. Only high scores (80+) for genuinely impressive, specific, detailed responses
7. Average/mediocre responses = average scores (55-70)

Return ONLY valid JSON with no markdown formatting.`;

  const userPrompt = `You are a senior technical interview assessor conducting a comprehensive evaluation. Analyze this interview transcript with the precision and rigor expected at top-tier technology companies.

BE RUTHLESSLY HONEST. Your job is to give TRUE feedback, not to make the candidate feel good.

INTERVIEW CONTEXT:
- Role: ${interviewContext?.role || "Unknown"}
- Level: ${interviewContext?.level || "Unknown"}
- Type: ${interviewContext?.type || "Unknown"}
- Difficulty: ${interviewContext?.difficulty || "Unknown"}
- Questions Asked: ${(interviewContext?.questions || []).length || 0}
- Overall Score (if available): ${
    typeof interviewContext?.overallScoreHint === "number"
      ? interviewContext.overallScoreHint.toFixed(2)
      : "Not available"
  }
- Per-Question Scores (if available): ${
    interviewContext?.perQuestionScoresHint?.length
      ? interviewContext.perQuestionScoresHint
          .map((entry, index) => `Q${index + 1} ${entry.score.toFixed(2)}`)
          .join(", ")
      : "Not available"
  }

QUESTION + ANSWER MAPPING:
${interviewContext?.questionAnswerSummary || "Not available"}

TRANSCRIPT:
${formattedTranscript}

ANTI-TEMPLATE REQUIREMENTS:
- Do NOT use generic filler feedback. Make this report unique to the provided transcript.
- Include at least 2 short direct quotes from the candidate transcript in your category comments/final assessment.
- Avoid repeating the same sentence structure across categories.
- If evidence is weak, say exactly what is missing instead of using vague suggestions.
- Do not use generic phrases like "You did well overall" or "good job" without concrete evidence.
- Mention specific technical mistakes and explicitly name concepts the candidate missed.
- Provide role-specific, practical suggestions (tools, concepts, patterns) based on ${
    interviewContext?.role || "the target role"
  }.

REQUIRED FEEDBACK SECTIONS TO COVER IN OUTPUT CONTENT:
1) Strengths
2) Areas for Improvement
3) Technical Gaps Identified
4) Suggested Topics to Revise
5) Final Recommendation

MAPPING TO JSON FIELDS:
- strengths: include section (1)
- areasForImprovement: include section (2) and (4) with actionable bullets
- criticalHighlights: include section (3) entries (type="critical" or "improvement")
- finalAssessment: include section (5) and a concise summary of role-readiness

TRUTHFULNESS CHECKLIST (Apply before scoring each category):
□ Did the candidate actually demonstrate this skill in the transcript?
□ Were their answers specific and detailed, or vague and generic?
□ Did they answer the question asked, or deflect/avoid it?
□ Were there any factual errors or misconceptions?
□ Is my score based on evidence, or am I being generous?

EVALUATION CRITERIA (Score each from 0 to 100 with EXACT decimal precision - never round to whole numbers):

1. **Communication Skills** (Weight: 20 points max)
   - Clarity of expression and articulation
   - Structure and organization of responses (STAR method usage)
   - Active listening indicators and appropriate pauses
   - Professional vocabulary and terminology usage
   - Ability to explain complex concepts simply
   - RED FLAGS: Rambling, off-topic, unclear, or incomplete responses = score 40-55

2. **Technical Knowledge** (Weight: 25 points max)
   - Depth of understanding in core concepts
   - Breadth of knowledge across relevant technologies
   - Accuracy of technical statements (flag any misconceptions)
   - Awareness of best practices and industry standards
   - Understanding of trade-offs and alternatives
   - RED FLAGS: Incorrect statements, surface-level knowledge, buzzword usage without depth = score 35-55

3. **Problem Solving** (Weight: 25 points max)
   - Structured approach to problem decomposition
   - Logical reasoning and analytical thinking
   - Creative and innovative solutions proposed
   - Consideration of edge cases and error handling
   - Ability to optimize and iterate on solutions
   - RED FLAGS: No clear methodology, missing edge cases, jumping to solutions without analysis = score 35-55

4. **Cultural Fit** (Weight: 15 points max)
   - Alignment with collaborative work environments
   - Growth mindset and learning orientation
   - Handling of challenging or ambiguous situations
   - Professional demeanor and emotional intelligence
   - Team-oriented thinking vs. individual focus
   - RED FLAGS: Blame others, no self-reflection, rigid thinking = score 40-55

5. **Confidence and Clarity** (Weight: 15 points max)
   - Confidence without arrogance
   - Clarity in explaining decisions and reasoning
   - Handling of uncertainty or knowledge gaps
   - Engagement level and enthusiasm
   - Recovery from mistakes or difficult questions
   - RED FLAGS: Overconfidence without substance, excessive uncertainty, defensive = score 40-55

SCORING GUIDELINES (Be honest - most candidates score 55-75):
- 90-100: Exceptional/Hire Strong - Top 5% performance, specific impressive examples throughout
- 80-89.99: Strong/Hire - Clear competence with multiple standout moments
- 70-79.99: Competent/Lean Hire - Solid but not exceptional, minor gaps
- 60-69.99: Developing/Lean No Hire - Some good moments but significant gaps
- 50-59.99: Below Average/No Hire - Mostly generic or weak responses
- 40-49.99: Poor/Strong No Hire - Concerning gaps, errors, or avoidance
- Below 40: Failing - Major red flags, incompetence, or unprofessional

REALITY CHECK: If the transcript shows a short, generic, or superficial interview, the scores MUST reflect that. Do NOT give 70+ scores for mediocre performance.

IMPORTANT: Use PRECISE decimal scores (e.g., 56.75, 63.25, 71.5). Avoid round numbers unless genuinely warranted.

CRITICAL - OVERALL SCORE CALCULATION:
The totalScore MUST be calculated as the weighted average of all category scores using this exact formula:
totalScore = (Communication Skills × 0.20) + (Technical Knowledge × 0.25) + (Problem Solving × 0.25) + (Cultural Fit × 0.15) + (Confidence and Clarity × 0.15)

Example: If scores are Communication=75, Technical=80, Problem=85, Cultural=70, Confidence=78:
totalScore = (75 × 0.20) + (80 × 0.25) + (85 × 0.25) + (70 × 0.15) + (78 × 0.15) = 15 + 20 + 21.25 + 10.5 + 11.7 = 78.45

Return your evaluation as a JSON object with this EXACT structure:
{
  "totalScore": <MUST be calculated using the weighted formula above - precise decimal 0-100>,
  "categoryScores": [
    {
      "name": "Communication Skills",
      "score": <precise decimal 0-100>,
      "comment": "<detailed 2-3 sentence assessment with specific examples from transcript>",
      "keyHighlights": ["<specific quote or behavior noted>", "<another specific observation>"]
    },
    {
      "name": "Technical Knowledge",
      "score": <precise decimal 0-100>,
      "comment": "<detailed assessment citing specific technical points discussed>",
      "keyHighlights": ["<specific technical strength or gap>", "<relevant observation>"]
    },
    {
      "name": "Problem Solving",
      "score": <precise decimal 0-100>,
      "comment": "<assessment of problem-solving approach with examples>",
      "keyHighlights": ["<specific approach noted>", "<methodology observation>"]
    },
    {
      "name": "Cultural Fit",
      "score": <precise decimal 0-100>,
      "comment": "<assessment of cultural alignment indicators>",
      "keyHighlights": ["<specific behavior or statement>"]
    },
    {
      "name": "Confidence and Clarity",
      "score": <precise decimal 0-100>,
      "comment": "<assessment of confidence and clarity in responses>",
      "keyHighlights": ["<specific confidence indicator>"]
    }
  ],
  "strengths": [
    "<specific strength with concrete example from interview>",
    "<another specific strength>",
    "<at least 3-5 strengths>"
  ],
  "areasForImprovement": [
    "<specific actionable improvement with example>",
    "<another specific area with recommendation>",
    "<at least 3-5 areas>"
  ],
  "finalAssessment": "<comprehensive 4-6 sentence professional assessment summarizing overall performance, key differentiators, comparison to industry hiring bar, and clear hiring recommendation with justification>",
  "overallScorePoints": {
    "maxPoints": 100,
    "earnedPoints": <MUST match totalScore exactly>,
    "breakdown": [
      {"category": "Communication Skills", "maxPoints": 20, "earnedPoints": <category score × 0.20>},
      {"category": "Technical Knowledge", "maxPoints": 25, "earnedPoints": <category score × 0.25>},
      {"category": "Problem Solving", "maxPoints": 25, "earnedPoints": <category score × 0.25>},
      {"category": "Cultural Fit", "maxPoints": 15, "earnedPoints": <category score × 0.15>},
      {"category": "Confidence and Clarity", "maxPoints": 15, "earnedPoints": <category score × 0.15>}
    ]
  },
  "criticalHighlights": [
    {"type": "strength", "text": "<most impressive strength to highlight>", "priority": "high"},
    {"type": "improvement", "text": "<most critical area needing improvement>", "priority": "high"},
    {"type": "critical", "text": "<any critical concern or outstanding positive>", "priority": "medium"}
  ]
}

Return ONLY the JSON object, no markdown code blocks or extra text.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEEDBACK_AI_TIMEOUT_MS);

  const result = await generateChatCompletionWithFailover({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.45,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeout);
  });

  const content = result.content?.trim();
  if (!content) {
    throw new Error("AI provider returned empty content");
  }

  // Parse the JSON response
  const cleaned = content
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  return feedbackSchema.parse(parsed);
};

const roundTwo = (value: number) => Math.round(value * 100) / 100;

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

const generateFallbackFeedback = (
  transcript: Array<{ role: string; content: string }>,
  interviewContext?: {
    role?: string;
    level?: string;
    type?: string;
    difficulty?: string;
  }
): {
  totalScore: number;
  categoryScores: Array<{ name: string; score: number; comment: string; keyHighlights?: string[] }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  overallScorePoints: {
    maxPoints: number;
    earnedPoints: number;
    breakdown: Array<{ category: string; maxPoints: number; earnedPoints: number }>;
  };
  criticalHighlights: Array<{ type: "strength" | "improvement" | "critical"; text: string; priority: "high" | "medium" | "low" }>;
} => {
  const userResponses = transcript.filter((entry) => entry.role === "user");
  const combinedUserText = userResponses.map((entry) => entry.content).join(" ").trim();
  const evidenceQuotes = userResponses
    .map((entry) => entry.content.trim())
    .filter((entry) => entry.length > 20)
    .slice(0, 3)
    .map((entry) => `"${entry.slice(0, 120)}${entry.length > 120 ? "..." : ""}"`);
  const wordCount = combinedUserText ? combinedUserText.split(/\s+/).filter(Boolean).length : 0;
  const avgWordsPerResponse = userResponses.length ? wordCount / userResponses.length : 0;

  const fillerWordRegex = /\b(um|uh|like|you know|basically|kind of|sort of|i guess)\b/gi;
  const fillerMatches = combinedUserText.match(fillerWordRegex) ?? [];
  const fillerRate = wordCount ? (fillerMatches.length / wordCount) * 100 : 100;

  const technicalRegex = /\b(api|database|algorithm|complexity|react|typescript|architecture|testing|cache|optimization|security|scalability|system design)\b/gi;
  const technicalMentions = combinedUserText.match(technicalRegex)?.length ?? 0;

  const structureRegex = /\b(first|second|third|because|therefore|however|trade[- ]?off|for example|for instance)\b/gi;
  const structureMentions = combinedUserText.match(structureRegex)?.length ?? 0;

  const communicationScore = clampScore(
    roundTwo(35 + Math.min(avgWordsPerResponse, 120) * 0.35 + Math.min(structureMentions, 10) * 2 - Math.min(fillerRate, 25) * 0.8)
  );
  const technicalScore = clampScore(
    roundTwo(30 + Math.min(technicalMentions, 18) * 3 + Math.min(avgWordsPerResponse, 120) * 0.2)
  );
  const problemSolvingScore = clampScore(
    roundTwo(32 + Math.min(structureMentions, 12) * 2.6 + Math.min(technicalMentions, 12) * 1.8)
  );
  const culturalFitScore = clampScore(
    roundTwo(40 + Math.min(userResponses.length, 12) * 2 - Math.min(fillerRate, 25) * 0.4)
  );
  const confidenceScore = clampScore(
    roundTwo(38 + Math.min(avgWordsPerResponse, 100) * 0.3 - Math.min(fillerRate, 30) * 0.7)
  );

  const weightedTotal = roundTwo(
    communicationScore * 0.2 +
      technicalScore * 0.25 +
      problemSolvingScore * 0.25 +
      culturalFitScore * 0.15 +
      confidenceScore * 0.15
  );

  const baseStrengths = [
    userResponses.length >= 4
      ? "Maintained engagement across multiple responses and attempted to address most prompts."
      : "Provided at least partial responses to prompts, showing willingness to engage.",
    technicalMentions >= 6
      ? "Referenced relevant technical concepts instead of only generic statements."
      : "Showed early technical awareness, though depth remained limited.",
    structureMentions >= 4
      ? "Used some structured reasoning language to explain decisions."
      : "Showed moments of reasoning that can be expanded into clearer frameworks.",
    evidenceQuotes[0]
      ? `Evidence from transcript: ${evidenceQuotes[0]}`
      : "Transcript evidence is limited; provide fuller examples in future responses.",
  ];

  const baseImprovements = [
    "Provide deeper, concrete examples for each answer instead of broad high-level statements.",
    "Reduce filler words and tighten phrasing to improve clarity and confidence.",
    "Use a consistent problem-solving structure and explicitly call out trade-offs and edge cases.",
    evidenceQuotes[1]
      ? `Expand on points like ${evidenceQuotes[1]} with measurable outcomes and technical depth.`
      : "Add specific project details (constraints, decisions, outcomes) to avoid generic responses.",
  ];

  const contextLabel = [
    interviewContext?.role,
    interviewContext?.level,
    interviewContext?.type,
  ]
    .filter(Boolean)
    .join(" • ");

  const finalAssessment =
    weightedTotal >= 80
      ? `${contextLabel ? `[${contextLabel}] ` : ""}Performance is strong with clear technical substance and structured communication. Responses demonstrate good judgment and practical depth. The interview trend aligns with a hiring recommendation, while still leaving room for sharper examples in a few areas.`
      : weightedTotal >= 65
        ? `${contextLabel ? `[${contextLabel}] ` : ""}Performance is mixed with visible strengths and clear development gaps. Some answers show useful technical awareness, but consistency and depth are not yet at a strong-hire bar. A lean-no-hire or borderline outcome is likely unless response quality becomes more specific and structured.`
        : `${contextLabel ? `[${contextLabel}] ` : ""}Performance is currently below hiring expectations. Responses are too generic or insufficiently detailed to demonstrate consistent capability. Major improvement is needed in technical depth, structured reasoning, and communication precision before this profile is interview-ready.`;

  const categoryScores = [
    {
      name: "Communication Skills",
      score: communicationScore,
      comment:
        communicationScore >= 70
          ? "Communication is generally clear with understandable flow. Some responses show good structure, though precision can improve further."
          : "Communication lacks consistency and precision, with multiple vague or loosely structured responses.",
      keyHighlights: [
        `Average response length: ${roundTwo(avgWordsPerResponse)} words`,
        `Filler-word rate: ${roundTwo(fillerRate)}%`,
        evidenceQuotes[0] || "No strong communication quote captured.",
      ],
    },
    {
      name: "Technical Knowledge",
      score: technicalScore,
      comment:
        technicalScore >= 70
          ? "Technical discussion included relevant concepts and mostly solid framing."
          : "Technical depth appears limited, with insufficient concrete detail in several responses.",
      keyHighlights: [
        `Technical concept mentions detected: ${technicalMentions}`,
        evidenceQuotes[1] || "No clear technical quote captured.",
      ],
    },
    {
      name: "Problem Solving",
      score: problemSolvingScore,
      comment:
        problemSolvingScore >= 70
          ? "Problem-solving approach shows signs of method and structured thinking."
          : "Problem-solving flow is inconsistent and needs clearer decomposition and trade-off analysis.",
      keyHighlights: [
        `Structured-reasoning cues detected: ${structureMentions}`,
        evidenceQuotes[2] || "No clear problem-solving quote captured.",
      ],
    },
    {
      name: "Cultural Fit",
      score: culturalFitScore,
      comment:
        culturalFitScore >= 70
          ? "Professional tone and collaboration signals are mostly positive."
          : "Signals for teamwork and reflective growth are limited in the available transcript.",
      keyHighlights: ["Assessed from engagement, consistency, and communication tone"],
    },
    {
      name: "Confidence and Clarity",
      score: confidenceScore,
      comment:
        confidenceScore >= 70
          ? "Delivery is reasonably confident and clear with minor hesitation."
          : "Delivery shows uncertainty and uneven clarity; answers need tighter framing.",
      keyHighlights: ["Assessed from fluency, specificity, and hesitation indicators"],
    },
  ];

  const overallScorePoints = {
    maxPoints: 100,
    earnedPoints: weightedTotal,
    breakdown: [
      { category: "Communication Skills", maxPoints: 20, earnedPoints: roundTwo(communicationScore * 0.2) },
      { category: "Technical Knowledge", maxPoints: 25, earnedPoints: roundTwo(technicalScore * 0.25) },
      { category: "Problem Solving", maxPoints: 25, earnedPoints: roundTwo(problemSolvingScore * 0.25) },
      { category: "Cultural Fit", maxPoints: 15, earnedPoints: roundTwo(culturalFitScore * 0.15) },
      { category: "Confidence and Clarity", maxPoints: 15, earnedPoints: roundTwo(confidenceScore * 0.15) },
    ],
  };

  const criticalHighlights: Array<{
    type: "strength" | "improvement" | "critical";
    text: string;
    priority: "high" | "medium" | "low";
  }> = [
    {
      type: "strength",
      text:
        technicalMentions >= 6
          ? "Candidate demonstrates baseline technical vocabulary and practical context awareness."
          : "Candidate shows willingness to engage and provide responses under interview conditions.",
      priority: "high",
    },
    {
      type: "improvement",
      text: "Most answers need more concrete examples, explicit trade-offs, and deeper technical specificity.",
      priority: "high",
    },
    {
      type: "critical",
      text:
        wordCount < 120
          ? "Transcript has limited content, reducing confidence in high-score conclusions."
          : "Current interview quality is not yet consistently at a strong-hire bar.",
      priority: "medium",
    },
  ];

  return feedbackSchema.parse({
    totalScore: weightedTotal,
    categoryScores,
    strengths: baseStrengths,
    areasForImprovement: baseImprovements,
    finalAssessment,
    overallScorePoints,
    criticalHighlights,
  });
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

    let object;

    const questionAnswerSummary = formatQuestionAnswerSummary(interview.questions, transcript);
    let overallScoreHint: number | undefined;
    let perQuestionScoresHint: Array<{ question: string; score: number }> | undefined;

    if (feedbackId) {
      const existingFeedback = await db.collection("feedback").doc(feedbackId).get();
      if (existingFeedback.exists) {
        const existingData = existingFeedback.data() as {
          totalScore?: number;
          questionScores?: Array<{ question?: string; score?: number }>;
        };

        if (typeof existingData.totalScore === "number") {
          overallScoreHint = existingData.totalScore;
        }

        if (Array.isArray(existingData.questionScores)) {
          perQuestionScoresHint = existingData.questionScores
            .filter((entry) => typeof entry?.score === "number")
            .map((entry) => ({
              question: String(entry.question || "Question"),
              score: Number(entry.score),
            }));
        }
      }
    }

    try {
      object = await generateFeedbackWithOpenRouter(formattedTranscript, {
        role: interview.role,
        level: interview.level,
        type: interview.type,
        difficulty: interview.difficulty,
        questions: Array.isArray(interview.questions) ? interview.questions : [],
        questionAnswerSummary,
        overallScoreHint,
        perQuestionScoresHint,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI provider unavailable";
      console.warn(`AI feedback unavailable, using deterministic scoring. (${message})`);
      object = generateFallbackFeedback(transcript, {
        role: interview.role,
        level: interview.level,
        type: interview.type,
        difficulty: interview.difficulty,
      });
    }

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      overallScorePoints: object.overallScorePoints,
      criticalHighlights: object.criticalHighlights,
      transcript,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    try {
      const weakTopics = extractWeakTopics({
        categoryScores: feedback.categoryScores,
        areasForImprovement: feedback.areasForImprovement,
        criticalHighlights: feedback.criticalHighlights,
      });

      const learningModules = await buildLearningModules(weakTopics);

      await db
        .collection("interviews")
        .doc(interviewId)
        .set(
          {
            weakTopics,
            learningModules,
            learningModulesUpdatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
    } catch (learningError) {
      console.error("Error generating learning recommendations:", learningError);
    }

    calculatePerformanceMetrics(feedbackRef.id, transcript).catch((error) => {
      console.error("Error calculating performance metrics:", error);
    });

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function completeInterviewSession(params: CreateFeedbackParams) {
  const { interviewId, transcript, feedbackId } = params;

  const feedbackResult = await createFeedback({
    interviewId,
    transcript,
    feedbackId,
  });

  if (!feedbackResult.success) {
    return feedbackResult;
  }

  try {
    await db
      .collection("interviews")
      .doc(interviewId)
      .set(
        {
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          status: "completed",
        },
        { merge: true }
      );
  } catch (error) {
    console.error("Error updating interview completion state:", error);
    return { success: false, error: "Failed to update interview" };
  }

  return feedbackResult;
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

export async function getFeedbackMapByInterviewIds(params: {
  interviewIds: string[];
  userId: string;
}): Promise<Map<string, Feedback>> {
  const { interviewIds, userId } = params;

  if (!interviewIds.length) return new Map();

  const uniqueIds = Array.from(new Set(interviewIds));
  const chunks = chunkArray(uniqueIds, IN_QUERY_LIMIT);

  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      db
        .collection("feedback")
        .where("userId", "==", userId)
        .where("interviewId", "in", chunk)
        .get()
    )
  );

  const feedbackMap = new Map<string, Feedback>();
  for (const snapshot of snapshots) {
    snapshot.docs.forEach((doc) => {
      const feedback = { id: doc.id, ...doc.data() } as Feedback;
      if (!feedbackMap.has(feedback.interviewId)) {
        feedbackMap.set(feedback.interviewId, feedback);
      }
    });
  }

  return feedbackMap;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const bufferMultiplier = 8;
  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .limit(limit * bufferMultiplier)
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
  try {
    const interviews = await db
      .collection("interviews")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    return interviews.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as Interview) as Interview[];
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (message.includes("requires an index") || message.includes("failed_precondition")) {
      const fallbackInterviews = await db
        .collection("interviews")
        .where("userId", "==", userId)
        .get();

      return fallbackInterviews.docs
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

    throw error;
  }
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
