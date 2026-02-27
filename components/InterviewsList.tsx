"use client";

import { useState } from "react";
import InterviewCard from "./InterviewCard";
import InterviewSearchFilter from "./InterviewSearchFilter";

interface InterviewsListProps {
  interviews: Interview[];
  userId: string;
  showDelete?: boolean;
  feedbacks?: Map<string, Feedback | null>;
  showAttendedTag?: boolean;
}

export default function InterviewsList({
  interviews,
  userId,
  showDelete = false,
  feedbacks = new Map(),
  showAttendedTag = false,
}: InterviewsListProps) {
  const [filteredInterviews, setFilteredInterviews] = useState<Interview[]>(interviews);

  if (interviews.length === 0) {
    return <p>No interviews found</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <InterviewSearchFilter
        interviews={interviews}
        onFilteredChange={setFilteredInterviews}
      />

      {filteredInterviews.length === 0 ? (
        <p className="text-center text-muted-foreground">No interviews match your filters</p>
      ) : (
        <div className="interviews-section">
          {filteredInterviews.map((interview) => (
            <InterviewCard
              key={interview.id}
              userId={userId}
              interviewId={interview.id}
              role={interview.role}
              type={interview.type}
              difficulty={interview.difficulty}
              techstack={interview.techstack}
              createdAt={interview.createdAt}
              coverImage={interview.coverImage}
              showDelete={showDelete}
              feedback={feedbacks.get(interview.id)}
              showAttendedTag={showAttendedTag}
            />
          ))}
        </div>
      )}
    </div>
  );
}
