/**
 * Caching system for interview questions
 * Reduces API costs by caching frequently requested interview patterns
 */

import { db } from "@/firebase/admin";

export interface QuestionCacheEntry {
  role: string;
  level: string;
  techstack: string[];
  type: string;
  amount: number;
  questions: string[];
  createdAt: string;
  usageCount: number;
  lastUsed: string;
}

/**
 * Generate a cache key from interview parameters
 */
function generateCacheKey(params: {
  role: string;
  level: string;
  techstack: string[];
  type: string;
  amount: number;
}): string {
  const normalizedRole = params.role.trim().toLowerCase();
  const normalizedLevel = params.level.trim().toLowerCase();
  const normalizedType = params.type.trim().toLowerCase();
  const normalizedTechstack = params.techstack
    .map((tech) => tech.trim().toLowerCase())
    .sort()
    .join(",");

  return `${normalizedRole}|${normalizedLevel}|${normalizedType}|${normalizedTechstack}|${params.amount}`;
}

/**
 * Get cached questions if available
 * Returns null if no cache hit
 */
export async function getCachedQuestions(params: {
  role: string;
  level: string;
  techstack: string[];
  type: string;
  amount: number;
}): Promise<string[] | null> {
  try {
    const cacheKey = generateCacheKey(params);

    const cacheDoc = await db.collection("question_cache").doc(cacheKey).get();

    if (!cacheDoc.exists) {
      return null;
    }

    const cacheData = cacheDoc.data() as QuestionCacheEntry;

    // Cache entries older than 30 days are considered stale
    const cacheAge = Date.now() - new Date(cacheData.createdAt).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    if (cacheAge > thirtyDaysMs) {
      // Delete stale cache
      await db.collection("question_cache").doc(cacheKey).delete();
      return null;
    }

    // Update usage stats
    await db.collection("question_cache").doc(cacheKey).update({
      usageCount: cacheData.usageCount + 1,
      lastUsed: new Date().toISOString(),
    });

    console.log(`[CACHE HIT] ${cacheKey} (used ${cacheData.usageCount + 1} times)`);

    return cacheData.questions;
  } catch (error) {
    console.error("Error reading cache:", error);
    return null;
  }
}

/**
 * Store generated questions in cache
 */
export async function cacheQuestions(
  params: {
    role: string;
    level: string;
    techstack: string[];
    type: string;
    amount: number;
  },
  questions: string[]
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(params);

    const entry: QuestionCacheEntry = {
      role: params.role,
      level: params.level,
      techstack: params.techstack,
      type: params.type,
      amount: params.amount,
      questions,
      createdAt: new Date().toISOString(),
      usageCount: 1,
      lastUsed: new Date().toISOString(),
    };

    await db.collection("question_cache").doc(cacheKey).set(entry);

    console.log(`[CACHE WRITE] ${cacheKey}`);
  } catch (error) {
    console.error("Error writing cache:", error);
    // Don't fail the request if caching fails
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalHits: number;
  topCachedPatterns: Array<{
    role: string;
    level: string;
    techstack: string[];
    type: string;
    usageCount: number;
  }>;
}> {
  try {
    const cacheEntries = await db.collection("question_cache").get();

    let totalHits = 0;
    const patterns: Array<{
      role: string;
      level: string;
      techstack: string[];
      type: string;
      usageCount: number;
    }> = [];

    cacheEntries.forEach((doc) => {
      const data = doc.data() as QuestionCacheEntry;
      totalHits += data.usageCount;
      patterns.push({
        role: data.role,
        level: data.level,
        techstack: data.techstack,
        type: data.type,
        usageCount: data.usageCount,
      });
    });

    // Sort by usage count
    patterns.sort((a, b) => b.usageCount - a.usageCount);

    return {
      totalEntries: cacheEntries.size,
      totalHits,
      topCachedPatterns: patterns.slice(0, 10),
    };
  } catch (error) {
    console.error("Error fetching cache stats:", error);
    return {
      totalEntries: 0,
      totalHits: 0,
      topCachedPatterns: [],
    };
  }
}

/**
 * Clear old cache entries (admin utility)
 * Removes entries older than specified days
 */
export async function clearOldCache(daysOld: number = 30): Promise<number> {
  try {
    const cacheEntries = await db.collection("question_cache").get();

    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    const batch = db.batch();

    cacheEntries.forEach((doc) => {
      const data = doc.data() as QuestionCacheEntry;
      const cacheAge = new Date(data.createdAt).getTime();

      if (cacheAge < cutoffTime) {
        batch.delete(doc.ref);
        deletedCount++;
      }
    });

    await batch.commit();

    console.log(`[CACHE CLEANUP] Deleted ${deletedCount} old entries`);

    return deletedCount;
  } catch (error) {
    console.error("Error clearing cache:", error);
    return 0;
  }
}
