import { Router, type IRouter } from "express";
import { eq, asc, and } from "drizzle-orm";
import {
  db,
  chatMessages,
  projects,
  entities,
  rules,
  players,
} from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { stream } from "../lib/aiRouter";

const router: IRouter = Router();

const VALID_TABS = new Set([
  "overview",
  "research",
  "ontology",
  "players",
  "rules",
  "simulator",
  "assets",
  "playtesting",
  "tasks",
  "balance",
  "export",
  "notes",
  "storyboard",
]);

function tabFromQuery(q: unknown): string {
  const t = typeof q === "string" ? q : "overview";
  return VALID_TABS.has(t) ? t : "overview";
}

router.get("/projects/:projectId/chat", async (req, res): Promise<void> => {
  const params = schemas.ListChatMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tab = tabFromQuery(req.query.tab);
  const rows = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.projectId, params.data.projectId),
        eq(chatMessages.tab, tab),
      ),
    )
    .orderBy(asc(chatMessages.createdAt));
  res.json(schemas.ListChatMessagesResponse.parse(rows));
});

router.delete("/projects/:projectId/chat", async (req, res): Promise<void> => {
  const params = schemas.ClearChatMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tab = tabFromQuery(req.query.tab);
  await db
    .delete(chatMessages)
    .where(
      and(
        eq(chatMessages.projectId, params.data.projectId),
        eq(chatMessages.tab, tab),
      ),
    );
  res.sendStatus(204);
});

router.post("/projects/:projectId/chat/send", async (req, res): Promise<void> => {
  const params = schemas.SendChatMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const projectId = params.data.projectId;
  const tab = parsed.data.tab && VALID_TABS.has(parsed.data.tab) ? parsed.data.tab : "overview";
  const { content, gameType, genre } = parsed.data;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db.insert(chatMessages).values({
    projectId,
    tab,
    role: "user",
    content,
    gameType: gameType ?? null,
    genre: genre ?? null,
    model: parsed.data.model ?? null,
  });

  const history = await db
    .select()
    .from(chatMessages)
    .where(
      and(eq(chatMessages.projectId, projectId), eq(chatMessages.tab, tab)),
    )
    .orderBy(asc(chatMessages.createdAt));

  const [es, rs, ps] = await Promise.all([
    db.select().from(entities).where(eq(entities.projectId, projectId)),
    db.select().from(rules).where(eq(rules.projectId, projectId)),
    db.select().from(players).where(eq(players.projectId, projectId)),
  ]);

  const tabPrompts: Record<string, string> = {
    overview: "You are an AI Game Architect helping the designer iterate on the game's high-level concept, hook, and pillars.",
    research: "You are a research assistant helping the designer explore mechanics, comps, and references.",
    ontology: "You are a game systems analyst helping the designer build entity taxonomies and properties.",
    players: "You are a player-archetype consultant helping the designer balance asymmetric factions.",
    rules: "You are a rules editor helping the designer write tight, unambiguous game rules.",
    simulator: "You are a game-balance analyst helping the designer reason about playthroughs and economy.",
    assets: "You are an art director helping the designer specify card flavor, themes, and component aesthetics.",
    playtesting: "You are a playtest coordinator helping the designer interpret session feedback.",
    tasks: "You are a project manager helping the designer triage their backlog.",
    balance: "You are a numerical balance analyst.",
    export: "You are a publishing assistant helping prepare deliverables.",
    notes: "You are a brainstorming partner for free-form design ideas.",
    storyboard: "You are a narrative designer helping plan rule variants and branching design directions.",
  };

  const contextLines: string[] = [];
  contextLines.push(
    `Project: ${project.name}${project.description ? ` — ${project.description}` : ""}`,
  );
  if (project.gameType) contextLines.push(`Game type: ${project.gameType}`);
  if (project.genre) contextLines.push(`Genre: ${project.genre}`);
  if (project.playerCount) contextLines.push(`Player count: ${project.playerCount}`);
  if (project.targetDuration) contextLines.push(`Target duration: ${project.targetDuration}`);
  if (gameType) contextLines.push(`Current focus — game type: ${gameType}`);
  if (genre) contextLines.push(`Current focus — genre: ${genre}`);
  if (es.length)
    contextLines.push(
      `Entities (${es.length}): ${es.slice(0, 12).map((e) => `${e.name} (${e.type})`).join(", ")}`,
    );
  if (rs.length)
    contextLines.push(
      `Rules (${rs.length}): ${rs.slice(0, 8).map((r) => r.title).join("; ")}`,
    );
  if (ps.length)
    contextLines.push(
      `Players (${ps.length}): ${ps.slice(0, 8).map((p) => `${p.name}${p.role ? ` — ${p.role}` : ""}`).join(", ")}`,
    );

  const tabIntro = tabPrompts[tab] ?? tabPrompts.overview;
  const systemPrompt = `${tabIntro}

You are GameForge, an AI co-designer for tabletop board games. Be concise, specific, and opinionated. Prefer short numbered or bulleted lists over walls of prose. Suggest concrete numbers and mechanics rather than vague advice. Use markdown.

Current project context:
${contextLines.join("\n")}`;

  const apiMessages = history.map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
    content: m.content,
  }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let assistantText = "";
  let usedModel = "";
  let usedProvider = "";
  try {
    const result = await stream(req, {
      kind: "narrative",
      system: systemPrompt,
      messages: apiMessages,
      maxTokens: 2048,
      onChunk: (piece) => {
        assistantText += piece;
        res.write(`data: ${JSON.stringify({ content: piece })}\n\n`);
      },
    });
    usedModel = result.model;
    usedProvider = result.provider;
    if (assistantText.length > 0) {
      await db.insert(chatMessages).values({
        projectId,
        tab,
        role: "assistant",
        content: assistantText,
        gameType: gameType ?? null,
        genre: genre ?? null,
        model: usedModel,
        provider: usedProvider,
      });
    }
    res.write(
      `data: ${JSON.stringify({ done: true, model: usedModel, provider: usedProvider })}\n\n`,
    );
    res.end();
  } catch (err) {
    req.log.error({ err }, "chat stream failed");
    res.write(
      `data: ${JSON.stringify({ error: "AI request failed. Please try again." })}\n\n`,
    );
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

export default router;
