"use client";

import { useState, useEffect } from "react";
import StatisticsDisplay from "@/components/StatisticsDisplay";
import {
  getLatestPerformanceMetrics,
  getPerformanceTrend,
  calculatePerformanceMetrics,
} from "@/lib/actions/performance-metrics.action";
import { getUserStatistics } from "@/lib/actions/statistics.action";

export default function PerformancePage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    setLoading(true);
    // Fetch current metrics and trends
    const [metricsResult, trendsResult, statisticsResult] = await Promise.all([
      getLatestPerformanceMetrics(),
      getPerformanceTrend(),
      getUserStatistics(),
    ]);

    if (metricsResult.success) {
      setMetrics(metricsResult.metrics);
    }
    if (trendsResult.success) {
      setTrends(trendsResult.trends || []);
    }
    if (statisticsResult && statisticsResult.totalFeedbacks > 0) {
      setStatistics(statisticsResult);
    }
    setLoading(false);
  };

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case "fast":
        return "text-red-600";
      case "normal":
        return "text-green-600";
      case "slow":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const ScoreGauge = ({
    score,
    label,
  }: {
    score: number;
    label: string;
  }) => {
    const getColor =
      score >= 80
        ? "text-green-600"
        : score >= 60
          ? "text-yellow-600"
          : "text-red-600";

    return (
      <div className="text-center">
        <div className={`text-4xl font-bold ${getColor}`}>{score}</div>
        <p className="text-sm text-slate-600 mt-2">{label}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Performance Insights
          </h1>
          <p className="text-slate-600 mt-2">
            Real-time analytics of your interview performance
          </p>
        </div>

        {statistics && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Your Performance Statistics</h2>
            <StatisticsDisplay stats={statistics} />
          </section>
        )}

        {/* Current Performance Scores */}
        {metrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <ScoreGauge score={metrics.confidenceScore || 0} label="Confidence" />
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <ScoreGauge score={metrics.clarityScore || 0} label="Clarity" />
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <ScoreGauge score={metrics.coherenceScore || 0} label="Coherence" />
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <ScoreGauge
                  score={
                    Math.round(
                      ((metrics.confidenceScore || 0) +
                        (metrics.clarityScore || 0) +
                        (metrics.coherenceScore || 0)) /
                        3
                    )
                  }
                  label="Overall"
                />
              </div>
            </div>

            {/* Speaking Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  Speaking Pattern
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Speaking Pace</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg font-semibold ${getSpeedColor(metrics.speakingPace)}`}
                      >
                        {metrics.speakingPace?.toUpperCase()}
                      </span>
                      <span className="text-sm text-slate-600">
                        {metrics.speakingPace === "normal"
                          ? "✓ Good pace"
                          : metrics.speakingPace === "fast"
                            ? "📈 Consider slowing down"
                            : "📉 Try speaking faster"}
                      </span>
                    </div>
                  </div>

                  {metrics.fillerWords && (
                    <div>
                      <p className="text-sm text-slate-600 mb-2">Filler Words</p>
                      <div className="bg-slate-50 rounded p-3">
                        <p className="text-2xl font-bold text-slate-900">
                          {metrics.fillerWords.count || 0}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {metrics.fillerWords.percentage?.toFixed(1)}% of response
                        </p>
                        {metrics.fillerWords.examples?.length > 0 && (
                          <div className="mt-2 text-xs text-slate-600">
                            <p className="font-medium">Examples:</p>
                            <p>{metrics.fillerWords.examples.join(", ")}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {metrics.pauseAnalysis && (
                    <div>
                      <p className="text-sm text-slate-600 mb-2">
                        Pause Analysis
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-blue-50 rounded p-2 text-center">
                          <p className="text-lg font-bold text-blue-600">
                            {metrics.pauseAnalysis.total || 0}
                          </p>
                          <p className="text-xs text-blue-600">Total</p>
                        </div>
                        <div className="bg-green-50 rounded p-2 text-center">
                          <p className="text-lg font-bold text-green-600">
                            {metrics.pauseAnalysis.thoughtful || 0}
                          </p>
                          <p className="text-xs text-green-600">Thoughtful</p>
                        </div>
                        <div className="bg-red-50 rounded p-2 text-center">
                          <p className="text-lg font-bold text-red-600">
                            {metrics.pauseAnalysis.hesitant || 0}
                          </p>
                          <p className="text-xs text-red-600">Hesitant</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics Overview */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  Key Metrics
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-slate-600">Confidence Level</span>
                    <span className="font-bold text-slate-900">
                      {metrics.confidenceScore || 0}/100
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-slate-600">Clarity Score</span>
                    <span className="font-bold text-slate-900">
                      {metrics.clarityScore || 0}/100
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-slate-600">Coherence Score</span>
                    <span className="font-bold text-slate-900">
                      {metrics.coherenceScore || 0}/100
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Filler Word Rate</span>
                    <span className="font-bold text-slate-900">
                      {metrics.fillerWords?.percentage?.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded">
                  <p className="text-sm text-blue-900">
                    <strong>Pro Tip:</strong> Focus on reducing filler words and
                    maintaining a steady pace for better confidence scores.
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Trend */}
            {trends.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  Performance Trend (Last 10 Interviews)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-semibold">Interview</th>
                        <th className="text-left p-2 font-semibold">Confidence</th>
                        <th className="text-left p-2 font-semibold">Clarity</th>
                        <th className="text-left p-2 font-semibold">Coherence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trends.map((trend) => (
                        <tr key={trend.interviewNumber} className="border-b hover:bg-slate-50">
                          <td className="p-2">{trend.interviewNumber}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-200 rounded h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded"
                                  style={{ width: `${trend.confidenceScore}%` }}
                                />
                              </div>
                              <span>{trend.confidenceScore}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-200 rounded h-2">
                                <div
                                  className="bg-green-600 h-2 rounded"
                                  style={{ width: `${trend.clarityScore}%` }}
                                />
                              </div>
                              <span>{trend.clarityScore}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-200 rounded h-2">
                                <div
                                  className="bg-yellow-600 h-2 rounded"
                                  style={{ width: `${trend.coherenceScore}%` }}
                                />
                              </div>
                              <span>{trend.coherenceScore}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!metrics && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No performance data yet
            </h3>
            <p className="text-slate-600">
              Complete some interviews to see your performance analytics
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
