import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, players } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import {
  complete,
  tryParseJsonArray,
  tryParseJsonObject,
  pickStringFields,
} from "../lib/aiRouter";

const router: IRouter = Router();

router.get("/projects/:projectId/players", async (req, res): Promise<void> => {
  const params = schemas.ListPlayersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(players)
    .where(eq(players.projectId, params.data.projectId))
    .orderBy(asc(players.displayOrder), asc(players.id));
  res.json(schemas.ListPlayersResponse.parse(rows));
});

router.post("/projects/:projectId/players", async (req, res): Promise<void> => {
  const params = schemas.CreatePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.CreatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(players)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  res.status(201).json(row);
});

router.patch("/projects/:projectId/players/:playerId", async (req, res): Promise<void> => {
  const params = schemas.UpdatePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.UpdatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(players)
    .set(parsed.data)
    .where(
      and(
        eq(players.id, params.data.playerId),
        eq(players.projectId, params.data.projectId),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.json(schemas.UpdatePlayerResponse.parse(row));
});

router.delete("/projects/:projectId/players/:playerId", async (req, res): Promise<void> => {
  const params = schemas.DeletePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(players)
    .where(
      and(
        eq(players.id, params.data.playerId),
        eq(players.projectId, params.data.projectId),
      ),
    );
  res.sendStatus(204);
});

router.post(
  "/projects/:projectId/players/ai-generate",
  async (req, res): Promise<void> => {
    const params = schemas.AiGeneratePlayersParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.AiGeneratePlayersBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const count = parsed.data.count ?? 4;
    try {
      const text = await complete(req, {
        prompt: `Design ${count} distinct player archetypes for a tabletop game with this brief: "${parsed.data.prompt}".

Return ONLY a JSON array (no prose, no code fences):
[{"name":"...","role":"...","archetype":"...","description":"...","strategy":"...","startingResources":"...","victoryCondition":"...","specialAbility":"...","playstyle":"..."}]
- name: short faction/character name.
- role: short role like "Aggressor", "Builder", "Trickster".
- archetype: one of "Aggressive","Defensive","Economic","Tempo","Combo".
- description: 1 sentence.
- strategy: 1 sentence on optimal play.
- startingResources: short JSON-like string e.g. "{ gold:5, troops:2 }".
- victoryCondition: 1 sentence.
- specialAbility: 1 sentence describing a unique mechanic.
- playstyle: 1-2 words.
Output JUST the JSON array.`,
        maxTokens: 2500,
      });
      const generated = tryParseJsonArray<{
        name?: string;
        role?: string;
        archetype?: string;
        description?: string;
        strategy?: string;
        startingResources?: string;
        victoryCondition?: string;
        specialAbility?: string;
        playstyle?: string;
      }>(text);
      if (generated.length === 0) {
        res.status(502).json({ error: "AI returned no players" });
        return;
      }
      const inserted = await db
        .insert(players)
        .values(
          generated.slice(0, count).map((p) => ({
            projectId: params.data.projectId,
            name: String(p.name ?? "Unnamed"),
            role: p.role ? String(p.role) : null,
            archetype: p.archetype ? String(p.archetype) : null,
            description: p.description ? String(p.description) : null,
            strategy: p.strategy ? String(p.strategy) : null,
            startingResources: p.startingResources ? String(p.startingResources) : null,
            victoryCondition: p.victoryCondition ? String(p.victoryCondition) : null,
            specialAbility: p.specialAbility ? String(p.specialAbility) : null,
            playstyle: p.playstyle ? String(p.playstyle) : null,
          })),
        )
        .returning();
      res.json(inserted);
    } catch (err) {
      req.log.error({ err }, "ai-generate-players failed");
      res.status(500).json({ error: "AI generation failed" });
    }
  },
);

router.post(
  "/projects/:projectId/players/:playerId/enhance",
  async (req, res): Promise<void> => {
    const params = schemas.AiEnhancePlayerParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [p] = await db
      .select()
      .from(players)
      .where(
        and(
          eq(players.id, params.data.playerId),
          eq(players.projectId, params.data.projectId),
        ),
      );
    if (!p) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    try {
      const editable = {
        name: p.name,
        role: p.role,
        description: p.description,
        motivation: p.motivation,
        flaw: p.flaw,
        arc: p.arc,
        faction: p.faction,
        strategy: p.strategy,
        archetype: p.archetype,
        victoryCondition: p.victoryCondition,
        specialAbility: p.specialAbility,
        playstyle: p.playstyle,
        startingResources: p.startingResources,
      };
      const text = await complete(req, {
        prompt: `Enhance this character profile for a board game. Keep existing fields but rewrite empty or weak fields with vivid detail.

Existing character data:
${JSON.stringify(editable, null, 2)}

Return ONLY a flat JSON object with these field names (no wrapper, no nesting):
description, motivation, flaw, arc, strategy, archetype, victoryCondition, specialAbility, playstyle, startingResources, role

- description: 1-2 sentences about who they are and what makes them unique.
- motivation: what they want most (their core drive).
- flaw: what they fear or their key weakness/obstacle.
- arc: how they change through the game, or "N/A" for non-narrative types.
- strategy: 1 sentence on how they play optimally.
Output JUST the JSON object.`,
        maxTokens: 900,
      });
      const allowed = [
        "description",
        "motivation",
        "flaw",
        "arc",
        "strategy",
        "archetype",
        "victoryCondition",
        "specialAbility",
        "playstyle",
        "startingResources",
        "role",
      ] as const;
      const obj = tryParseJsonObject<Record<string, unknown>>(text);
      const update = pickStringFields(obj, allowed);
      if (Object.keys(update).length === 0) {
        req.log.warn(
          { aiTextSnippet: text.slice(0, 500) },
          "enhance player: AI returned no usable fields",
        );
        res.status(502).json({
          error: "AI returned no usable content. Try again or switch model.",
        });
        return;
      }
      const [updated] = await db
        .update(players)
        .set(update)
        .where(eq(players.id, p.id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "enhance player failed");
      res.status(500).json({ error: "Enhance failed" });
    }
  },
);

export default router;
