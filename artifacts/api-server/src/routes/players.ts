import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, players, projects } from "@workspace/db";
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
  try {
    const rows = await db
      .select()
      .from(players)
      .where(eq(players.projectId, params.data.projectId))
      .orderBy(asc(players.displayOrder), asc(players.id));

    // Normalize fields that may be objects in DB but schema expects strings
    const normalizedRows = rows.map((row) => ({
      ...row,
      startingResources: typeof row.startingResources === "object" && row.startingResources !== null
        ? JSON.stringify(row.startingResources)
        : row.startingResources,
      victoryCondition: typeof row.victoryCondition === "object" && row.victoryCondition !== null
        ? JSON.stringify(row.victoryCondition)
        : row.victoryCondition,
      specialAbility: typeof row.specialAbility === "object" && row.specialAbility !== null
        ? JSON.stringify(row.specialAbility)
        : row.specialAbility,
      description: typeof row.description === "object" && row.description !== null
        ? JSON.stringify(row.description)
        : row.description,
      strategy: typeof row.strategy === "object" && row.strategy !== null
        ? JSON.stringify(row.strategy)
        : row.strategy,
    }));

    res.json(schemas.ListPlayersResponse.parse(normalizedRows));
  } catch (err) {
    req.log.error({ err }, "list players failed");
    res.status(500).json({ error: "Failed to load players" });
  }
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
  try {
    const [row] = await db
      .insert(players)
      .values({ ...parsed.data, projectId: params.data.projectId })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "create player failed");
    res.status(500).json({ error: "Failed to create player" });
  }
});

router.patch(
  "/projects/:projectId/players/reorder",
  async (req, res): Promise<void> => {
    const params = schemas.ReorderPlayersParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.ReorderPlayersBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { playerIds } = parsed.data;
    const { projectId } = params.data;

    if (new Set(playerIds).size !== playerIds.length) {
      res.status(400).json({ error: "playerIds must not contain duplicates" });
      return;
    }

    try {
      const existing = await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.projectId, projectId));
      const existingIds = new Set(existing.map((r) => r.id));
      const foreign = playerIds.filter((id) => !existingIds.has(id));
      if (foreign.length > 0) {
        res.status(400).json({ error: `playerIds contain IDs not in this project: ${foreign.join(", ")}` });
        return;
      }

      const rows = await db.transaction(async (tx) => {
        await Promise.all(
          playerIds.map((id, idx) =>
            tx
              .update(players)
              .set({ displayOrder: idx })
              .where(
                and(
                  eq(players.id, id),
                  eq(players.projectId, projectId),
                ),
              ),
          ),
        );
        return tx
          .select()
          .from(players)
          .where(eq(players.projectId, projectId))
          .orderBy(asc(players.displayOrder), asc(players.id));
      });
      res.json(schemas.ReorderPlayersResponse.parse(rows));
    } catch (err) {
      req.log.error({ err }, "reorder players failed");
      res.status(500).json({ error: "Failed to reorder players" });
    }
  },
);

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
  try {
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
  } catch (err) {
    req.log.error({ err }, "update player failed");
    res.status(500).json({ error: "Failed to update player" });
  }
});

router.delete("/projects/:projectId/players/:playerId", async (req, res): Promise<void> => {
  const params = schemas.DeletePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    await db
      .delete(players)
      .where(
        and(
          eq(players.id, params.data.playerId),
          eq(players.projectId, params.data.projectId),
        ),
      );
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "delete player failed");
    res.status(500).json({ error: "Failed to delete player" });
  }
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
    const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId));
    const narrativeLine = project?.narrative?.trim()
      ? `\nGame narrative: ${project.narrative.trim()}\n`
      : "";
    try {
      const text = await complete(req, {
        prompt: `Design ${count} distinct player archetypes for a tabletop game with this brief: "${parsed.data.prompt}".${narrativeLine}

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
      res.json({ items: inserted, narrativeApplied: !!narrativeLine });
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
    const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId));
    const narrativeLine = project?.narrative?.trim()
      ? `\nGame narrative: ${project.narrative.trim()}\n`
      : "";
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
        prompt: `Enhance this character profile for a board game. Keep existing fields but rewrite empty or weak fields with vivid detail.${narrativeLine}

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
      res.json({ player: updated, narrativeApplied: !!narrativeLine });
    } catch (err) {
      req.log.error({ err }, "enhance player failed");
      res.status(500).json({ error: "Enhance failed" });
    }
  },
);

export default router;
