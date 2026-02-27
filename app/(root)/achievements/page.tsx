"use client";

import { useState, useEffect } from "react";
import { getUserAchievements, getUserLevel, getStreaks } from "@/lib/actions/gamification.action";

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [level, setLevel] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGamificationData();
  }, []);

  const loadGamificationData = async () => {
    setLoading(true);
    const [achievementsResult, levelResult, streakResult] = await Promise.all([
      getUserAchievements(),
      getUserLevel(),
      getStreaks(),
    ]);

    if (achievementsResult.success) {
      setAchievements(achievementsResult.achievements || []);
    }
    if (levelResult.success) {
      setLevel(levelResult.level);
    }
    if (streakResult.success) {
      setStreak(streakResult.streak);
    }
    setLoading(false);
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Achievements & Progress
          </h1>
          <p className="text-slate-600 mt-2">
            Track your interview preparation journey
          </p>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Level */}
          {level && (
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
              <h3 className="text-sm font-medium opacity-90">Your Level</h3>
              <div className="mt-4 flex items-end gap-4">
                <div className="text-6xl font-bold">{level.level}</div>
                <div className="flex-1">
                  <div className="bg-blue-400 rounded-full h-2 mb-2">
                    <div
                      className="bg-white rounded-full h-2 transition-all"
                      style={{ width: `${level.progress || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-sm opacity-90">
                    {level.currentLevelPoints} / {level.nextLevelPoints} XP
                  </p>
                </div>
              </div>
              <p className="text-sm opacity-75 mt-4">
                {level.totalPoints} Total Points
              </p>
            </div>
          )}

          {/* Streak */}
          {streak && (
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md p-6 text-white">
              <h3 className="text-sm font-medium opacity-90">Interview Streak</h3>
              <div className="mt-4">
                <div className="text-6xl font-bold">{streak.currentCount || 0}</div>
                <p className="text-sm opacity-90 mt-2">Days in a row</p>
              </div>
              <p className="text-sm opacity-75 mt-4">
                🔥 Best: {streak.longestCount || 0} days
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
            <h3 className="text-sm font-medium opacity-90">Achievements</h3>
            <div className="mt-4">
              <div className="text-6xl font-bold">{achievements.length}</div>
              <p className="text-sm opacity-90 mt-2">Unlocked</p>
            </div>
            <p className="text-sm opacity-75 mt-4">
              Keep progressing to unlock more!
            </p>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Your Achievements
          </h2>

          {achievements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 text-lg">
                Complete interviews and reach milestones to unlock achievements!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex flex-col items-center justify-center p-6 border-2 border-yellow-400 rounded-lg bg-gradient-to-br from-yellow-50 to-transparent hover:shadow-lg transition"
                >
                  <div className="text-6xl mb-3">{achievement.icon}</div>
                  <h3 className="text-lg font-bold text-slate-900 text-center">
                    {achievement.name}
                  </h3>
                  <p className="text-sm text-slate-600 text-center mt-2">
                    {achievement.description}
                  </p>
                  <p className="text-xs text-yellow-600 font-semibold mt-3">
                    Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achievement Roadmap */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Achievement Roadmap
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-green-200 bg-green-50">
              <div className="text-4xl">🚀</div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">Getting Started</h3>
                <p className="text-sm text-slate-600">Complete your first interview</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">+10 XP</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
              <div className="text-4xl">📚</div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">Consistent Learner</h3>
                <p className="text-sm text-slate-600">Complete 5 interviews</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">+25 XP</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-purple-200 bg-purple-50">
              <div className="text-4xl">⭐</div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">Perfect Performance</h3>
                <p className="text-sm text-slate-600">Achieve a perfect 100 score</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">+50 XP</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-yellow-200 bg-yellow-50">
              <div className="text-4xl">🏆</div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">High Performer</h3>
                <p className="text-sm text-slate-600">Maintain average score above 80</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-600">+40 XP</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-red-200 bg-red-50">
              <div className="text-4xl">🔥</div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">On Fire</h3>
                <p className="text-sm text-slate-600">7 day interview streak</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600">+35 XP</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
