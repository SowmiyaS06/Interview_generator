type FeedbackSnapshot = {
  categoryScores?: Array<{ name: string; score: number; comment?: string }>;
  areasForImprovement?: string[];
  criticalHighlights?: Array<{ type: "strength" | "improvement" | "critical"; text: string }>;
};

export type LearningResource = {
  title: string;
  url: string;
  thumbnail: string;
};

export type LearningModule = {
  topic: string;
  resources: LearningResource[];
};

const STOP_PHRASES = [
  "improve",
  "improvement",
  "better",
  "overall",
  "communication",
  "confidence",
  "answer quality",
  "technical depth",
  "problem solving",
  "cultural fit",
  "needs improvement",
  "candidate",
  "interview",
  "response",
  "responses",
];

const cleanTopic = (value: string) =>
  value
    .replace(/\*\*/g, "")
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-–•\d.)\s]+/, "")
    .replace(/[.:;!?,]+$/, "");

const normalizeTopicCandidate = (value: string) => {
  const cleaned = cleanTopic(value);
  if (!cleaned) return "";

  const lowered = cleaned.toLowerCase();
  if (lowered.length < 4) return "";
  if (STOP_PHRASES.includes(lowered)) return "";

  return cleaned;
};

const topicFromCategory = (category: string, comment?: string) => {
  const normalizedCategory = cleanTopic(category);
  const normalizedComment = cleanTopic(comment || "");

  if (!normalizedCategory) return "";

  if (!normalizedComment) {
    return normalizedCategory;
  }

  const sentence = normalizedComment.split(/[.!?]/).map((item) => item.trim()).find(Boolean);
  return sentence ? `${normalizedCategory}: ${sentence}` : normalizedCategory;
};

const dedupeTopics = (topics: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const topic of topics) {
    const normalized = topic.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(topic);
  }

  return result;
};

export const extractWeakTopics = (feedback: FeedbackSnapshot): string[] => {
  const candidates: string[] = [];

  for (const category of feedback.categoryScores || []) {
    if (typeof category.score === "number" && category.score < 75) {
      const categoryTopic = topicFromCategory(category.name, category.comment);
      if (categoryTopic) candidates.push(categoryTopic);
    }
  }

  for (const area of feedback.areasForImprovement || []) {
    const normalized = normalizeTopicCandidate(area);
    if (normalized) candidates.push(normalized);
  }

  for (const highlight of feedback.criticalHighlights || []) {
    if (highlight.type === "strength") continue;
    const normalized = normalizeTopicCandidate(highlight.text);
    if (normalized) candidates.push(normalized);
  }

  return dedupeTopics(candidates).slice(0, 8);
};

const fetchYoutubeResources = async (topic: string): Promise<LearningResource[]> => {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim();
  if (!apiKey) return [];

  const query = `${topic} tutorial`;
  const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=3&q=${encodeURIComponent(
    query
  )}&key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          thumbnails?: {
            high?: { url?: string };
            medium?: { url?: string };
            default?: { url?: string };
          };
        };
      }>;
    };

    return (payload.items || [])
      .map((item) => {
        const videoId = item.id?.videoId;
        const title = item.snippet?.title?.trim();
        const thumbnail =
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          "";

        if (!videoId || !title || !thumbnail) return null;

        return {
          title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail,
        } satisfies LearningResource;
      })
      .filter((item): item is LearningResource => Boolean(item))
      .slice(0, 3);
  } catch {
    return [];
  }
};

export const buildLearningModules = async (weakTopics: string[]): Promise<LearningModule[]> => {
  if (!weakTopics.length) return [];

  const modules = await Promise.all(
    weakTopics.map(async (topic) => ({
      topic,
      resources: await fetchYoutubeResources(topic),
    }))
  );

  return modules;
};
