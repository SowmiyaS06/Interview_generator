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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    targetScore: 80,
    deadline: "",
    priority: "medium" as const,
    category: "technical" as const,
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    const result = await getUserGoals();
    if (result.success) {
      setGoals(result.goals || []);
    }
    setLoading(false);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createGoal(
      newGoal.title,
      newGoal.description,
      newGoal.targetScore,
      newGoal.deadline,
      newGoal.priority,
      newGoal.category
    );

    if (result.success) {
      setNewGoal({
        title: "",
        description: "",
        targetScore: 80,
        deadline: "",
        priority: "medium",
        category: "technical",
      });
      setShowCreateForm(false);
      fetchGoals();
    }
  };

  const handleUpdateProgress = async (goalId: string, newScore: number) => {
    const result = await updateGoalProgress(goalId, newScore);
    if (result.success) {
      fetchGoals();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Interview Goals</h1>
            <p className="text-slate-600 mt-2">
              Track your interview preparation and set learning goals
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showCreateForm ? "Cancel" : "+ New Goal"}
          </Button>
        </div>

        {/* Create Goal Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Create New Goal</h2>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Goal Title
                  </label>
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, title: e.target.value })
                    }
                    placeholder="e.g., Master System Design"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="goal-target-score" className="block text-sm font-medium text-slate-700 mb-2">
                    Target Score
                  </label>
                  <input
                    id="goal-target-score"
                    type="number"
                    value={newGoal.targetScore}
                    onChange={(e) =>
                      setNewGoal({
                        ...newGoal,
                        targetScore: parseInt(e.target.value),
                      })
                    }
                    min={0}
                    max={100}
                    placeholder="0-100"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="goal-deadline" className="block text-sm font-medium text-slate-700 mb-2">
                    Deadline
                  </label>
                  <input
                    id="goal-deadline"
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, deadline: e.target.value })
                    }
                    placeholder="Select deadline"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="goal-priority" className="block text-sm font-medium text-slate-700 mb-2">
                    Priority
                  </label>
                  <select
                    id="goal-priority"
                    value={newGoal.priority}
                    onChange={(e) =>
                      setNewGoal({
                        ...newGoal,
                        priority: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="goal-category" className="block text-sm font-medium text-slate-700 mb-2">
                  Category
                </label>
                <select
                  id="goal-category"
                  value={newGoal.category}
                  onChange={(e) =>
                    setNewGoal({
                      ...newGoal,
                      category: e.target.value as any,
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="technical">Technical</option>
                  <option value="communication">Communication</option>
                  <option value="problem_solving">Problem Solving</option>
                  <option value="cultural_fit">Cultural Fit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, description: e.target.value })
                  }
                  placeholder="Describe your goal and how you plan to achieve it"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Create Goal
              </Button>
            </form>
          </div>
        )}

        {/* Goals List */}
        {goals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No goals yet
            </h3>
            <p className="text-slate-600">
              Create your first interview goal to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {goal.title}
                    </h3>
                    <p className="text-slate-600 text-sm mt-1">
                      {goal.description}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(goal.status)}`}>
                    {goal.status?.replace("_", " ").toUpperCase()}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      Progress: {Math.round(goal.progress || 0)}%
                    </span>
                    <span className={`text-xs font-semibold ${getPriorityColor(goal.priority)}`}>
                      {goal.priority?.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(goal.progress || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 rounded p-3">
                    <p className="text-xs text-slate-600">Target Score</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {goal.targetScore}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded p-3">
                    <p className="text-xs text-slate-600">Category</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {goal.category?.replace("_", " ")}
                    </p>
                  </div>
                </div>

                {goal.deadline && (
                  <div className="text-xs text-slate-600 mb-4">
                    📅 Deadline: {new Date(goal.deadline).toLocaleDateString()}
                  </div>
                )}

                {goal.status !== "completed" && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Update score"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateProgress(
                            goal.id,
                            parseInt((e.target as HTMLInputElement).value)
                          );
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        const input = document.querySelector(
                          `input[placeholder="Update score"]`
                        ) as HTMLInputElement;
                        if (input && input.value) {
                          handleUpdateProgress(goal.id, parseInt(input.value));
                          input.value = "";
                        }
                      }}
                    >
                      Update
                    </Button>
                  </div>
                )}

                {goal.status === "completed" && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                    <p className="text-green-700 font-semibold">✓ Goal Completed!</p>
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
