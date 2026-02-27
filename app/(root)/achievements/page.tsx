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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#181c24] to-[#23272f]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#181c24] to-[#23272f] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
            Achievements & Progress
          </h1>
          <p className="text-lg text-slate-300 mt-3">
            Track your interview preparation journey and celebrate your milestones.
          </p>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Level */}
          {level && (
            <div className="glass-card p-7 flex flex-col items-center">
              <h3 className="text-sm font-medium text-blue-200">Your Level</h3>
              <div className="mt-4 flex items-end gap-4 w-full">
                <div className="text-6xl font-extrabold text-blue-100 drop-shadow">{level.level}</div>
                <div className="flex-1">
                  <div className="bg-blue-900/40 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-400 rounded-full h-2 transition-all"
                      style={{ width: `${level.progress || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-blue-200">
                    {level.currentLevelPoints} / {level.nextLevelPoints} XP
                  </p>
                </div>
              </div>
              <p className="text-xs text-blue-300 mt-4">
                {level.totalPoints} Total Points
              </p>
            </div>
          )}

          {/* Streak */}
          {streak && (
            <div className="glass-card p-7 flex flex-col items-center">
              <h3 className="text-sm font-medium text-orange-200">Interview Streak</h3>
              <div className="mt-4">
                <div className="text-6xl font-extrabold text-orange-100 drop-shadow">{streak.currentCount || 0}</div>
                <p className="text-xs text-orange-200 mt-2">Days in a row</p>
              </div>
              <p className="text-xs text-orange-300 mt-4">
                🔥 Best: {streak.longestCount || 0} days
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="glass-card p-7 flex flex-col items-center">
            <h3 className="text-sm font-medium text-green-200">Achievements</h3>
            <div className="mt-4">
              <div className="text-6xl font-extrabold text-green-100 drop-shadow">{achievements.length}</div>
              <p className="text-xs text-green-200 mt-2">Unlocked</p>
            </div>
            <p className="text-xs text-green-300 mt-4">
              Keep progressing to unlock more!
            </p>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Your Achievements</h2>

          {achievements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">
                Complete interviews and reach milestones to unlock achievements!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex flex-col items-center justify-center p-7 border-2 border-yellow-400/60 rounded-xl bg-gradient-to-br from-yellow-400/10 to-transparent hover:shadow-2xl transition backdrop-blur-md"
                >
                  <div className="text-6xl mb-3 drop-shadow-lg">{achievement.icon}</div>
                  <h3 className="text-lg font-bold text-yellow-100 text-center drop-shadow">
                    {achievement.name}
                  </h3>
                  <p className="text-sm text-yellow-50 text-center mt-2">
                    {achievement.description}
                  </p>
                  <p className="text-xs text-yellow-300 font-semibold mt-3">
                    Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achievement Roadmap */}
        <div className="mt-10 glass-card p-8">
          <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Achievement Roadmap</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-green-400/40 bg-green-900/10">
              <div className="text-4xl">🚀</div>
              <div className="flex-1">
                <h3 className="font-bold text-green-100">Getting Started</h3>
                <p className="text-sm text-green-200">Complete your first interview</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-300">+10 XP</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-blue-400/40 bg-blue-900/10">
              <div className="text-4xl">📚</div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-100">Consistent Learner</h3>
                <p className="text-sm text-blue-200">Complete 5 interviews</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-300">+25 XP</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-purple-400/40 bg-purple-900/10">
              <div className="text-4xl">⭐</div>
              <div className="flex-1">
                <h3 className="font-bold text-purple-100">Perfect Performance</h3>
                <p className="text-sm text-purple-200">Achieve a perfect 100 score</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-300">+50 XP</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-yellow-400/40 bg-yellow-900/10">
              <div className="text-4xl">🏆</div>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-100">High Performer</h3>
                <p className="text-sm text-yellow-200">Maintain average score above 80</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-300">+40 XP</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-red-400/40 bg-red-900/10">
              <div className="text-4xl">🔥</div>
              <div className="flex-1">
                <h3 className="font-bold text-red-100">On Fire</h3>
                <p className="text-sm text-red-200">7 day interview streak</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-300">+35 XP</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
