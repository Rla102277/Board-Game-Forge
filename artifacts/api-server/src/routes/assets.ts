import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, assets, entities } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { complete } from "../lib/aiRouter";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";

const router: IRouter = Router();

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
      const buf = await generateImageBuffer(parsed.data.prompt, "1024x1024");
      const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
      const [updated] = await db
        .update(assets)
        .set({ imageDataUrl: dataUrl, imagePrompt: parsed.data.prompt })
        .where(eq(assets.id, asset.id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "generate-image failed");
      res.status(500).json({ error: "Image generation failed" });
    }
  },
);

export default router;
