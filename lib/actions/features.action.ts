"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

// ============================================
// 1. COMPANY Q&A DATABASE
// ============================================

export async function submitCompanyQuestion(
  companyName: string,
  role: string,
  question: string,
  difficulty: "easy" | "medium" | "hard",
  category: string
) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const docId = db.collection("company_questions").doc().id;
    await db.collection("company_questions").doc(docId).set({
      userId,
      companyName,
      role,
      question,
      difficulty,
      category,
      upvotes: 0,
      voters: [],
      createdAt: new Date().toISOString(),
    });
    return { success: true, questionId: docId };
  } catch (error) {
    console.error("Error submitting question:", error);
    return { success: false, error: "Failed to submit question" };
  }
}

export async function getCompanyQuestions(companyName?: string, role?: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    let query: any = db.collection("company_questions");

    if (companyName) {
      query = query.where("companyName", "==", companyName);
    }
    if (role) {
      query = query.where("role", "==", role);
    }

    const snapshot = await query.orderBy("upvotes", "desc").get();
    const questions = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, questions };
  } catch (error) {
    console.error("Error fetching questions:", error);
    return { success: false, error: "Failed to fetch questions" };
  }
}

export async function upvoteQuestion(questionId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const doc = await db.collection("company_questions").doc(questionId).get();
    if (!doc.exists) return { success: false, error: "Question not found" };

    const data = doc.data();
    const voters = data?.voters || [];

    if (voters.includes(userId)) {
      return { success: false, error: "Already voted" };
    }

    await db
      .collection("company_questions")
      .doc(questionId)
      .update({
        upvotes: (data?.upvotes || 0) + 1,
        voters: [...voters, userId],
      });

    return { success: true };
  } catch (error) {
    console.error("Error upvoting:", error);
    return { success: false, error: "Failed to upvote" };
  }
}

// ============================================
// 2. GAMIFICATION FEATURES
// ============================================

export async function getUserGamificationProfile(userId?: string) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { success: false, error: "Unauthorized" };

  const targetUserId = userId || currentUserId;

  try {
    const doc = await db.collection("user_gamification").doc(targetUserId).get();
    if (!doc.exists) {
      // Initialize new profile
      const initialData = {
        userId: targetUserId,
        level: 1,
        totalXP: 0,
        currentXP: 0,
        xpPerLevel: 500,
        streak: 0,
        lastPracticeDate: null,
        badges: [],
        achievements: [],
        totalSessionsCompleted: 0,
        totalInterviewsCompleted: 0,
        leaderboardRank: 0,
      };
      await db.collection("user_gamification").doc(targetUserId).set(initialData);
      return { success: true, profile: initialData };
    }

    return { success: true, profile: doc.data() };
  } catch (error) {
    console.error("Error fetching gamification profile:", error);
    return { success: false, error: "Failed to fetch profile" };
  }
}

export async function addXP(amount: number, reason: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const profileResult = await getUserGamificationProfile(userId);
    if (!profileResult.success) return profileResult;

    const profile = profileResult.profile as any;
    const newXP = profile.currentXP + amount;
    const newLevel = profile.level + Math.floor(newXP / profile.xpPerLevel);
    const newCurrentXP = newXP % profile.xpPerLevel;

    const updates: any = {
      currentXP: newCurrentXP,
      totalXP: profile.totalXP + amount,
    };

    if (newLevel > profile.level) {
      updates.level = newLevel;
    }

    await db.collection("user_gamification").doc(userId).update(updates);

    // Log XP gain
    await db.collection("xp_logs").add({
      userId,
      amount,
      reason,
      newLevel,
      timestamp: new Date().toISOString(),
    });

    return { success: true, newLevel, newXP: newCurrentXP };
  } catch (error) {
    console.error("Error adding XP:", error);
    return { success: false, error: "Failed to add XP" };
  }
}

export async function awardBadge(badgeName: string, description: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const profileResult = await getUserGamificationProfile(userId);
    if (!profileResult.success) return profileResult;

    const profile = profileResult.profile as any;
    const badges = profile.badges || [];

    if (badges.find((b: any) => b.name === badgeName)) {
      return { success: false, error: "Badge already earned" };
    }

    badges.push({
      name: badgeName,
      description,
      earnedAt: new Date().toISOString(),
    });

    await db.collection("user_gamification").doc(userId).update({ badges });

    // Award XP for badge
    await addXP(50, `Earned badge: ${badgeName}`);

    return { success: true, badge: badgeName };
  } catch (error) {
    console.error("Error awarding badge:", error);
    return { success: false, error: "Failed to award badge" };
  }
}

export async function updateStreak() {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const profileResult = await getUserGamificationProfile(userId);
    if (!profileResult.success) return profileResult;

    const profile = profileResult.profile as any;
    const lastDate = profile.lastPracticeDate ? new Date(profile.lastPracticeDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStreak = profile.streak || 0;

    if (lastDate) {
      lastDate.setHours(0, 0, 0, 0);
      const dayDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        newStreak += 1;
      } else if (dayDiff > 1) {
        newStreak = 1; // Reset if gap > 1 day
      } else {
        return { success: true, streak: newStreak }; // Same day
      }
    } else {
      newStreak = 1;
    }

    await db.collection("user_gamification").doc(userId).update({
      streak: newStreak,
      lastPracticeDate: today.toISOString(),
    });

    // Award milestone badges
    if (newStreak === 7) {
      await awardBadge("Week Warrior", "Maintained a 7-day practice streak");
    } else if (newStreak === 30) {
      await awardBadge("Monthly Master", "Maintained a 30-day practice streak");
    }

    return { success: true, streak: newStreak };
  } catch (error) {
    console.error("Error updating streak:", error);
    return { success: false, error: "Failed to update streak" };
  }
}

export async function getLeaderboard(limit: number = 50) {
  try {
    const snapshot = await db
      .collection("user_gamification")
      .orderBy("totalXP", "desc")
      .limit(limit)
      .get();

    const leaderboard = snapshot.docs.map((doc, index) => ({
      rank: index + 1,
      ...doc.data(),
    }));

    return { success: true, leaderboard };
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return { success: false, error: "Failed to fetch leaderboard" };
  }
}

// ============================================
// 3. FLASHCARDS SYSTEM
// ============================================

export async function createFlashcard(
  front: string,
  back: string,
  category: string,
  source: "auto_generated" | "user_created" | "interview_question"
) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const docId = db.collection("flashcards").doc().id;
    await db.collection("flashcards").doc(docId).set({
      userId,
      front,
      back,
      category,
      source,
      difficulty: "medium",
      reviewCount: 0,
      correctCount: 0,
      lastReviewDate: null,
      nextReviewDate: new Date().toISOString(),
      easeFactor: 2.5,
      interval: 1,
      createdAt: new Date().toISOString(),
    });

    await addXP(5, "Created flashcard");
    return { success: true, cardId: docId };
  } catch (error) {
    console.error("Error creating flashcard:", error);
    return { success: false, error: "Failed to create flashcard" };
  }
}

export async function getFlashcards(category?: string, dueOnly: boolean = false) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    let query: any = db.collection("flashcards").where("userId", "==", userId);

    if (category) {
      query = query.where("category", "==", category);
    }

    const snapshot = await query.get();
    let cards = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (dueOnly) {
      const now = new Date();
      cards = cards.filter((card: any) => new Date(card.nextReviewDate) <= now);
    }

    return { success: true, cards };
  } catch (error) {
    console.error("Error fetching flashcards:", error);
    return { success: false, error: "Failed to fetch flashcards" };
  }
}

export async function reviewFlashcard(cardId: string, correct: boolean) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const doc = await db.collection("flashcards").doc(cardId).get();
    if (!doc.exists) return { success: false, error: "Card not found" };

    const card = doc.data() as any;

    // SM-2 algorithm for spaced repetition
    let easeFactor = card.easeFactor;
    let interval = card.interval;

    if (correct) {
      if (card.reviewCount === 0) {
        interval = 1;
      } else if (card.reviewCount === 1) {
        interval = 3;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      easeFactor = Math.max(1.3, easeFactor + (5 - 0) * (0.1 - (5 - 0) * (0.08 - (5 - 0) * 0.02)));
    } else {
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      interval = 1;
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    await db.collection("flashcards").doc(cardId).update({
      reviewCount: card.reviewCount + 1,
      correctCount: correct ? card.correctCount + 1 : card.correctCount,
      easeFactor,
      interval,
      lastReviewDate: new Date().toISOString(),
      nextReviewDate: nextReviewDate.toISOString(),
    });

    if (correct) {
      await addXP(2, "Reviewed flashcard correctly");
    }

    return { success: true };
  } catch (error) {
    console.error("Error reviewing flashcard:", error);
    return { success: false, error: "Failed to review flashcard" };
  }
}

// ============================================
// 4. COMPANY DATABASE
// ============================================

export async function submitCompanyProfile(
  companyName: string,
  interviewProcess: string,
  cultureFit: string,
  salaryRange: { min: number; max: number },
  averageDifficulty: "easy" | "medium" | "hard"
) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const normalizedName = companyName.toLowerCase().trim();
    const query = await db
      .collection("companies")
      .where("nameLower", "==", normalizedName)
      .limit(1)
      .get();

    if (!query.empty) {
      // Update existing
      const docId = query.docs[0].id;
      await db.collection("companies").doc(docId).update({
        interviewProcess,
        cultureFit,
        salaryRange,
        averageDifficulty,
        updatedAt: new Date().toISOString(),
      });
      return { success: true, companyId: docId, isNew: false };
    } else {
      // Create new
      const docId = db.collection("companies").doc().id;
      await db.collection("companies").doc(docId).set({
        name: companyName,
        nameLower: normalizedName,
        interviewProcess,
        cultureFit,
        salaryRange,
        averageDifficulty,
        upvotes: 0,
        voters: [userId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return { success: true, companyId: docId, isNew: true };
    }
  } catch (error) {
    console.error("Error submitting company profile:", error);
    return { success: false, error: "Failed to submit company profile" };
  }
}

export async function getCompanies() {
  try {
    const snapshot = await db
      .collection("companies")
      .orderBy("upvotes", "desc")
      .get();

    const companies = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, companies };
  } catch (error) {
    console.error("Error fetching companies:", error);
    return { success: false, error: "Failed to fetch companies" };
  }
}

export async function getCompanyDetails(companyName: string) {
  try {
    const snapshot = await db
      .collection("companies")
      .where("nameLower", "==", companyName.toLowerCase().trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: false, error: "Company not found" };
    }

    return { success: true, company: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } };
  } catch (error) {
    console.error("Error fetching company:", error);
    return { success: false, error: "Failed to fetch company" };
  }
}

// ============================================
// 5. FLASHCARD AUTO-GENERATION (from interviews)
// ============================================

export async function autoGenerateFlashcards(interviewId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const interview = await db.collection("interview_sessions").doc(interviewId).get();
    if (!interview.exists) {
      return { success: false, error: "Interview not found" };
    }

    const data = interview.data() as any;
    if (data.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Extract Q&A pairs from transcript
    const transcript = data.transcript || [];
    const flashcardCount = await Promise.all(
      transcript
        .filter((item: any) => item.role === "user")
        .slice(0, 10)
        .map(async (item: any) => {
          const cardId = await createFlashcard(
            `Interview Q: How would you approach this?`,
            item.content,
            "interview_prep",
            "auto_generated"
          );
          return cardId;
        })
    );

    return { success: true, cardsCreated: flashcardCount.length };
  } catch (error) {
    console.error("Error auto-generating flashcards:", error);
    return { success: false, error: "Failed to generate flashcards" };
  }
}
