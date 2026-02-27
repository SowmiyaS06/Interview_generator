"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

export async function addInterviewNote(
  interviewId: string,
  content: string,
  type: "general" | "strength" | "improvement" | "question",
  questionIndex?: number,
  timestamp?: string
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const noteId = db.collection("interview_notes").doc().id;
    await db.collection("interview_notes").doc(noteId).set({
      interviewId,
      userId,
      content,
      type,
      questionIndex,
      timestamp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true, noteId };
  } catch (error) {
    console.error("Error adding note:", error);
    return { success: false, error: "Failed to add note" };
  }
}

export async function getInterviewNotes(interviewId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const notesSnapshot = await db
      .collection("interview_notes")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const notes = notesSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, notes };
  } catch (error) {
    console.error("Error fetching notes:", error);
    return { success: false, error: "Failed to fetch notes" };
  }
}

export async function deleteNote(noteId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const noteDoc = await db.collection("interview_notes").doc(noteId).get();
    if (!noteDoc.exists) {
      return { success: false, error: "Note not found" };
    }

    const note = noteDoc.data();
    if (!note) {
      return { success: false, error: "Invalid note data" };
    }
    if (note.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await db.collection("interview_notes").doc(noteId).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting note:", error);
    return { success: false, error: "Failed to delete note" };
  }
}

export async function addBookmark(
  interviewId: string,
  questionIndex: number,
  question: string,
  reason: string,
  priority: "low" | "medium" | "high" = "medium"
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const bookmarkId = db.collection("interview_bookmarks").doc().id;
    await db.collection("interview_bookmarks").doc(bookmarkId).set({
      interviewId,
      userId,
      questionIndex,
      question,
      reason,
      priority,
      createdAt: new Date().toISOString(),
    });

    return { success: true, bookmarkId };
  } catch (error) {
    console.error("Error adding bookmark:", error);
    return { success: false, error: "Failed to add bookmark" };
  }
}

export async function getInterviewBookmarks(interviewId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const bookmarksSnapshot = await db
      .collection("interview_bookmarks")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .orderBy("priority", "desc")
      .get();

    const bookmarks = bookmarksSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, bookmarks };
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return { success: false, error: "Failed to fetch bookmarks" };
  }
}

export async function removeBookmark(bookmarkId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const bookmarkDoc = await db.collection("interview_bookmarks").doc(bookmarkId).get();
    if (!bookmarkDoc.exists) {
      return { success: false, error: "Bookmark not found" };
    }

    const bookmark = bookmarkDoc.data();
    if (!bookmark) {
      return { success: false, error: "Invalid bookmark data" };
    }
    if (bookmark.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await db.collection("interview_bookmarks").doc(bookmarkId).delete();
    return { success: true };
  } catch (error) {
    console.error("Error removing bookmark:", error);
    return { success: false, error: "Failed to remove bookmark" };
  }
}

export async function addTag(interviewId: string, tagName: string, color: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const tagId = db.collection("interview_tags").doc().id;
    await db.collection("interview_tags").doc(tagId).set({
      interviewId,
      userId,
      name: tagName,
      color,
      createdAt: new Date().toISOString(),
    });

    return { success: true, tagId };
  } catch (error) {
    console.error("Error adding tag:", error);
    return { success: false, error: "Failed to add tag" };
  }
}

export async function getInterviewTags(interviewId: string) {
  try {
    const tagsSnapshot = await db
      .collection("interview_tags")
      .where("interviewId", "==", interviewId)
      .get();

    const tags = tagsSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, tags };
  } catch (error) {
    console.error("Error fetching tags:", error);
    return { success: false, error: "Failed to fetch tags" };
  }
}

export async function removeTag(tagId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const tagDoc = await db.collection("interview_tags").doc(tagId).get();
    if (!tagDoc.exists) {
      return { success: false, error: "Tag not found" };
    }

    const tag = tagDoc.data();
    if (!tag || tag.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await db.collection("interview_tags").doc(tagId).delete();
    return { success: true };
  } catch (error) {
    console.error("Error removing tag:", error);
    return { success: false, error: "Failed to remove tag" };
  }
}
