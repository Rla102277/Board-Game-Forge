import { Router, type IRouter } from "express";
import { and, eq, asc, inArray } from "drizzle-orm";
import { db, rules, entityRules, entities, projects } from "@workspace/db";
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
  const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId));
  const narrativeLine = project?.narrative?.trim()
    ? `\nGame narrative: ${project.narrative.trim()}\n`
    : "";
  try {
    const text = await complete(req, {
      prompt: `You are codifying the rulebook for a tabletop board game.${narrativeLine}
Generate exactly ${count} concise game rules based on this brief: "${parsed.data.prompt}"

Return ONLY a JSON array (no prose, no code fences). Emit each rule's keys in EXACTLY this order so the most important fields are produced first:
[{"title":"...","content":"...","category":"...","priority":0,"designNotes":"...","edgeCases":"..."}]
- title under 60 chars.
- content is 1-3 sentences (<= 400 chars).
- category is one of: "movement","combat","economy","turn_structure","variant".
- priority 0 (highest) to 4 (lowest).
- designNotes: 1-2 sentences (<= 200 chars) explaining the DESIGN INTENT — why this rule exists, what tension it creates, how it shapes player decisions.
- edgeCases: 1-3 short bullet points separated by ' • ' (<= 200 chars) describing tricky cases, exceptions, or common rule-lawyering attempts.
Output JUST the JSON array.`,
      maxTokens: 4000,
    });
    const generated = tryParseJsonArray<{ title?: string; content?: string; category?: string; priority?: number; designNotes?: string; edgeCases?: string }>(text);
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
          designNotes: typeof r.designNotes === "string" && r.designNotes.trim() ? r.designNotes : null,
          edgeCases: typeof r.edgeCases === "string" && r.edgeCases.trim() ? r.edgeCases : null,
        })),
      )
      .returning();
    res.json(inserted);
  } catch (err) {
    req.log.error({ err }, "ai-generate-rules failed");
    res.status(500).json({ error: "AI generation failed" });
  }
});

type EnhanceRuleAiResponse = {
  improvedTitle?: string;
  rewrittenContent?: string;
  designNotes?: string;
  edgeCases?: string;
  relatedRuleSuggestions?: Array<{ title?: string; content?: string; category?: string }>;
};

type RuleRow = typeof rules.$inferSelect;

function buildEnhanceRulePrompt(rule: RuleRow, existingTitles: string, narrativeLine: string): string {
  return `You are a senior board-game rules editor.${narrativeLine} Improve this rule and provide designer notes.

Return ONLY a JSON object — no prose, no code fences. List the keys in EXACTLY this order so the most important fields are emitted first:
{
  "rewrittenContent": "1-4 sentences. Precise, unambiguous. May include 'Example:' on its own line. Keep under 600 characters.",
  "improvedTitle": "tightened title (<= 60 chars). If already good, repeat the original.",
  "designNotes": "1-2 sentences explaining the DESIGN INTENT — why this rule exists, what tension it creates, how it shapes player decisions. (<= 240 chars)",
  "edgeCases": "1-3 short bullet points (separated by ' • ') describing tricky cases, exceptions, or common rule-lawyering attempts. (<= 240 chars)",
  "relatedRuleSuggestions": [
    {
      "title": "title for a NEW related rule (<= 60 chars)",
      "content": "1-2 sentences (<= 200 chars)",
      "category": "movement | combat | economy | turn_structure | variant"
    }
  ]
}

Suggest 1-3 related rules. Do NOT duplicate any of these existing rules:
${existingTitles}

Current rule:
title: ${rule.title}
category: ${rule.category ?? "(none)"}
priority: ${rule.priority}
content: ${rule.content}

Output JUST the JSON object. Keep total length under 1800 characters.`;
}

function parseEnhanceRuleResult(text: string, rule: RuleRow) {
  const obj = tryParseJsonObject<EnhanceRuleAiResponse>(text);
  if (!obj?.rewrittenContent) return null;
  const relatedRuleSuggestions = (obj.relatedRuleSuggestions ?? [])
    .filter((s) => s?.title && s?.content)
    .map((s) => ({
      title: String(s.title),
      content: String(s.content),
      category: String(s.category ?? "movement"),
    }));
  return {
    improvedTitle: String(obj.improvedTitle ?? rule.title),
    rewrittenContent: String(obj.rewrittenContent),
    designNotes: obj.designNotes ? String(obj.designNotes) : undefined,
    edgeCases: obj.edgeCases ? String(obj.edgeCases) : undefined,
    relatedRuleSuggestions,
  };
}

router.post(
  "/projects/:projectId/rules/:ruleId/enhance",
  async (req, res): Promise<void> => {
    const params = schemas.AiEnhanceRuleParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [rule] = await db
      .select()
      .from(rules)
      .where(and(eq(rules.id, params.data.ruleId), eq(rules.projectId, params.data.projectId)));
    if (!rule) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    const others = await db.select().from(rules).where(eq(rules.projectId, params.data.projectId));
    const existingTitles =
      others
        .filter((o) => o.id !== rule.id)
        .map((o) => `- ${o.title}`)
        .join("\n") || "(none)";
    const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId));
    const narrativeLine = project?.narrative?.trim()
      ? `\nGame narrative: ${project.narrative.trim()}\n`
      : "";
    try {
      const text = await complete(req, {
        prompt: buildEnhanceRulePrompt(rule, existingTitles, narrativeLine),
        maxTokens: 3000,
      });
      const result = parseEnhanceRuleResult(text, rule);
      if (!result) {
        req.log.warn({ aiTextSnippet: text.slice(0, 500) }, "enhance rule: AI returned no usable fields");
        res.status(502).json({ error: "AI returned no usable content. Try again or switch model." });
        return;
      }
      res.json(result);
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

router.get(
  "/projects/:projectId/rules/:ruleId/entities",
  async (req, res): Promise<void> => {
    const projectId = parseInt(req.params.projectId);
    const ruleId = parseInt(req.params.ruleId);
    if (isNaN(projectId) || isNaN(ruleId)) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }
    const links = await db
      .select()
      .from(entityRules)
      .where(eq(entityRules.ruleId, ruleId));
    if (links.length === 0) {
      res.json([]);
      return;
    }
    const entityIds = links.map((l) => l.entityId);
    const rows = await db
      .select({ id: entities.id, name: entities.name, type: entities.type, subtype: entities.subtype, color: entities.color })
      .from(entities)
      .where(and(inArray(entities.id, entityIds), eq(entities.projectId, projectId)));
    res.json(rows);
  },
);

export default router;
