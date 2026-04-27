import { Router, type IRouter } from "express";
import { and, eq, asc } from "drizzle-orm";
import { db, entityProperties, entities } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { complete, tryParseJsonObject } from "../lib/aiRouter";

const router: IRouter = Router();

router.get(
  "/projects/:projectId/entities/:entityId/properties",
  async (req, res): Promise<void> => {
    const params = schemas.ListEntityPropertiesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(entityProperties)
      .where(eq(entityProperties.entityId, params.data.entityId))
      .orderBy(asc(entityProperties.id));
    res.json(schemas.ListEntityPropertiesResponse.parse(rows));
  },
);

router.post(
  "/projects/:projectId/entities/:entityId/properties",
  async (req, res): Promise<void> => {
    const params = schemas.CreateEntityPropertyParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.CreateEntityPropertyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [row] = await db
      .insert(entityProperties)
      .values({ ...parsed.data, entityId: params.data.entityId })
      .returning();
    res.status(201).json(row);
  },
);

router.patch(
  "/projects/:projectId/entities/:entityId/properties/:propertyId",
  async (req, res): Promise<void> => {
    const params = schemas.UpdateEntityPropertyParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.UpdateEntityPropertyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [row] = await db
      .update(entityProperties)
      .set(parsed.data)
      .where(
        and(
          eq(entityProperties.id, params.data.propertyId),
          eq(entityProperties.entityId, params.data.entityId),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Property not found" });
      return;
    }
    res.json(schemas.UpdateEntityPropertyResponse.parse(row));
  },
);

router.delete(
  "/projects/:projectId/entities/:entityId/properties/:propertyId",
  async (req, res): Promise<void> => {
    const params = schemas.DeleteEntityPropertyParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(entityProperties)
      .where(
        and(
          eq(entityProperties.id, params.data.propertyId),
          eq(entityProperties.entityId, params.data.entityId),
        ),
      );
    res.sendStatus(204);
  },
);

router.post(
  "/projects/:projectId/entities/:entityId/enhance",
  async (req, res): Promise<void> => {
    const params = schemas.AiEnhanceEntityParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [entity] = await db
      .select()
      .from(entities)
      .where(
        and(
          eq(entities.id, params.data.entityId),
          eq(entities.projectId, params.data.projectId),
        ),
      );
    if (!entity) {
      res.status(404).json({ error: "Entity not found" });
      return;
    }
    try {
      const text = await complete(req, {
        prompt: `You are improving a tabletop game entity. Make its description vivid and evocative, and tighten its stats line.

Current entity:
name: ${entity.name}
type: ${entity.type}${entity.subtype ? `/${entity.subtype}` : ""}
description: ${entity.description ?? ""}
stats: ${entity.stats ?? ""}

Return ONLY a JSON object: {"description":"...","stats":"..."}.
- description: 1-2 sentences, vivid, under 180 chars.
- stats: short stat line under 60 chars.
Output JUST the JSON object.`,
        maxTokens: 600,
      });
      const obj = tryParseJsonObject<{ description?: string; stats?: string }>(text);
      const update: { description?: string; stats?: string } = {};
      if (obj?.description) update.description = String(obj.description);
      if (obj?.stats) update.stats = String(obj.stats);
      const [updated] = await db
        .update(entities)
        .set(update)
        .where(eq(entities.id, entity.id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "enhance entity failed");
      res.status(500).json({ error: "AI enhance failed" });
    }
  },
);

export default router;
