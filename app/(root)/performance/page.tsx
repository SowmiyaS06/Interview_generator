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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current metrics and trends
      const [metricsResult, trendsResult, statisticsResult] = await Promise.all([
        getLatestPerformanceMetrics(),
        getPerformanceTrend(),
        getUserStatistics(),
      ]);

      // Set metrics if available (null if no metrics yet)
      if (metricsResult.success && metricsResult.metrics) {
        setMetrics(metricsResult.metrics);
      } else {
        setMetrics(null); // No metrics available yet - this is normal for new users
      }

      if (trendsResult.success) {
        setTrends(trendsResult.trends || []);
      }

      if (statisticsResult && statisticsResult.totalInterviews > 0) {
        setStatistics(statisticsResult);
      } else {
        setStatistics(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load performance data";
      setError(errorMessage);
      console.error("Error loading performance data:", err);
    } finally {
      setLoading(false);
    }
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#181c24] to-[#23272f]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-slate-300 mt-4">Loading your performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#181c24] to-[#23272f] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">Performance Insights</h1>
          <p className="text-lg text-slate-300 mt-3">Real-time analytics of your interview performance</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-card p-4 mb-8 border-l-4 border-red-500">
            <div className="flex justify-between items-center">
              <p className="text-red-300">⚠️ {error}</p>
              <button
                onClick={fetchPerformanceData}
                className="text-sm bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {statistics && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">Your Performance Statistics</h2>
            <StatisticsDisplay stats={statistics} />
          </section>
        )}

        {/* Current Performance Scores */}
        {metrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="glass-card p-7">
                <ScoreGauge score={metrics.confidenceScore || 0} label="Confidence" />
              </div>
              <div className="glass-card p-7">
                <ScoreGauge score={metrics.clarityScore || 0} label="Clarity" />
              </div>
              <div className="glass-card p-7">
                <ScoreGauge score={metrics.coherenceScore || 0} label="Coherence" />
              </div>
              <div className="glass-card p-7">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              <div className="glass-card p-8">
                <h2 className="text-xl font-bold text-white mb-4">Speaking Pattern</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-300 mb-2">Speaking Pace</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-semibold ${getSpeedColor(metrics.speakingPace)}`}>{metrics.speakingPace?.toUpperCase()}</span>
                      <span className="text-sm text-slate-400">
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
                      <p className="text-sm text-slate-300 mb-2">Filler Words</p>
                      <div className="bg-[#23272f] rounded p-3">
                        <p className="text-2xl font-bold text-white">{metrics.fillerWords.count || 0}</p>
                        <p className="text-xs text-slate-400 mt-1">{metrics.fillerWords.percentage?.toFixed(1)}% of response</p>
                        {metrics.fillerWords.examples?.length > 0 && (
                          <div className="mt-2 text-xs text-slate-400">
                            <p className="font-medium">Examples:</p>
                            <p>{metrics.fillerWords.examples.join(", ")}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {metrics.pauseAnalysis && (
                    <div>
                      <p className="text-sm text-slate-300 mb-2">Pause Analysis</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-blue-900/20 rounded p-2 text-center">
                          <p className="text-lg font-bold text-blue-300">{metrics.pauseAnalysis.total || 0}</p>
                          <p className="text-xs text-blue-200">Total</p>
                        </div>
                        <div className="bg-green-900/20 rounded p-2 text-center">
                          <p className="text-lg font-bold text-green-300">{metrics.pauseAnalysis.thoughtful || 0}</p>
                          <p className="text-xs text-green-200">Thoughtful</p>
                        </div>
                        <div className="bg-red-900/20 rounded p-2 text-center">
                          <p className="text-lg font-bold text-red-300">{metrics.pauseAnalysis.hesitant || 0}</p>
                          <p className="text-xs text-red-200">Hesitant</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics Overview */}
              <div className="glass-card p-8">
                <h2 className="text-xl font-bold text-white mb-4">Key Metrics</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-slate-300">Confidence Level</span>
                    <span className="font-bold text-white">{metrics.confidenceScore || 0}/100</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-slate-300">Clarity Score</span>
                    <span className="font-bold text-white">{metrics.clarityScore || 0}/100</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-slate-300">Coherence Score</span>
                    <span className="font-bold text-white">{metrics.coherenceScore || 0}/100</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Filler Word Rate</span>
                    <span className="font-bold text-white">{metrics.fillerWords?.percentage?.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-900/20 rounded">
                  <p className="text-sm text-blue-200">
                    <strong>Pro Tip:</strong> Focus on reducing filler words and maintaining a steady pace for better confidence scores.
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Trend */}
            {trends.length > 0 && (
              <div className="glass-card p-8">
                <h2 className="text-xl font-bold text-white mb-4">Performance Trend (Last 10 Interviews)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left p-2 font-semibold text-slate-200">Interview</th>
                        <th className="text-left p-2 font-semibold text-slate-200">Confidence</th>
                        <th className="text-left p-2 font-semibold text-slate-200">Clarity</th>
                        <th className="text-left p-2 font-semibold text-slate-200">Coherence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trends.map((trend) => (
                        <tr key={trend.interviewNumber} className="border-b border-slate-800 hover:bg-slate-800/30">
                          <td className="p-2 text-slate-100">{trend.interviewNumber}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-700 rounded h-2">
                                <div className="bg-blue-400 h-2 rounded" style={{ width: `${trend.confidenceScore}%` }} />
                              </div>
                              <span className="text-slate-100">{trend.confidenceScore}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-700 rounded h-2">
                                <div className="bg-green-400 h-2 rounded" style={{ width: `${trend.clarityScore}%` }} />
                              </div>
                              <span className="text-slate-100">{trend.clarityScore}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-700 rounded h-2">
                                <div className="bg-yellow-400 h-2 rounded" style={{ width: `${trend.coherenceScore}%` }} />
                              </div>
                              <span className="text-slate-100">{trend.coherenceScore}</span>
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

        {!metrics && !loading && (
          <div className="glass-card p-12 text-center">
            <div className="mb-4 text-4xl">📊</div>
            <h3 className="text-xl font-semibold text-slate-200 mb-2">No Performance Data Yet</h3>
            <p className="text-slate-400 mb-6">Complete interviews to generate your performance analytics and insights</p>
            <a href="/interview" className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
              Start an Interview
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
