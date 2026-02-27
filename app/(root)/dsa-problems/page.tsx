"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getDSAProblems, submitCodeSolution, getDSAProgress } from "@/lib/actions/code-and-export.action";

export default function DSAProblemsPage() {
  const [problems, setProblems] = useState<any[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<any>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<"python" | "javascript" | "java" | "cpp">("python");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any>(null);
  const [difficulty, setDifficulty] = useState<any>(null);

  useEffect(() => {
    fetchProblems();
    fetchProgress();
  }, [difficulty]);

  async function fetchProblems() {
    setLoading(true);
    const result = await getDSAProblems(difficulty, undefined, 50);
    if (result.success && result.problems) {
      setProblems(result.problems);
    }
    setLoading(false);
  }

  async function fetchProgress() {
    const result = await getDSAProgress();
    if (result.success) {
      setProgress(result.progress);
    }
  }

  async function handleSubmitCode() {
    if (!selectedProblem || !code.trim()) return;

    const result = await submitCodeSolution(selectedProblem.id, code, language);
    if (result.success) {
      alert(
        `${result.passed ? "✅ Accepted" : "❌ Rejected"}\n${result.passedTests}/${result.totalTests} tests passed`
      );
      setCode("");
      await fetchProgress();
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#181c24] to-[#23272f] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">DSA Practice</h1>
            <p className="text-slate-300 mt-2">Solve coding problems and improve your skills</p>
          </div>
        </div>

        {/* Progress Stats */}
        {progress && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-white">{progress.totalSolved}</p>
              <p className="text-slate-300">Problems Solved</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-white">{progress.byDifficulty?.easy || 0}</p>
              <p className="text-slate-300">Easy</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-white">{progress.byDifficulty?.medium || 0}</p>
              <p className="text-slate-300">Medium</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Problems List */}
          <div>
            <div className="glass-card p-4 mb-4">
              <select
                value={difficulty || ""}
                onChange={(e) => setDifficulty(e.target.value || null)}
                className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                problems.map((problem) => (
                  <div
                    key={problem.id}
                    onClick={() => setSelectedProblem(problem)}
                    className={`glass-card p-4 cursor-pointer hover:shadow-lg transition ${
                      selectedProblem?.id === problem.id ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <h3 className="font-semibold text-white text-sm">{problem.title}</h3>
                    <p
                      className={`text-xs mt-1 ${
                        problem.difficulty === "easy"
                          ? "text-green-400"
                          : problem.difficulty === "medium"
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {problem.difficulty?.toUpperCase()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Problem Details & Code Editor */}
          {selectedProblem ? (
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-card p-6">
                <h2 className="text-2xl font-bold text-white mb-4">{selectedProblem.title}</h2>
                <p className="text-slate-300 mb-4">{selectedProblem.description}</p>

                {selectedProblem.examples && selectedProblem.examples.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Examples</h3>
                    {selectedProblem.examples.map((ex: any, idx: number) => (
                      <div key={idx} className="bg-slate-700/30 p-3 rounded mb-2 text-sm text-slate-300">
                        <p>
                          <strong>Input:</strong> {ex.input}
                        </p>
                        <p>
                          <strong>Output:</strong> {ex.output}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-card p-6">
                <div className="flex gap-2 mb-4">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>

                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter your code here..."
                  className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white font-mono text-sm min-h-[300px]"
                />

                <Button
                  onClick={handleSubmitCode}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                >
                  Submit Solution
                </Button>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 glass-card p-12 flex items-center justify-center">
              <p className="text-slate-300 text-center">Select a problem to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
