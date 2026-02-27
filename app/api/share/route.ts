import { NextResponse } from "next/server";

import { disableFeedbackShare, enableFeedbackShare } from "@/lib/actions/general.action";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { interviewId?: string } | null;
  if (!body?.interviewId) {
    return NextResponse.json({ success: false, error: "InterviewId required" }, { status: 400 });
  }

  const result = await enableFeedbackShare(body.interviewId);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { interviewId?: string } | null;
  if (!body?.interviewId) {
    return NextResponse.json({ success: false, error: "InterviewId required" }, { status: 400 });
  }

  const result = await disableFeedbackShare(body.interviewId);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
