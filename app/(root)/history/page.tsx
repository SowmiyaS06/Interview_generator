"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import TranscriptViewer from "@/components/TranscriptViewer";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getFeedbackByInterviewId, getInterviewsByUserId } from "@/lib/actions/general.action";

interface InterviewWithFeedback {
  id: string;
  role: string;
  type: string;
  level: string;
  difficulty?: string;
  feedback?: any;
}

const HistoryPage = () => {
  const router = useRouter();
  const [interviews, setInterviews] = useState<InterviewWithFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();
      if (!user) {
        router.push("/sign-in");
        return;
      }

      const interviewsResult = await getInterviewsByUserId(user.id);
      if (!interviewsResult) {
        setInterviews([]);
        return;
      }

      const feedbacksArray = await Promise.all(
        interviewsResult.map((interview) =>
          getFeedbackByInterviewId({ interviewId: interview.id, userId: user.id }).then((feedback) => ({
            id: interview.id,
            feedback,
          }))
        )
      );

      const feedbackMap = new Map(feedbacksArray.map((entry) => [entry.id, entry.feedback]));

      const interviewsWithFeedback = interviewsResult.map((interview) => ({
        ...interview,
        feedback: feedbackMap.get(interview.id),
      }));

      setInterviews(interviewsWithFeedback);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load interview history";
      setError(errorMessage);
      console.error("Error loading history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#181c24] to-[#23272f]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-slate-300 mt-4">Loading your interview history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#181c24] to-[#23272f] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">Interview History</h1>
          <p className="text-lg text-slate-300 mt-3">Review past interviews, feedback, and transcripts.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-card p-4 mb-8 border-l-4 border-red-500">
            <div className="flex justify-between items-center">
              <p className="text-red-300">⚠️ {error}</p>
              <button
                onClick={fetchHistoryData}
                className="text-sm bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {interviews.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <h3 className="text-xl font-semibold text-slate-200 mb-2">No interviews yet</h3>
            <p className="text-slate-400">Complete an interview to see your history here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {interviews.map((interview) => (
              <div key={interview.id} className="glass-card p-7 rounded-xl">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <h3 className="capitalize text-2xl font-bold text-white drop-shadow">{interview.role} Interview</h3>
                    <p className="text-slate-300">
                      {interview.type} • {interview.level} • {interview.difficulty || "Medium"}
                    </p>
                  </div>
                  <p className="text-blue-300 font-semibold text-xl">Score: {interview.feedback?.totalScore ?? "---"}</p>
                </div>

                {interview.feedback?.finalAssessment && (
                  <div className="mb-3">
                    <p className="text-green-300 font-semibold">{interview.feedback.finalAssessment}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <h3 className="text-lg font-bold text-white">Transcript</h3>
                  <div className="bg-[#23272f] rounded p-4">
                    <TranscriptViewer transcript={interview.feedback?.transcript} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
