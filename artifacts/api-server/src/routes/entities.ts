import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, entities } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

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

const COLOR_PALETTE = [
  "#7c3aed",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#ec4899",
  "#8b5cf6",
  "#3b82f6",
];

router.post("/projects/:projectId/entities/ai-generate", async (req, res): Promise<void> => {
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
  const prompt = `You are designing entities for a tabletop board game.
Generate exactly ${count} distinct game entities based on this brief: "${parsed.data.prompt}"

Return ONLY a JSON array (no prose, no code fences) with this exact shape:
[{"name": "...", "type": "...", "description": "...", "stats": "..."}]
- type is one of: "card", "token", "unit", "resource", "tile", "deck", "board"
- stats is a short string like "ATK 3 / DEF 2 / Cost 4" or "Score: 5pt" — keep it under 60 chars.
- description is a single sentence under 140 chars.
Output JUST the JSON array.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const block = message.content[0];
    const text = block && block.type === "text" ? block.text : "[]";
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    let generated: Array<{ name: string; type: string; description?: string; stats?: string }> = [];
    try {
      generated = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) generated = JSON.parse(match[0]);
    }
    if (!Array.isArray(generated) || generated.length === 0) {
      res.status(502).json({ error: "AI returned no entities" });
      return;
    }
    const inserted = await db
      .insert(entities)
      .values(
        generated.slice(0, count).map((e, i) => ({
          projectId: params.data.projectId,
          name: String(e.name ?? "Untitled"),
          type: String(e.type ?? "card"),
          description: e.description ? String(e.description) : null,
          stats: e.stats ? String(e.stats) : null,
          color: COLOR_PALETTE[i % COLOR_PALETTE.length] ?? null,
        })),
      )
      .returning();
    res.json(inserted);
  } catch (err) {
    req.log.error({ err }, "ai-generate-entities failed");
    res.status(500).json({ error: "AI generation failed" });
  }
});

export default router;
