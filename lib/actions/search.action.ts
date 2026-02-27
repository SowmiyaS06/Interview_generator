"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

const IN_QUERY_LIMIT = 10;

const chunkArray = <T>(items: T[], size: number): T[][] => {
  if (!items.length) return [];

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

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
    let query = db.collection("interviews").where("userId", "==", userId) as any;

    if (filters.difficulties && filters.difficulties.length > 0) {
      query = query.where("difficulty", "in", filters.difficulties);
    }

    if (filters.types && filters.types.length > 0) {
      query = query.where("type", "in", filters.types);
    }

    let snapshot;
    try {
      snapshot = await query.orderBy("createdAt", "desc").get();
    } catch (error) {
      const message =
        error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

      if (!message.includes("requires an index") && !message.includes("failed_precondition")) {
        throw error;
      }

      snapshot = await query.get();
    }
    let interviews: Array<{ id: string; createdAt?: string } & Record<string, any>> =
      snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      }));

    interviews.sort((a, b) => {
      const aTime = new Date(String(a.createdAt ?? 0)).getTime();
      const bTime = new Date(String(b.createdAt ?? 0)).getTime();
      return bTime - aTime;
    });

    if (filters.roles && filters.roles.length > 0) {
      interviews = interviews.filter((interview) => filters.roles!.includes(interview.role));
    }

    if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
      const startDate = filters.dateRange.start
        ? new Date(filters.dateRange.start).getTime()
        : 0;
      const endDate = filters.dateRange.end
        ? new Date(filters.dateRange.end).getTime()
        : Date.now();

      interviews = interviews.filter((interview) => {
        const createdAt = interview.createdAt ? new Date(interview.createdAt).getTime() : 0;
        return createdAt >= startDate && createdAt <= endDate;
      });
    }

    if (filters.status && filters.status !== "all") {
      interviews = interviews.filter((interview) => {
        const interviewStatus = String(interview.status || "").toLowerCase();
        const hasFeedback = Boolean(interview.feedbackId || interview.completedAt);
        const normalizedStatus = interviewStatus || (hasFeedback ? "completed" : "in-progress");
        return normalizedStatus === filters.status;
      });
    }

    if (!interviews.length) {
      return { success: true, interviews: [] };
    }

    const interviewIds = interviews.map((interview) => interview.id);
    const feedbackSnapshots = await Promise.all(
      chunkArray(interviewIds, IN_QUERY_LIMIT).map((chunk) =>
        db
          .collection("feedback")
          .where("userId", "==", userId)
          .where("interviewId", "in", chunk)
          .get()
      )
    );

    const feedbackMap = new Map<
      string,
      { totalScore?: number; transcript?: Array<{ content?: string }> }
    >();
    feedbackSnapshots.forEach((feedbackSnapshot) => {
      feedbackSnapshot.docs.forEach((doc) => {
        const data = doc.data() as {
          interviewId?: string;
          totalScore?: number;
          transcript?: Array<{ content?: string }>;
        };
        if (data.interviewId) {
          feedbackMap.set(data.interviewId, {
            totalScore: data.totalScore,
            transcript: data.transcript,
          });
        }
      });
    });

    // Filter by score range
    if (filters.scoreRange) {
      interviews = interviews.filter((interview) => {
        const score = feedbackMap.get(interview.id)?.totalScore;
        if (score === undefined) return false;
        return (
          score >= filters.scoreRange!.min &&
          score <= filters.scoreRange!.max
        );
      });
    }

    // Filter by keywords in transcript (only if keywords provided)
    if (filters.keywords && filters.keywords.length > 0) {
      const keywordSet = new Set(filters.keywords.map((k) => k.toLowerCase()));

      interviews = interviews.filter((interview) => {
        const transcript = (feedbackMap.get(interview.id)?.transcript || [])
          .map((item) => String(item?.content || "").toLowerCase())
          .join(" ");

        if (!transcript) return false;

        return Array.from(keywordSet).some((keyword) => transcript.includes(keyword));
      });
    }

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
    let snapshot;
    try {
      snapshot = await db
        .collection("saved_searches")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .get();
    } catch (error) {
      const message =
        error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

      if (!message.includes("requires an index") && !message.includes("failed_precondition")) {
        throw error;
      }

      snapshot = await db
        .collection("saved_searches")
        .where("userId", "==", userId)
        .get();
    }

    const searches = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{ id: string; createdAt?: string } & Record<string, any>>;

    searches.sort((a, b) => {
      const aTime = new Date(String(a.createdAt ?? 0)).getTime();
      const bTime = new Date(String(b.createdAt ?? 0)).getTime();
      return bTime - aTime;
    });

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
