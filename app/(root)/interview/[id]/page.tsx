import Image from "next/image";
import { redirect } from "next/navigation";

import Agent from "@/components/Agent";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import DisplayTechIcons from "@/components/DisplayTechIcons";
import TranscriptViewer from "@/components/TranscriptViewer";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const InterviewDetails = async ({ params }: RouteParams) => {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const canAccessInterview =
    interview.userId === user.id || interview.finalized;
  if (!canAccessInterview) redirect("/");

  const hasGeneratedQuestions =
    interview.finalized && Array.isArray(interview.questions) && interview.questions.length > 0;
  if (!hasGeneratedQuestions) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user.id,
  });

  return (
    <>
      <div className="flex flex-row gap-4 justify-between">
        <div className="flex flex-row gap-4 items-center max-sm:flex-col">
          <div className="flex flex-row gap-4 items-center">
            <Image
              src={interview.coverImage || "/covers/default.png"}
              alt="cover-image"
              width={40}
              height={40}
              className="rounded-full object-cover size-10"
            />
            <h3 className="capitalize">{interview.role} Interview</h3>
          </div>

          <DisplayTechIcons techStack={interview.techstack} />
        </div>

        <div className="flex items-center gap-3">
          <p className="bg-dark-200 px-4 py-2 rounded-lg h-fit">
            {interview.type}
          </p>
          {interview.difficulty && (
            <p className="bg-dark-200 px-4 py-2 rounded-lg h-fit">{interview.difficulty}</p>
          )}
        </div>
      </div>

      {feedback && (
        <section className="flex flex-col gap-4 mt-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3>Interview Summary</h3>
            <Button asChild variant="outline">
              <Link href={`/interview/${id}/feedback`}>View full feedback</Link>
            </Button>
          </div>

          <p>{feedback.finalAssessment}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedback.categoryScores.map((category, index) => (
              <div key={index} className="bg-dark-200 border border-dark-300 rounded-lg p-4">
                <p className="font-bold">
                  {category.name} ({category.score}/100)
                </p>
                <p>{category.comment}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <h3>Transcript</h3>
            <TranscriptViewer transcript={feedback.transcript} />
          </div>
        </section>
      )}

      <Agent
        userName={user.name}
        userId={user.id}
        interviewId={id}
        type="interview"
        questions={interview.questions}
        feedbackId={feedback?.id}
      />
    </>
  );
};

export default InterviewDetails;
