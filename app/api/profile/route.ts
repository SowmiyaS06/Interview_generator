import { NextResponse } from "next/server";

import { updateUserProfile } from "@/lib/actions/auth.action";

export async function POST(request: Request) {
  let payload: { name?: string; resumeUrl?: string; profileUrl?: string };

  try {
    payload = (await request.json()) as {
      name?: string;
      resumeUrl?: string;
      profileUrl?: string;
    };
  } catch {
    return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 400 });
  }

  const result = await updateUserProfile(payload);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
