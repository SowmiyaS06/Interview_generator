import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/actions/auth.action";

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code, language, testCases } = await request.json();

    if (!code || !language || !testCases) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // In production, send to Judge0 or similar service
    // For now, simulate execution
    const result = simulateCodeExecution(code, language, testCases);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error executing code:", error);
    return NextResponse.json(
      { error: "Failed to execute code" },
      { status: 500 }
    );
  }
}

function simulateCodeExecution(
  code: string,
  language: string,
  testCases: { input: string; expectedOutput: string }[]
) {
  // Placeholder implementation
  // In production, integrate with Judge0 API
  const passed = testCases.length;
  const totalTests = testCases.length;

  return {
    success: true,
    passed: passed === totalTests,
    passedTests: passed,
    totalTests: totalTests,
    runtime: Math.random() * 100,
    memory: Math.random() * 50,
    output: "Test execution successful",
  };
}
