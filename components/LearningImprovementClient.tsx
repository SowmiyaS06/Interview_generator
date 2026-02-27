"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toggleLearningResourceCompletion } from "@/lib/actions/learning.action";

type LearningResource = {
  title: string;
  url: string;
  thumbnail: string;
};

type LearningModule = {
  topic: string;
  resources: LearningResource[];
};

interface LearningImprovementClientProps {
  interviewId: string;
  role: string;
  score: number;
  weakTopics: string[];
  learningModules: LearningModule[];
  completedResourceUrls: string[];
}

const LearningImprovementClient = ({
  interviewId,
  role,
  score,
  weakTopics,
  learningModules,
  completedResourceUrls,
}: LearningImprovementClientProps) => {
  const [isPending, startTransition] = useTransition();
  const [completedUrls, setCompletedUrls] = useState<string[]>(completedResourceUrls);

  const completedUrlSet = useMemo(() => new Set(completedUrls), [completedUrls]);

  const totalResources = useMemo(
    () => learningModules.reduce((acc, module) => acc + module.resources.length, 0),
    [learningModules]
  );

  const completionPercentage = useMemo(() => {
    if (!totalResources) return 0;
    return Number(((completedUrls.length / totalResources) * 100).toFixed(2));
  }, [completedUrls.length, totalResources]);

  const toggleCompletion = (resourceUrl: string, nextCompleted: boolean) => {
    startTransition(async () => {
      const result = await toggleLearningResourceCompletion({
        interviewId,
        resourceUrl,
        completed: nextCompleted,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to update learning progress");
        return;
      }

      setCompletedUrls(result.completedResourceUrls || []);
      toast.success(nextCompleted ? "Marked as completed" : "Marked as pending");
    });
  };

  return (
    <section className="section-feedback">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold">Learning Improvement Plan</h1>
        <p className="text-light-100">
          Personalized learning modules based on your {role} interview feedback.
        </p>
      </div>

      <div className="bg-dark-200/30 rounded-lg p-5 border border-dark-300">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <p className="text-lg">
            Interview score: <span className="font-bold">{score.toFixed(2)}/100</span>
          </p>
          <p className="text-sm text-light-100">
            {completedUrls.length} / {totalResources} resources completed
          </p>
        </div>
        <Progress value={completionPercentage} className="h-3 bg-dark-300" />
        <p className="mt-2 text-sm text-light-100">Progress: {completionPercentage.toFixed(2)}%</p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2">
          <span className="text-xl">🧠</span> Weak Topics
        </h3>
        {weakTopics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {weakTopics.map((topic, index) => (
              <span key={`${topic}-${index}`} className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 text-sm">
                {topic}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-light-100">No weak topics detected yet.</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="flex items-center gap-2">
          <span className="text-xl">📚</span> Learning Modules
        </h3>

        {learningModules.length === 0 ? (
          <p className="text-light-100">No learning modules available for this interview yet.</p>
        ) : (
          learningModules.map((module, moduleIndex) => (
            <div key={`${module.topic}-${moduleIndex}`} className="bg-dark-200/30 rounded-lg p-4 border border-dark-300">
              <p className="font-semibold text-lg mb-3">{module.topic}</p>

              {module.resources.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {module.resources.map((resource, resourceIndex) => {
                    const completed = completedUrlSet.has(resource.url);

                    return (
                      <div key={`${resource.url}-${resourceIndex}`} className="rounded-lg overflow-hidden border border-dark-300 bg-dark-200">
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block">
                          <Image
                            src={resource.thumbnail}
                            alt={resource.title}
                            width={320}
                            height={180}
                            className="w-full h-auto object-cover"
                          />
                          <div className="p-3">
                            <p className="text-sm line-clamp-2">{resource.title}</p>
                          </div>
                        </a>
                        <div className="px-3 pb-3">
                          <Button
                            type="button"
                            variant={completed ? "secondary" : "default"}
                            className="w-full"
                            disabled={isPending}
                            onClick={() => toggleCompletion(resource.url, !completed)}
                          >
                            {completed ? "Completed" : "Mark as Completed"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-light-100">No resources available for this topic.</p>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default LearningImprovementClient;
