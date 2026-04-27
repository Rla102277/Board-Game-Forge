import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, researchItems } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { complete, tryParseJsonArray } from "../lib/aiRouter";
import { logChange } from "../lib/changelog";

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

export default router;
