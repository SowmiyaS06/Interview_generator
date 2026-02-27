"use client";

import { useState, useEffect } from "react";
import { getLeaderboard } from "@/lib/actions/features.action";
import { getUserGamificationProfile } from "@/lib/actions/features.action";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
    fetchUserProfile();
  }, []);

  async function fetchLeaderboard() {
    try {
      setError(null);
      const result = await getLeaderboard(100);
      console.log('Leaderboard result:', result); // Debug log
      if (result.success && result.leaderboard) {
        console.log('Number of users in leaderboard:', result.leaderboard.length); // Debug log
        setLeaderboard(result.leaderboard);
      } else {
        console.log('No leaderboard data or failed:', result.error); // Debug log
        setLeaderboard([]); // No leaderboard data yet - normal for new users
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load leaderboard";
      setError(errorMessage);
      console.error("Error loading leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserProfile() {
    try {
      const result = await getUserGamificationProfile();
      if (result.success) {
        setUserProfile(result.profile);
        // Find user rank
        const leaderboardResult = await getLeaderboard(500);
        if (leaderboardResult.success && leaderboardResult.leaderboard) {
          const rank = leaderboardResult.leaderboard.findIndex(
            (u: any) => u.userId === result.profile?.userId
          );
          setUserRank(rank >= 0 ? rank + 1 : null);
        }
      } else {
        throw new Error("Failed to load user profile");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load user profile";
      console.error("Error loading user profile:", err);
      // Don't set error for profile as it's non-critical
    }
  }

  return (
    <section className="w-full flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-3xl font-bold text-white">Global Leaderboard</h2>
        <p className="text-slate-300 mt-2">Top performers of the community</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card p-4 border-l-4 border-red-500">
          <div className="flex justify-between items-center">
            <p className="text-red-300">⚠️ {error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchLeaderboard();
              }}
              className="text-sm bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* User Stats */}
      {userProfile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-white">{userProfile.level}</p>
            <p className="text-slate-300 text-sm">Level</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-white">{userProfile.totalXP}</p>
            <p className="text-slate-300 text-sm">Total XP</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-white">{userProfile.streak}</p>
            <p className="text-slate-300 text-sm">Streak</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-white">{userRank || "N/A"}</p>
            <p className="text-slate-300 text-sm">Your Rank</p>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-700/30">
              <th className="px-6 py-4 text-left text-white font-semibold">Rank</th>
              <th className="px-6 py-4 text-left text-white font-semibold">User</th>
              <th className="px-6 py-4 text-left text-white font-semibold">Level</th>
              <th className="px-6 py-4 text-left text-white font-semibold">XP</th>
              <th className="px-6 py-4 text-left text-white font-semibold">Streak</th>
              <th className="px-6 py-4 text-left text-white font-semibold">Badges</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4">
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <p className="text-slate-300 mt-2">Loading leaderboard...</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : leaderboard.length > 0 ? (
              leaderboard.map((entry, idx) => (
                <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/20 transition">
                  <td className="px-6 py-4">
                    <span className="text-white font-bold text-lg">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${entry.rank}`}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-semibold">{entry.userName || `User ${entry.userId?.slice(0, 8)}`}</td>
                  <td className="px-6 py-4">
                    <span className="bg-amber-700/50 text-amber-300 px-3 py-1 rounded-full text-sm font-semibold">
                      L{entry.level || 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-semibold">{entry.totalXP?.toLocaleString() || 0}</td>
                  <td className="px-6 py-4">
                    <span className="text-orange-400 font-semibold">🔥 {entry.streak || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-yellow-400 font-semibold">★ {entry.badges?.length || 0}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-slate-300">
                  No users yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
