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
    <div className="min-h-screen bg-gradient-to-br from-[#181c24] to-[#23272f] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">Interview History</h1>
          <p className="text-lg text-slate-300 mt-3">Review past interviews, feedback, and transcripts.</p>
        </div>

        {interviews.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <h3 className="text-xl font-semibold text-slate-200 mb-2">No interviews yet</h3>
            <p className="text-slate-400">Complete an interview to see your history here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {interviews.map((interview) => {
              const feedback = feedbackMap.get(interview.id);
              return (
                <div key={interview.id} className="glass-card p-7 rounded-xl">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <h3 className="capitalize text-2xl font-bold text-white drop-shadow">{interview.role} Interview</h3>
                      <p className="text-slate-300">
                        {interview.type} • {interview.level} • {interview.difficulty || "Medium"}
                      </p>
                    </div>
                    <p className="text-blue-300 font-semibold text-xl">Score: {feedback?.totalScore ?? "---"}</p>
                  </div>

                  {feedback?.finalAssessment && (
                    <div className="mb-3">
                      <p className="text-green-300 font-semibold">{feedback.finalAssessment}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <h3 className="text-lg font-bold text-white">Transcript</h3>
                    <div className="bg-[#23272f] rounded p-4">
                      <TranscriptViewer transcript={feedback?.transcript} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
