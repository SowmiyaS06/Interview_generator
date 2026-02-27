"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import Agent from "@/components/Agent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { interviewTemplates } from "@/constants";

const levels = ["Junior", "Mid", "Senior"] as const;
const types = ["Technical", "Behavioral", "Mixed"] as const;
const difficulties = ["Easy", "Medium", "Hard"] as const;

const parseTechstack = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const QuickInterviewSetup = ({ user }: { user: User }) => {
  const router = useRouter();
  const [role, setRole] = useState("Frontend Developer");
  const [level, setLevel] = useState<(typeof levels)[number]>("Mid");
  const [type, setType] = useState<(typeof types)[number]>("Technical");
  const [difficulty, setDifficulty] = useState<(typeof difficulties)[number]>("Medium");
  const [techstack, setTechstack] = useState("React, TypeScript, CSS");
  const [amount, setAmount] = useState(5);
  const [templateId, setTemplateId] = useState("custom");
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<string[] | null>(null);

  const selectedTemplate = useMemo(
    () => interviewTemplates.find((template) => template.id === templateId),
    [templateId]
  );

  const applyTemplate = (id: string) => {
    const template = interviewTemplates.find((entry) => entry.id === id);
    if (!template) return;

    setRole(template.role);
    setLevel(template.level as (typeof levels)[number]);
    setType(template.type as (typeof types)[number]);
    setDifficulty(template.difficulty as (typeof difficulties)[number]);
    setTechstack(template.techstack.join(", "));
    setAmount(template.questions.length);
  };

  const findBestTemplate = () => {
    if (selectedTemplate) return selectedTemplate;

    return (
      interviewTemplates.find(
        (template) =>
          template.role === role &&
          template.type === type &&
          template.difficulty === difficulty
      ) || interviewTemplates[0]
    );
  };

  const handleStart = async () => {
    if (isPracticeMode) {
      const template = findBestTemplate();
      if (!template?.questions?.length) {
        toast.error("No practice template available. Pick a template or disable practice mode.");
        return;
      }

      setPracticeQuestions(template.questions.slice(0, amount));
      return;
    }

    const techstackList = parseTechstack(techstack);
    if (!techstackList.length) {
      toast.error("Please provide at least one technology");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/vapi/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          level,
          type,
          techstack: techstackList,
          amount,
          difficulty,
          templateId: templateId !== "custom" ? templateId : undefined,
          userId: user.id,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        interviewId?: string;
        error?: string;
      };

      if (!result.success || !result.interviewId) {
        toast.error(result.error || "Failed to generate interview");
        return;
      }

      router.push(`/interview/${result.interviewId}`);
    } catch {
      toast.error("Failed to generate interview");
    } finally {
      setIsLoading(false);
    }
  };

  if (practiceQuestions) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3>Practice Interview</h3>
          <p className="text-light-100">
            Practice mode uses template questions and does not save interviews or generate feedback.
          </p>
          <Button variant="outline" onClick={() => setPracticeQuestions(null)}>
            Back to setup
          </Button>
        </div>

        <Agent
          userName={user.name}
          userId={user.id}
          type="interview"
          questions={practiceQuestions}
        />
      </div>
    );
  }

  return (
    <div className="card-border w-full">
      <div className="card p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="template-select" className="text-sm text-light-100">Template</label>
          <select
            id="template-select"
            value={templateId}
            onChange={(event) => {
              const value = event.target.value;
              setTemplateId(value);
              if (value !== "custom") applyTemplate(value);
            }}
            className="px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg"
          >
            <option value="custom">Custom setup</option>
            {interviewTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-light-100">Role</label>
            <Input value={role} onChange={(event) => setRole(event.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="level-select" className="text-sm text-light-100">Level</label>
            <select
              id="level-select"
              value={level}
              onChange={(event) => setLevel(event.target.value as (typeof levels)[number])}
              className="px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg"
            >
              {levels.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="type-select" className="text-sm text-light-100">Type</label>
            <select
              id="type-select"
              value={type}
              onChange={(event) => setType(event.target.value as (typeof types)[number])}
              className="px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg"
            >
              {types.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="difficulty-select" className="text-sm text-light-100">Difficulty</label>
            <select
              id="difficulty-select"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as (typeof difficulties)[number])}
              className="px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg"
            >
              {difficulties.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-light-100">Tech stack (comma separated)</label>
          <Input value={techstack} onChange={(event) => setTechstack(event.target.value)} />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-light-100">Number of questions</label>
          <Input
            type="number"
            value={amount}
            min={1}
            max={20}
            onChange={(event) => setAmount(Number(event.target.value))}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-light-100">
          <input
            type="checkbox"
            checked={isPracticeMode}
            onChange={(event) => setIsPracticeMode(event.target.checked)}
          />
          Practice mode (no save, no feedback)
        </label>

        <Button onClick={handleStart} disabled={isLoading}>
          {isLoading ? "Generating..." : isPracticeMode ? "Start Practice" : "Generate Interview"}
        </Button>
      </div>
    </div>
  );
};

export default QuickInterviewSetup;
