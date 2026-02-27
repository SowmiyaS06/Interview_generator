import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import InterviewsList from "@/components/InterviewsList";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
  getFeedbackMapByInterviewIds,
} from "@/lib/actions/general.action";

async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [userInterviews, allInterview] = await Promise.all([
    getInterviewsByUserId(user.id),
    getLatestInterviews({ userId: user.id }),
  ]);

  const safeUserInterviews = userInterviews ?? [];
  const safeAllInterviews = allInterview ?? [];

  const [userFeedbacksMap, allFeedbacksMap] = await Promise.all([
    getFeedbackMapByInterviewIds({
      interviewIds: safeUserInterviews.map((interview) => interview.id),
      userId: user.id,
    }),
    getFeedbackMapByInterviewIds({
      interviewIds: safeAllInterviews.map((interview) => interview.id),
      userId: user.id,
    }),
  ]);

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
          loading="eager"
          className="max-sm:hidden w-auto h-auto"
        />
      </section>

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
          showAttendedTag={true}
        />
      </section>
    </>
  );
}

export default Home;
