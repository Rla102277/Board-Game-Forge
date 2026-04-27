import { anthropic } from "@workspace/integrations-anthropic-ai";
import { openai } from "@workspace/integrations-openai-ai-server";
import type { Request } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, appUsers, aiProviderSettings } from "@workspace/db";

export type AiTaskKind =
  | "narrative" // overview chat, playthrough, storyboard — always Anthropic Claude
  | "structured" // entity / rule / player gen, conflict check, kickstarter copy — uses user provider
  | "image"; // always OpenAI

export type AiProvider = "anthropic" | "openai" | "gemini" | "xai";

interface ProviderChoice {
  provider: AiProvider;
  model: string;
}

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const FAST_ANTHROPIC_MODEL = "claude-haiku-4-5";
const DEFAULT_OPENAI_MODEL = "gpt-5.4";

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
    return {
      provider: (pref.provider as AiProvider) ?? "anthropic",
      model: pref.model ?? null,
    };
  } catch {
    return null;
  }
}

export async function pickProvider(
  req: Request,
  kind: AiTaskKind,
  preferFast = false,
): Promise<ProviderChoice> {
  if (kind === "narrative") {
    return {
      provider: "anthropic",
      model: preferFast ? FAST_ANTHROPIC_MODEL : DEFAULT_ANTHROPIC_MODEL,
    };
  }
  if (kind === "image") {
    return { provider: "openai", model: "gpt-image-1" };
  }
  const pref = await getUserAiPreference(req);
  if (!pref) {
    return {
      provider: "anthropic",
      model: preferFast ? FAST_ANTHROPIC_MODEL : DEFAULT_ANTHROPIC_MODEL,
    };
  }
  // Gemini and xAI are not first-class — fall back to Anthropic gracefully.
  if (pref.provider === "gemini" || pref.provider === "xai") {
    return {
      provider: "anthropic",
      model: preferFast ? FAST_ANTHROPIC_MODEL : DEFAULT_ANTHROPIC_MODEL,
    };
  }
  if (pref.provider === "openai") {
    return {
      provider: "openai",
      model: pref.model ?? DEFAULT_OPENAI_MODEL,
    };
  }
  return {
    provider: "anthropic",
    model: pref.model ?? (preferFast ? FAST_ANTHROPIC_MODEL : DEFAULT_ANTHROPIC_MODEL),
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
  if (choice.provider === "openai") {
    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (opts.system) messages.push({ role: "system", content: opts.system });
    messages.push({ role: "user", content: opts.prompt });
    const r = await openai.chat.completions.create({
      model: choice.model,
      max_completion_tokens: max,
      messages,
    });
    return r.choices[0]?.message?.content ?? "";
  }
  const message = await anthropic.messages.create({
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
  let text = "";
  if (choice.provider === "openai") {
    const all: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
    if (opts.system) all.push({ role: "system", content: opts.system });
    for (const m of opts.messages) all.push(m);
    const s = await openai.chat.completions.create({
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
  const s = await anthropic.messages.stream({
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
        return null;
      }
    }
    return null;
  }
}
