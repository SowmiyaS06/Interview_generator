import { redirect } from "next/navigation";

import TranscriptViewer from "@/components/TranscriptViewer";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getFeedbackByInterviewId, getInterviewsByUserId } from "@/lib/actions/general.action";

const HistoryPage = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interviews = (await getInterviewsByUserId(user.id)) ?? [];
  const feedbacksArray = await Promise.all(
    interviews.map((interview) =>
      getFeedbackByInterviewId({ interviewId: interview.id, userId: user.id }).then((feedback) => ({
        id: interview.id,
        feedback,
      }))
    )
  );

  const feedbackMap = new Map(feedbacksArray.map((entry) => [entry.id, entry.feedback]));

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2>Interview History</h2>
        <p className="text-light-100">Review past interviews, feedback, and transcripts.</p>
      </div>

      {interviews.length === 0 ? (
        <p className="text-light-100">No interviews yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {interviews.map((interview) => {
            const feedback = feedbackMap.get(interview.id);
            return (
              <div key={interview.id} className="card-border">
                <div className="card p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="capitalize">{interview.role} Interview</h3>
                      <p className="text-light-100">
                        {interview.type} • {interview.level} • {interview.difficulty || "Medium"}
                      </p>
                    </div>
                    <p className="text-primary-200 font-semibold">
                      Score: {feedback?.totalScore ?? "---"}
                    </p>
                  </div>

                  {feedback?.finalAssessment && <p>{feedback.finalAssessment}</p>}

                  <div className="flex flex-col gap-3">
                    <h3>Transcript</h3>
                    <TranscriptViewer transcript={feedback?.transcript} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default HistoryPage;
