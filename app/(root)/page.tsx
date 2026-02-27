import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import InterviewsList from "@/components/InterviewsList";
import StatisticsDisplay from "@/components/StatisticsDisplay";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
  getFeedbackByInterviewId,
} from "@/lib/actions/general.action";
import { getUserStatistics } from "@/lib/actions/statistics.action";

async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [userInterviews, allInterview, statistics] = await Promise.all([
    getInterviewsByUserId(user.id),
    getLatestInterviews({ userId: user.id }),
    getUserStatistics(user.id),
  ]);

  const safeUserInterviews = userInterviews ?? [];
  const safeAllInterviews = allInterview ?? [];

  // Fetch feedbacks for user interviews
  const userFeedbacksArray = await Promise.all(
    safeUserInterviews.map((interview) =>
      getFeedbackByInterviewId({
        interviewId: interview.id,
        userId: user.id,
      }).then((feedback) => ({ id: interview.id, feedback }))
    )
  );

  // Fetch feedbacks for all interviews
  const allFeedbacksArray = await Promise.all(
    safeAllInterviews.map((interview) =>
      getFeedbackByInterviewId({
        interviewId: interview.id,
        userId: user.id,
      }).then((feedback) => ({ id: interview.id, feedback }))
    )
  );

  // Create maps for easy lookup
  const userFeedbacksMap = new Map(
    userFeedbacksArray.map((item) => [item.id, item.feedback])
  );
  const allFeedbacksMap = new Map(
    allFeedbacksArray.map((item) => [item.id, item.feedback])
  );

  return (
    <>
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice & Feedback</h2>
          <p className="text-lg">
            Practice real interview questions & get instant feedback
          </p>

          <Button asChild variant="default" className="max-sm:w-full">
            <Link href="/interview">Start an Interview</Link>
          </Button>
        </div>

        <Image
          src="/robot.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      {/* Statistics Section */}
      {statistics && statistics.totalFeedbacks > 0 && (
        <section className="flex flex-col gap-6 mt-8">
          <h2>Your Performance Statistics</h2>
          <StatisticsDisplay stats={statistics} />
        </section>
      )}

      <section className="flex flex-col gap-6 mt-8">
        <h2>Your Interviews</h2>
        <InterviewsList
          interviews={safeUserInterviews}
          userId={user.id}
          showDelete={true}
          feedbacks={userFeedbacksMap}
        />
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>Take Interviews</h2>
        <InterviewsList
          interviews={safeAllInterviews}
          userId={user.id}
          showDelete={false}
          feedbacks={allFeedbacksMap}
        />
      </section>
    </>
  );
}

export default Home;
