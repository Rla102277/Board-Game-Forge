import { Router, type IRouter } from "express";
import { and, eq, desc, asc, inArray, sql } from "drizzle-orm";
import {
  db,
  assets,
  assetEntityLinks,
  assetVersions,
  entities,
  projects,
} from "@workspace/db";
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
    n?: number;
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

// ─── Helpers for linkedEntityIds ─────────────────────────────────────────────

type AssetRow = typeof assets.$inferSelect;

async function fetchLinkedEntityIdsForAssets(
  assetIds: number[],
): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (assetIds.length === 0) return map;
  const rows = await db
    .select({ assetId: assetEntityLinks.assetId, entityId: assetEntityLinks.entityId })
    .from(assetEntityLinks)
    .where(inArray(assetEntityLinks.assetId, assetIds));
  for (const r of rows) {
    const list = map.get(r.assetId) ?? [];
    list.push(r.entityId);
    map.set(r.assetId, list);
  }
  return map;
}

async function getLinkedEntityIds(assetId: number): Promise<number[]> {
  const rows = await db
    .select({ entityId: assetEntityLinks.entityId })
    .from(assetEntityLinks)
    .where(eq(assetEntityLinks.assetId, assetId));
  return rows.map((r) => r.entityId);
}

function withLinks(
  asset: AssetRow,
  linkedEntityIds: number[],
): AssetRow & { linkedEntityIds: number[] } {
  return { ...asset, linkedEntityIds };
}

// ─── Asset CRUD ──────────────────────────────────────────────────────────────

router.get("/projects/:projectId/assets", async (req, res): Promise<void> => {
  try {
    const params = schemas.ListAssetsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(assets)
      .where(eq(assets.projectId, params.data.projectId))
      .orderBy(asc(assets.displayOrder), desc(assets.createdAt));
    const linksMap = await fetchLinkedEntityIdsForAssets(rows.map((r) => r.id));
    const enriched = rows.map((r) => withLinks(r, linksMap.get(r.id) ?? []));
    res.json(schemas.ListAssetsResponse.parse(enriched));
  } catch (err) {
    req.log.error({ err }, "list assets failed");
    res.status(500).json({ error: "Failed to load assets", details: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/projects/:projectId/assets", async (req, res): Promise<void> => {
  try {
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
    res.status(201).json(withLinks(row, []));
  } catch (err) {
    req.log.error({ err }, "create asset failed");
    res.status(500).json({ error: "Failed to create asset", details: err instanceof Error ? err.message : String(err) });
  }
});

router.patch(
  "/projects/:projectId/assets/:assetId",
  async (req, res): Promise<void> => {
    try {
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
      // If the primary entityId is being changed, also remove any matching
      // additional link so the link set never duplicates the new primary.
      const row = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(assets)
          .set(parsed.data)
          .where(
            and(
              eq(assets.id, params.data.assetId),
              eq(assets.projectId, params.data.projectId),
            ),
          )
          .returning();
        if (!updated) return null;
        // Whenever entityId is touched (set or cleared), reconcile links.
        if (Object.prototype.hasOwnProperty.call(parsed.data, "entityId")) {
          if (updated.entityId != null) {
            await tx
              .delete(assetEntityLinks)
              .where(
                and(
                  eq(assetEntityLinks.assetId, updated.id),
                  eq(assetEntityLinks.entityId, updated.entityId),
                ),
              );
          }
        }
        return updated;
      });
      if (!row) {
        res.status(404).json({ error: "Asset not found" });
        return;
      }
      const links = await getLinkedEntityIds(row.id);
      res.json(schemas.UpdateAssetResponse.parse(withLinks(row, links)));
    } catch (err) {
      req.log.error({ err }, "update asset failed");
      res.status(500).json({ error: "Failed to update asset", details: err instanceof Error ? err.message : String(err) });
    }
  },
);

router.delete(
  "/projects/:projectId/assets/:assetId",
  async (req, res): Promise<void> => {
    try {
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
    } catch (err) {
      req.log.error({ err }, "delete asset failed");
      res.status(500).json({ error: "Failed to delete asset", details: err instanceof Error ? err.message : String(err) });
    }
  },
);

// ─── PUT /assets/:id/links — replace additional entity links ─────────────────

router.put(
  "/projects/:projectId/assets/:assetId/links",
  async (req, res): Promise<void> => {
    try {
      const params = schemas.SetAssetLinksParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      const parsed = schemas.SetAssetLinksBody.safeParse(req.body);
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
      // De-duplicate, drop primary entityId from the link set (it's tracked separately),
      // and verify all referenced entities belong to this project.
      const requested = Array.from(new Set(parsed.data.entityIds)).filter(
        (id) => id !== asset.entityId,
      );
      if (requested.length > 0) {
        const valid = await db
          .select({ id: entities.id })
          .from(entities)
          .where(
            and(
              inArray(entities.id, requested),
              eq(entities.projectId, params.data.projectId),
            ),
          );
        if (valid.length !== requested.length) {
          res
            .status(400)
            .json({ error: "One or more entityIds do not belong to this project" });
          return;
        }
      }
      await db.transaction(async (tx) => {
        await tx
          .delete(assetEntityLinks)
          .where(eq(assetEntityLinks.assetId, asset.id));
        if (requested.length > 0) {
          await tx.insert(assetEntityLinks).values(
            requested.map((entityId) => ({ assetId: asset.id, entityId })),
          );
        }
      });
      res.json(withLinks(asset, requested));
    } catch (err) {
      req.log.error({ err }, "set asset links failed");
      res.status(500).json({ error: "Failed to update asset links", details: err instanceof Error ? err.message : String(err) });
    }
  },
);

// ─── AI describe (flavor text) ───────────────────────────────────────────────

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
      const links = await getLinkedEntityIds(updated.id);
      res.json(withLinks(updated, links));
    } catch (err) {
      req.log.error({ err }, "describe asset failed");
      res.status(500).json({ error: "AI describe failed" });
    }
  },
);

// ─── AI image generation: single (existing, returns saved asset) ─────────────

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
      const links = await getLinkedEntityIds(updated.id);
      res.json(withLinks(updated, links));
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

// ─── AI image variations: generate N candidates without saving ───────────────

router.post(
  "/projects/:projectId/assets/:assetId/generate-image-variations",
  async (req, res): Promise<void> => {
    const params = schemas.GenerateAssetImageVariationsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.GenerateAssetImageVariationsBody.safeParse(req.body);
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
    const n = Math.max(1, Math.min(4, parsed.data.n ?? 1));
    try {
      const { client } = await getOpenAiImageClient(req);
      const response = await generateImageWithRetry(req, client, {
        model: "gpt-image-1",
        prompt: parsed.data.prompt,
        size: "1024x1024",
        n,
      });
      const candidates = (response.data ?? [])
        .map((d) => d?.b64_json)
        .filter((b): b is string => Boolean(b))
        .map((b) => `data:image/png;base64,${b}`);
      if (candidates.length === 0) {
        req.log.warn({ assetId: asset.id }, "generate-image-variations: empty response");
        res.status(502).json({
          error: "AI image provider returned no candidates. Please try again.",
        });
        return;
      }
      res.json({ candidates });
    } catch (err) {
      if (err instanceof AiProviderDisabledError) {
        res.status(503).json({ error: err.message, provider: err.provider });
        return;
      }
      const mapped = mapImageProviderError(err);
      req.log.error(
        { err, mappedStatus: mapped.status },
        "generate-image-variations failed",
      );
      res.status(mapped.status).json({ error: mapped.message });
    }
  },
);

// ─── Save selected variation as the asset's current image ────────────────────

router.post(
  "/projects/:projectId/assets/:assetId/select-variation",
  async (req, res): Promise<void> => {
    const params = schemas.SelectAssetVariationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.SelectAssetVariationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (!/^data:image\/[a-zA-Z+.-]+;base64,/.test(parsed.data.dataUrl)) {
      res.status(400).json({ error: "dataUrl must be a base64 image data URL" });
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
    const updateSet: { imageDataUrl: string; imagePrompt?: string } = {
      imageDataUrl: parsed.data.dataUrl,
    };
    if (parsed.data.prompt) updateSet.imagePrompt = parsed.data.prompt;
    const [updated] = await db
      .update(assets)
      .set(updateSet)
      .where(eq(assets.id, asset.id))
      .returning();
    const links = await getLinkedEntityIds(updated.id);
    res.json(withLinks(updated, links));
  },
);

// ─── Asset version history ───────────────────────────────────────────────────

router.get(
  "/projects/:projectId/assets/:assetId/versions",
  async (req, res): Promise<void> => {
    const params = schemas.ListAssetVersionsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    // Verify asset belongs to project before exposing versions
    const [asset] = await db
      .select({ id: assets.id })
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
    const rows = await db
      .select()
      .from(assetVersions)
      .where(eq(assetVersions.assetId, asset.id))
      .orderBy(desc(assetVersions.createdAt));
    res.json(schemas.ListAssetVersionsResponse.parse(rows));
  },
);

router.post(
  "/projects/:projectId/assets/:assetId/versions",
  async (req, res): Promise<void> => {
    const params = schemas.CreateAssetVersionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.CreateAssetVersionBody.safeParse(req.body);
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
    if (!asset.imageDataUrl) {
      res
        .status(400)
        .json({ error: "Asset has no current image to snapshot" });
      return;
    }
    const [snap] = await db
      .insert(assetVersions)
      .values({
        assetId: asset.id,
        versionLabel: parsed.data.versionLabel ?? null,
        imageDataUrl: asset.imageDataUrl,
        imagePrompt: asset.imagePrompt ?? null,
        notes: parsed.data.notes ?? null,
        createdByUserId: req.appUserId ?? null,
      })
      .returning();
    res.status(201).json(snap);
  },
);

router.post(
  "/projects/:projectId/assets/:assetId/versions/:versionId/restore",
  async (req, res): Promise<void> => {
    const params = schemas.RestoreAssetVersionParams.safeParse(req.params);
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
    const [version] = await db
      .select()
      .from(assetVersions)
      .where(
        and(
          eq(assetVersions.id, params.data.versionId),
          eq(assetVersions.assetId, asset.id),
        ),
      );
    if (!version) {
      res.status(404).json({ error: "Version not found" });
      return;
    }
    const [updated] = await db
      .update(assets)
      .set({
        imageDataUrl: version.imageDataUrl,
        imagePrompt: version.imagePrompt,
      })
      .where(eq(assets.id, asset.id))
      .returning();
    const links = await getLinkedEntityIds(updated.id);
    res.json(withLinks(updated, links));
  },
);

router.delete(
  "/projects/:projectId/assets/:assetId/versions/:versionId",
  async (req, res): Promise<void> => {
    const params = schemas.DeleteAssetVersionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    // Verify asset belongs to project, then delete only versions of that asset
    const [asset] = await db
      .select({ id: assets.id })
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
    await db
      .delete(assetVersions)
      .where(
        and(
          eq(assetVersions.id, params.data.versionId),
          eq(assetVersions.assetId, asset.id),
        ),
      );
    res.sendStatus(204);
  },
);

// ─── AI enhance (returns suggestion only, not saved) ─────────────────────────

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
    const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId));
    let entityName: string | null = null;
    if (a.entityId) {
      const [e] = await db
        .select()
        .from(entities)
        .where(eq(entities.id, a.entityId));
      entityName = e?.name ?? null;
    }
    const narrativeLine = project?.narrative?.trim()
      ? `\nGame narrative: ${project.narrative.trim()}\n`
      : "";
    try {
      const text = await complete(req, {
        prompt: `Enhance this game asset's metadata. Tighten the name, sharpen the description into a designer-facing brief, and write evocative flavor text.${narrativeLine}
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
      const suggestion: { name?: string; description?: string; flavorText?: string } = {};
      if (picked.name) suggestion.name = picked.name;
      if (picked.description) suggestion.description = picked.description;
      if (picked.flavorText) suggestion.flavorText = picked.flavorText.replace(/^["']|["']$/g, "");
      if (Object.keys(suggestion).length === 0) {
        req.log.warn(
          { aiTextSnippet: text.slice(0, 500) },
          "enhance asset: AI returned no usable fields",
        );
        res.status(502).json({ error: "AI returned no usable content" });
        return;
      }
      res.json(suggestion);
    } catch (err) {
      if (err instanceof AiProviderDisabledError) {
        res.status(503).json({
          error: err.message,
          provider: err.provider,
          providerDisabled: true,
        });
        return;
      }
      req.log.error({ err }, "enhance asset failed");
      res.status(500).json({ error: "Enhance failed" });
    }
  },
);

// Silence unused-imports warning when sql helper is unused
void sql;

export default router;
