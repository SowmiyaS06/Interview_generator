import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";

import TranscriptViewer from "@/components/TranscriptViewer";
import { getFeedbackByShareId, getInterviewById } from "@/lib/actions/general.action";

const SharedFeedbackPage = async ({ params }: { params: Promise<{ shareId: string }> }) => {
  const { shareId } = await params;
  const feedback = await getFeedbackByShareId(shareId);
  if (!feedback) {
    return (
      <section className="flex flex-col gap-4">
        <h2>Shared feedback not found</h2>
        <Link href="/" className="text-primary-200">Return to home</Link>
      </section>
    );
  }

  const interview = await getInterviewById(feedback.interviewId);

  return (
    <section className="section-feedback">
      <div className="flex flex-row justify-center">
        <h1 className="text-4xl font-semibold">
          Shared Interview Feedback - <span className="capitalize">{interview?.role || "Interview"}</span>
        </h1>
      </div>

      <div className="flex flex-row justify-center">
        <div className="flex flex-row gap-5">
          <div className="flex flex-row gap-2 items-center">
            <Image src="/star.svg" width={22} height={22} alt="star" />
            <p>
              Overall Impression: <span className="text-primary-200 font-bold">{feedback.totalScore}</span>/100
            </p>
          </div>

          <div className="flex flex-row gap-2">
            <Image src="/calendar.svg" width={22} height={22} alt="calendar" />
            <p>
              {feedback.createdAt
                ? dayjs(feedback.createdAt).format("MMM D, YYYY h:mm A")
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      <hr />

      <p>{feedback.finalAssessment}</p>

      <div className="flex flex-col gap-4">
        <h2>Breakdown of the Interview:</h2>
        {feedback.categoryScores.map((category, index) => (
          <div key={index}>
            <p className="font-bold">
              {index + 1}. {category.name} ({category.score}/100)
            </p>
            <p>{category.comment}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h3>Strengths</h3>
        <ul>
          {feedback.strengths.map((strength, index) => (
            <li key={index}>{strength}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h3>Areas for Improvement</h3>
        <ul>
          {feedback.areasForImprovement.map((area, index) => (
            <li key={index}>{area}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        <h3>Transcript</h3>
        <TranscriptViewer transcript={feedback.transcript} />
      </div>
    </section>
  );
};

export default SharedFeedbackPage;
