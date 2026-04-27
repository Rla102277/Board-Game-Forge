import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, assets, entities } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import {
  complete,
  tryParseJsonObject,
  pickStringFields,
  AiProviderDisabledError,
} from "../lib/aiRouter";
import { APIError as OpenAIAPIError, OpenAI } from "@workspace/integrations-openai-ai-server";
import { getOpenAiImageClient } from "../lib/workspaceAiSettings";

const router: IRouter = Router();

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const IMAGE_RETRY_DELAYS_MS = [800, 2000];

type ImageGenerateResponse = { data?: Array<{ b64_json?: string | null }> };

async function generateImageWithRetry(
  req: import("express").Request,
  client: OpenAI,
  params: {
    model: "gpt-image-1";
    prompt: string;
    size: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  },
): Promise<ImageGenerateResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= IMAGE_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const resp = await client.images.generate(params);
      return resp as ImageGenerateResponse;
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      const isRetryable =
        (typeof status === "number" && RETRYABLE_STATUS.has(status)) ||
        (err instanceof Error && /(ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|network)/i.test(err.message));
      if (!isRetryable || attempt === IMAGE_RETRY_DELAYS_MS.length) break;
      const delay = IMAGE_RETRY_DELAYS_MS[attempt];
      req.log.warn(
        { attempt: attempt + 1, status, delay },
        "generate-image: transient upstream error, retrying",
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function mapImageProviderError(err: unknown): { status: number; message: string } {
  if (err instanceof OpenAIAPIError) {
    const status = err.status ?? 500;
    const code = (err as { code?: string }).code ?? "";
    if (status === 429) {
      return {
        status: 429,
        message:
          "AI image provider is rate-limiting requests. Please wait a few seconds and try again.",
      };
    }
    if (code === "content_policy_violation" || status === 400) {
      return {
        status: 400,
        message:
          err.message ||
          "Image prompt was rejected by the AI provider. Try rephrasing the prompt.",
      };
    }
    if (status >= 500 && status < 600) {
      return {
        status: 503,
        message:
          "AI image provider is temporarily unavailable. Please try again in a moment.",
      };
    }
    return { status, message: err.message || "Image generation failed" };
  }
  // Non-APIError failures that survived retries (e.g. ECONNRESET, ETIMEDOUT,
  // EAI_AGAIN, generic "fetch failed") are upstream-availability issues from
  // the user's perspective, not bugs on our side — surface as 503 too.
  if (
    err instanceof Error &&
    /(ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|network|socket hang up)/i.test(err.message)
  ) {
    return {
      status: 503,
      message:
        "AI image provider is temporarily unreachable. Please try again in a moment.",
    };
  }
  return { status: 500, message: "Image generation failed" };
}

router.get("/projects/:projectId/assets", async (req, res): Promise<void> => {
  const params = schemas.ListAssetsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(assets)
    .where(eq(assets.projectId, params.data.projectId))
    .orderBy(desc(assets.createdAt));
  res.json(schemas.ListAssetsResponse.parse(rows));
});

router.post("/projects/:projectId/assets", async (req, res): Promise<void> => {
  const params = schemas.CreateAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.CreateAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(assets)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  res.status(201).json(row);
});

router.patch(
  "/projects/:projectId/assets/:assetId",
  async (req, res): Promise<void> => {
    const params = schemas.UpdateAssetParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.UpdateAssetBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [row] = await db
      .update(assets)
      .set(parsed.data)
      .where(
        and(
          eq(assets.id, params.data.assetId),
          eq(assets.projectId, params.data.projectId),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    res.json(schemas.UpdateAssetResponse.parse(row));
  },
);

router.delete(
  "/projects/:projectId/assets/:assetId",
  async (req, res): Promise<void> => {
    const params = schemas.DeleteAssetParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(assets)
      .where(
        and(
          eq(assets.id, params.data.assetId),
          eq(assets.projectId, params.data.projectId),
        ),
      );
    res.sendStatus(204);
  },
);

router.post(
  "/projects/:projectId/assets/:assetId/describe",
  async (req, res): Promise<void> => {
    const params = schemas.AiDescribeAssetParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [asset] = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.id, params.data.assetId),
          eq(assets.projectId, params.data.projectId),
        ),
      );
    if (!asset) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    let entityName: string | null = null;
    if (asset.entityId) {
      const [e] = await db
        .select()
        .from(entities)
        .where(eq(entities.id, asset.entityId));
      entityName = e?.name ?? null;
    }
    try {
      const text = await complete(req, {
        prompt: `You are writing flavor text for a board game ${asset.kind}.
Asset name: ${asset.name}
${entityName ? `Linked entity: ${entityName}` : ""}
Existing notes: ${asset.description ?? "(none)"}

Write a vivid 1-2 sentence flavor text quote (under 200 chars), evocative and on-theme. Output ONLY the flavor text — no quotes around it, no preamble.`,
        maxTokens: 300,
      });
      const flavor = text.trim().replace(/^["']|["']$/g, "");
      const [updated] = await db
        .update(assets)
        .set({ flavorText: flavor })
        .where(eq(assets.id, asset.id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "describe asset failed");
      res.status(500).json({ error: "AI describe failed" });
    }
  },
);

router.post(
  "/projects/:projectId/assets/:assetId/generate-image",
  async (req, res): Promise<void> => {
    const params = schemas.GenerateAssetImageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.GenerateAssetImageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [asset] = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.id, params.data.assetId),
          eq(assets.projectId, params.data.projectId),
        ),
      );
    if (!asset) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    try {
      const { client } = await getOpenAiImageClient(req);
      const response = await generateImageWithRetry(req, client, {
        model: "gpt-image-1",
        prompt: parsed.data.prompt,
        size: "1024x1024",
      });
      const base64 = response.data?.[0]?.b64_json ?? "";
      if (!base64) {
        req.log.warn({ assetId: asset.id }, "generate-image: empty response from provider");
        res.status(502).json({
          error: "AI image provider returned an empty response. Please try again.",
        });
        return;
      }
      const dataUrl = `data:image/png;base64,${base64}`;
      const [updated] = await db
        .update(assets)
        .set({ imageDataUrl: dataUrl, imagePrompt: parsed.data.prompt })
        .where(eq(assets.id, asset.id))
        .returning();
      res.json(updated);
    } catch (err) {
      if (err instanceof AiProviderDisabledError) {
        res.status(503).json({ error: err.message, provider: err.provider });
        return;
      }
      const mapped = mapImageProviderError(err);
      req.log.error(
        { err, mappedStatus: mapped.status },
        "generate-image failed",
      );
      res.status(mapped.status).json({ error: mapped.message });
    }
  },
);

router.post(
  "/projects/:projectId/assets/:assetId/enhance",
  async (req, res): Promise<void> => {
    const params = schemas.AiEnhanceAssetParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [a] = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.id, params.data.assetId),
          eq(assets.projectId, params.data.projectId),
        ),
      );
    if (!a) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    let entityName: string | null = null;
    if (a.entityId) {
      const [e] = await db
        .select()
        .from(entities)
        .where(eq(entities.id, a.entityId));
      entityName = e?.name ?? null;
    }
    try {
      const text = await complete(req, {
        prompt: `Enhance this game asset's metadata. Tighten the name, sharpen the description into a designer-facing brief, and write evocative flavor text.

Existing asset:
kind: ${a.kind}
name: ${a.name}
${entityName ? `linked entity: ${entityName}` : ""}
description: ${a.description ?? ""}
flavorText: ${a.flavorText ?? ""}

Return ONLY a flat JSON object (no wrapper, no nesting): {"name":"...","description":"...","flavorText":"..."}.
- name <= 60 chars; keep meaning, just tighten.
- description: 1-2 sentences focused on what makes this asset useful in play.
- flavorText: a single 1-2 sentence in-world quote (no surrounding quotes).
Output JUST the JSON object.`,
        maxTokens: 700,
      });
      const obj = tryParseJsonObject<Record<string, unknown>>(text);
      const picked = pickStringFields(obj, ["name", "description", "flavorText"] as const);
      const update: Record<string, string> = {};
      if (picked.name) update.name = picked.name;
      if (picked.description) update.description = picked.description;
      if (picked.flavorText) update.flavorText = picked.flavorText.replace(/^["']|["']$/g, "");
      if (Object.keys(update).length === 0) {
        req.log.warn(
          { aiTextSnippet: text.slice(0, 500) },
          "enhance asset: AI returned no usable fields",
        );
        res.status(502).json({ error: "AI returned no usable content" });
        return;
      }
      const [updated] = await db
        .update(assets)
        .set(update)
        .where(eq(assets.id, a.id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "enhance asset failed");
      res.status(500).json({ error: "Enhance failed" });
    }
  },
);

export default router;
