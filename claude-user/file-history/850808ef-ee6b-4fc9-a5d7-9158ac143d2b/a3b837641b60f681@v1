import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, entities } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { complete, tryParseJsonArray } from "../lib/aiRouter";

const router: IRouter = Router();

router.get("/projects/:projectId/entities", async (req, res): Promise<void> => {
  const params = schemas.ListEntitiesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(entities)
    .where(eq(entities.projectId, params.data.projectId))
    .orderBy(desc(entities.createdAt));
  res.json(schemas.ListEntitiesResponse.parse(rows));
});

router.post("/projects/:projectId/entities", async (req, res): Promise<void> => {
  const params = schemas.CreateEntityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.CreateEntityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(entities)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  res.status(201).json(row);
});

router.patch("/projects/:projectId/entities/:entityId", async (req, res): Promise<void> => {
  const params = schemas.UpdateEntityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.UpdateEntityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(entities)
    .set(parsed.data)
    .where(
      and(
        eq(entities.id, params.data.entityId),
        eq(entities.projectId, params.data.projectId),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Entity not found" });
    return;
  }
  res.json(schemas.UpdateEntityResponse.parse(row));
});

router.delete("/projects/:projectId/entities/:entityId", async (req, res): Promise<void> => {
  const params = schemas.DeleteEntityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(entities)
    .where(
      and(
        eq(entities.id, params.data.entityId),
        eq(entities.projectId, params.data.projectId),
      ),
    );
  res.sendStatus(204);
});

const TYPE_COLORS: Record<string, string> = {
  Item: "#f59e0b",
  Faction: "#7c3aed",
  Location: "#06b6d4",
  Event: "#ef4444",
  card: "#7c3aed",
  token: "#06b6d4",
  unit: "#ef4444",
  resource: "#10b981",
  tile: "#f59e0b",
  deck: "#3b82f6",
  board: "#ec4899",
};
const FALLBACK_COLORS = ["#7c3aed", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#8b5cf6", "#3b82f6"];

router.post(
  "/projects/:projectId/entities/ai-generate",
  async (req, res): Promise<void> => {
    const params = schemas.AiGenerateEntitiesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.AiGenerateEntitiesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const count = parsed.data.count ?? 4;
    try {
      const text = await complete(req, {
        prompt: `Design ${count} distinct game entities for a tabletop game with this brief: "${parsed.data.prompt}".

Return ONLY a JSON array (no prose, no code fences). Emit each entity's keys in EXACTLY this order so the most important fields are produced first:
[{"name":"...","type":"...","subtype":"...","description":"...","stats":"...","relatedTo":"...","lore":"...","designNotes":"..."}]
- type is one of "Item","Faction","Location","Event".
- subtype is a more specific tag like "Weapon", "Tribe", "City", "Disaster".
- description: 1 sentence under 140 chars.
- stats: short stat line under 60 chars.
- relatedTo: comma-separated names of related entities (or empty).
- lore: 1 short flavor / world-building sentence in-character (<= 160 chars).
- designNotes: 1-2 sentences (<= 200 chars) explaining the DESIGN INTENT — why this entity exists, how it interacts with other systems, what tension/decisions it creates.
Output JUST the JSON array.`,
        maxTokens: 4000,
      });
      const generated = tryParseJsonArray<{
        name?: string;
        type?: string;
        subtype?: string;
        description?: string;
        stats?: string;
        relatedTo?: string;
        lore?: string;
        designNotes?: string;
      }>(text);
      if (generated.length === 0) {
        res.status(502).json({ error: "AI returned no entities" });
        return;
      }
      const inserted = await db
        .insert(entities)
        .values(
          generated.slice(0, count).map((e, i) => {
            const t = String(e.type ?? "Item");
            return {
              projectId: params.data.projectId,
              name: String(e.name ?? "Untitled"),
              type: t,
              subtype: e.subtype ? String(e.subtype) : null,
              description: e.description ? String(e.description) : null,
              stats: e.stats ? String(e.stats) : null,
              relatedTo: e.relatedTo ? String(e.relatedTo) : null,
              lore: typeof e.lore === "string" && e.lore.trim() ? e.lore : null,
              designNotes: typeof e.designNotes === "string" && e.designNotes.trim() ? e.designNotes : null,
              color: TYPE_COLORS[t] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] ?? "#7c3aed",
            };
          }),
        )
        .returning();
      res.json(inserted);
    } catch (err) {
      req.log.error({ err }, "ai-generate-entities failed");
      res.status(500).json({ error: "AI generation failed" });
    }
  },
);

export default router;
