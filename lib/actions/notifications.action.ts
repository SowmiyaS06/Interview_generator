"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

export async function createNotification(
  userId: string,
  type: "reminder" | "milestone" | "alert" | "announcement" | "achievement",
  title: string,
  message: string,
  actionUrl?: string
) {
  try {
    const notifId = db.collection("notifications").doc().id;
    await db.collection("notifications").doc(notifId).set({
      userId,
      type,
      title,
      message,
      actionUrl,
      read: false,
      createdAt: new Date().toISOString(),
    });

    return { success: true, notifId };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error: "Failed to create notification" };
  }
}

export async function getNotifications(unreadOnly: boolean = false) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    let query = db
      .collection("notifications")
      .where("userId", "==", userId) as any;

    if (unreadOnly) {
      query = query.where("read", "==", false);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();

    const notifications = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, notifications };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { success: false, error: "Failed to fetch notifications" };
  }
}

export async function markNotificationAsRead(notifId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const notifDoc = await db.collection("notifications").doc(notifId).get();
    if (!notifDoc.exists) {
      return { success: false, error: "Notification not found" };
    }

    const notif = notifDoc.data();
    if (!notif || notif.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await db.collection("notifications").doc(notifId).update({
      read: true,
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: "Failed to mark as read" };
  }
}

export async function setNotificationPreferences(preferences: {
  emailReminders: boolean;
  performanceAlerts: boolean;
  weeklyReports: boolean;
  announcements: boolean;
  achievementNotifications: boolean;
}) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db.collection("notification_preferences").doc(userId).set({
      userId,
      ...preferences,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error setting preferences:", error);
    return { success: false, error: "Failed to set preferences" };
  }
}

export async function getNotificationPreferences() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const prefDoc = await db
      .collection("notification_preferences")
      .doc(userId)
      .get();

    const preferences = prefDoc.exists
      ? prefDoc.data()
      : {
          emailReminders: true,
          performanceAlerts: true,
          weeklyReports: false,
          announcements: true,
          achievementNotifications: true,
        };

    return { success: true, preferences };
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return { success: false, error: "Failed to fetch preferences" };
  }
}
