import { anthropic as defaultAnthropic, Anthropic } from "@workspace/integrations-anthropic-ai";
import { openai as defaultOpenAi, OpenAI } from "@workspace/integrations-openai-ai-server";
import { ai as defaultGemini, GoogleGenAI } from "@workspace/integrations-gemini-ai";
import { openrouter as defaultOpenRouter } from "@workspace/integrations-openrouter-ai";
import type { Request } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, appUsers, aiProviderSettings } from "@workspace/db";
import {
  getWorkspaceIdForRequest,
  getWorkspaceProviderSettings,
  AiProviderDisabledError,
  type WorkspaceProvider,
} from "./workspaceAiSettings";

export { AiProviderDisabledError } from "./workspaceAiSettings";

export type AiTaskKind =
  | "narrative"
  | "structured"
  | "image";

export type AiProvider =
  | "anthropic"
  | "openai"
  | "gemini"
  | "openrouter";

export interface ProviderChoice {
  provider: AiProvider;
  model: string;
}

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const FAST_ANTHROPIC_MODEL = "claude-haiku-4-5";
const DEFAULT_OPENAI_MODEL = "gpt-5.4";
const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";
const FAST_GEMINI_MODEL = "gemini-3-flash-preview";
const PRO_GEMINI_MODEL = "gemini-3.1-pro-preview";
const DEFAULT_OPENROUTER_MODEL = "x-ai/grok-4-fast";

export interface ModelOption {
  provider: AiProvider;
  model: string;
  label: string;
  family: "claude" | "gpt" | "gemini" | "grok" | "perplexity";
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { provider: "anthropic", model: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (best balance)", family: "claude" },
  { provider: "anthropic", model: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fast)", family: "claude" },
  { provider: "openai", model: "gpt-5.4", label: "GPT-5.4 (smart)", family: "gpt" },
  { provider: "openai", model: "gpt-5-mini", label: "GPT-5 Mini (fast)", family: "gpt" },
  { provider: "gemini", model: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (deep reasoning)", family: "gemini" },
  { provider: "gemini", model: "gemini-3-flash-preview", label: "Gemini 3 Flash (fast)", family: "gemini" },
  { provider: "openrouter", model: "x-ai/grok-4-fast", label: "Grok 4 Fast (xAI)", family: "grok" },
  { provider: "openrouter", model: "x-ai/grok-4", label: "Grok 4 (xAI)", family: "grok" },
  { provider: "openrouter", model: "perplexity/sonar", label: "Perplexity Sonar (web-aware)", family: "perplexity" },
  { provider: "openrouter", model: "perplexity/sonar-pro", label: "Perplexity Sonar Pro", family: "perplexity" },
];

export async function getUserAiPreference(
  req: Request,
): Promise<{ provider: AiProvider; model: string | null } | null> {
  try {
    const { userId } = getAuth(req);
    if (!userId) return null;
    const [user] = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.clerkUserId, userId));
    if (!user) return null;
    const [pref] = await db
      .select()
      .from(aiProviderSettings)
      .where(eq(aiProviderSettings.userId, user.id));
    if (!pref) return null;
    const provider = (pref.provider as AiProvider) ?? "anthropic";
    if (!["anthropic", "openai", "gemini", "openrouter"].includes(provider)) {
      return { provider: "anthropic", model: null };
    }
    return { provider, model: pref.model ?? null };
  } catch {
    return null;
  }
}

function defaultModelFor(provider: AiProvider, preferFast: boolean): string {
  if (provider === "anthropic") return preferFast ? FAST_ANTHROPIC_MODEL : DEFAULT_ANTHROPIC_MODEL;
  if (provider === "openai") return preferFast ? "gpt-5-mini" : DEFAULT_OPENAI_MODEL;
  if (provider === "gemini") return preferFast ? FAST_GEMINI_MODEL : PRO_GEMINI_MODEL;
  return DEFAULT_OPENROUTER_MODEL;
}

export async function pickProvider(
  req: Request,
  kind: AiTaskKind,
  preferFast = false,
): Promise<ProviderChoice> {
  if (kind === "image") {
    return { provider: "openai", model: "gpt-image-1" };
  }
  const pref = await getUserAiPreference(req);
  // Narrative still defaults to Anthropic if user has no preference, since it's the most reliable for streaming.
  if (!pref) {
    return {
      provider: "anthropic",
      model: defaultModelFor("anthropic", preferFast),
    };
  }
  return {
    provider: pref.provider,
    model: pref.model ?? defaultModelFor(pref.provider, preferFast),
  };
}

interface ResolvedClients {
  anthropic: typeof defaultAnthropic;
  openai: typeof defaultOpenAi;
  gemini: typeof defaultGemini;
  openrouter: typeof defaultOpenRouter;
}

async function resolveProvider(
  req: Request,
  provider: AiProvider,
): Promise<{ apiKey: string | null }> {
  const wsId = await getWorkspaceIdForRequest(req);
  if (!wsId) return { apiKey: null };
  const settings = await getWorkspaceProviderSettings(wsId, provider as WorkspaceProvider);
  if (!settings.enabled) throw new AiProviderDisabledError(provider as WorkspaceProvider);
  return { apiKey: settings.apiKey };
}

function buildAnthropicClient(apiKey: string | null): typeof defaultAnthropic {
  if (!apiKey) return defaultAnthropic;
  return new Anthropic({ apiKey }) as unknown as typeof defaultAnthropic;
}

function buildOpenAiClient(apiKey: string | null): typeof defaultOpenAi {
  if (!apiKey) return defaultOpenAi;
  return new OpenAI({ apiKey }) as unknown as typeof defaultOpenAi;
}

function buildGeminiClient(apiKey: string | null): typeof defaultGemini {
  if (!apiKey) return defaultGemini;
  return new GoogleGenAI({ apiKey }) as unknown as typeof defaultGemini;
}

function buildOpenRouterClient(apiKey: string | null): typeof defaultOpenRouter {
  if (!apiKey) return defaultOpenRouter;
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  }) as unknown as typeof defaultOpenRouter;
}

async function resolveClients(req: Request, choice: ProviderChoice): Promise<ResolvedClients> {
  const { apiKey } = await resolveProvider(req, choice.provider);
  return {
    anthropic: choice.provider === "anthropic" ? buildAnthropicClient(apiKey) : defaultAnthropic,
    openai: choice.provider === "openai" ? buildOpenAiClient(apiKey) : defaultOpenAi,
    gemini: choice.provider === "gemini" ? buildGeminiClient(apiKey) : defaultGemini,
    openrouter: choice.provider === "openrouter" ? buildOpenRouterClient(apiKey) : defaultOpenRouter,
  };
}

export interface CompleteOptions {
  system?: string;
  prompt: string;
  maxTokens?: number;
  preferFast?: boolean;
  kind?: AiTaskKind;
}

export async function complete(
  req: Request,
  opts: CompleteOptions,
): Promise<string> {
  const choice = await pickProvider(
    req,
    opts.kind ?? "structured",
    opts.preferFast ?? false,
  );
  const max = opts.maxTokens ?? 2048;
  const clients = await resolveClients(req, choice);

  if (choice.provider === "openai" || choice.provider === "openrouter") {
    const client = choice.provider === "openai" ? clients.openai : clients.openrouter;
    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (opts.system) messages.push({ role: "system", content: opts.system });
    messages.push({ role: "user", content: opts.prompt });
    const r = await client.chat.completions.create({
      model: choice.model,
      max_completion_tokens: max,
      messages,
    });
    return r.choices[0]?.message?.content ?? "";
  }

  if (choice.provider === "gemini") {
    const r = await clients.gemini.models.generateContent({
      model: choice.model,
      contents: opts.prompt,
      config: opts.system
        ? { systemInstruction: opts.system, maxOutputTokens: max }
        : { maxOutputTokens: max },
    });
    return r.text ?? "";
  }

  const message = await clients.anthropic.messages.create({
    model: choice.model,
    max_tokens: max,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });
  const block = message.content[0];
  return block && block.type === "text" ? block.text : "";
}

export interface StreamOptions {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  preferFast?: boolean;
  kind?: AiTaskKind;
  onChunk: (text: string) => void;
}

export async function stream(
  req: Request,
  opts: StreamOptions,
): Promise<{ provider: AiProvider; model: string; text: string }> {
  const choice = await pickProvider(
    req,
    opts.kind ?? "narrative",
    opts.preferFast ?? false,
  );
  const max = opts.maxTokens ?? 2048;
  const clients = await resolveClients(req, choice);
  let text = "";

  if (choice.provider === "openai" || choice.provider === "openrouter") {
    const client = choice.provider === "openai" ? clients.openai : clients.openrouter;
    const all: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
    if (opts.system) all.push({ role: "system", content: opts.system });
    for (const m of opts.messages) all.push(m);
    const s = await client.chat.completions.create({
      model: choice.model,
      max_completion_tokens: max,
      messages: all,
      stream: true,
    });
    for await (const chunk of s) {
      const piece = chunk.choices[0]?.delta?.content;
      if (piece) {
        text += piece;
        opts.onChunk(piece);
      }
    }
    return { provider: choice.provider, model: choice.model, text };
  }

  if (choice.provider === "gemini") {
    const stream = await clients.gemini.models.generateContentStream({
      model: choice.model,
      contents: opts.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: opts.system
        ? { systemInstruction: opts.system, maxOutputTokens: max }
        : { maxOutputTokens: max },
    });
    for await (const chunk of stream) {
      const piece = chunk.text;
      if (piece) {
        text += piece;
        opts.onChunk(piece);
      }
    }
    return { provider: choice.provider, model: choice.model, text };
  }

  const s = await clients.anthropic.messages.stream({
    model: choice.model,
    max_tokens: max,
    system: opts.system,
    messages: opts.messages,
  });
  for await (const event of s) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const piece = event.delta.text;
      text += piece;
      opts.onChunk(piece);
    }
  }
  return { provider: choice.provider, model: choice.model, text };
}

export function tryParseJsonArray<T = unknown>(text: string): T[] {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
  try {
    const v = JSON.parse(cleaned);
    return Array.isArray(v) ? v : [];
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const v = JSON.parse(match[0]);
        return Array.isArray(v) ? v : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}

export function tryParseJsonObject<T = Record<string, unknown>>(
  text: string,
): T | null {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        // fall through to repair
      }
    }
    const repaired = repairTruncatedJsonObject(cleaned);
    if (repaired) {
      try {
        return JSON.parse(repaired) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Pick string fields from a parsed AI JSON response, tolerating wrapped
// shapes such as {"player": {...}}, {"data": {...}}, or {"result": {...}}.
// If no allowed keys are found at the top level, looks EXACTLY one level
// deep into immediate child object values and returns the first match.
// Does not recurse further — deeper matches are intentionally ignored to
// avoid pulling allowed-key names from unrelated nested noise.
// Empty strings are skipped.
export function pickStringFields(
  obj: unknown,
  allowed: readonly string[],
): Record<string, string> {
  const pickFlat = (v: unknown): Record<string, string> => {
    const result: Record<string, string> = {};
    if (!v || typeof v !== "object" || Array.isArray(v)) return result;
    const rec = v as Record<string, unknown>;
    for (const k of allowed) {
      const val = rec[k];
      if (typeof val === "string" && val.trim().length > 0) {
        result[k] = val;
      } else if (typeof val === "number" || typeof val === "boolean") {
        result[k] = String(val);
      }
    }
    return result;
  };
  const top = pickFlat(obj);
  if (Object.keys(top).length > 0) return top;
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return top;
  for (const child of Object.values(obj as Record<string, unknown>)) {
    const nested = pickFlat(child);
    if (Object.keys(nested).length > 0) return nested;
  }
  return top;
}

// Best-effort repair for JSON that was cut off mid-output (token cap, network).
// Collects every "safe cut" position (after a closed string, value, or `}`/`]`)
// while scanning, then attempts to close from the latest safe point and walks
// backwards through prior safe points until JSON.parse succeeds.
function repairTruncatedJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  const buf = text.slice(start);
  const safePoints: number[] = []; // indices (exclusive end) where it is safe to cut
  let inString = false;
  let escape = false;
  for (let i = 0; i < buf.length; i++) {
    const ch = buf[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        safePoints.push(i + 1);
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "}" || ch === "]") {
      safePoints.push(i + 1);
      continue;
    }
    if (ch === ",") {
      safePoints.push(i); // cut BEFORE the comma so we strip it
    }
  }
  if (safePoints.length === 0) return null;
  // Try latest safe point first, then walk back.
  for (let k = safePoints.length - 1; k >= 0; k--) {
    const cutAt = safePoints[k];
    let candidate = buf.slice(0, cutAt).replace(/,\s*$/, "");
    const state = scanJsonState(candidate);
    if (state.inString) candidate += '"';
    candidate += state.stack.reverse().join("");
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // try earlier point
    }
  }
  return null;
}

function scanJsonState(text: string): { stack: string[]; inString: boolean } {
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  return { stack, inString };
}
