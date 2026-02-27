"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

const formatDate = (date: Date) =>
  date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

const CalendarExport = ({ title }: { title: string }) => {
  const [scheduledAt, setScheduledAt] = useState<string>("");

  const handleDownload = () => {
    if (!scheduledAt) return;
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PrepWise//Interview Reminder//EN",
      "BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:${title}`,
      "DESCRIPTION:PrepWise interview practice session",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "prepwise-interview.ics";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <input
        type="datetime-local"
        value={scheduledAt}
        onChange={(event) => setScheduledAt(event.target.value)}
        className="px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg"
        aria-label="Schedule time"
      />
      <Button type="button" onClick={handleDownload} disabled={!scheduledAt}>
        Add to calendar
      </Button>
    </div>
  );
};

export default CalendarExport;
