import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import {
  db,
  chatMessages,
  projects,
  entities,
  rules,
  players,
} from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

const ALLOWED_MODELS = new Set(["claude-sonnet-4-6", "claude-haiku-4-5"]);

router.get("/projects/:projectId/chat", async (req, res): Promise<void> => {
  const params = schemas.ListChatMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.projectId, params.data.projectId))
    .orderBy(asc(chatMessages.createdAt));
  res.json(schemas.ListChatMessagesResponse.parse(rows));
});

router.delete("/projects/:projectId/chat", async (req, res): Promise<void> => {
  const params = schemas.ClearChatMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(chatMessages).where(eq(chatMessages.projectId, params.data.projectId));
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
  const { content, gameType, genre } = parsed.data;
  const model =
    parsed.data.model && ALLOWED_MODELS.has(parsed.data.model)
      ? parsed.data.model
      : "claude-sonnet-4-6";

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
    role: "user",
    content,
    gameType: gameType ?? null,
    genre: genre ?? null,
    model,
  });

  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.projectId, projectId))
    .orderBy(asc(chatMessages.createdAt));

  const projectEntities = await db
    .select()
    .from(entities)
    .where(eq(entities.projectId, projectId));
  const projectRules = await db
    .select()
    .from(rules)
    .where(eq(rules.projectId, projectId));
  const projectPlayers = await db
    .select()
    .from(players)
    .where(eq(players.projectId, projectId));

  const contextLines: string[] = [];
  contextLines.push(
    `Project: ${project.name}${project.description ? ` — ${project.description}` : ""}`,
  );
  if (project.gameType) contextLines.push(`Project game type: ${project.gameType}`);
  if (project.genre) contextLines.push(`Project genre: ${project.genre}`);
  if (project.playerCount) contextLines.push(`Player count: ${project.playerCount}`);
  if (project.targetDuration) contextLines.push(`Target duration: ${project.targetDuration}`);
  if (gameType) contextLines.push(`Current focus — game type: ${gameType}`);
  if (genre) contextLines.push(`Current focus — genre: ${genre}`);
  if (projectEntities.length) {
    contextLines.push(
      `Entities (${projectEntities.length}): ${projectEntities
        .slice(0, 12)
        .map((e) => `${e.name} (${e.type})`)
        .join(", ")}`,
    );
  }
  if (projectRules.length) {
    contextLines.push(
      `Rules (${projectRules.length}): ${projectRules
        .slice(0, 8)
        .map((r) => r.title)
        .join("; ")}`,
    );
  }
  if (projectPlayers.length) {
    contextLines.push(
      `Players (${projectPlayers.length}): ${projectPlayers
        .slice(0, 8)
        .map((p) => `${p.name}${p.role ? ` — ${p.role}` : ""}`)
        .join(", ")}`,
    );
  }

  const systemPrompt = `You are GameForge, an AI co-designer for tabletop board games. You help indie designers iterate on rules, components, balance, and theme.

Be concise, specific, and opinionated. Reference real published games when useful. Suggest concrete changes (numbers, mechanics, components) rather than vague advice. Prefer short numbered or bulleted lists over walls of prose.

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

  try {
    const stream = await anthropic.messages.stream({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: apiMessages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const chunk = event.delta.text;
        assistantText += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
    }

    if (assistantText.length > 0) {
      await db.insert(chatMessages).values({
        projectId,
        role: "assistant",
        content: assistantText,
        gameType: gameType ?? null,
        genre: genre ?? null,
        model,
      });
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "chat stream failed");
    res.write(
      `data: ${JSON.stringify({
        error: "AI request failed. Please try again.",
      })}\n\n`,
    );
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

export default router;
