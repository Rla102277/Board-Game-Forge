import { Router, type IRouter, type Request } from "express";
import { and, asc, desc, eq, inArray, ilike, or, lte, gte, sql } from "drizzle-orm";
import {
  db,
  tasks,
  taskAssignees,
  taskSubtasks,
  taskDependencies,
  activityFeed,
  appUsers,
} from "@workspace/db";

const router: IRouter = Router();

function getUID(req: Request): number | null {
  return typeof req.appUserId === "number" ? req.appUserId : null;
}

function parseProjectId(req: Request): number {
  return parseInt(req.params.projectId as string, 10);
}

function parseTaskId(req: Request): number {
  return parseInt(req.params.taskId as string, 10);
}

// Build a "rich task" by joining assignee IDs and normalising numeric fields
async function buildRichTasks(taskRows: (typeof tasks.$inferSelect)[]) {
  if (taskRows.length === 0) return [];
  const taskIds = taskRows.map((t) => t.id);

  const assigneeRows = await db
    .select()
    .from(taskAssignees)
    .where(inArray(taskAssignees.taskId, taskIds));

  const assigneesByTask = new Map<number, number[]>();
  for (const row of assigneeRows) {
    const cur = assigneesByTask.get(row.taskId) ?? [];
    cur.push(row.userId);
    assigneesByTask.set(row.taskId, cur);
  }

  return taskRows.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    parentTaskId: t.parentTaskId ?? null,
    title: t.title,
    description: t.description ?? null,
    status: t.status,
    priority: t.priority,
    category: t.category ?? null,
    tags: (t.tags as string[]) ?? [],
    assigneeIds: assigneesByTask.get(t.id) ?? [],
    estimatedHours: t.estimatedHours != null ? parseFloat(t.estimatedHours as string) : null,
    actualHours: t.actualHours != null ? parseFloat(t.actualHours as string) : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
}

async function logActivity(
  projectId: number,
  userId: number,
  action: string,
  entityType: string,
  entityId: number,
  entityName: string,
  description: string,
  metadata?: Record<string, unknown>,
) {
  await db.insert(activityFeed).values({
    projectId,
    userId,
    action,
    entityType,
    entityId,
    entityName,
    description,
    metadata: metadata ?? null,
  });
}

// ─── List tasks ──────────────────────────────────────────────────────────────
router.get("/projects/:projectId/tasks", async (req, res): Promise<void> => {
  const projectId = parseProjectId(req);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid projectId" }); return; }

  const { status, priority, search, dueBefore, dueAfter, assigneeId } = req.query as Record<string, string | undefined>;

  let query = db.select().from(tasks).where(eq(tasks.projectId, projectId)).$dynamic();

  const conditions = [eq(tasks.projectId, projectId)];
  if (status) conditions.push(eq(tasks.status, status));
  if (priority) conditions.push(eq(tasks.priority, priority));
  if (search) conditions.push(ilike(tasks.title, `%${search}%`));
  if (dueBefore) conditions.push(lte(tasks.dueDate, new Date(dueBefore)));
  if (dueAfter) conditions.push(gte(tasks.dueDate, new Date(dueAfter)));

  let rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.createdAt));

  // Filter by assignee if requested (post-query since it requires join)
  if (assigneeId) {
    const aid = parseInt(assigneeId, 10);
    const assignedTaskIds = (
      await db.select({ taskId: taskAssignees.taskId }).from(taskAssignees).where(eq(taskAssignees.userId, aid))
    ).map((r) => r.taskId);
    rows = rows.filter((r) => assignedTaskIds.includes(r.id));
  }

  const rich = await buildRichTasks(rows);
  res.json(rich);
});

// ─── Create task ─────────────────────────────────────────────────────────────
router.post("/projects/:projectId/tasks", async (req, res): Promise<void> => {
  const projectId = parseProjectId(req);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid projectId" }); return; }

  const uid = getUID(req);
  const { assigneeIds, tags, estimatedHours, actualHours, dueDate, parentTaskId, ...rest } = req.body as {
    assigneeIds?: number[];
    tags?: string[];
    estimatedHours?: number;
    actualHours?: number;
    dueDate?: string;
    parentTaskId?: number;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    category?: string;
  };

  if (!rest.title) { res.status(400).json({ error: "title is required" }); return; }

  const [task] = await db
    .insert(tasks)
    .values({
      projectId,
      title: rest.title,
      description: rest.description ?? null,
      status: rest.status ?? "todo",
      priority: rest.priority ?? "medium",
      category: rest.category ?? null,
      tags: tags ?? [],
      parentTaskId: parentTaskId ?? null,
      estimatedHours: estimatedHours != null ? String(estimatedHours) : null,
      actualHours: actualHours != null ? String(actualHours) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
    })
    .returning();

  // Insert assignees
  if (assigneeIds && assigneeIds.length > 0) {
    await db.insert(taskAssignees).values(assigneeIds.map((uid) => ({ taskId: task.id, userId: uid }))).onConflictDoNothing();
  }

  if (uid) {
    await logActivity(projectId, uid, "created", "task", task.id, task.title, `Created task "${task.title}"`);
    // Create assignment notifications for new assignees
    if (assigneeIds && assigneeIds.length > 0) {
      const otherAssignees = assigneeIds.filter((id) => id !== uid);
      if (otherAssignees.length > 0) {
        const { notifications } = await import("@workspace/db");
        await db.insert(notifications).values(
          otherAssignees.map((assigneeUid) => ({
            userId: assigneeUid,
            projectId,
            type: "assignment",
            title: "You were assigned a task",
            message: `You were assigned to "${task.title}"`,
            entityType: "task",
            entityId: task.id,
            actorUserId: uid,
          })),
        );
      }
    }
  }

  const [rich] = await buildRichTasks([task]);
  res.status(201).json(rich);
});

// ─── Get single task ──────────────────────────────────────────────────────────
router.get("/projects/:projectId/tasks/:taskId", async (req, res): Promise<void> => {
  const projectId = parseProjectId(req);
  const taskId = parseTaskId(req);

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));

  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  const [rich] = await buildRichTasks([task]);
  res.json(rich);
});

// ─── Update task ─────────────────────────────────────────────────────────────
router.patch("/projects/:projectId/tasks/:taskId", async (req, res): Promise<void> => {
  const projectId = parseProjectId(req);
  const taskId = parseTaskId(req);
  const uid = getUID(req);

  const { assigneeIds, tags, estimatedHours, actualHours, dueDate, parentTaskId, ...rest } = req.body as {
    assigneeIds?: number[];
    tags?: string[];
    estimatedHours?: number | null;
    actualHours?: number | null;
    dueDate?: string | null;
    parentTaskId?: number | null;
    title?: string;
    description?: string | null;
    status?: string;
    priority?: string;
    category?: string | null;
  };

  const updateFields: Record<string, unknown> = { ...rest };
  if (tags !== undefined) updateFields.tags = tags;
  if (parentTaskId !== undefined) updateFields.parentTaskId = parentTaskId;
  if (estimatedHours !== undefined) updateFields.estimatedHours = estimatedHours != null ? String(estimatedHours) : null;
  if (actualHours !== undefined) updateFields.actualHours = actualHours != null ? String(actualHours) : null;
  if (dueDate !== undefined) updateFields.dueDate = dueDate ? new Date(dueDate) : null;

  const [task] = await db
    .update(tasks)
    .set(updateFields as unknown as Partial<typeof tasks.$inferInsert>)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
    .returning();

  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  // Sync assignees if provided
  if (assigneeIds !== undefined) {
    await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
    if (assigneeIds.length > 0) {
      await db.insert(taskAssignees).values(assigneeIds.map((uid) => ({ taskId, userId: uid }))).onConflictDoNothing();
    }
    // Notify newly assigned users
    if (uid && assigneeIds.length > 0) {
      const otherAssignees = assigneeIds.filter((id) => id !== uid);
      if (otherAssignees.length > 0) {
        const { notifications } = await import("@workspace/db");
        await db.insert(notifications).values(
          otherAssignees.map((assigneeUid) => ({
            userId: assigneeUid,
            projectId,
            type: "assignment",
            title: "You were assigned a task",
            message: `You were assigned to "${task.title}"`,
            entityType: "task",
            entityId: task.id,
            actorUserId: uid,
          })),
        ).onConflictDoNothing();
      }
    }
  }

  if (uid) {
    await logActivity(projectId, uid, "updated", "task", task.id, task.title, `Updated task "${task.title}"`);
  }

  const [rich] = await buildRichTasks([task]);
  res.json(rich);
});

// ─── Delete task ─────────────────────────────────────────────────────────────
router.delete("/projects/:projectId/tasks/:taskId", async (req, res): Promise<void> => {
  const projectId = parseProjectId(req);
  const taskId = parseTaskId(req);
  const uid = getUID(req);

  const [task] = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));

  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));

  if (uid) {
    await logActivity(projectId, uid, "deleted", "task", task.id, task.title, `Deleted task "${task.title}"`);
  }

  res.sendStatus(204);
});

// ─── Subtasks ─────────────────────────────────────────────────────────────────
router.get("/projects/:projectId/tasks/:taskId/subtasks", async (req, res): Promise<void> => {
  const taskId = parseTaskId(req);
  const rows = await db
    .select()
    .from(taskSubtasks)
    .where(eq(taskSubtasks.taskId, taskId))
    .orderBy(asc(taskSubtasks.orderIndex), asc(taskSubtasks.createdAt));
  res.json(rows.map((r) => ({
    id: r.id,
    taskId: r.taskId,
    title: r.title,
    completed: r.completed,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/projects/:projectId/tasks/:taskId/subtasks", async (req, res): Promise<void> => {
  const taskId = parseTaskId(req);
  const { title } = req.body as { title: string };
  if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }

  const existing = await db.select({ id: taskSubtasks.id }).from(taskSubtasks).where(eq(taskSubtasks.taskId, taskId));
  const [row] = await db.insert(taskSubtasks).values({ taskId, title: title.trim(), orderIndex: existing.length }).returning();
  res.status(201).json({ id: row.id, taskId: row.taskId, title: row.title, completed: row.completed, createdAt: row.createdAt.toISOString() });
});

router.patch("/projects/:projectId/tasks/:taskId/subtasks/:subtaskId", async (req, res): Promise<void> => {
  const subtaskId = parseInt(req.params.subtaskId as string, 10);
  const taskId = parseTaskId(req);
  const { completed, title } = req.body as { completed?: boolean; title?: string };

  const update: Record<string, unknown> = {};
  if (completed !== undefined) update.completed = completed;
  if (title !== undefined) update.title = title;

  const [row] = await db
    .update(taskSubtasks)
    .set(update as unknown as Partial<typeof taskSubtasks.$inferInsert>)
    .where(and(eq(taskSubtasks.id, subtaskId), eq(taskSubtasks.taskId, taskId)))
    .returning();

  if (!row) { res.status(404).json({ error: "Subtask not found" }); return; }
  res.json({ id: row.id, taskId: row.taskId, title: row.title, completed: row.completed, createdAt: row.createdAt.toISOString() });
});

router.delete("/projects/:projectId/tasks/:taskId/subtasks/:subtaskId", async (req, res): Promise<void> => {
  const subtaskId = parseInt(req.params.subtaskId as string, 10);
  const taskId = parseTaskId(req);
  await db.delete(taskSubtasks).where(and(eq(taskSubtasks.id, subtaskId), eq(taskSubtasks.taskId, taskId)));
  res.sendStatus(204);
});

// ─── Dependencies ─────────────────────────────────────────────────────────────
router.get("/projects/:projectId/tasks/:taskId/dependencies", async (req, res): Promise<void> => {
  const taskId = parseTaskId(req);
  const rows = await db
    .select({
      id: taskDependencies.id,
      taskId: taskDependencies.taskId,
      dependsOnTaskId: taskDependencies.dependsOnTaskId,
      type: taskDependencies.type,
      dependsOnTitle: tasks.title,
    })
    .from(taskDependencies)
    .leftJoin(tasks, eq(taskDependencies.dependsOnTaskId, tasks.id))
    .where(eq(taskDependencies.taskId, taskId));
  res.json(rows);
});

router.post("/projects/:projectId/tasks/:taskId/dependencies", async (req, res): Promise<void> => {
  const taskId = parseTaskId(req);
  const { dependsOnTaskId, type } = req.body as { dependsOnTaskId: number; type?: string };
  if (!dependsOnTaskId) { res.status(400).json({ error: "dependsOnTaskId is required" }); return; }

  const [row] = await db
    .insert(taskDependencies)
    .values({ taskId, dependsOnTaskId, type: type ?? "blocks" })
    .onConflictDoNothing()
    .returning();
  res.status(201).json(row);
});

router.delete("/projects/:projectId/tasks/:taskId/dependencies/:depId", async (req, res): Promise<void> => {
  const depId = parseInt(req.params.depId as string, 10);
  const taskId = parseTaskId(req);
  await db.delete(taskDependencies).where(and(eq(taskDependencies.id, depId), eq(taskDependencies.taskId, taskId)));
  res.sendStatus(204);
});

// ─── Project users (for assignee picker) ────────────────────────────────────
router.get("/projects/:projectId/users", async (req, res): Promise<void> => {
  const projectId = parseProjectId(req);

  // Get all users who have tasks assigned or are owners/members of the project's workspace
  const assigneeUserIds = await db
    .selectDistinct({ userId: taskAssignees.userId })
    .from(taskAssignees)
    .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
    .where(eq(tasks.projectId, projectId));

  // Also include the project owner and workspace members
  const projectRows = await db
    .select({ ownerUserId: sql<number>`owner_user_id`, workspaceId: sql<number>`workspace_id` })
    .from(sql`projects`)
    .where(sql`id = ${projectId}`);

  const userIdSet = new Set(assigneeUserIds.map((r) => r.userId));
  if (projectRows[0]?.ownerUserId) userIdSet.add(projectRows[0].ownerUserId);

  if (projectRows[0]?.workspaceId) {
    const { workspaceMembers } = await import("@workspace/db");
    const members = await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, projectRows[0].workspaceId), eq(workspaceMembers.status, "active")));
    members.forEach((m) => { if (m.userId) userIdSet.add(m.userId); });
  }

  const userIds = [...userIdSet].filter(Boolean);
  if (userIds.length === 0) {
    res.json([]);
    return;
  }

  const users = await db
    .select({ id: appUsers.id, email: appUsers.email, firstName: appUsers.firstName, lastName: appUsers.lastName, imageUrl: appUsers.imageUrl })
    .from(appUsers)
    .where(inArray(appUsers.id, userIds));

  res.json(users);
});

export default router;
