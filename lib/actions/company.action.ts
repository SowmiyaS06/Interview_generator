"use server";

import { db } from "@/firebase/admin";
import { getCurrentUserId } from "./auth.action";

export async function createCompanyProfile(
  name: string,
  industry: string,
  size: string,
  website?: string,
  logo?: string
) {
  try {
    const companyId = db.collection("company_profiles").doc().id;
    await db.collection("company_profiles").doc(companyId).set({
      name,
      industry,
      size,
      website,
      logo,
      interviewStyle: "Not provided",
      commonQuestions: [],
      interviewProcess: [],
      culture: {
        values: [],
        teamSize: size,
        workEnvironment: "Not provided",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true, companyId };
  } catch (error) {
    console.error("Error creating company profile:", error);
    return { success: false, error: "Failed to create company profile" };
  }
}

export async function getCompanyProfile(companyId: string) {
  try {
    const companyDoc = await db.collection("company_profiles").doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: "Company not found" };
    }

    const company = companyDoc.data();
    return { success: true, company };
  } catch (error) {
    console.error("Error fetching company profile:", error);
    return { success: false, error: "Failed to fetch company profile" };
  }
}

export async function recordCompanyInterview(
  companyId: string,
  position: string,
  stage: string,
  status: string,
  feedback?: string
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const companyInterviewId = db.collection("company_interviews").doc().id;
    await db.collection("company_interviews").doc(companyInterviewId).set({
      userId,
      companyId,
      position,
      stage,
      status,
      feedback,
      createdAt: new Date().toISOString(),
    });

    return { success: true, companyInterviewId };
  } catch (error) {
    console.error("Error recording company interview:", error);
    return { success: false, error: "Failed to record interview" };
  }
}

export async function getUserCompanyInterviews() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const snapshot = await db
      .collection("company_interviews")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const interviews = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, interviews };
  } catch (error) {
    console.error("Error fetching company interviews:", error);
    return { success: false, error: "Failed to fetch interviews" };
  }
}
