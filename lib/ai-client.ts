type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ProviderConfig =
  | {
      id: string;
      provider: "openrouter";
      key: string;
      model: string;
      appUrl: string;
      appTitle: string;
    }
  | {
      id: string;
      provider: "openai";
      key: string;
      model: string;
    };

export type ChatCompletionResult = {
  content: string;
  provider: "openrouter" | "openai";
  model: string;
};

const splitKeys = (raw?: string) =>
  (raw || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const PROVIDER_RETRY_COUNT = 1;
const RETRY_DELAY_MS = 250;
const COOL_DOWN_TRANSIENT_MS = 60_000;
const COOL_DOWN_QUOTA_MS = 10 * 60_000;
const COOL_DOWN_AUTH_MS = 30 * 60_000;
const providerCooldownUntil = new Map<string, number>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isProviderCoolingDown = (id: string) => {
  const until = providerCooldownUntil.get(id);
  if (!until) return false;

  if (Date.now() > until) {
    providerCooldownUntil.delete(id);
    return false;
  }

  return true;
};

const setProviderCooldown = (id: string, durationMs: number) => {
  providerCooldownUntil.set(id, Date.now() + durationMs);
};

const classifyStatus = (status: number): "auth" | "quota" | "transient" | "other" => {
  if (status === 401 || status === 403) return "auth";
  if (status === 402 || status === 429) return "quota";
  if (status >= 500) return "transient";
  return "other";
};

const buildProviderQueue = (): ProviderConfig[] => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const appTitle = "PrepWise";

  const openRouterModel = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";
  const openAiModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const openRouterKeys = Array.from(
    new Set([
      ...splitKeys(process.env.OPENROUTER_API_KEYS),
      ...splitKeys(process.env.OPENROUTER_API_KEY),
    ])
  );

  const openAiKeys = Array.from(
    new Set([
      ...splitKeys(process.env.OPENAI_API_KEYS),
      ...splitKeys(process.env.OPENAI_API_KEY),
    ])
  );

  return [
    ...openRouterKeys.map(
      (key, index): ProviderConfig => ({
        id: `openrouter-${index}`,
        provider: "openrouter",
        key,
        model: openRouterModel,
        appUrl,
        appTitle,
      })
    ),
    ...openAiKeys.map(
      (key, index): ProviderConfig => ({
        id: `openai-${index}`,
        provider: "openai",
        key,
        model: openAiModel,
      })
    ),
  ];
};

const parseContent = (body: unknown): string => {
  if (!body || typeof body !== "object") return "";

  const source = body as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return source.choices?.[0]?.message?.content?.trim() || "";
};

const parseErrorMessage = (body: unknown, fallback: string) => {
  if (!body || typeof body !== "object") return fallback;

  const source = body as {
    error?: { message?: string };
  };

  return source.error?.message || fallback;
};

const postChatCompletion = async (
  config: ProviderConfig,
  messages: ChatMessage[],
  temperature: number,
  signal?: AbortSignal
) => {
  if (config.provider === "openrouter") {
    return fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": config.appUrl,
        "X-Title": config.appTitle,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
      }),
      signal,
    });
  }

  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature,
    }),
    signal,
  });
};

export async function generateChatCompletionWithFailover(params: {
  messages: ChatMessage[];
  temperature?: number;
  signal?: AbortSignal;
}): Promise<ChatCompletionResult> {
  const { messages, temperature = 0.3, signal } = params;
  const providers = buildProviderQueue();

  if (!providers.length) {
    throw new Error(
      "No AI provider key configured. Set OPENROUTER_API_KEY(S) or OPENAI_API_KEY(S)."
    );
  }

  const eligibleProviders = providers.filter((provider) => !isProviderCoolingDown(provider.id));
  const queue = eligibleProviders.length ? eligibleProviders : providers;
  const failures: string[] = [];

  for (const config of queue) {
    for (let attempt = 0; attempt <= PROVIDER_RETRY_COUNT; attempt++) {
      try {
        const response = await postChatCompletion(config, messages, temperature, signal);
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          const category = classifyStatus(response.status);
          const message = parseErrorMessage(body, "AI request failed");
          failures.push(`${config.provider}:${response.status}`);

          if (category === "auth") setProviderCooldown(config.id, COOL_DOWN_AUTH_MS);
          if (category === "quota") setProviderCooldown(config.id, COOL_DOWN_QUOTA_MS);
          if (category === "transient") setProviderCooldown(config.id, COOL_DOWN_TRANSIENT_MS);

          if (category === "transient" && attempt < PROVIDER_RETRY_COUNT) {
            await sleep(RETRY_DELAY_MS * (attempt + 1));
            continue;
          }

          if (category !== "auth" && category !== "quota") {
            failures.push(`${config.provider}:detail:${message.slice(0, 80)}`);
          }

          break;
        }

        const content = parseContent(body);
        if (!content) {
          failures.push(`${config.provider}:empty-response`);
          if (attempt < PROVIDER_RETRY_COUNT) {
            await sleep(RETRY_DELAY_MS * (attempt + 1));
            continue;
          }
          break;
        }

        providerCooldownUntil.delete(config.id);
        return {
          content,
          provider: config.provider,
          model: config.model,
        };
      } catch (error) {
        failures.push(`${config.provider}:network`);
        setProviderCooldown(config.id, COOL_DOWN_TRANSIENT_MS);

        if (attempt < PROVIDER_RETRY_COUNT) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }

        if (error instanceof Error && error.name === "AbortError") {
          break;
        }

        break;
      }
    }
  }

  throw new Error(
    `AI providers temporarily unavailable. Retry later. Details: ${failures.join(" | ")}`
  );
}
