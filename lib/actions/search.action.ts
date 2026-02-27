"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

export async function searchInterviews(filters: {
  keywords?: string[];
  scoreRange?: { min: number; max: number };
  dateRange?: { start: string; end: string };
  roles?: string[];
  difficulties?: string[];
  types?: string[];
  tags?: string[];
  status?: "completed" | "in-progress" | "all";
}) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    console.log("Search filters received:", filters);
    
    let query = db
      .collection("interviews")
      .where("userId", "==", userId) as any;

    const snapshot = await query.get();
    
    console.log("Total interviews found:", snapshot.size);
    
    if (snapshot.empty) {
      return { success: true, interviews: [] };
    }

    let interviews: Array<{ id: string; createdAt?: string } & Record<string, any>> =
      snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      }));

    console.log("Initial interviews:", interviews.length);

    // Client-side filtering by roles
    if (filters.roles && filters.roles.length > 0) {
      interviews = interviews.filter(i => filters.roles!.includes(i.role));
      console.log("After role filter:", interviews.length);
    }

    // Client-side filtering by difficulties
    if (filters.difficulties && filters.difficulties.length > 0) {
      interviews = interviews.filter(i => filters.difficulties!.includes(i.difficulty));
      console.log("After difficulty filter:", interviews.length);
    }

    // Client-side filtering by types
    if (filters.types && filters.types.length > 0) {
      interviews = interviews.filter(i => filters.types!.includes(i.type));
      console.log("After type filter:", interviews.length);
    }

    // Sort by createdAt client-side (newest first)
    interviews.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Filter by date range
    if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
      const startDate = filters.dateRange.start ? new Date(filters.dateRange.start).getTime() : 0;
      const endDate = filters.dateRange.end ? new Date(filters.dateRange.end).getTime() : Date.now();

      interviews = interviews.filter((interview) => {
        if (!interview.createdAt) return false;
        const interviewDate = new Date(interview.createdAt).getTime();
        return interviewDate >= startDate && interviewDate <= endDate;
      });
      console.log("After date range filter:", interviews.length);
    }

    // Filter by score range (only if feedback exists)
    if (filters.scoreRange && (filters.scoreRange.min > 0 || filters.scoreRange.max < 100)) {
      const feedbackMap = new Map();
      for (const interview of interviews) {
        const feedbackSnap = await db
          .collection("feedback")
          .where("interviewId", "==", interview.id)
          .limit(1)
          .get();

        if (!feedbackSnap.empty) {
          const feedback = feedbackSnap.docs[0].data();
          feedbackMap.set(interview.id, feedback.totalScore || 0);
        }
      }

      interviews = interviews.filter((interview) => {
        const score = feedbackMap.get(interview.id);
        // If no feedback/score, include the interview (don't filter out)
        if (score === undefined) return true;
        return (
          score >= filters.scoreRange!.min &&
          score <= filters.scoreRange!.max
        );
      });
      console.log("After score range filter:", interviews.length);
    }

    // Filter by keywords in transcript (only if keywords provided)
    if (filters.keywords && filters.keywords.length > 0) {
      const keywordSet = new Set(filters.keywords.map((k) => k.toLowerCase()));
      const matchedInterviews: typeof interviews = [];

      for (const interview of interviews) {
        const feedbackSnap = await db
          .collection("feedback")
          .where("interviewId", "==", interview.id)
          .limit(1)
          .get();

        let hasKeyword = false;
        
        if (!feedbackSnap.empty) {
          const feedback = feedbackSnap.docs[0].data();
          const transcript = (feedback.transcript || [])
            .map((t: any) => t.content.toLowerCase())
            .join(" ");

          hasKeyword = Array.from(keywordSet).some((keyword) =>
            transcript.includes(keyword)
          );
        } else {
          // If no transcript, check if keyword matches position or role
          const position = (interview.position || "").toLowerCase();
          const role = (interview.role || "").toLowerCase();
          hasKeyword = Array.from(keywordSet).some((keyword) =>
            position.includes(keyword) || role.includes(keyword)
          );
        }

        if (hasKeyword) {
          matchedInterviews.push(interview);
        }
      }

      interviews = matchedInterviews;
      console.log("After keyword filter:", interviews.length);
    }

    console.log("Final result interviews:", interviews.length);
    return { success: true, interviews };
  } catch (error) {
    console.error("Error searching interviews:", error);
    return { success: false, error: "Failed to search interviews" };
  }
}

export async function saveSearch(
  name: string,
  filters: Record<string, any>
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const searchId = db.collection("saved_searches").doc().id;
    await db.collection("saved_searches").doc(searchId).set({
      userId,
      name,
      filters,
      createdAt: new Date().toISOString(),
    });

    return { success: true, searchId };
  } catch (error) {
    console.error("Error saving search:", error);
    return { success: false, error: "Failed to save search" };
  }
}

export async function getSavedSearches() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const snapshot = await db
      .collection("saved_searches")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const searches = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, searches };
  } catch (error) {
    console.error("Error fetching saved searches:", error);
    return { success: false, error: "Failed to fetch searches" };
  }
}

export async function deleteSavedSearch(searchId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const searchDoc = await db.collection("saved_searches").doc(searchId).get();
    if (!searchDoc.exists) {
      return { success: false, error: "Search not found" };
    }

    const search = searchDoc.data();
    if (!search || search.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await db.collection("saved_searches").doc(searchId).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting saved search:", error);
    return { success: false, error: "Failed to delete search" };
  }
}
