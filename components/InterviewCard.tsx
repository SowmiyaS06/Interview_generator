import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { memo } from "react";

import { Button } from "./ui/button";
import DisplayTechIcons from "./DisplayTechIcons";
import DeleteInterviewButton from "./DeleteInterviewButton";

import { cn } from "@/lib/utils";

const InterviewCard = ({
  interviewId,
  userId,
  role,
  type,
  difficulty,
  techstack,
  createdAt,
  coverImage,
  showDelete = false,
  feedback = null,
  showAttendedTag = false,
}: InterviewCardProps) => {
  const normalizedType = /mix/gi.test(type) ? "Mixed" : type;

  const badgeColor =
    {
      Behavioral: "bg-light-400",
      Mixed: "bg-light-600",
      Technical: "bg-light-800",
    }[normalizedType] || "bg-light-600";

  const interviewDate = feedback?.createdAt ?? createdAt;
  const formattedDate = interviewDate
    ? dayjs(interviewDate).format("MMM D, YYYY")
    : "N/A";

  return (
    <div className="card-border w-90 max-sm:w-full min-h-96 relative">
      {showDelete && interviewId && (
        <div className="absolute top-3 left-3 z-10">
          <DeleteInterviewButton interviewId={interviewId} />
        </div>
      )}
      
      <div className="card-interview">
        <div>
          {showAttendedTag && feedback && (
            <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/40">
              <p className="text-xs font-semibold text-green-300">Attended</p>
            </div>
          )}

          {/* Type Badge */}
          <div
            className={cn(
              "absolute top-0 right-0 w-fit px-4 py-2 rounded-bl-lg",
              badgeColor
            )}
          >
            <p className="badge-text ">{normalizedType}</p>
          </div>

          {/* Cover Image */}
          <Image
            src={coverImage || "/covers/default.png"}
            alt="cover-image"
            width={90}
            height={90}
            className="rounded-full object-cover size-22.5"
          />

          {/* Interview Role */}
          <h3 className="mt-5 capitalize">{role} Interview</h3>

          {difficulty && (
            <p className="text-sm text-primary-200 mt-1">Difficulty: {difficulty}</p>
          )}

          {/* Date & Score */}
          <div className="flex flex-row gap-5 mt-3">
            <div className="flex flex-row gap-2">
              <Image
                src="/calendar.svg"
                width={22}
                height={22}
                alt="calendar"
                className="w-auto h-auto"
              />
              <p>{formattedDate}</p>
            </div>

            <div className="flex flex-row gap-2 items-center">
              <Image src="/star.svg" width={22} height={22} alt="star" />
              <p>{feedback?.totalScore || "---"}/100</p>
            </div>
          </div>

          {/* Feedback or Placeholder Text */}
          <p className="line-clamp-2 mt-5">
            {feedback?.finalAssessment ||
              "You haven't taken this interview yet. Take it now to improve your skills."}
          </p>
        </div>

        <div className="flex flex-row justify-between">
          <DisplayTechIcons techStack={techstack} />

          <Button variant="default">
            <Link
              href={
                feedback
                  ? `/interview/${interviewId}/feedback`
                  : `/interview/${interviewId}`
              }
            >
              {feedback ? "Check Feedback" : "View Interview"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default memo(InterviewCard);
