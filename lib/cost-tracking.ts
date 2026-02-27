/**
 * Cost tracking system for OpenRouter API calls
 * Tracks token usage and estimates costs for monitoring and billing
 */

import { db } from "@/firebase/admin";

// OpenRouter pricing (as of 2024)
// Source: https://openrouter.ai/models
const MODEL_PRICING = {
  "openai/gpt-4o-mini": {
    input: 0.15 / 1_000_000, // $0.15 per 1M input tokens
    output: 0.60 / 1_000_000, // $0.60 per 1M output tokens
  },
  "openai/gpt-4o": {
    input: 2.50 / 1_000_000,
    output: 10.00 / 1_000_000,
  },
  "anthropic/claude-3.5-sonnet": {
    input: 3.00 / 1_000_000,
    output: 15.00 / 1_000_000,
  },
} as const;

export interface CostTrackingEntry {
  userId: string;
  model: string;
  operation: "interview-generation" | "feedback-generation";
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  timestamp: string;
  interviewId?: string;
  feedbackId?: string;
}

/**
 * Estimate token count from text (rough approximation)
 * More accurate: use tiktoken library, but this is good enough for estimates
 * Rule of thumb: 1 token ≈ 4 characters or 0.75 words
 */
function estimateTokens(text: string): number {
  // Average between character-based and word-based estimates
  const charBasedEstimate = text.length / 4;
  const wordBasedEstimate = text.split(/\s+/).length * 1.33;
  
  return Math.ceil((charBasedEstimate + wordBasedEstimate) / 2);
}

/**
 * Calculate cost based on model and token usage
 */
function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING["openai/gpt-4o-mini"];
  
  return (inputTokens * pricing.input) + (outputTokens * pricing.output);
}

/**
 * Track API usage and cost
 */
export async function trackApiCost(params: {
  userId: string;
  model: string;
  operation: "interview-generation" | "feedback-generation";
  inputText: string;
  outputText: string;
  interviewId?: string;
  feedbackId?: string;
}): Promise<void> {
  try {
    const inputTokens = estimateTokens(params.inputText);
    const outputTokens = estimateTokens(params.outputText);
    const estimatedCost = calculateCost(params.model, inputTokens, outputTokens);

    const entry: CostTrackingEntry = {
      userId: params.userId,
      model: params.model,
      operation: params.operation,
      inputTokens,
      outputTokens,
      estimatedCost,
      timestamp: new Date().toISOString(),
      interviewId: params.interviewId,
      feedbackId: params.feedbackId,
    };

    // Store in Firestore
    await db.collection("api_costs").add(entry);

    // Also update user's total cost
    const userRef = db.collection("users").doc(params.userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const currentCost = (userDoc.data()?.totalApiCost as number) || 0;
      await userRef.update({
        totalApiCost: currentCost + estimatedCost,
        lastApiCall: new Date().toISOString(),
      });
    } else {
      // Create user document if it doesn't exist
      await userRef.set({
        totalApiCost: estimatedCost,
        lastApiCall: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    // Don't fail the request if cost tracking fails
    console.error("Cost tracking error:", error);
  }
}

/**
 * Get user's total API cost
 */
export async function getUserTotalCost(userId: string): Promise<number> {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (userDoc.exists) {
      return (userDoc.data()?.totalApiCost as number) || 0;
    }
    
    return 0;
  } catch (error) {
    console.error("Error fetching user cost:", error);
    return 0;
  }
}

/**
 * Get user's cost breakdown by operation type
 */
export async function getUserCostBreakdown(userId: string): Promise<{
  interviewGeneration: number;
  feedbackGeneration: number;
  total: number;
  callCount: number;
}> {
  try {
    const costs = await db
      .collection("api_costs")
      .where("userId", "==", userId)
      .get();

    let interviewGeneration = 0;
    let feedbackGeneration = 0;

    costs.forEach((doc) => {
      const data = doc.data() as CostTrackingEntry;
      if (data.operation === "interview-generation") {
        interviewGeneration += data.estimatedCost;
      } else if (data.operation === "feedback-generation") {
        feedbackGeneration += data.estimatedCost;
      }
    });

    return {
      interviewGeneration,
      feedbackGeneration,
      total: interviewGeneration + feedbackGeneration,
      callCount: costs.size,
    };
  } catch (error) {
    console.error("Error fetching cost breakdown:", error);
    return {
      interviewGeneration: 0,
      feedbackGeneration: 0,
      total: 0,
      callCount: 0,
    };
  }
}

/**
 * Get system-wide cost statistics (admin only)
 */
export async function getSystemCostStats(): Promise<{
  totalCost: number;
  totalCalls: number;
  averageCostPerCall: number;
  costByOperation: {
    interviewGeneration: number;
    feedbackGeneration: number;
  };
  topUsers: Array<{ userId: string; totalCost: number }>;
}> {
  try {
    const costs = await db.collection("api_costs").get();

    let totalCost = 0;
    let interviewGeneration = 0;
    let feedbackGeneration = 0;
    const userCosts = new Map<string, number>();

    costs.forEach((doc) => {
      const data = doc.data() as CostTrackingEntry;
      totalCost += data.estimatedCost;

      if (data.operation === "interview-generation") {
        interviewGeneration += data.estimatedCost;
      } else if (data.operation === "feedback-generation") {
        feedbackGeneration += data.estimatedCost;
      }

      const currentUserCost = userCosts.get(data.userId) || 0;
      userCosts.set(data.userId, currentUserCost + data.estimatedCost);
    });

    const topUsers = Array.from(userCosts.entries())
      .map(([userId, totalCost]) => ({ userId, totalCost }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

    return {
      totalCost,
      totalCalls: costs.size,
      averageCostPerCall: costs.size > 0 ? totalCost / costs.size : 0,
      costByOperation: {
        interviewGeneration,
        feedbackGeneration,
      },
      topUsers,
    };
  } catch (error) {
    console.error("Error fetching system cost stats:", error);
    return {
      totalCost: 0,
      totalCalls: 0,
      averageCostPerCall: 0,
      costByOperation: {
        interviewGeneration: 0,
        feedbackGeneration: 0,
      },
      topUsers: [],
    };
  }
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(4)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}
