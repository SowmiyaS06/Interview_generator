"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

// ============================================
// 6. COMMUNITY FORUM
// ============================================

export async function createForumPost(
  title: string,
  content: string,
  category: "general" | "dsa" | "system_design" | "behavioral" | "tips",
  tags: string[] = []
) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const postId = db.collection("forum_posts").doc().id;
    await db.collection("forum_posts").doc(postId).set({
      userId,
      title,
      content,
      category,
      tags,
      upvotes: 0,
      voters: [],
      replies: 0,
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true, postId };
  } catch (error) {
    console.error("Error creating post:", error);
    return { success: false, error: "Failed to create post" };
  }
}

export async function getForumPosts(
  category?: string,
  sortBy: "recent" | "popular" | "views" = "recent",
  limit: number = 20
) {
  try {
    let query: any = db.collection("forum_posts");

    if (category) {
      query = query.where("category", "==", category);
    }

    let sortField = "createdAt";
    if (sortBy === "popular") sortField = "upvotes";
    if (sortBy === "views") sortField = "views";

    const snapshot = await query
      .orderBy(sortField, "desc")
      .limit(limit)
      .get();

    const posts = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, posts };
  } catch (error) {
    console.error("Error fetching posts:", error);
    return { success: false, error: "Failed to fetch posts" };
  }
}

export async function replyToPost(postId: string, content: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const replyId = db.collection("forum_replies").doc().id;
    await db.collection("forum_replies").doc(replyId).set({
      postId,
      userId,
      content,
      upvotes: 0,
      voters: [],
      createdAt: new Date().toISOString(),
    });

    // Update reply count
    const post = await db.collection("forum_posts").doc(postId).get();
    if (post.exists) {
      await db
        .collection("forum_posts")
        .doc(postId)
        .update({
          replies: (post.data()?.replies || 0) + 1,
        });
    }

    return { success: true, replyId };
  } catch (error) {
    console.error("Error replying to post:", error);
    return { success: false, error: "Failed to reply" };
  }
}

export async function getForumReplies(postId: string) {
  try {
    const snapshot = await db
      .collection("forum_replies")
      .where("postId", "==", postId)
      .orderBy("createdAt", "asc")
      .get();

    const replies = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, replies };
  } catch (error) {
    console.error("Error fetching replies:", error);
    return { success: false, error: "Failed to fetch replies" };
  }
}

export async function upvotePost(postId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const post = await db.collection("forum_posts").doc(postId).get();
    if (!post.exists) return { success: false, error: "Post not found" };

    const voters = post.data()?.voters || [];
    if (voters.includes(userId)) {
      return { success: false, error: "Already voted" };
    }

    await db
      .collection("forum_posts")
      .doc(postId)
      .update({
        upvotes: (post.data()?.upvotes || 0) + 1,
        voters: [...voters, userId],
      });

    return { success: true };
  } catch (error) {
    console.error("Error upvoting:", error);
    return { success: false, error: "Failed to upvote" };
  }
}

export async function viewPost(postId: string) {
  try {
    const post = await db.collection("forum_posts").doc(postId).get();
    if (post.exists) {
      await db
        .collection("forum_posts")
        .doc(postId)
        .update({
          views: (post.data()?.views || 0) + 1,
        });
    }
    return { success: true };
  } catch (error) {
    console.error("Error updating view count:", error);
    return { success: false, error: "Failed to update view count" };
  }
}

// ============================================
// 7. STUDY PLAN GENERATOR
// ============================================

export async function generateStudyPlan(
  targetRole: string,
  currentLevel: "beginner" | "intermediate" | "advanced",
  timelineWeeks: number,
  focusAreas: string[]
) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const planId = db.collection("study_plans").doc().id;

    // Generate schedule based on timeline
    const schedule = generateWeeklySchedule(targetRole, currentLevel, timelineWeeks, focusAreas);

    await db.collection("study_plans").doc(planId).set({
      userId,
      targetRole,
      currentLevel,
      timelineWeeks,
      focusAreas,
      schedule,
      completedMilestones: 0,
      totalMilestones: schedule.length,
      startDate: new Date().toISOString(),
      targetCompletionDate: new Date(Date.now() + timelineWeeks * 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    return { success: true, planId, schedule };
  } catch (error) {
    console.error("Error generating study plan:", error);
    return { success: false, error: "Failed to generate study plan" };
  }
}

function generateWeeklySchedule(
  targetRole: string,
  level: string,
  weeks: number,
  focusAreas: string[]
) {
  const schedule = [];
  const topicsPerWeek = Math.ceil(focusAreas.length / weeks);

  for (let week = 1; week <= weeks; week++) {
    const weekTopics = focusAreas.slice((week - 1) * topicsPerWeek, week * topicsPerWeek);
    schedule.push({
      week,
      topics: weekTopics,
      targetHours: level === "advanced" ? 8 : level === "intermediate" ? 10 : 12,
      resources: generateResources(targetRole, weekTopics),
      milestone: `Complete ${weekTopics.join(", ")}`,
      completed: false,
    });
  }

  return schedule;
}

function generateResources(role: string, topics: string[]) {
  const resourceMap: { [key: string]: string[] } = {
    "system design": [
      "Design Data Intensive Applications (Book)",
      "System Design Interview YouTube Series",
      "LeetCode System Design Problems",
    ],
    dsa: ["LeetCode 75", "NeetCode 150", "AlgoExpert Videos"],
    behavioral: [
      "STAR Method Guide",
      "Mock Behavioral Interviews",
      "Company Culture Research",
    ],
    "sql/databases": ["SQL Tutorial", "Database Design Course", "Query Optimization"],
  };

  const resources = [];
  for (const topic of topics) {
    const topicLower = topic.toLowerCase();
    if (resourceMap[topicLower]) {
      resources.push(...resourceMap[topicLower]);
    }
  }
  return [...new Set(resources)];
}

export async function getStudyPlan(planId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const doc = await db.collection("study_plans").doc(planId).get();
    if (!doc.exists) return { success: false, error: "Plan not found" };

    const data = doc.data();
    if (data?.userId !== userId) return { success: false, error: "Unauthorized" };

    return { success: true, plan: { id: planId, ...data } };
  } catch (error) {
    console.error("Error fetching study plan:", error);
    return { success: false, error: "Failed to fetch study plan" };
  }
}

export async function completeMilestone(planId: string, week: number) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const doc = await db.collection("study_plans").doc(planId).get();
    if (!doc.exists) return { success: false, error: "Plan not found" };

    const data = doc.data();
    if (data?.userId !== userId) return { success: false, error: "Unauthorized" };

    const schedule = data?.schedule || [];
    const weekIndex = week - 1;

    if (schedule[weekIndex]) {
      schedule[weekIndex].completed = true;

      const completedCount = schedule.filter((w: any) => w.completed).length;

      await db.collection("study_plans").doc(planId).update({
        schedule,
        completedMilestones: completedCount,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error completing milestone:", error);
    return { success: false, error: "Failed to complete milestone" };
  }
}

// ============================================
// 8. PRACTICE CHALLENGES
// ============================================

export async function createChallenge(
  title: string,
  description: string,
  type: "coding" | "behavioral" | "trivia",
  difficulty: "easy" | "medium" | "hard",
  timeLimit: number, // in seconds
  reward: number // XP reward
) {
  try {
    const challengeId = db.collection("challenges").doc().id;
    await db.collection("challenges").doc(challengeId).set({
      title,
      description,
      type,
      difficulty,
      timeLimit,
      reward,
      participantCount: 0,
      completionCount: 0,
      createdAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    return { success: true, challengeId };
  } catch (error) {
    console.error("Error creating challenge:", error);
    return { success: false, error: "Failed to create challenge" };
  }
}

export async function getChallenges(
  type?: string,
  difficulty?: string,
  activeOnly: boolean = true
) {
  try {
    let query: any = db.collection("challenges");

    if (type) {
      query = query.where("type", "==", type);
    }
    if (difficulty) {
      query = query.where("difficulty", "==", difficulty);
    }

    let snapshot = await query.orderBy("createdAt", "desc").get();

    let challenges = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (activeOnly) {
      const now = new Date();
      challenges = challenges.filter((c: any) => new Date(c.endsAt) > now);
    }

    return { success: true, challenges };
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return { success: false, error: "Failed to fetch challenges" };
  }
}

export async function participateInChallenge(challengeId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const participationId = db.collection("challenge_participations").doc().id;
    await db.collection("challenge_participations").doc(participationId).set({
      challengeId,
      userId,
      startedAt: new Date().toISOString(),
      completedAt: null,
      score: 0,
      status: "in_progress",
    });

    // Update challenge participant count
    const challenge = await db.collection("challenges").doc(challengeId).get();
    if (challenge.exists) {
      await db
        .collection("challenges")
        .doc(challengeId)
        .update({
          participantCount: (challenge.data()?.participantCount || 0) + 1,
        });
    }

    return { success: true, participationId };
  } catch (error) {
    console.error("Error participating in challenge:", error);
    return { success: false, error: "Failed to participate" };
  }
}

export async function completeChallenge(participationId: string, score: number) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const doc = await db.collection("challenge_participations").doc(participationId).get();
    if (!doc.exists) return { success: false, error: "Participation not found" };

    const data = doc.data();
    if (data?.userId !== userId) return { success: false, error: "Unauthorized" };

    await db.collection("challenge_participations").doc(participationId).update({
      completedAt: new Date().toISOString(),
      score,
      status: "completed",
    });

    // Update challenge completion count
    const challenge = await db.collection("challenges").doc(data.challengeId).get();
    if (challenge.exists) {
      await db
        .collection("challenges")
        .doc(data.challengeId)
        .update({
          completionCount: (challenge.data()?.completionCount || 0) + 1,
        });
    }

    return { success: true };
  } catch (error) {
    console.error("Error completing challenge:", error);
    return { success: false, error: "Failed to complete challenge" };
  }
}

export async function getChallengeLeaderboard(challengeId: string, limit: number = 10) {
  try {
    const snapshot = await db
      .collection("challenge_participations")
      .where("challengeId", "==", challengeId)
      .where("status", "==", "completed")
      .orderBy("score", "desc")
      .limit(limit)
      .get();

    const leaderboard = snapshot.docs.map((doc, index) => ({
      rank: index + 1,
      ...doc.data(),
    }));

    return { success: true, leaderboard };
  } catch (error) {
    console.error("Error fetching challenge leaderboard:", error);
    return { success: false, error: "Failed to fetch leaderboard" };
  }
}
