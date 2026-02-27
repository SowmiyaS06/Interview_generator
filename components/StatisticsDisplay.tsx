"use client";

import { TrendingUp, TrendingDown, Minus, Award, Target, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UserStatistics } from "@/lib/actions/statistics.action";
import { Progress } from "@/components/ui/progress";

interface StatisticsDisplayProps {
  stats: UserStatistics;
}

export default function StatisticsDisplay({ stats }: StatisticsDisplayProps) {
  const router = useRouter();

  if (stats.totalFeedbacks === 0) {
    return (
      <div className="card p-8 text-center">
        <BarChart3 size={48} className="mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Statistics Yet</h3>
        <p className="text-muted-foreground">
          Complete interviews and get feedback to see your performance statistics
        </p>
      </div>
    );
  }

  const getTrendIcon = () => {
    switch (stats.improvementTrend) {
      case "improving":
        return <TrendingUp size={20} className="text-green-500" />;
      case "declining":
        return <TrendingDown size={20} className="text-red-500" />;
      case "stable":
        return <Minus size={20} className="text-yellow-500" />;
      default:
        return <Minus size={20} className="text-muted-foreground" />;
    }
  };

  const getTrendText = () => {
    switch (stats.improvementTrend) {
      case "improving":
        return "Improving";
      case "declining":
        return "Needs Attention";
      case "stable":
        return "Stable";
      default:
        return "Not enough data";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const formatDate = (dateValue: string) =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      timeZone: "UTC",
    }).format(new Date(dateValue));

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Average Score</p>
            <Award size={18} className="text-primary-100" />
          </div>
          <p className={`text-3xl font-bold ${getScoreColor(stats.averageScore)}`}>
            {stats.averageScore.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            From {stats.totalFeedbacks} interview{stats.totalFeedbacks !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Highest Score</p>
            <TrendingUp size={18} className="text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-500">{stats.highestScore.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Personal best</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Lowest Score</p>
            <TrendingDown size={18} className="text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-500">{stats.lowestScore.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Room for improvement</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Trend</p>
            {getTrendIcon()}
          </div>
          <p className="text-xl font-bold">{getTrendText()}</p>
          <p className="text-xs text-muted-foreground mt-1">Overall progress</p>
        </div>
      </div>

      {/* Category Scores */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target size={20} className="text-primary-100" />
          Category Performance
        </h3>
        <div className="grid gap-4">
          {Object.entries(stats.categoryAverages).map(([key, score]) => {
            const label = key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase())
              .trim();

            return (
              <div key={key}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">{label}</span>
                  <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                    {score.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-dark-200 rounded-full h-2">
                  <Progress value={score} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strong and Weak Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strong Areas */}
        {stats.strongAreas.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 text-green-500">
              💪 Your Strengths
            </h3>
            <ul className="space-y-2">
              {stats.strongAreas.map((area, index) => (
                <li key={index} className="flex justify-between items-center">
                  <span>{area.category}</span>
                  <span className="text-green-500 font-semibold">
                    {area.averageScore.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weak Areas */}
        {stats.weakAreas.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 text-yellow-500">
              🎯 Focus Areas
            </h3>
            <ul className="space-y-2">
              {stats.weakAreas.map((area, index) => (
                <li key={index} className="flex justify-between items-center">
                  <span>{area.category}</span>
                  <span className="text-yellow-500 font-semibold">
                    {area.averageScore.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Role Breakdown */}
      {stats.roleBreakdown.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Performance by Role</h3>
          <div className="space-y-4">
            {stats.roleBreakdown.map((role, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{role.role}</p>
                  <p className="text-xs text-muted-foreground">
                    {role.count} interview{role.count !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Progress value={role.averageScore} className="w-32 h-2" />
                  <span className={`font-bold w-16 text-right ${getScoreColor(role.averageScore)}`}>
                    {role.averageScore.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Performance */}
      {stats.recentPerformance.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Performance</h3>
          <div className="space-y-2">
            {[...stats.recentPerformance].reverse().map((performance, index) => (
              <div
                key={`${performance.interviewId}-${performance.date}-${index}`}
                className="flex items-center justify-between py-2 border-b border-dark-300 last:border-0 cursor-pointer hover:bg-dark-200/40 transition-colors rounded-md px-2"
                onClick={() => router.push(`/interview/${performance.interviewId}/feedback`)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/interview/${performance.interviewId}/feedback`);
                  }
                }}
              >
                <div>
                  <p className="font-medium">{performance.role}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(performance.date)}
                  </p>
                </div>
                <span className={`font-bold text-lg ${getScoreColor(performance.score)}`}>
                  {performance.score.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
