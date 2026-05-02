import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, researchItems, workspaces, projects, entities, rules, players, notes } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { complete, completeWithKimi, tryParseJsonArray, tryParseJsonObject } from "../lib/aiRouter";
import { logChange } from "../lib/changelog";
import { generateProjectSlug, isUniqueViolation } from "../lib/workspaceHelpers";

const router: IRouter = Router();

router.get("/projects/:projectId/research", async (req, res): Promise<void> => {
  const params = schemas.ListResearchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(researchItems)
    .where(eq(researchItems.projectId, params.data.projectId))
    .orderBy(desc(researchItems.createdAt));
  res.json(schemas.ListResearchResponse.parse(rows));
});

router.post("/projects/:projectId/research", async (req, res): Promise<void> => {
  const params = schemas.CreateResearchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.CreateResearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(researchItems)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  await logChange(req, params.data.projectId, "create", `Added research: ${row!.title}`, {
    entityKind: "research",
    entityRef: String(row!.id),
  });
  res.status(201).json(row);
});

router.patch(
  "/projects/:projectId/research/:researchId",
  async (req, res): Promise<void> => {
    const params = schemas.UpdateResearchParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.UpdateResearchBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [row] = await db
      .update(researchItems)
      .set(parsed.data)
      .where(
        and(
          eq(researchItems.id, params.data.researchId),
          eq(researchItems.projectId, params.data.projectId),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Research not found" });
      return;
    }
    res.json(schemas.UpdateResearchResponse.parse(row));
  },
);

router.delete(
  "/projects/:projectId/research/:researchId",
  async (req, res): Promise<void> => {
    const params = schemas.DeleteResearchParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(researchItems)
      .where(
        and(
          eq(researchItems.id, params.data.researchId),
          eq(researchItems.projectId, params.data.projectId),
        ),
      );
    res.sendStatus(204);
  },
);

router.post(
  "/projects/:projectId/research/ai-generate",
  async (req, res): Promise<void> => {
    const params = schemas.AiGenerateResearchParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.AiGenerateResearchBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const count = parsed.data.count ?? 4;
    try {
      const text = await complete(req, {
        prompt: `You are a tabletop game designer's research assistant. Produce ${count} research notes that would help a designer working on this brief: "${parsed.data.prompt}".

Return ONLY a JSON array (no prose, no code fences):
[{"title":"...","content":"...","tags":"..."}]
- title <= 70 chars.
- content is 2-4 sentences of substantive insight (mechanics, themes, comps, history).
- tags is a comma-separated list of 2-4 short tags.
Output JUST the JSON array.`,
        maxTokens: 2048,
      });
      const generated = tryParseJsonArray<{ title?: string; content?: string; tags?: string }>(text);
      if (generated.length === 0) {
        res.status(502).json({ error: "AI returned no items" });
        return;
      }
      const inserted = await db
        .insert(researchItems)
        .values(
          generated.slice(0, count).map((r) => ({
            projectId: params.data.projectId,
            title: String(r.title ?? "Untitled"),
            content: r.content ? String(r.content) : null,
            tags: r.tags ? String(r.tags) : null,
            source: "AI",
          })),
        )
        .returning();
      res.json(inserted);
    } catch (err) {
      req.log.error({ err }, "ai-generate-research failed");
      res.status(500).json({ error: "AI generation failed" });
    }
  },
);

router.post(
  "/projects/:projectId/research/:researchId/enhance",
  async (req, res): Promise<void> => {
    const params = schemas.AiEnhanceResearchParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [r] = await db
      .select()
      .from(researchItems)
      .where(
        and(
          eq(researchItems.id, params.data.researchId),
          eq(researchItems.projectId, params.data.projectId),
        ),
      );
    if (!r) {
      res.status(404).json({ error: "Research item not found" });
      return;
    }
    try {
      const text = await complete(req, {
        prompt: `Expand this research note for a tabletop game designer. Add concrete examples, comparable games, and a one-line takeaway. Tighten language; keep it punchy.

Existing item:
title: ${r.title}
tags: ${r.tags ?? ""}
content: ${r.content ?? ""}

Return ONLY a JSON object: {"title":"...","content":"...","tags":"..."}.
- title under 80 chars.
- content can use markdown, 3-6 short paragraphs / bullets max.
- tags is a comma-separated list of 2-5 short tags.
Output JUST the JSON object.`,
        maxTokens: 1100,
      });
      const obj = tryParseJsonObject<{ title?: string; content?: string; tags?: string }>(text);
      const update: Record<string, string> = {};
      if (obj?.title) update.title = String(obj.title);
      if (obj?.content) update.content = String(obj.content);
      if (obj?.tags) update.tags = String(obj.tags);
      if (Object.keys(update).length === 0) {
        res.status(502).json({ error: "AI returned no usable content" });
        return;
      }
      const [updated] = await db
        .update(researchItems)
        .set(update)
        .where(eq(researchItems.id, r.id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "enhance research failed");
      res.status(500).json({ error: "Enhance failed" });
    }
  },
);

router.post(
  "/projects/:projectId/research/game-lookup",
  async (req, res): Promise<void> => {
    const params = schemas.CreateResearchParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const { gameName, borrowing, avoiding, depth = "comprehensive" } = req.body as {
      gameName?: string;
      borrowing?: string;
      avoiding?: string;
      depth?: string;
    };
    if (!gameName?.trim()) {
      res.status(400).json({ error: "gameName is required" });
      return;
    }
    try {
      const contextParts = [
        borrowing ? `The designer wants to borrow: ${borrowing}` : null,
        avoiding ? `They want to avoid: ${avoiding}` : null,
      ].filter(Boolean).join(". ");

      const isQuick = depth === "quick";
      const quickPrompt = `Give a concise design snapshot of the board game "${gameName}".${contextParts ? ` Context: ${contextParts}.` : ""}

Return ONLY this JSON — no prose, no fences:
{
  "overview": "1-2 sentences: what is this game?",
  "keyMechanics": ["mechanic 1", "mechanic 2", "mechanic 3"],
  "playerCount": "e.g. 2-5 players",
  "playTime": "e.g. 60 min",
  "complexity": "e.g. Medium (2.8/5)",
  "designLessons": "1 sentence takeaway for designers",
  "tags": "comma-separated short tags"
}`;

      const comprehensivePrompt = `Write a thorough design breakdown of the board game "${gameName}" for a game designer using it as a reference.${contextParts ? ` Context: ${contextParts}.` : ""}

Return exactly this JSON shape:
{
  "overview": "2-3 sentences: what is this game and where does it sit in the hobby?",
  "coreLoop": "1-2 sentences: what does a player actually DO on their turn?",
  "keyMechanics": ["mechanic 1", "mechanic 2", "mechanic 3", "mechanic 4", "mechanic 5"],
  "playerCount": "e.g. 2-5 players",
  "playTime": "e.g. 60-90 min",
  "complexity": "e.g. Medium (2.8/5)",
  "designStrengths": ["strength 1", "strength 2", "strength 3"],
  "designWeaknesses": ["weakness 1", "weakness 2"],
  "designLessons": "2-3 sentences on what a designer can steal or learn from this game",
  "tags": "comma-separated short tags e.g. strategy, worker-placement, resource-management"
}`;

      const text = await complete(req, {
        system: "You are an expert tabletop game designer and analyst. Return only valid JSON — no prose, no markdown fences.",
        prompt: isQuick ? quickPrompt : comprehensivePrompt,
        maxTokens: isQuick ? 600 : 1800,
        preferFast: isQuick,
      });

      type GameData = {
        overview?: string;
        coreLoop?: string;
        keyMechanics?: string[];
        playerCount?: string;
        playTime?: string;
        complexity?: string;
        designStrengths?: string[];
        designWeaknesses?: string[];
        designLessons?: string;
        tags?: string;
      };
      const data = tryParseJsonObject<GameData>(text);
      if (!data) {
        res.status(502).json({ error: "AI returned no usable content" });
        return;
      }

      const md: string[] = [
        `## ${gameName}`,
        "",
        data.overview ?? "",
        "",
        [
          data.playerCount ? `**Players:** ${data.playerCount}` : null,
          data.playTime ? `**Time:** ${data.playTime}` : null,
          data.complexity ? `**Complexity:** ${data.complexity}` : null,
        ].filter(Boolean).join("  ·  "),
        "",
        "### How it plays",
        data.coreLoop ?? "",
        "",
      ];
      if (data.keyMechanics?.length) {
        md.push("### Key mechanics");
        data.keyMechanics.forEach((m) => md.push(`- ${m}`));
        md.push("");
      }
      if (data.designStrengths?.length) {
        md.push("### What makes it great");
        data.designStrengths.forEach((s) => md.push(`- ${s}`));
        md.push("");
      }
      if (data.designWeaknesses?.length) {
        md.push("### Watch out for");
        data.designWeaknesses.forEach((w) => md.push(`- ${w}`));
        md.push("");
      }
      if (data.designLessons) {
        md.push("### Designer takeaway");
        md.push(data.designLessons);
        md.push("");
      }
      if (borrowing) md.push(`**Borrowing:** ${borrowing}`);
      if (avoiding) md.push(`**Avoiding:** ${avoiding}`);

      const [row] = await db
        .insert(researchItems)
        .values({
          projectId: params.data.projectId,
          title: `${gameName} — Design Breakdown`,
          content: md.join("\n").trim(),
          tags: data.tags ?? "reference-game",
          source: "AI Game Lookup",
        })
        .returning();

      await logChange(req, params.data.projectId, "create", `Researched game: ${gameName}`, {
        entityKind: "research",
        entityRef: String(row!.id),
      });

      res.status(201).json({ research: row, gameData: data });
    } catch (err) {
      req.log.error({ err }, "game-lookup failed");
      res.status(500).json({ error: "Game lookup failed" });
    }
  },
);

/* ── Types shared with frontend ──────────────────────────────────────── */

type ReverseGameInput = {
  id: string;
  name: string;
  borrowing?: string;
  avoiding?: string;
  gameData?: {
    overview?: string;
    coreLoop?: string;
    keyMechanics?: string[];
    designStrengths?: string[];
    designWeaknesses?: string[];
    designLessons?: string;
    playerCount?: string;
    playTime?: string;
    complexity?: string;
  };
};

type GeneratedGame = {
  name?: string;
  description?: string;
  gameType?: string;
  genre?: string;
  playerCount?: string;
  targetDuration?: string;
  complexityScore?: number;
  blueprint?: string;
  entities?: Array<{ name?: string; type?: string; description?: string }>;
  rules?: Array<{ title?: string; category?: string; content?: string }>;
  players?: Array<{ name?: string; role?: string; description?: string }>;
  notes?: Array<{ title?: string; content?: string }>;
};

// Map AI-returned entity type strings to canonical GameForge types (#bug-fix)
const ENTITY_TYPE_MAP: Record<string, string> = {
  card: "Card", cards: "Card",
  deck: "Deck", decks: "Deck",
  token: "Token", tokens: "Token", piece: "Token", pieces: "Token", counter: "Token",
  meeple: "Meeple", meeples: "Meeple", pawn: "Meeple", pawns: "Meeple",
  die: "Die", dice: "Die",
  tile: "Tile", tiles: "Tile", hex: "Tile",
  board: "Board", boards: "Board",
  zone: "Zone", zones: "Zone", area: "Zone", areas: "Zone",
  location: "Location", locations: "Location", space: "Location",
  faction: "Faction", factions: "Faction", team: "Faction",
  event: "Event", events: "Event",
  resource: "Resource", resources: "Resource", currency: "Resource", commodity: "Resource",
  ability: "Ability", abilities: "Ability", power: "Ability", skill: "Ability",
};

function normalizeEntityType(raw: string | undefined): string {
  if (!raw) return "Token";
  const lower = raw.trim().toLowerCase();
  return ENTITY_TYPE_MAP[lower] ?? "Token";
}

async function insertReverseComponents(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: number,
  parsed: GeneratedGame,
): Promise<void> {
  if (Array.isArray(parsed.entities) && parsed.entities.length) {
    await tx.insert(entities).values(
      parsed.entities.slice(0, 20).map((e) => ({
        projectId,
        name: String(e.name ?? "Entity").slice(0, 80),
        type: normalizeEntityType(e.type),
        description: e.description ? String(e.description) : null,
      })),
    );
  }
  if (Array.isArray(parsed.rules) && parsed.rules.length) {
    await tx.insert(rules).values(
      parsed.rules.slice(0, 20).map((r) => ({
        projectId,
        title: String(r.title ?? "Rule").slice(0, 100),
        category: r.category ? String(r.category).slice(0, 40) : null,
        content: String(r.content ?? ""),
      })),
    );
  }
  if (Array.isArray(parsed.players) && parsed.players.length) {
    await tx.insert(players).values(
      parsed.players.slice(0, 12).map((p) => ({
        projectId,
        name: String(p.name ?? "Role").slice(0, 80),
        role: p.role ? String(p.role).slice(0, 80) : null,
        description: p.description ? String(p.description) : null,
      })),
    );
  }
  if (Array.isArray(parsed.notes) && parsed.notes.length) {
    await tx.insert(notes).values(
      parsed.notes.slice(0, 8).map((n) => ({
        projectId,
        title: n.title ? String(n.title).slice(0, 100) : "Designer note",
        content: n.content ? String(n.content) : null,
      })),
    );
  }
}

function buildReversePrompt(
  sourceGames: ReverseGameInput[],
  direction: string,
  mode: "new_project" | "populate_current",
): string {
  const gameBlocks = sourceGames.map((g) => {
    const lines = [`Game: ${g.name}`];
    if (g.gameData?.overview) lines.push(`Overview: ${g.gameData.overview}`);
    if (g.gameData?.coreLoop) lines.push(`Core loop: ${g.gameData.coreLoop}`);
    if (g.gameData?.keyMechanics?.length) lines.push(`Key mechanics: ${g.gameData.keyMechanics.join(", ")}`);
    if (g.gameData?.designLessons) lines.push(`Design lessons: ${g.gameData.designLessons}`);
    if (g.borrowing) lines.push(`Borrowing from it: ${g.borrowing}`);
    if (g.avoiding) lines.push(`Doing differently: ${g.avoiding}`);
    return lines.join("\n");
  }).join("\n\n---\n\n");

  const modeHint = mode === "populate_current"
    ? "You are populating an existing project — focus on generating rich, detailed components that fit together."
    : "You are creating a brand-new original game — give it a fresh name and identity.";

  return [
    "You are a world-class tabletop game designer.",
    modeHint,
    "",
    "Study these reference games deeply. Extract the strongest structural patterns, mechanics, and design DNA from each, then synthesize an original game concept that combines their best elements in a fresh way:",
    "",
    gameBlocks,
    "",
    direction ? `Designer's direction: ${direction}` : "",
    "",
    "Output ONLY a valid JSON object with this exact shape (no markdown, no commentary):",
    `{
  "name": "string — short and memorable (max 30 chars)",
  "description": "string — 2-3 sentence elevator pitch that explains what makes this game unique",
  "gameType": "Strategy|Party|Cooperative|Deck-builder|Roll-and-Write|Worker-Placement|Tile-Laying|Trick-Taking|Social-Deduction|Dexterity|Other",
  "genre": "Fantasy|Sci-fi|Modern|Historical|Abstract|Horror|Western|Space|Medieval|Other",
  "playerCount": "e.g. 2-5",
  "targetDuration": "e.g. 45-75 minutes",
  "complexityScore": 1-10,
  "blueprint": "string — 4-6 paragraphs covering: core loop, turn structure, win condition, player interaction, balance philosophy, what makes it feel fresh",
  "entities": [{ "name": "string", "type": "Card|Deck|Token|Meeple|Die|Tile|Board|Zone|Location|Faction|Event|Resource|Ability", "description": "string (1-2 sentences)" }],
  "rules": [{ "title": "string", "category": "Setup|Turn|Action|Scoring|Endgame|Special", "content": "string — clear, actionable, 1-3 sentences" }],
  "players": [{ "name": "string — role/archetype name", "role": "string", "description": "string (1-2 sentences)" }],
  "notes": [{ "title": "string", "content": "string — designer insight or open question" }]
}`,
    "",
    "Aim for: 6-8 entities, 7-10 rules, 3-5 player roles, 3-4 designer notes.",
    "Make every mechanic deliberate and every rule immediately playable.",
  ].filter(Boolean).join("\n");
}

router.post(
  "/projects/:projectId/reverse-engineer",
  async (req, res): Promise<void> => {
    const projectId = parseInt(req.params.projectId ?? "");
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid projectId" });
      return;
    }

    const { games, direction = "", mode = "new_project", workspaceSlug } = req.body as {
      games?: ReverseGameInput[];
      direction?: string;
      mode?: "new_project" | "populate_current";
      workspaceSlug?: string;
    };

    if (!Array.isArray(games) || games.length === 0) {
      res.status(400).json({ error: "At least one game is required" });
      return;
    }

    if (mode === "new_project" && !workspaceSlug) {
      res.status(400).json({ error: "workspaceSlug is required for new_project mode" });
      return;
    }

    let raw: string;
    try {
      raw = await completeWithKimi(req, {
        system: "You are a world-class senior tabletop game designer. Output only valid JSON, never prose or markdown.",
        prompt: buildReversePrompt(games, direction, mode),
        maxTokens: 10000,
      });
    } catch (err) {
      req.log.error({ err }, "reverse-engineer kimi failed");
      res.status(502).json({ error: "AI generation failed" });
      return;
    }

    const parsed = tryParseJsonObject<GeneratedGame>(raw);
    if (!parsed) {
      res.status(502).json({ error: "AI returned unreadable JSON. Please try again." });
      return;
    }

    try {
      if (mode === "populate_current") {
        await db.transaction(async (tx) => {
          // Update the project description and blueprint if generated
          const update: Record<string, string | number | null> = {};
          if (parsed.description) update.description = String(parsed.description);
          if (parsed.blueprint) update.blueprint = String(parsed.blueprint);
          if (parsed.gameType) update.gameType = String(parsed.gameType);
          if (parsed.genre) update.genre = String(parsed.genre);
          if (parsed.playerCount) update.playerCount = String(parsed.playerCount);
          if (parsed.targetDuration) update.targetDuration = String(parsed.targetDuration);
          if (typeof parsed.complexityScore === "number") {
            update.complexityScore = Math.max(1, Math.min(10, Math.round(parsed.complexityScore)));
          }
          if (Object.keys(update).length) {
            await tx.update(projects).set(update).where(eq(projects.id, projectId));
          }
          await insertReverseComponents(tx, projectId, parsed);
        });

        await logChange(req, projectId, "update", `Reverse-engineered from: ${games.map((g) => g.name).join(", ")}`, {
          entityKind: "project",
          entityRef: String(projectId),
        });

        const [proj] = await db.select().from(projects).where(eq(projects.id, projectId));
        res.json({ project: proj, mode: "populate_current" });
        return;
      }

      // new_project mode
      const [ws] = await db.select().from(workspaces).where(eq(workspaces.slug, workspaceSlug!));
      if (!ws) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const gameName = parsed.name?.trim() || `${games[0]!.name} Reimagined`;

      let newProject: typeof projects.$inferSelect | undefined;
      newProject = await db.transaction(async (tx) => {
        let attempt = 0;
        let inserted: typeof projects.$inferSelect | undefined;
        while (attempt < 5 && !inserted) {
          attempt += 1;
          const slug = await generateProjectSlug(ws.id, gameName);
          try {
            const rows = await tx.insert(projects).values({
              workspaceId: ws.id,
              ownerUserId: req.appUserId ?? undefined,
              slug,
              name: gameName.slice(0, 100),
              description: parsed.description ?? null,
              gameType: parsed.gameType ?? null,
              genre: parsed.genre ?? null,
              playerCount: parsed.playerCount ?? null,
              targetDuration: parsed.targetDuration ?? null,
              complexityScore: typeof parsed.complexityScore === "number"
                ? Math.max(1, Math.min(10, Math.round(parsed.complexityScore)))
                : null,
              blueprint: parsed.blueprint ?? null,
            }).returning();
            inserted = rows[0];
          } catch (err) {
            if (!isUniqueViolation(err)) throw err;
          }
        }
        if (!inserted) throw new Error("Could not allocate project slug");
        await insertReverseComponents(tx, inserted.id, parsed);
        return inserted;
      });

      res.status(201).json({ project: newProject, workspaceSlug: ws.slug, mode: "new_project" });
    } catch (err) {
      req.log.error({ err }, "reverse-engineer save failed");
      res.status(500).json({ error: "Could not save generated project" });
    }
  },
);

export default router;
