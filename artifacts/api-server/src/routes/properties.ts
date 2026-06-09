import { Router, type IRouter } from "express";
import { and, eq, asc } from "drizzle-orm";
import { db, entityProperties, entities, projects } from "@workspace/db";
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
    try {
      const rows = await db
        .select()
        .from(entityProperties)
        .where(eq(entityProperties.entityId, params.data.entityId))
        .orderBy(asc(entityProperties.id));
      res.json(schemas.ListEntityPropertiesResponse.parse(rows));
    } catch (err) {
      req.log.error({ err }, "list entity properties failed");
      res.status(500).json({ error: "Failed to load properties" });
    }
  },
);

// Project-wide flat list of all entity properties (for the Ontology
// browser + property dictionary — avoids N round-trips).
router.get(
  "/projects/:projectId/entity-properties",
  async (req, res): Promise<void> => {
    const params = schemas.ListProjectEntityPropertiesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    try {
      // Single JOIN — avoids the N+1-style two-query approach and any
      // inArray parameter-limit issues on large projects.
      const rows = await db
        .select({
          id: entityProperties.id,
          entityId: entityProperties.entityId,
          name: entityProperties.name,
          dataType: entityProperties.dataType,
          unit: entityProperties.unit,
          value: entityProperties.value,
          textValue: entityProperties.textValue,
          minValue: entityProperties.minValue,
          maxValue: entityProperties.maxValue,
          defaultValue: entityProperties.defaultValue,
        })
        .from(entityProperties)
        .innerJoin(entities, eq(entities.id, entityProperties.entityId))
        .where(eq(entities.projectId, params.data.projectId))
        .orderBy(asc(entityProperties.id));
      res.json(rows);
    } catch (err) {
      req.log.error({ err }, "list project entity-properties failed");
      res.status(500).json({ error: "Failed to load entity properties" });
    }
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
    try {
      const [row] = await db
        .insert(entityProperties)
        .values({ ...parsed.data, entityId: params.data.entityId })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      req.log.error({ err }, "create entity property failed");
      res.status(500).json({ error: "Failed to create property" });
    }
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
    // When the client sends one of {defaultValue, textValue} but not the other,
    // treat that as an intent to switch storage columns and explicitly clear
    // the other one. Otherwise stale numeric defaults can leak into the UI
    // after a user edits a property to a string default (or vice versa).
    const rawBody = (req.body ?? {}) as Record<string, unknown>;
    const setData: Record<string, unknown> = { ...parsed.data };
    const hasDefault = Object.prototype.hasOwnProperty.call(rawBody, "defaultValue");
    const hasText = Object.prototype.hasOwnProperty.call(rawBody, "textValue");
    if (hasDefault && !hasText) setData.textValue = null;
    if (hasText && !hasDefault) setData.defaultValue = null;
    try {
      const [row] = await db
        .update(entityProperties)
        .set(setData)
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
    } catch (err) {
      req.log.error({ err }, "update entity property failed");
      res.status(500).json({ error: "Failed to update property" });
    }
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
    try {
      await db
        .delete(entityProperties)
        .where(
          and(
            eq(entityProperties.id, params.data.propertyId),
            eq(entityProperties.entityId, params.data.entityId),
          ),
        );
      res.sendStatus(204);
    } catch (err) {
      req.log.error({ err }, "delete entity property failed");
      res.status(500).json({ error: "Failed to delete property" });
    }
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
    // Pull existing properties and project info in parallel for better performance
    const [[project], existingProps] = await Promise.all([
      db.select().from(projects).where(eq(projects.id, params.data.projectId)),
      db.select().from(entityProperties).where(eq(entityProperties.entityId, entity.id)),
    ]);
    const existingNames = existingProps.map((p) => p.name).join(", ") || "none";
    const narrativeLine = project?.narrative?.trim()
      ? `\nGame narrative: ${project.narrative.trim()}\n`
      : "";
    try {
      const text = await complete(req, {
        prompt: `You are a senior board-game designer enhancing one entity in a game's design document.${narrativeLine}

Return ONLY a JSON object — no prose, no code fences. Emit keys in EXACTLY this order so the most important fields are produced first:
{
  "description": "1-2 vivid, concrete sentences (<= 200 chars) describing what this entity IS in the game.",
  "lore": "1 short flavor / world-building sentence in-character (<= 160 chars). Optional but encouraged.",
  "designNotes": "1-2 sentences explaining the DESIGN INTENT — why this entity exists, how it interacts with other systems, what tension/decisions it creates. (<= 220 chars)",
  "suggestedProperties": [
    {
      "name": "snake_case_name",
      "dataType": "number | string | boolean | enum",
      "defaultValue": "starting value as a string (e.g. \\"10\\", \\"common\\", \\"true\\"). Optional.",
      "reason": "1 sentence saying why this property matters. (<= 100 chars)"
    }
  ]
}

Suggest 3-5 NEW properties (do not repeat existing ones). Use snake_case names.

Current entity:
name: ${entity.name}
type: ${entity.type}${entity.subtype ? `/${entity.subtype}` : ""}
description: ${entity.description ?? ""}
stats: ${entity.stats ?? ""}
existing properties: ${existingNames}

Output JUST the JSON object. Keep total length under 1800 characters.`,
        maxTokens: 3000,
      });
      const obj = tryParseJsonObject<{
        description?: string;
        lore?: string;
        designNotes?: string;
        suggestedProperties?: Array<{
          name?: string;
          dataType?: string;
          defaultValue?: unknown;
          reason?: string;
        }>;
      }>(text);
      if (!obj?.description) {
        req.log.warn(
          { aiTextSnippet: text.slice(0, 500) },
          "enhance property: AI returned no usable fields",
        );
        res.status(502).json({ error: "AI returned no usable content. Try again or switch model." });
        return;
      }
      const suggestedProperties = (obj.suggestedProperties ?? [])
        .filter((p) => p?.name)
        .map((p) => ({
          name: String(p.name),
          dataType: String(p.dataType ?? "string"),
          defaultValue: p.defaultValue == null ? undefined : String(p.defaultValue),
          reason: String(p.reason ?? ""),
        }));
      res.json({
        description: String(obj.description),
        lore: obj.lore ? String(obj.lore) : undefined,
        designNotes: obj.designNotes ? String(obj.designNotes) : undefined,
        suggestedProperties,
      });
    } catch (err) {
      req.log.error({ err }, "enhance entity failed");
      res.status(500).json({ error: "AI enhance failed" });
    }
  },
);

export default router;
