import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, entities, entityRules, rules, projects } from "@workspace/db";
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
  // Physical game components
  Card:     "#7c3aed",
  Deck:     "#4f46e5",
  Token:    "#d97706",
  Die:      "#dc2626",
  Tile:     "#059669",
  Meeple:   "#2563eb",
  Board:    "#64748b",
  // World / narrative components
  Location: "#0891b2",
  Faction:  "#9333ea",
  Event:    "#ea580c",
  Resource: "#0d9488",
  Ability:  "#db2777",
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
    const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId));
    const narrativeLine = project?.narrative?.trim()
      ? `\nGame narrative: ${project.narrative.trim()}\n`
      : "";
    try {
      const text = await complete(req, {
        prompt: `Design ${count} distinct game components for a tabletop game with this brief: "${parsed.data.prompt}".${narrativeLine}

Return ONLY a JSON array (no prose, no code fences). Emit each component's keys in EXACTLY this order:
[{"name":"...","type":"...","subtype":"...","description":"...","stats":"...","relatedTo":"...","lore":"...","designNotes":"..."}]

Component types and their typical subtypes:
- "Card": Action, Item, Spell, Event, Quest, Encounter, Treasure, Attack, Defense
- "Deck": Item Deck, Event Deck, Encounter Deck, Spell Deck, Quest Deck
- "Token": Resource, Currency, Health, Status, Marker, Victory Point
- "Die": Action Die, Combat Die, Event Die, Skill Die, Custom
- "Tile": Map Tile, Dungeon Tile, Terrain, Room, Hex, Starting Tile
- "Meeple": Pawn, Figure, Standee, Miniature, Ship, Vehicle
- "Board": Main Board, Player Board, Map, Reference Sheet
- "Location": City, Dungeon, Region, Shop, Landmark, Lair
- "Faction": Guild, Tribe, Nation, Team, House, Order
- "Event": Random Event, Scenario, Story Beat, Encounter, Trigger
- "Resource": Currency, Material, Food, Energy, Mana, Influence
- "Ability": Passive, Active, Triggered, Ultimate, Reaction, Aura

Rules:
- type must be exactly one of the 12 types listed above.
- subtype is the most fitting specific tag from that type's list.
- description: 1 sentence under 140 chars.
- stats: short stat line under 60 chars (e.g. "ATK 3 / DEF 1 / Cost 2" or "Qty: 20 / Value: 1 gold").
- relatedTo: comma-separated names of related components (or empty).
- lore: 1 short flavor sentence in-character (<= 160 chars).
- designNotes: 1-2 sentences explaining DESIGN INTENT — why this exists, how it interacts with other systems, what tension it creates.
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

// ── Entity-Rule links ────────────────────────────────────────────────────────

router.get(
  "/projects/:projectId/entities/:entityId/rules",
  async (req, res): Promise<void> => {
    const projectId = parseInt(req.params.projectId);
    const entityId = parseInt(req.params.entityId);
    if (isNaN(projectId) || isNaN(entityId)) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }
    const links = await db
      .select()
      .from(entityRules)
      .where(eq(entityRules.entityId, entityId));
    res.json(links);
  },
);

router.post(
  "/projects/:projectId/entities/:entityId/rules/:ruleId",
  async (req, res): Promise<void> => {
    const projectId = parseInt(req.params.projectId);
    const entityId = parseInt(req.params.entityId);
    const ruleId = parseInt(req.params.ruleId);
    if (isNaN(projectId) || isNaN(entityId) || isNaN(ruleId)) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }
    const [rule] = await db
      .select()
      .from(rules)
      .where(and(eq(rules.id, ruleId), eq(rules.projectId, projectId)));
    if (!rule) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    const [link] = await db
      .insert(entityRules)
      .values({ entityId, ruleId })
      .onConflictDoNothing()
      .returning();
    res.status(201).json(link ?? { entityId, ruleId });
  },
);

router.delete(
  "/projects/:projectId/entities/:entityId/rules/:ruleId",
  async (req, res): Promise<void> => {
    const entityId = parseInt(req.params.entityId);
    const ruleId = parseInt(req.params.ruleId);
    if (isNaN(entityId) || isNaN(ruleId)) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }
    await db
      .delete(entityRules)
      .where(
        and(eq(entityRules.entityId, entityId), eq(entityRules.ruleId, ruleId)),
      );
    res.sendStatus(204);
  },
);

export default router;
