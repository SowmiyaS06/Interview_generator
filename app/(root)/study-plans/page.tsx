"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { generateStudyPlan, getStudyPlan, completeMilestone } from "@/lib/actions/community.action";

export default function StudyPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    targetRole: "Senior Software Engineer",
    level: "intermediate",
    timelineWeeks: 8,
    focusAreas: ["system_design", "dsa", "behavioral"],
  });

  async function handleGeneratePlan() {
    setLoading(true);
    const result = await generateStudyPlan(
      formData.targetRole,
      formData.level as any,
      formData.timelineWeeks,
      formData.focusAreas
    );
    if (result.success) {
      setShowCreateForm(false);
      setSelectedPlan({ id: result.planId, ...result.schedule });
      setFormData({
        targetRole: "Senior Software Engineer",
        level: "intermediate",
        timelineWeeks: 8,
        focusAreas: ["system_design", "dsa", "behavioral"],
      });
    }
    setLoading(false);
  }

  async function handleCompleteMilestone(week: number) {
    if (!selectedPlan) return;
    await completeMilestone(selectedPlan.id, week);
    // Refresh plan
    const result = await getStudyPlan(selectedPlan.id);
    if (result.success) {
      setSelectedPlan(result.plan);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#181c24] to-[#23272f] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Study Plans</h1>
            <p className="text-slate-300 mt-2">Personalized roadmap for interview prep</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {showCreateForm ? "Cancel" : "+ Generate Plan"}
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="glass-card p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Generate Study Plan</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Target Role"
                value={formData.targetRole}
                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white"
              />

              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              <input
                type="number"
                min={1}
                max={52}
                placeholder="Timeline (weeks)"
                value={formData.timelineWeeks}
                onChange={(e) => setFormData({ ...formData, timelineWeeks: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white"
              />

              <Button
                onClick={handleGeneratePlan}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? "Generating..." : "Generate Plan"}
              </Button>
            </div>
          </div>
        )}

        {/* Study Plan */}
        {selectedPlan && (
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Your Study Plan</h2>

            <div className="space-y-4">
              {selectedPlan.schedule?.map((week: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-2 ${
                    week.completed
                      ? "border-green-500 bg-green-500/10"
                      : "border-slate-600 bg-slate-700/20"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Week {week.week}</h3>
                      <p className="text-slate-300 text-sm mt-1">{week.milestone}</p>
                    </div>
                    <span className="text-white font-semibold">{week.targetHours}h/week</span>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-slate-300 mb-2">Topics:</p>
                    <div className="flex flex-wrap gap-2">
                      {week.topics?.map((topic: string, t: number) => (
                        <span key={t} className="bg-blue-700/50 text-blue-200 px-3 py-1 rounded text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  {!week.completed && (
                    <Button
                      onClick={() => handleCompleteMilestone(week.week)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    >
                      Mark as Complete
                    </Button>
                  )}

                  {week.completed && (
                    <div className="text-center">
                      <span className="text-green-400 font-semibold">✅ Completed</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!selectedPlan && !showCreateForm && (
          <div className="glass-card p-12 text-center">
            <p className="text-xl text-slate-300">No study plan yet</p>
            <p className="text-slate-400 mt-2">Create a personalized study plan to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
