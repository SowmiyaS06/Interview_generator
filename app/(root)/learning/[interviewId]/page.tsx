import Link from "next/link";
import { redirect } from "next/navigation";

import LearningImprovementClient from "@/components/LearningImprovementClient";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getFeedbackByInterviewId, getInterviewById } from "@/lib/actions/general.action";

const LearningPage = async ({ params }: RouteParams) => {
  const { interviewId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interview = await getInterviewById(interviewId);
  if (!interview) redirect("/");

  const canAccessInterview = interview.userId === user.id || interview.finalized;
  if (!canAccessInterview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId,
    userId: user.id,
  });

  const learningModules = interview.learningModules || [];
  const weakTopics = interview.weakTopics || [];
  const completedResourceUrls = interview.completedLearningResources || [];

  return (
    <>
      <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
        <h2 className="capitalize">{interview.role} Learning Improvement</h2>
        <Button asChild variant="outline">
          <Link href={`/interview/${interviewId}/feedback`}>Back to Feedback</Link>
        </Button>
      </div>

      <LearningImprovementClient
        interviewId={interviewId}
        role={interview.role}
        score={feedback?.totalScore ?? 0}
        weakTopics={weakTopics}
        learningModules={learningModules}
        completedResourceUrls={completedResourceUrls}
      />
    </>
  );
};

export default LearningPage;
