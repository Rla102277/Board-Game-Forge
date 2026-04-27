import { Router, type IRouter } from "express";
import { and, eq, asc } from "drizzle-orm";
import { db, rules } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { complete, tryParseJsonArray, tryParseJsonObject } from "../lib/aiRouter";

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
  try {
    const text = await complete(req, {
      prompt: `You are codifying the rulebook for a tabletop board game.
Generate exactly ${count} concise game rules based on this brief: "${parsed.data.prompt}"

Return ONLY a JSON array (no prose, no code fences):
[{"title":"...","category":"...","content":"...","priority":0}]
- category is one of: "Setup","Turn","Combat","Scoring","Endgame","Component","Variant","Optional"
- title under 60 chars.
- content is 1-3 sentences.
- priority 0 (highest) to 4 (lowest).
Output JUST the JSON array.`,
      maxTokens: 2048,
    });
    const generated = tryParseJsonArray<{ title?: string; content?: string; category?: string; priority?: number }>(text);
    if (generated.length === 0) {
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

router.post(
  "/projects/:projectId/rules/:ruleId/enhance",
  async (req, res): Promise<void> => {
    const params = schemas.AiEnhanceRuleParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [r] = await db
      .select()
      .from(rules)
      .where(
        and(
          eq(rules.id, params.data.ruleId),
          eq(rules.projectId, params.data.projectId),
        ),
      );
    if (!r) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    try {
      const text = await complete(req, {
        prompt: `Tighten this game rule. Make it shorter, more precise, with no ambiguity. Add an example if helpful.

Existing rule:
title: ${r.title}
category: ${r.category ?? ""}
content: ${r.content}

Return ONLY a JSON object: {"title":"...","content":"..."}.
- title under 60 chars.
- content 1-3 sentences plus an "Example:" line if helpful.
Output JUST the JSON object.`,
        maxTokens: 600,
      });
      const obj = tryParseJsonObject<{ title?: string; content?: string }>(text);
      const update: Record<string, string> = {};
      if (obj?.title) update.title = String(obj.title);
      if (obj?.content) update.content = String(obj.content);
      if (Object.keys(update).length === 0) {
        res.status(502).json({ error: "AI returned no usable content. Try again or switch model." });
        return;
      }
      const [updated] = await db
        .update(rules)
        .set(update)
        .where(eq(rules.id, r.id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "enhance rule failed");
      res.status(500).json({ error: "Enhance failed" });
    }
  },
);

router.post(
  "/projects/:projectId/rules/conflict-check",
  async (req, res): Promise<void> => {
    const params = schemas.ConflictCheckRulesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rs = await db
      .select()
      .from(rules)
      .where(eq(rules.projectId, params.data.projectId));
    if (rs.length < 2) {
      res.json(
        schemas.ConflictCheckRulesResponse.parse({
          conflicts: [],
          summary:
            "Add at least two rules before running a conflict check.",
        }),
      );
      return;
    }
    const list = rs
      .map((r) => `[#${r.id}] ${r.title}: ${r.content}`)
      .join("\n\n");
    try {
      const text = await complete(req, {
        preferFast: true,
        prompt: `You are a rules editor. Scan these rules for conflicts, contradictions, ambiguities, or overlaps. Return ONLY a JSON object:

{"summary":"<1-2 sentence overall verdict>","conflicts":[{"ruleIds":[<numbers>],"severity":"low|medium|high","description":"...","suggestion":"..."}]}

Use only rule IDs from the list. If no conflicts, return an empty conflicts array. Output JUST the JSON object.

Rules:
${list}`,
        maxTokens: 2000,
      });
      const obj = tryParseJsonObject<{
        summary?: string;
        conflicts?: Array<{
          ruleIds?: number[];
          severity?: string;
          description?: string;
          suggestion?: string;
        }>;
      }>(text) ?? { summary: "Unable to parse AI response", conflicts: [] };
      const conflicts = (obj.conflicts ?? []).map((c) => ({
        ruleIds: Array.isArray(c.ruleIds) ? c.ruleIds.map(Number) : [],
        severity: String(c.severity ?? "low"),
        description: String(c.description ?? ""),
        suggestion: c.suggestion ? String(c.suggestion) : "",
      }));
      res.json(
        schemas.ConflictCheckRulesResponse.parse({
          summary: String(obj.summary ?? "Conflict check complete."),
          conflicts,
        }),
      );
    } catch (err) {
      req.log.error({ err }, "conflict check failed");
      res.status(500).json({ error: "Conflict check failed" });
    }
  },
);

export default router;
