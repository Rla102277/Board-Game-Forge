export type AiProvider = "anthropic" | "openai" | "gemini" | "openrouter";

export interface ModelOption {
  provider: AiProvider;
  model: string;
  label: string;
  family: "claude" | "gpt" | "gemini" | "grok" | "perplexity";
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { provider: "anthropic", model: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", family: "claude" },
  { provider: "anthropic", model: "claude-haiku-4-5", label: "Claude Haiku 4.5", family: "claude" },
  { provider: "openai", model: "gpt-5.4", label: "GPT-5.4", family: "gpt" },
  { provider: "openai", model: "gpt-5-mini", label: "GPT-5 Mini", family: "gpt" },
  { provider: "gemini", model: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", family: "gemini" },
  { provider: "gemini", model: "gemini-3-flash-preview", label: "Gemini 3 Flash", family: "gemini" },
  { provider: "openrouter", model: "x-ai/grok-4-fast", label: "Grok 4 Fast", family: "grok" },
  { provider: "openrouter", model: "x-ai/grok-4", label: "Grok 4", family: "grok" },
  { provider: "openrouter", model: "perplexity/sonar", label: "Perplexity Sonar", family: "perplexity" },
  { provider: "openrouter", model: "perplexity/sonar-pro", label: "Perplexity Sonar Pro", family: "perplexity" },
];

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
};

export const FAMILY_LABELS: Record<ModelOption["family"], string> = {
  claude: "Claude (Anthropic)",
  gpt: "GPT (OpenAI)",
  gemini: "Gemini (Google)",
  grok: "Grok (xAI via OpenRouter)",
  perplexity: "Perplexity (via OpenRouter)",
};

export function findModelOption(provider?: string | null, model?: string | null): ModelOption | undefined {
  if (!provider) return undefined;
  return AVAILABLE_MODELS.find(
    (m) => m.provider === provider && (!model || m.model === model),
  );
}

export function defaultModelOption(): ModelOption {
  return AVAILABLE_MODELS[0];
}
