import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import ExportButtons from "@/components/ExportButtons";
import ShareFeedbackControls from "@/components/ShareFeedbackControls";
import TranscriptViewer from "@/components/TranscriptViewer";
import VoiceFeedbackPlayer from "@/components/VoiceFeedbackPlayer";
import CalendarExport from "@/components/CalendarExport";

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-500";
  if (score >= 80) return "text-emerald-400";
  if (score >= 70) return "text-yellow-500";
  if (score >= 60) return "text-orange-500";
  return "text-red-500";
};

const getScoreLabel = (score: number) => {
  if (score >= 90) return "Exceptional";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Competent";
  if (score >= 60) return "Developing";
  return "Below Expectations";
};

const getPriorityBadgeClass = (priority: "high" | "medium" | "low") => {
  switch (priority) {
    case "high":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "low":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  }
};

const getHighlightTypeClass = (type: "strength" | "improvement" | "critical") => {
  switch (type) {
    case "strength":
      return "bg-green-500/10 border-l-4 border-l-green-500";
    case "improvement":
      return "bg-orange-500/10 border-l-4 border-l-orange-500";
    case "critical":
      return "bg-purple-500/10 border-l-4 border-l-purple-500";
  }
};

const Feedback = async ({ params }: RouteParams) => {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const canAccessInterview =
    interview.userId === user.id || interview.finalized;
  if (!canAccessInterview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user.id,
  });

  if (!feedback) redirect(`/interview/${id}`);

  return (
    <section className="section-feedback">
      <div className="flex flex-row justify-center">
        <h1 className="text-4xl font-semibold">
          Feedback on the Interview -{" "}
          <span className="capitalize">{interview.role}</span> Interview
        </h1>
      </div>

      <div className="flex flex-row justify-center">
        <div className="flex flex-row gap-5 flex-wrap items-center">
          {/* Overall Score */}
          <div className="flex flex-row gap-2 items-center">
            <Image src="/star.svg" width={22} height={22} alt="star" />
            <p>
              Overall Score:{" "}
              <span className={`font-bold ${getScoreColor(feedback.totalScore)}`}>
                {feedback.totalScore.toFixed(2)}
              </span>
              /100
              <span className={`ml-2 text-sm font-medium ${getScoreColor(feedback.totalScore)}`}>
                ({getScoreLabel(feedback.totalScore)})
              </span>
            </p>
          </div>

          {/* Date */}
          <div className="flex flex-row gap-2">
            <Image
              src="/calendar.svg"
              width={22}
              height={22}
              alt="calendar"
              className="w-auto h-auto"
            />
            <p>
              {feedback.createdAt
                ? dayjs(feedback.createdAt).format("MMM D, YYYY h:mm A")
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Overall Score Points Breakdown */}
      {feedback.overallScorePoints && (
        <div className="bg-linear-to-r from-primary-200/10 to-primary-200/5 rounded-xl p-6 border border-primary-200/20">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span> Overall Score Breakdown (Out of 100)
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Your overall score is calculated as a weighted average of all category scores
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {feedback.overallScorePoints.breakdown.map((item, index) => {
              const categoryScore = feedback.categoryScores[index]?.score || 0;
              return (
                <div key={index} className="bg-dark-200/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-400 mb-1">{item.category}</p>
                  <p className={`text-lg font-semibold ${getScoreColor(categoryScore)}`}>
                    {categoryScore.toFixed(2)}/100
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Weight: {item.maxPoints}%</p>
                  <p className={`text-xl font-bold mt-2 ${getScoreColor((item.earnedPoints / item.maxPoints) * 100)}`}>
                    +{item.earnedPoints.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">pts earned</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center border-t border-primary-200/20 pt-4">
            <p className="text-sm text-gray-400 mb-2">
              Formula: (Comm × 20%) + (Tech × 25%) + (Problem × 25%) + (Culture × 15%) + (Confidence × 15%)
            </p>
            <p className="text-lg">
              <span className="text-gray-400">Overall Score: </span>
              <span className={`text-3xl font-bold ${getScoreColor(feedback.overallScorePoints.earnedPoints)}`}>
                {feedback.overallScorePoints.earnedPoints.toFixed(2)}
              </span>
              <span className="text-gray-400 text-xl"> / 100</span>
            </p>
          </div>
        </div>
      )}

      <hr />

      {/* Critical Highlights */}
      {feedback.criticalHighlights && feedback.criticalHighlights.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="text-2xl">🎯</span> Key Highlights
          </h2>
          <div className="grid gap-3">
            {feedback.criticalHighlights.map((highlight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${getHighlightTypeClass(highlight.type)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-sm font-medium uppercase tracking-wide">
                      {highlight.type === "strength" && "✅ Strength"}
                      {highlight.type === "improvement" && "⚠️ Needs Improvement"}
                      {highlight.type === "critical" && "💡 Critical Note"}
                    </span>
                    <p className="mt-1 font-medium">{highlight.text}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityBadgeClass(highlight.priority)}`}>
                    {highlight.priority.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-lg leading-relaxed">{feedback.finalAssessment}</p>

      <div className="flex flex-wrap gap-4">
        <VoiceFeedbackPlayer feedbackText={feedback.finalAssessment} />
        <ExportButtons interview={interview} feedback={feedback} />
        <ShareFeedbackControls interviewId={id} shareId={feedback.shareId} />
        <CalendarExport title={`${interview.role} interview follow-up`} />
        <Button asChild variant="outline">
          <Link href={`/learning/${id}`}>Improve Based on Feedback</Link>
        </Button>
      </div>

      {/* Interview Breakdown */}
      <div className="flex flex-col gap-4">
        <h2>Breakdown of the Interview:</h2>
        {feedback.categoryScores.map((category, index) => (
          <div key={index} className="bg-dark-200/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-lg">
                {index + 1}. {category.name}
              </p>
              <span className={`text-xl font-bold ${getScoreColor(category.score)}`}>
                {category.score.toFixed(2)}/100
              </span>
            </div>
            <p className="text-gray-300 mb-3">{category.comment}</p>
            {category.keyHighlights && category.keyHighlights.length > 0 && (
              <div className="mt-3 border-t border-gray-700/50 pt-3">
                <p className="text-sm font-medium text-gray-400 mb-2">Key Observations:</p>
                <ul className="space-y-1">
                  {category.keyHighlights.map((highlight, hIndex) => (
                    <li key={hIndex} className="flex items-start gap-2 text-sm">
                      <span className="text-primary-200 mt-0.5">•</span>
                      <span className="text-gray-400 italic">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2">
          <span className="text-xl">💪</span> Strengths
        </h3>
        <ul className="space-y-2">
          {feedback.strengths.map((strength, index) => (
            <li key={index} className="flex items-start gap-2 bg-green-500/10 p-3 rounded-lg border-l-4 border-l-green-500">
              <span className="text-green-400 font-bold">{index + 1}.</span>
              <span>{strength}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2">
          <span className="text-xl">📈</span> Areas for Improvement
        </h3>
        <ul className="space-y-2">
          {feedback.areasForImprovement.map((area, index) => (
            <li key={index} className="flex items-start gap-2 bg-orange-500/10 p-3 rounded-lg border-l-4 border-l-orange-500">
              <span className="text-orange-400 font-bold">{index + 1}.</span>
              <span>{area}</span>
            </li>
          ))}
        </ul>
      </div>

      {interview.learningModules && interview.learningModules.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="flex items-center gap-2">
            <span className="text-xl">📚</span> Learning Recommendations
          </h3>

          <div className="grid gap-4">
            {interview.learningModules.map((module, moduleIndex) => (
              <div key={`${module.topic}-${moduleIndex}`} className="bg-dark-200/30 rounded-lg p-4">
                <p className="font-bold text-lg mb-3">{module.topic}</p>

                {module.resources.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {module.resources.map((resource, resourceIndex) => (
                      <a
                        key={`${resource.url}-${resourceIndex}`}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-dark-200 border border-dark-300 rounded-lg overflow-hidden hover:border-primary-200/50 transition-colors"
                      >
                        <Image
                          src={resource.thumbnail}
                          alt={resource.title}
                          width={320}
                          height={180}
                          className="w-full h-auto object-cover"
                        />
                        <div className="p-3">
                          <p className="text-sm line-clamp-2">{resource.title}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Learning resources are currently unavailable for this topic.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3>Transcript</h3>
        <TranscriptViewer transcript={feedback.transcript} />
      </div>

      <div className="buttons">
        <Button variant="secondary" className="flex-1">
          <Link href="/" className="flex w-full justify-center">
            <p className="text-sm font-semibold text-center">
              Back to dashboard
            </p>
          </Link>
        </Button>

        <Button variant="default" className="flex-1">
          <Link
            href={`/interview/${id}`}
            className="flex w-full justify-center"
          >
            <p className="text-sm font-semibold text-black text-center">
              Retake Interview
            </p>
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default Feedback;
