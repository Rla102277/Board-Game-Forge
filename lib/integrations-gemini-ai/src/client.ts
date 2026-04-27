import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

function build(): GoogleGenAI {
  if (!process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
    throw new Error(
      "AI_INTEGRATIONS_GEMINI_BASE_URL must be set. Did you forget to provision the Gemini AI integration?",
    );
  }
  if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
    throw new Error(
      "AI_INTEGRATIONS_GEMINI_API_KEY must be set. Did you forget to provision the Gemini AI integration?",
    );
  }
  return new GoogleGenAI({
    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
    httpOptions: {
      apiVersion: "",
      baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    },
  });
}

function getClient(): GoogleGenAI {
  if (!_ai) _ai = build();
  return _ai;
}

export const ai: GoogleGenAI = new Proxy({} as GoogleGenAI, {
  get(_t, prop, receiver) {
    const c = getClient() as unknown as Record<string | symbol, unknown>;
    return Reflect.get(c, prop, receiver);
  },
});
