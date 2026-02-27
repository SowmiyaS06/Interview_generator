import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/actions/auth.action";
import { getDSAProgress } from "@/lib/actions/code-and-export.action";
import { db } from "@/firebase/admin";
import { PDFDocument, rgb } from "pdf-lib";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("reportId");
  const format = searchParams.get("format") || "pdf";

  if (!reportId) {
    return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
  }

  try {
    const report = await db.collection("progress_reports").doc(reportId).get();

    if (!report.exists) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.data()?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = report.data()?.data;

    if (format === "csv") {
      const csvContent = generateCSV(data);
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="progress-report-${reportId}.csv"`,
        },
      });
    } else {
      // Generate PDF (implement with pdfkit or similar)
      const pdfContent = await generatePDF(data);
      return new NextResponse(pdfContent as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="progress-report-${reportId}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error("Error exporting report:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}

function generateCSV(data: any): string {
  const rows = [
    ["Progress Report"],
    ["Generated At", new Date(data.generatedAt).toLocaleDateString()],
    [],
    ["User Stats"],
    ["Level", data.user.level],
    ["Total XP", data.user.totalXP],
    ["Streak", data.user.streak],
    [],
    ["Coding Stats"],
    ["Submissions", data.coding.submissions],
    ["Problems Solved", data.coding.problems],
    [],
    ["Interview Stats"],
    ["Total Interviews", data.interviews.total],
    ["Average Score", data.interviews.averageScore],
    [],
    ["Learning Stats"],
    ["Flashcards Created", data.learning.flashcardsCreated],
    ["Reviews Completed", data.learning.reviewsDone],
  ];

  return rows.map((row) => row.join(",")).join("\n");
}

async function generatePDF(data: any): Promise<Buffer> {
  // Placeholder - in production use pdfkit or pdf-lib
  return Buffer.from("PDF report placeholder");
}
