import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, notes } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { complete, tryParseJsonObject } from "../lib/aiRouter";

const router: IRouter = Router();

router.get("/projects/:projectId/notes", async (req, res): Promise<void> => {
  const params = schemas.ListNotesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(notes)
    .where(eq(notes.projectId, params.data.projectId))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt));
  res.json(schemas.ListNotesResponse.parse(rows));
});

router.post("/projects/:projectId/notes", async (req, res): Promise<void> => {
  const params = schemas.CreateNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.CreateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(notes)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  res.status(201).json(row);
});

router.patch("/projects/:projectId/notes/:noteId", async (req, res): Promise<void> => {
  const params = schemas.UpdateNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.UpdateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(notes)
    .set(parsed.data)
    .where(
      and(
        eq(notes.id, params.data.noteId),
        eq(notes.projectId, params.data.projectId),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(schemas.UpdateNoteResponse.parse(row));
});

router.delete("/projects/:projectId/notes/:noteId", async (req, res): Promise<void> => {
  const params = schemas.DeleteNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(notes)
    .where(
      and(
        eq(notes.id, params.data.noteId),
        eq(notes.projectId, params.data.projectId),
      ),
    );
  res.sendStatus(204);
});

router.post(
  "/projects/:projectId/notes/:noteId/enhance",
  async (req, res): Promise<void> => {
    const params = schemas.AiEnhanceNoteParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [n] = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.id, params.data.noteId),
          eq(notes.projectId, params.data.projectId),
        ),
      );
    if (!n) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    try {
      const text = await complete(req, {
        prompt: `Polish this designer note. Tighten the writing, organize ideas, and add concrete next-step bullets where useful. Preserve the author's intent — do NOT invent new mechanics that aren't already implied.

Existing note:
title: ${n.title}
content: ${n.content ?? ""}

Return ONLY a JSON object: {"title":"...","content":"..."}.
- title under 100 chars.
- content can use markdown (bullet lists, **bold**), 2-6 short paragraphs / bullets max.
Output JUST the JSON object.`,
        maxTokens: 900,
      });
      const obj = tryParseJsonObject<{ title?: string; content?: string }>(text);
      const update: Record<string, string> = {};
      if (obj?.title) update.title = String(obj.title);
      if (obj?.content) update.content = String(obj.content);
      if (Object.keys(update).length === 0) {
        res.status(502).json({ error: "AI returned no usable content" });
        return;
      }
      const [updated] = await db
        .update(notes)
        .set(update)
        .where(eq(notes.id, n.id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "enhance note failed");
      res.status(500).json({ error: "Enhance failed" });
    }
  },
);

export default router;
