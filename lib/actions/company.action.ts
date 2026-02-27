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
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const companyId = db.collection("company_profiles").doc().id;
    await db.collection("company_profiles").doc(companyId).set({
      userId,
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
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const companyDoc = await db.collection("company_profiles").doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: "Company not found" };
    }

    const company = companyDoc.data();
    if (!company || company.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

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
    const companyDoc = await db.collection("company_profiles").doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: "Company not found" };
    }

    const company = companyDoc.data();
    if (!company || company.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

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
    const interviewSnapshot = await db
      .collection("company_interviews")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const rawInterviews = interviewSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{
      id: string;
      companyId: string;
      position: string;
      stage: string;
      status: string;
      feedback?: string;
      createdAt: string;
    }>;

    if (!rawInterviews.length) {
      return { success: true, interviews: [] };
    }

    const companyIds = Array.from(new Set(rawInterviews.map((entry) => entry.companyId)));
    const companyDocs = await Promise.all(
      companyIds.map((companyId) => db.collection("company_profiles").doc(companyId).get())
    );

    const companyMap = new Map(
      companyDocs
        .filter((doc) => doc.exists)
        .map((doc) => [doc.id, doc.data() as Record<string, unknown>])
    );

    const groupedMap = new Map<
      string,
      {
        id: string;
        companyName: string;
        interviewStyle: string;
        industry: string;
        size: string;
        website?: string;
        interviews: Array<{
          id: string;
          position: string;
          stage: string;
          status: string;
          feedback?: string;
          createdAt: string;
        }>;
      }
    >();

    for (const interview of rawInterviews) {
      const companyData = companyMap.get(interview.companyId);
      if (!companyData) continue;
      if (String(companyData.userId ?? "") !== userId) continue;

      if (!groupedMap.has(interview.companyId)) {
        groupedMap.set(interview.companyId, {
          id: interview.companyId,
          companyName: String(companyData.name ?? "Unknown Company"),
          interviewStyle: String(companyData.interviewStyle ?? "Not provided"),
          industry: String(companyData.industry ?? ""),
          size: String(companyData.size ?? ""),
          website: companyData.website ? String(companyData.website) : undefined,
          interviews: [],
        });
      }

      groupedMap.get(interview.companyId)!.interviews.push({
        id: interview.id,
        position: interview.position,
        stage: interview.stage,
        status: interview.status,
        feedback: interview.feedback,
        createdAt: interview.createdAt,
      });
    }

    const interviews = Array.from(groupedMap.values()).sort((a, b) => {
      const aLatest = a.interviews[0]?.createdAt ?? "";
      const bLatest = b.interviews[0]?.createdAt ?? "";
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });

    return { success: true, interviews };
  } catch (error) {
    console.error("Error fetching company interviews:", error);
    return { success: false, error: "Failed to fetch interviews" };
  }
}
