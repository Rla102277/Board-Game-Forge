import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, notes } from "@workspace/db";
import { schemas } from "@workspace/api-zod";

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

export default router;
