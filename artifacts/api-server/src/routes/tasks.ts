import { Router, type IRouter } from "express";
import { and, eq, asc } from "drizzle-orm";
import { db, tasks } from "@workspace/db";
import { schemas } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects/:projectId/tasks", async (req, res): Promise<void> => {
  const params = schemas.ListTasksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, params.data.projectId))
    .orderBy(asc(tasks.createdAt));
  res.json(schemas.ListTasksResponse.parse(rows));
});

router.post("/projects/:projectId/tasks", async (req, res): Promise<void> => {
  const params = schemas.CreateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(tasks)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();
  res.status(201).json(row);
});

router.patch("/projects/:projectId/tasks/:taskId", async (req, res): Promise<void> => {
  const params = schemas.UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(tasks)
    .set(parsed.data)
    .where(
      and(
        eq(tasks.id, params.data.taskId),
        eq(tasks.projectId, params.data.projectId),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(schemas.UpdateTaskResponse.parse(row));
});

router.delete("/projects/:projectId/tasks/:taskId", async (req, res): Promise<void> => {
  const params = schemas.DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(tasks)
    .where(
      and(
        eq(tasks.id, params.data.taskId),
        eq(tasks.projectId, params.data.projectId),
      ),
    );
  res.sendStatus(204);
});

export default router;
