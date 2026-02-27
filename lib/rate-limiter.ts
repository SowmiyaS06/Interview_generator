/**
 * Simple in-memory rate limiter using sliding window algorithm
 * For production, consider using Redis or similar distributed cache
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  /**
   * Check if the request is within rate limits
   * @param key - Unique identifier (e.g., userId or IP)
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with success status and remaining requests
   */
  check(
    key: string,
    limit: number,
    windowMs: number
  ): {
    success: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const entry = this.store.get(key);

    // No entry or expired - create new
    if (!entry || now >= entry.resetAt) {
      const resetAt = now + windowMs;
      this.store.set(key, { count: 1, resetAt });
      return {
        success: true,
        remaining: limit - 1,
        resetAt,
      };
    }

    // Within window - check limit
    if (entry.count >= limit) {
      return {
        success: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);

    return {
      success: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Get current usage for a key
   */
  getUsage(key: string): { count: number; resetAt: number } | null {
    const entry = this.store.get(key);
    if (!entry || Date.now() >= entry.resetAt) {
      return null;
    }
    return { count: entry.count, resetAt: entry.resetAt };
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear cleanup interval (for testing or shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

// Rate limit configurations
export const RATE_LIMITS = {
  // Interview generation (expensive OpenRouter calls)
  INTERVIEW_GENERATION: {
    limit: 10, // 10 interviews per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Feedback generation
  FEEDBACK_GENERATION: {
    limit: 20, // 20 feedback requests per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // API endpoints (general)
  API_GENERAL: {
    limit: 100, // 100 requests per 15 minutes
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
} as const;

/**
 * Check rate limit for interview generation
 */
export function checkInterviewRateLimit(userId: string) {
  const key = `interview:${userId}`;
  return rateLimiter.check(
    key,
    RATE_LIMITS.INTERVIEW_GENERATION.limit,
    RATE_LIMITS.INTERVIEW_GENERATION.windowMs
  );
}

/**
 * Check rate limit for feedback generation
 */
export function checkFeedbackRateLimit(userId: string) {
  const key = `feedback:${userId}`;
  return rateLimiter.check(
    key,
    RATE_LIMITS.FEEDBACK_GENERATION.limit,
    RATE_LIMITS.FEEDBACK_GENERATION.windowMs
  );
}

/**
 * Check rate limit for general API calls
 */
export function checkApiRateLimit(identifier: string) {
  const key = `api:${identifier}`;
  return rateLimiter.check(
    key,
    RATE_LIMITS.API_GENERAL.limit,
    RATE_LIMITS.API_GENERAL.windowMs
  );
}

/**
 * Get usage statistics for a user
 */
export function getRateLimitUsage(userId: string) {
  return {
    interview: rateLimiter.getUsage(`interview:${userId}`),
    feedback: rateLimiter.getUsage(`feedback:${userId}`),
  };
}

/**
 * Reset rate limits for a user (admin only)
 */
export function resetUserRateLimit(userId: string) {
  rateLimiter.reset(`interview:${userId}`);
  rateLimiter.reset(`feedback:${userId}`);
  rateLimiter.reset(`api:${userId}`);
}

export default rateLimiter;
