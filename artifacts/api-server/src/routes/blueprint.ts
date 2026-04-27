import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projects, researchItems, entities, rules, players } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { stream, complete } from "../lib/aiRouter";

const router: IRouter = Router();

router.post(
  "/projects/:projectId/complexity",
  async (req, res): Promise<void> => {
    const params = schemas.ComputeComplexityParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const projectId = params.data.projectId;
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const [es, rs, ps] = await Promise.all([
      db.select().from(entities).where(eq(entities.projectId, projectId)),
      db.select().from(rules).where(eq(rules.projectId, projectId)),
      db.select().from(players).where(eq(players.projectId, projectId)),
    ]);
    const breakdown = [
      { factor: "Entities", value: Math.min(30, es.length * 2) },
      { factor: "Rules", value: Math.min(35, rs.length * 3) },
      { factor: "Player archetypes", value: Math.min(15, ps.length * 3) },
      {
        factor: "Description depth",
        value: Math.min(20, Math.floor((project.description?.length ?? 0) / 40)),
      },
    ];
    const score = Math.min(
      100,
      breakdown.reduce((s, b) => s + b.value, 0),
    );
    await db
      .update(projects)
      .set({ complexityScore: score })
      .where(eq(projects.id, projectId));
    res.json(schemas.ComputeComplexityResponse.parse({ score, breakdown }));
  },
);

router.post(
  "/projects/:projectId/blueprint",
  async (req, res): Promise<void> => {
    const params = schemas.GenerateBlueprintParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.GenerateBlueprintBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, params.data.projectId));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const system = `You are GameForge's AI Game Architect. Output a complete tabletop game blueprint as well-structured markdown. Use these section headings exactly: ## Concept, ## Core Loop, ## Components, ## Player Roles, ## Turn Structure, ## Victory Conditions, ## Balance Hooks, ## Variants, ## Production Notes. Be specific with numbers, components, and mechanics — no vague advice.`;

    const userMsg = `Project: ${project.name}
Game type: ${project.gameType ?? "—"}
Genre: ${project.genre ?? "—"}
Players: ${project.playerCount ?? "—"}
Duration: ${project.targetDuration ?? "—"}
Description: ${project.description ?? "—"}

Designer brief: ${parsed.data.prompt}

Produce the complete blueprint now.`;

    let full = "";
    try {
      const result = await stream(req, {
        kind: "narrative",
        system,
        messages: [{ role: "user", content: userMsg }],
        maxTokens: 4096,
        onChunk: (piece) => {
          full += piece;
          res.write(`data: ${JSON.stringify({ content: piece })}\n\n`);
        },
      });
      if (full.length > 0) {
        await db
          .update(projects)
          .set({ blueprint: full })
          .where(eq(projects.id, params.data.projectId));
      }
      res.write(`data: ${JSON.stringify({ done: true, model: result.model })}\n\n`);
      res.end();
    } catch (err) {
      req.log.error({ err }, "blueprint failed");
      res.write(`data: ${JSON.stringify({ error: "Blueprint failed" })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  },
);

router.post(
  "/projects/:projectId/ingest/text",
  async (req, res): Promise<void> => {
    const params = schemas.IngestTextParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.IngestTextBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const projectId = params.data.projectId;
    try {
      const summary = await complete(req, {
        prompt: `Summarize the following document for a board-game designer. Capture: (1) one-paragraph summary, (2) bulleted key insights (3-6 bullets), (3) ideas the designer should steal or adapt.

Document title: ${parsed.data.title}
Content:
${parsed.data.content.slice(0, 12000)}

Output well-formed markdown.`,
        maxTokens: 1500,
      });
      const [row] = await db
        .insert(researchItems)
        .values({
          projectId,
          title: parsed.data.title,
          content: summary,
          source: "Document upload",
          tags: "document, ai-summary",
        })
        .returning();
      res.json(row);
    } catch (err) {
      req.log.error({ err }, "ingest text failed");
      res.status(500).json({ error: "Ingest failed" });
    }
  },
);

router.post(
  "/projects/:projectId/ingest/url",
  async (req, res): Promise<void> => {
    const params = schemas.IngestUrlParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = schemas.IngestUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const projectId = params.data.projectId;
    try {
      const r = await fetch(parsed.data.url, {
        headers: { "User-Agent": "GameForge-Bot/1.0" },
      });
      const ct = r.headers.get("content-type") ?? "";
      if (!ct.includes("text") && !ct.includes("html")) {
        res.status(400).json({ error: "URL did not return text content" });
        return;
      }
      const html = await r.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 12000);
      const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
      const title = titleMatch?.[1]?.trim() || parsed.data.url;
      const summary = await complete(req, {
        prompt: `Summarize this web page for a board-game designer. Capture: (1) one-paragraph summary, (2) bulleted key insights (3-6 bullets), (3) ideas to steal or adapt.

URL: ${parsed.data.url}
Page text:
${text}

Output well-formed markdown.`,
        maxTokens: 1500,
      });
      const [row] = await db
        .insert(researchItems)
        .values({
          projectId,
          title,
          content: summary,
          source: parsed.data.url,
          tags: "url, ai-summary",
        })
        .returning();
      res.json(row);
    } catch (err) {
      req.log.error({ err }, "ingest url failed");
      res.status(500).json({ error: "Could not fetch URL" });
    }
  },
);

export default router;
