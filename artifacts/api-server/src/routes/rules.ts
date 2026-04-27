import { Router, type IRouter } from "express";
import { and, eq, asc } from "drizzle-orm";
import { db, rules } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

router.get("/projects/:projectId/rules", async (req, res): Promise<void> => {
  const params = schemas.ListRulesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(rules)
    .where(eq(rules.projectId, params.data.projectId))
    .orderBy(asc(rules.priority), asc(rules.createdAt));
  res.json(schemas.ListRulesResponse.parse(rows));
});

router.post("/projects/:projectId/rules", async (req, res): Promise<void> => {
  const params = schemas.CreateRuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.CreateRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(rules)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  res.status(201).json(row);
});

router.patch("/projects/:projectId/rules/:ruleId", async (req, res): Promise<void> => {
  const params = schemas.UpdateRuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.UpdateRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(rules)
    .set(parsed.data)
    .where(
      and(
        eq(rules.id, params.data.ruleId),
        eq(rules.projectId, params.data.projectId),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }
  res.json(schemas.UpdateRuleResponse.parse(row));
});

router.delete("/projects/:projectId/rules/:ruleId", async (req, res): Promise<void> => {
  const params = schemas.DeleteRuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(rules)
    .where(
      and(
        eq(rules.id, params.data.ruleId),
        eq(rules.projectId, params.data.projectId),
      ),
    );
  res.sendStatus(204);
});

router.post("/projects/:projectId/rules/ai-generate", async (req, res): Promise<void> => {
  const params = schemas.AiGenerateRulesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.AiGenerateRulesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const count = parsed.data.count ?? 5;
  const prompt = `You are codifying the rulebook for a tabletop board game.
Generate exactly ${count} concise game rules based on this brief: "${parsed.data.prompt}"

Return ONLY a JSON array (no prose, no code fences) with this exact shape:
[{"title": "...", "category": "...", "content": "...", "priority": 0}]
- category is one of: "Setup", "Turn", "Combat", "Scoring", "Endgame", "Component"
- title is under 60 chars.
- content is 1-3 sentences explaining the rule precisely.
- priority is 0 (highest) to 4 (lowest).
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
    let generated: Array<{ title: string; content: string; category?: string; priority?: number }> = [];
    try {
      generated = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) generated = JSON.parse(match[0]);
    }
    if (!Array.isArray(generated) || generated.length === 0) {
      res.status(502).json({ error: "AI returned no rules" });
      return;
    }
    const inserted = await db
      .insert(rules)
      .values(
        generated.slice(0, count).map((r) => ({
          projectId: params.data.projectId,
          title: String(r.title ?? "Untitled rule"),
          content: String(r.content ?? ""),
          category: r.category ? String(r.category) : null,
          priority: typeof r.priority === "number" ? r.priority : 1,
        })),
      )
      .returning();
    res.json(inserted);
  } catch (err) {
    req.log.error({ err }, "ai-generate-rules failed");
    res.status(500).json({ error: "AI generation failed" });
  }
});

export default router;
