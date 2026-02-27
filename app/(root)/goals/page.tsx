"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  getUserGoals,
  createGoal,
  updateGoalProgress,
  addMilestone,
  createLearningPlan,
} from "@/lib/actions/goals.action";


export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    targetScore: 0,
    deadline: "",
    priority: "medium",
    category: "technical",
    description: "",
  });

  useEffect(() => {
    async function fetchGoals() {
      try {
        setLoading(true);
        setError(null);
        const result = await getUserGoals();
        if (result.success) {
          setGoals(result.goals || []);
        } else {
          setGoals([]);
          // Only show error if there was an actual failure, not just no goals
          console.error("Failed to load goals:", result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load goals");
        console.error("Error fetching goals:", err);
        setGoals([]);
      } finally {
        setLoading(false);
      }
    }
    fetchGoals();
  }, []);

  function getStatusBadgeColor(status: string) {
    switch (status) {
      case "completed":
        return "bg-green-700 text-green-200";
      case "in_progress":
        return "bg-blue-700 text-blue-200";
      case "not_started":
        return "bg-slate-700 text-slate-200";
      default:
        return "bg-slate-700 text-slate-200";
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "high":
        return "text-red-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-green-400";
      default:
        return "text-slate-400";
    }
  }

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const { title, description, targetScore, deadline, priority, category } = newGoal;
    const result = await createGoal(
      title,
      description,
      targetScore,
      deadline,
      priority as "low" | "medium" | "high",
      category
    );
    if (result.success) {
      // Refetch goals to get the new one
      const goalsResult = await getUserGoals();
      if (goalsResult.success && goalsResult.goals) {
        setGoals(goalsResult.goals);
      }
      setShowCreateForm(false);
      setNewGoal({
        title: "",
        targetScore: 0,
        deadline: "",
        priority: "medium",
        category: "technical",
        description: "",
      });
    }
  };

  const handleUpdateProgress = async (goalId: string, newScore: number) => {
    await updateGoalProgress(goalId, newScore);
    setGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, progress: newScore, status: newScore >= (g.targetScore || 100) ? "completed" : g.status } : g));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-[#181c24] to-[#23272f]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#181c24] to-[#23272f] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">Interview Goals</h1>
            <p className="text-lg text-slate-300 mt-3">Track your interview preparation and set learning goals</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="glass-card px-6 py-2 text-base font-semibold text-white bg-blue-700/80 hover:bg-blue-800/90 shadow-lg rounded-lg"
          >
            {showCreateForm ? "Cancel" : "+ New Goal"}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-card p-4 mb-8 border-l-4 border-red-500">
            <div className="flex justify-between items-center">
              <p className="text-red-300">⚠️ {error}</p>
              <button
                onClick={() => {
                  setError(null);
                  // Refetch goals
                  getUserGoals().then((result) => {
                    if (result.success && result.goals) {
                      setGoals(result.goals);
                    }
                  });
                }}
                className="text-sm bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Create Goal Form */}
        {showCreateForm && (
          <div className="glass-card p-8 mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">Create New Goal</h2>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Goal Title</label>
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="e.g., Master System Design"
                    className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="goal-target-score" className="block text-sm font-medium text-slate-200 mb-2">Target Score</label>
                  <input
                    id="goal-target-score"
                    type="number"
                    value={newGoal.targetScore}
                    onChange={(e) => setNewGoal({ ...newGoal, targetScore: parseInt(e.target.value) })}
                    min={0}
                    max={100}
                    placeholder="0-100"
                    className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="goal-deadline" className="block text-sm font-medium text-slate-200 mb-2">Deadline</label>
                  <input
                    id="goal-deadline"
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                    placeholder="Select deadline"
                    className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="goal-priority" className="block text-sm font-medium text-slate-200 mb-2">Priority</label>
                  <select
                    id="goal-priority"
                    value={newGoal.priority}
                    onChange={(e) => setNewGoal({ ...newGoal, priority: e.target.value as any })}
                    className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="goal-category" className="block text-sm font-medium text-slate-200 mb-2">Category</label>
                <select
                  id="goal-category"
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as any })}
                  className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="technical">Technical</option>
                  <option value="communication">Communication</option>
                  <option value="problem_solving">Problem Solving</option>
                  <option value="cultural_fit">Cultural Fit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Description</label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="Describe your goal and how you plan to achieve it"
                  rows={3}
                  className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full glass-card bg-green-700/80 hover:bg-green-800/90 text-white font-semibold text-lg shadow-lg"
              >
                Create Goal
              </Button>
            </form>
          </div>
        )}

        {/* Goals List */}
        {goals.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <h3 className="text-xl font-semibold text-slate-200 mb-2">No goals yet</h3>
            <p className="text-slate-400">Create your first interview goal to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="glass-card p-7 hover:shadow-2xl transition rounded-xl"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{goal.title}</h3>
                    <p className="text-slate-300 text-sm mt-1">{goal.description}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(goal.status)} bg-opacity-80 backdrop-blur-md`}>
                    {goal.status?.replace("_", " ").toUpperCase()}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-200">Progress: {Math.round(goal.progress || 0)}%</span>
                    <span className={`text-xs font-semibold ${getPriorityColor(goal.priority)}`}>{goal.priority?.toUpperCase()} PRIORITY</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-400 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(goal.progress || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-[#23272f] rounded p-3">
                    <p className="text-xs text-slate-400">Target Score</p>
                    <p className="text-2xl font-bold text-white">{goal.targetScore}</p>
                  </div>
                  <div className="bg-[#23272f] rounded p-3">
                    <p className="text-xs text-slate-400">Category</p>
                    <p className="text-sm font-semibold text-white">{goal.category?.replace("_", " ")}</p>
                  </div>
                </div>

                {goal.deadline && (
                  <div className="text-xs text-slate-400 mb-4">📅 Deadline: {new Date(goal.deadline).toLocaleDateString()}</div>
                )}

                {goal.status !== "completed" ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Update score"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateProgress(goal.id, parseInt((e.target as HTMLInputElement).value));
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-[#23272f] border border-blue-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      size="sm"
                      className="glass-card bg-blue-700/80 hover:bg-blue-800/90 text-white"
                      onClick={() => {
                        const input = document.querySelector(`input[placeholder=\"Update score\"]`) as HTMLInputElement;
                        if (input && input.value) {
                          handleUpdateProgress(goal.id, parseInt(input.value));
                          input.value = "";
                        }
                      }}
                    >
                      Update
                    </Button>
                  </div>
                ) : (
                  <div className="bg-green-700/20 border border-green-400 rounded p-3 text-center">
                    <p className="text-green-300 font-semibold">✓ Goal Completed!</p>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>
    </div>

  );
}


