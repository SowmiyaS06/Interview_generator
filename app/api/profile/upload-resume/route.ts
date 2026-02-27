import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/actions/auth.action";
import { storage, db } from "@/firebase/admin";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Only PDF and DOCX are allowed." },
        { status: 400 }
      );
    }

    // Get the storage bucket
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 
      `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
    const bucket = storage.bucket(bucketName);
    const safeName = file.name.replace(/\s+/g, "-");
    const path = `resumes/${userId}/${Date.now()}-${safeName}`;
    const file_obj = bucket.file(path);

    // Upload file
    const buffer = await file.arrayBuffer();
    await file_obj.save(Buffer.from(buffer), {
      metadata: {
        contentType: file.type,
      },
    });

    // Get download URL
    const [url] = await file_obj.getSignedUrl({
      version: "v4",
      action: "read",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000 * 365), // 1 year
    });

    // Save resume metadata to Firestore collection directly
    const resumeData = {
      userId,
      fileName: file.name,
      fileUrl: url,
      fileSize: file.size,
      fileType: file.type,
      description: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection("resumes").add(resumeData);

    return NextResponse.json(
      { success: true, resumeUrl: url, resumeId: docRef.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading resume:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload resume";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
