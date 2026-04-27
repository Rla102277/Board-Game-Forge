import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import {
  db,
  projects,
  entities,
  rules,
  players,
  notes,
  tasks,
  chatMessages,
} from "@workspace/db";
import { schemas } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects", async (_req, res): Promise<void> => {
  const rows = await db.select().from(projects).orderBy(desc(projects.updatedAt));
  res.json(schemas.ListProjectsResponse.parse(rows));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = schemas.CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(projects).values(parsed.data).returning();
  res.status(201).json(schemas.GetProjectResponse.parse(row));
});

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const params = schemas.GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, params.data.projectId));
  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(schemas.GetProjectResponse.parse(row));
});

router.patch("/projects/:projectId", async (req, res): Promise<void> => {
  const params = schemas.UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(projects)
    .set(parsed.data)
    .where(eq(projects.id, params.data.projectId))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(schemas.UpdateProjectResponse.parse(row));
});

router.delete("/projects/:projectId", async (req, res): Promise<void> => {
  const params = schemas.DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(projects).where(eq(projects.id, params.data.projectId));
  res.sendStatus(204);
});

router.get("/projects/:projectId/stats", async (req, res): Promise<void> => {
  const params = schemas.GetProjectStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const projectId = params.data.projectId;
  const countSql = sql<number>`count(*)::int`;

  const [
    [entityRow],
    [ruleRow],
    [playerRow],
    [noteRow],
    [taskRow],
    [chatRow],
  ] = await Promise.all([
    db.select({ c: countSql }).from(entities).where(eq(entities.projectId, projectId)),
    db.select({ c: countSql }).from(rules).where(eq(rules.projectId, projectId)),
    db.select({ c: countSql }).from(players).where(eq(players.projectId, projectId)),
    db.select({ c: countSql }).from(notes).where(eq(notes.projectId, projectId)),
    db.select({ c: countSql }).from(tasks).where(eq(tasks.projectId, projectId)),
    db.select({ c: countSql }).from(chatMessages).where(eq(chatMessages.projectId, projectId)),
  ]);

  const stats = {
    entityCount: entityRow?.c ?? 0,
    ruleCount: ruleRow?.c ?? 0,
    playerCount: playerRow?.c ?? 0,
    noteCount: noteRow?.c ?? 0,
    taskCount: taskRow?.c ?? 0,
    chatMessageCount: chatRow?.c ?? 0,
  };
  res.json(schemas.GetProjectStatsResponse.parse(stats));
});

export default router;
