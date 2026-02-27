"use server";

import { db } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getCacheStats } from "@/lib/question-cache";
import { getSystemCostStats } from "@/lib/cost-tracking";

const isAdminUser = (email?: string | null) => {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || "";
  const allowed = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.toLowerCase());
};

export async function getAdminOverview() {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user.email)) {
    return { authorized: false } as const;
  }

  const [usersSnapshot, interviewsSnapshot, feedbackSnapshot, cacheStats, costStats] =
    await Promise.all([
      db.collection("users").get(),
      db.collection("interviews").get(),
      db.collection("feedback").get(),
      getCacheStats(),
      getSystemCostStats(),
    ]);

  // Build user details with stats
  const userDetails = await Promise.all(
    usersSnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Get user's interviews and feedbacks
      const [userInterviews, userFeedbacks] = await Promise.all([
        db.collection("interviews").where("userId", "==", userId).get(),
        db.collection("feedback").where("userId", "==", userId).get(),
      ]);

      // Calculate average score from feedbacks
      const feedbacksData = userFeedbacks.docs.map(
        (doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data()
      );
      const totalScore = feedbacksData.reduce((sum, fb) => sum + (fb.totalScore || 0), 0);
      const averageScore = feedbacksData.length > 0 ? totalScore / feedbacksData.length : 0;

      // Get last activity (most recent interview or feedback)
      const lastInterview = userInterviews.docs.length > 0 
        ? userInterviews.docs[0].data().createdAt 
        : null;
      const lastFeedback = userFeedbacks.docs.length > 0 
        ? userFeedbacks.docs[0].data().createdAt 
        : null;
      
      const lastActivity = [lastInterview, lastFeedback]
        .filter(Boolean)
        .sort()
        .pop() || userData.createdAt || null;

      return {
        id: userId,
        name: userData.name || "N/A",
        email: userData.email || "N/A",
        profileUrl: userData.profileUrl || null,
        resumeUrl: userData.resumeUrl || null,
        joinedAt: userData.createdAt || null,
        lastActivity,
        stats: {
          interviewCount: userInterviews.size,
          feedbackCount: userFeedbacks.size,
          averageScore: averageScore,
        },
      };
    })
  );

  // Sort by most recent activity
  userDetails.sort((a, b) => {
    if (!a.lastActivity) return 1;
    if (!b.lastActivity) return -1;
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });

  const hitRate = cacheStats.totalEntries
    ? (cacheStats.totalHits / cacheStats.totalEntries) * 100
    : 0;

  return {
    authorized: true as const,
    counts: {
      users: usersSnapshot.size,
      interviews: interviewsSnapshot.size,
      feedbacks: feedbackSnapshot.size,
    },
    users: userDetails,
    cache: {
      ...cacheStats,
      validEntries: cacheStats.totalEntries,
      expiredEntries: 0,
      hitRate,
    },
    costs: costStats,
  };
}
