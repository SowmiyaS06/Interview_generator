"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getChallenges, participateInChallenge, getChallengeLeaderboard } from "@/lib/actions/community.action";

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<any>({ type: "", difficulty: "" });

  useEffect(() => {
    fetchChallenges();
  }, [filter]);

  async function fetchChallenges() {
    setLoading(true);
    const result = await getChallenges(filter.type || undefined, filter.difficulty || undefined);
    if (result.success && result.challenges) {
      setChallenges(result.challenges);
    }
    setLoading(false);
  }

  async function handleSelectChallenge(challenge: any) {
    setSelectedChallenge(challenge);
    const leaderboardResult = await getChallengeLeaderboard(challenge.id);
    if (leaderboardResult.success) {
      setLeaderboard(leaderboardResult.leaderboard || []);
    }
  }

  async function handleParticipate() {
    if (!selectedChallenge) return;
    const result = await participateInChallenge(selectedChallenge.id);
    if (result.success) {
      alert("Challenge joined! Good luck!");
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#181c24] to-[#23272f] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white">Practice Challenges</h1>
          <p className="text-slate-300 mt-2">Daily challenges and weekly competitions</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4 mt-8 mb-8">
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white"
          >
            <option value="">All Types</option>
            <option value="coding">Coding</option>
            <option value="behavioral">Behavioral</option>
            <option value="trivia">Trivia</option>
          </select>

          <select
            value={filter.difficulty}
            onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
            className="px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Challenges List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-4 text-slate-300">Loading challenges...</div>
            ) : (
              challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  onClick={() => handleSelectChallenge(challenge)}
                  className={`glass-card p-4 cursor-pointer hover:shadow-lg transition ${
                    selectedChallenge?.id === challenge.id ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <h3 className="font-semibold text-white text-sm">{challenge.title}</h3>
                  <div className="flex gap-2 mt-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        challenge.difficulty === "easy"
                          ? "bg-green-700/50 text-green-300"
                          : challenge.difficulty === "medium"
                          ? "bg-yellow-700/50 text-yellow-300"
                          : "bg-red-700/50 text-red-300"
                      }`}
                    >
                      {challenge.difficulty?.toUpperCase()}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-blue-700/50 text-blue-300">
                      {challenge.type?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    ⏱️ {Math.round(challenge.timeLimit / 60)} min | 👥 {challenge.participantCount}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Challenge Details */}
          {selectedChallenge ? (
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-card p-6">
                <h2 className="text-2xl font-bold text-white mb-4">{selectedChallenge.title}</h2>
                <p className="text-slate-300 mb-6">{selectedChallenge.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-slate-400 text-sm">Time Limit</p>
                    <p className="text-white font-semibold">{Math.round(selectedChallenge.timeLimit / 60)} minutes</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">XP Reward</p>
                    <p className="text-white font-semibold">{selectedChallenge.reward}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Participants</p>
                    <p className="text-white font-semibold">{selectedChallenge.participantCount}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Completed</p>
                    <p className="text-white font-semibold">{selectedChallenge.completionCount}</p>
                  </div>
                </div>

                <Button onClick={handleParticipate} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Join Challenge
                </Button>
              </div>

              {/* Leaderboard */}
              {leaderboard.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Leaderboard</h3>
                  <div className="space-y-2">
                    {leaderboard.map((entry, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white text-lg">#{entry.rank}</span>
                          <div>
                            <p className="text-white font-semibold">User {idx + 1}</p>
                            <p className="text-xs text-slate-400">{entry.status}</p>
                          </div>
                        </div>
                        <span className="text-white font-bold">{entry.score} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="lg:col-span-2 glass-card p-12 flex items-center justify-center">
              <p className="text-slate-300">Select a challenge to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
