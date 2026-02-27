"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

const buildCsv = (interview: Interview, feedback: Feedback) => {
  const lines: string[] = [];
  lines.push("Section,Value");
  lines.push(`Role,${interview.role}`);
  lines.push(`Level,${interview.level}`);
  lines.push(`Type,${interview.type}`);
  lines.push(`Difficulty,${interview.difficulty || ""}`);
  lines.push(`Score,${feedback.totalScore}`);
  lines.push(`CreatedAt,${feedback.createdAt}`);
  lines.push(" ");
  lines.push("Category,Score,Comment");
  feedback.categoryScores.forEach((category) => {
    lines.push(`"${category.name}",${category.score},"${category.comment.replace(/"/g, '""')}"`);
  });
  lines.push(" ");
  lines.push("Strengths");
  feedback.strengths.forEach((item) => lines.push(`"${item.replace(/"/g, '""')}"`));
  lines.push(" ");
  lines.push("Areas for Improvement");
  feedback.areasForImprovement.forEach((item) => lines.push(`"${item.replace(/"/g, '""')}"`));

  if (feedback.transcript?.length) {
    lines.push(" ");
    lines.push("Transcript");
    lines.push("Role,Content");
    feedback.transcript.forEach((entry) => {
      lines.push(`"${entry.role}","${entry.content.replace(/"/g, '""')}"`);
    });
  }

  return lines.join("\n");
};

const ExportButtons = ({ interview, feedback }: { interview: Interview; feedback: Feedback }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleCsvExport = () => {
    const csv = buildCsv(interview, feedback);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `interview-${interview.id}-feedback.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePdfExport = async () => {
    setIsExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      let y = 12;
      const addLine = (text: string, size = 11) => {
        doc.setFontSize(size);
        doc.text(text, 14, y);
        y += size * 0.6;
      };

      addLine(`Interview Feedback - ${interview.role}`, 14);
      addLine(`Level: ${interview.level} | Type: ${interview.type} | Difficulty: ${interview.difficulty || "N/A"}`);
      addLine(`Score: ${feedback.totalScore}/100`);
      addLine(`Date: ${feedback.createdAt}`);
      y += 4;

      addLine("Final Assessment:", 12);
      feedback.finalAssessment.split("\n").forEach((line) => addLine(line));
      y += 2;

      addLine("Category Breakdown:", 12);
      feedback.categoryScores.forEach((category) => {
        addLine(`${category.name}: ${category.score}/100`);
        addLine(category.comment);
      });
      y += 2;

      addLine("Strengths:", 12);
      feedback.strengths.forEach((item) => addLine(`- ${item}`));
      y += 2;

      addLine("Areas for Improvement:", 12);
      feedback.areasForImprovement.forEach((item) => addLine(`- ${item}`));

      if (feedback.transcript?.length) {
        y += 4;
        addLine("Transcript:", 12);
        feedback.transcript.forEach((entry) => {
          addLine(`${entry.role}: ${entry.content}`);
        });
      }

      doc.save(`interview-${interview.id}-feedback.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="outline" onClick={handleCsvExport}>
        Export CSV
      </Button>
      <Button type="button" onClick={handlePdfExport} disabled={isExporting}>
        {isExporting ? "Exporting..." : "Export PDF"}
      </Button>
    </div>
  );
};

export default ExportButtons;
