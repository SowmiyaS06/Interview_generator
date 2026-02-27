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
    const companyData = {
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
    };

    const sanitizedCompanyData = Object.fromEntries(
      Object.entries(companyData).filter(([, value]) => value !== undefined)
    );

    await db.collection("company_profiles").doc(companyId).set(sanitizedCompanyData);

    return { success: true, companyId };
  } catch (error) {
    console.error("Error creating company profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create company profile",
    };
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
    const interviewData = {
      userId,
      companyId,
      position,
      stage,
      status,
      feedback,
      createdAt: new Date().toISOString(),
    };

    const sanitizedInterviewData = Object.fromEntries(
      Object.entries(interviewData).filter(([, value]) => value !== undefined)
    );

    await db.collection("company_interviews").doc(companyInterviewId).set(sanitizedInterviewData);

    return { success: true, companyInterviewId };
  } catch (error) {
    console.error("Error recording company interview:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record interview",
    };
  }
}

export async function getUserCompanyInterviews() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const companiesSnapshot = await db
      .collection("company_profiles")
      .where("userId", "==", userId)
      .get();

    const interviewSnapshot = await db
      .collection("company_interviews")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const companies = companiesSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>),
    })) as Array<{
      id: string;
      userId: string;
      name?: string;
      interviewStyle?: string;
      industry?: string;
      size?: string;
      website?: string;
      createdAt?: string;
    }>;

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

    if (!companies.length) {
      return { success: true, interviews: [] };
    }

    const interviewsByCompany = new Map<
      string,
      Array<{
        id: string;
        position: string;
        stage: string;
        status: string;
        feedback?: string;
        createdAt: string;
      }>
    >();

    for (const interview of rawInterviews) {
      if (!interviewsByCompany.has(interview.companyId)) {
        interviewsByCompany.set(interview.companyId, []);
      }
      interviewsByCompany.get(interview.companyId)!.push({
        id: interview.id,
        position: interview.position,
        stage: interview.stage,
        status: interview.status,
        feedback: interview.feedback,
        createdAt: interview.createdAt,
      });
    }

    const interviews = companies
      .map((company) => ({
        id: company.id,
        companyName: String(company.name ?? "Unknown Company"),
        interviewStyle: String(company.interviewStyle ?? "Not provided"),
        industry: String(company.industry ?? ""),
        size: String(company.size ?? ""),
        website: company.website ? String(company.website) : undefined,
        interviews: interviewsByCompany.get(company.id) ?? [],
      }))
      .sort((a, b) => {
      const aLatest = a.interviews[0]?.createdAt ?? "";
      const bLatest = b.interviews[0]?.createdAt ?? "";
      if (!aLatest && !bLatest) return 0;
      if (!aLatest) return 1;
      if (!bLatest) return -1;
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
      });

    return { success: true, interviews };
  } catch (error) {
    console.error("Error fetching company interviews:", error);
    return { success: false, error: "Failed to fetch interviews" };
  }
}
