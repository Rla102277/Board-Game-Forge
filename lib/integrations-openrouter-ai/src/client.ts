import OpenAI from "openai";

let _client: OpenAI | null = null;

function build(): OpenAI {
  if (!process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL) {
    throw new Error(
      "AI_INTEGRATIONS_OPENROUTER_BASE_URL must be set. Did you forget to provision the OpenRouter AI integration?",
    );
  }
  if (!process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY) {
    throw new Error(
      "AI_INTEGRATIONS_OPENROUTER_API_KEY must be set. Did you forget to provision the OpenRouter AI integration?",
    );
  }
  return new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
  });
}

function getClient(): OpenAI {
  if (!_client) _client = build();
  return _client;
}

export const openrouter: OpenAI = new Proxy({} as OpenAI, {
  get(_t, prop, receiver) {
    const c = getClient() as unknown as Record<string | symbol, unknown>;
    return Reflect.get(c, prop, receiver);
  },
});
