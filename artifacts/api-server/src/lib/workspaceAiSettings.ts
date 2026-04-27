import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { OpenAI } from "@workspace/integrations-openai-ai-server";
import { db, workspaceAiSettings, projects } from "@workspace/db";
import type { Request } from "express";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

export type WorkspaceProvider = "anthropic" | "openai" | "gemini" | "openrouter";
export const ALL_PROVIDERS: WorkspaceProvider[] = ["anthropic", "openai", "gemini", "openrouter"];

export class AiProviderDisabledError extends Error {
  status = 503 as const;
  provider: WorkspaceProvider;
  constructor(provider: WorkspaceProvider) {
    super(`AI provider "${provider}" is disabled for this workspace.`);
    this.name = "AiProviderDisabledError";
    this.provider = provider;
  }
}

export class AiProviderKeyDecryptError extends Error {
  status = 500 as const;
  provider: WorkspaceProvider;
  constructor(provider: WorkspaceProvider) {
    super(
      `Stored BYOK API key for provider "${provider}" could not be decrypted (SESSION_SECRET may have rotated). Re-enter the key in workspace settings.`,
    );
    this.name = "AiProviderKeyDecryptError";
    this.provider = provider;
  }
}

function getMasterKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET not configured");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptApiKey(plain: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptApiKey(payload: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const key = getMasterKey();
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

export interface ResolvedProviderSettings {
  enabled: boolean;
  apiKey: string | null;
  hasKey: boolean;
}

export async function getWorkspaceProviderSettings(
  workspaceId: number,
  provider: WorkspaceProvider,
): Promise<ResolvedProviderSettings> {
  const [row] = await db
    .select()
    .from(workspaceAiSettings)
    .where(
      and(
        eq(workspaceAiSettings.workspaceId, workspaceId),
        eq(workspaceAiSettings.provider, provider),
      ),
    );
  if (!row) {
    return { enabled: true, apiKey: null, hasKey: false };
  }
  if (!row.encryptedKey) {
    return { enabled: row.enabled, apiKey: null, hasKey: false };
  }
  const key = decryptApiKey(row.encryptedKey);
  if (key === null) {
    throw new AiProviderKeyDecryptError(provider);
  }
  return { enabled: row.enabled, apiKey: key, hasKey: true };
}

export async function getOpenAiImageClient(
  req: Request,
): Promise<{ client: OpenAI; usingByok: boolean }> {
  const wsId = await getWorkspaceIdForRequest(req);
  if (!wsId) {
    return { client: defaultImagesClient(), usingByok: false };
  }
  const settings = await getWorkspaceProviderSettings(wsId, "openai");
  if (!settings.enabled) throw new AiProviderDisabledError("openai");
  if (settings.apiKey) {
    return {
      client: new OpenAI({
        apiKey: settings.apiKey,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      }),
      usingByok: true,
    };
  }
  return { client: defaultImagesClient(), usingByok: false };
}

let _imagesClient: OpenAI | null = null;
function defaultImagesClient(): OpenAI {
  if (_imagesClient) return _imagesClient;
  _imagesClient = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
  return _imagesClient;
}

export async function listWorkspaceProviderSettings(
  workspaceId: number,
): Promise<Array<{ provider: WorkspaceProvider; enabled: boolean; hasKey: boolean }>> {
  const rows = await db
    .select()
    .from(workspaceAiSettings)
    .where(eq(workspaceAiSettings.workspaceId, workspaceId));
  const byProvider = new Map(rows.map((r) => [r.provider, r] as const));
  return ALL_PROVIDERS.map((p) => {
    const r = byProvider.get(p);
    return {
      provider: p,
      enabled: r ? r.enabled : true,
      hasKey: r ? !!r.encryptedKey : false,
    };
  });
}

export async function upsertWorkspaceProviderSettings(
  workspaceId: number,
  provider: WorkspaceProvider,
  patch: { enabled?: boolean; apiKey?: string | null },
): Promise<{ provider: WorkspaceProvider; enabled: boolean; hasKey: boolean }> {
  const [existing] = await db
    .select()
    .from(workspaceAiSettings)
    .where(
      and(
        eq(workspaceAiSettings.workspaceId, workspaceId),
        eq(workspaceAiSettings.provider, provider),
      ),
    );

  let encryptedKey: string | null | undefined = undefined;
  if (patch.apiKey === null) encryptedKey = null;
  else if (typeof patch.apiKey === "string" && patch.apiKey.trim().length > 0) {
    encryptedKey = encryptApiKey(patch.apiKey.trim());
  }

  if (!existing) {
    const [created] = await db
      .insert(workspaceAiSettings)
      .values({
        workspaceId,
        provider,
        enabled: patch.enabled ?? true,
        encryptedKey: encryptedKey ?? null,
      })
      .returning();
    return { provider, enabled: created.enabled, hasKey: !!created.encryptedKey };
  }

  const updates: Partial<typeof workspaceAiSettings.$inferInsert> = {};
  if (patch.enabled !== undefined) updates.enabled = patch.enabled;
  if (encryptedKey !== undefined) updates.encryptedKey = encryptedKey;
  if (Object.keys(updates).length === 0) {
    return { provider, enabled: existing.enabled, hasKey: !!existing.encryptedKey };
  }
  const [updated] = await db
    .update(workspaceAiSettings)
    .set(updates)
    .where(eq(workspaceAiSettings.id, existing.id))
    .returning();
  return { provider, enabled: updated.enabled, hasKey: !!updated.encryptedKey };
}

export async function getWorkspaceIdForRequest(req: Request): Promise<number | null> {
  if (req.workspace?.id) return req.workspace.id;
  const projectIdParam = req.params?.projectId;
  if (projectIdParam) {
    const projectId = Number(projectIdParam);
    if (Number.isFinite(projectId)) {
      const [p] = await db
        .select({ workspaceId: projects.workspaceId })
        .from(projects)
        .where(eq(projects.id, projectId));
      if (p?.workspaceId) return p.workspaceId;
    }
  }
  return null;
}
