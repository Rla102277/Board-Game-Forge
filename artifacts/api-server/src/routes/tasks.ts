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
// Supports server-side filtering: status[], priority[], assigneeIds[], tags[], search, dueBefore, dueAfter, sortBy, sortOrder
router.get("/projects/:projectId/tasks", async (req, res): Promise<void> => {
  const projectId = parseProjectId(req);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid projectId" }); return; }

  const {
    status,
    priority,
    search,
    dueBefore,
    dueAfter,
    assigneeId,
    assigneeIds,
    tags,
    sortBy = "createdAt",
    sortOrder = "asc",
  } = req.query as Record<string, string | undefined>;

  // Support comma-separated values for multi-filter (e.g., status=todo,in_progress)
  const statuses = status?.split(",").filter(Boolean);
  const priorities = priority?.split(",").filter(Boolean);
  const assigneeIdList = assigneeIds?.split(",").map(Number).filter((n) => !isNaN(n));
  const tagList = tags?.split(",").filter(Boolean);

  try {
    const conditions = [eq(tasks.projectId, projectId)];

    // Multi-status filter
    if (statuses?.length === 1) {
      conditions.push(eq(tasks.status, statuses[0]));
    } else if (statuses && statuses.length > 1) {
      conditions.push(inArray(tasks.status, statuses));
    }

    // Multi-priority filter
    if (priorities?.length === 1) {
      conditions.push(eq(tasks.priority, priorities[0]));
    } else if (priorities && priorities.length > 1) {
      conditions.push(inArray(tasks.priority, priorities));
    }

    if (search) conditions.push(ilike(tasks.title, `%${search}%`));
    if (dueBefore) conditions.push(lte(tasks.dueDate, new Date(dueBefore)));
    if (dueAfter) conditions.push(gte(tasks.dueDate, new Date(dueAfter)));

    // Build base query
    let query = db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        parentTaskId: tasks.parentTaskId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        category: tasks.category,
        tags: tasks.tags,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(and(...conditions));

    // Apply sorting
    const sortColumn = sortBy === "dueDate" ? tasks.dueDate :
                      sortBy === "priority" ? tasks.priority :
                      sortBy === "status" ? tasks.status :
                      sortBy === "title" ? tasks.title :
                      tasks.createdAt;
    query = sortOrder === "desc" ? query.orderBy(desc(sortColumn)) : query.orderBy(asc(sortColumn));

    let rows = await query;

    // Server-side assignee filtering with JOIN for efficiency
    const targetAssignees = assigneeIdList ?? (assigneeId ? [parseInt(assigneeId, 10)] : []);
    if (targetAssignees.length > 0) {
      // Get task IDs that have any of the specified assignees
      const assignedTaskRows = await db
        .select({ taskId: taskAssignees.taskId })
        .from(taskAssignees)
        .where(and(
          inArray(taskAssignees.userId, targetAssignees),
          inArray(taskAssignees.taskId, rows.map((r) => r.id))
        ));
      const assignedTaskIds = new Set(assignedTaskRows.map((r) => r.taskId));
      rows = rows.filter((r) => assignedTaskIds.has(r.id));
    }

    // Server-side tag filtering
    if (tagList && tagList.length > 0) {
      rows = rows.filter((r) => {
        const taskTags = (r.tags as string[]) ?? [];
        return tagList.some((tag) => taskTags.includes(tag));
      });
    }

    const rich = await buildRichTasks(rows);
    res.json(rich);
  } catch (err) {
    req.log.error({ err }, "list tasks failed");
    res.status(500).json({ error: "Failed to load tasks" });
  }
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

  try {
    const [task] = await db
      .insert(tasks)
      .values({
        projectId,
        title: rest.title,
        description: rest.description ?? null,
        status: rest.status ?? "backlog",
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
  } catch (err) {
    req.log.error({ err }, "create task failed");
    res.status(500).json({ error: "Failed to create task" });
  }
});

// ─── Get single task ──────────────────────────────────────────────────────────
router.get("/projects/:projectId/tasks/:taskId", async (req, res): Promise<void> => {
  const projectId = parseProjectId(req);
  const taskId = parseTaskId(req);

  try {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));

    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    const [rich] = await buildRichTasks([task]);
    res.json(rich);
  } catch (err) {
    req.log.error({ err }, "get task failed");
    res.status(500).json({ error: "Failed to load task" });
  }
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

  // Snapshot the task BEFORE updating so we can diff `status` for the activity
  // feed and notify on key transitions (e.g. → done).
  const [previous] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));
  if (!previous) { res.status(404).json({ error: "Task not found" }); return; }

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
  let newAssignees: number[] = [];
  if (assigneeIds !== undefined) {
    const previousAssignees = (
      await db.select({ userId: taskAssignees.userId }).from(taskAssignees).where(eq(taskAssignees.taskId, taskId))
    ).map((r) => r.userId);
    await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
    if (assigneeIds.length > 0) {
      await db.insert(taskAssignees).values(assigneeIds.map((uid) => ({ taskId, userId: uid }))).onConflictDoNothing();
    }
    const prevSet = new Set(previousAssignees);
    newAssignees = assigneeIds.filter((id) => !prevSet.has(id));
    // Notify newly added assignees only.
    if (uid && newAssignees.length > 0) {
      const others = newAssignees.filter((id) => id !== uid);
      if (others.length > 0) {
        const { notifications } = await import("@workspace/db");
        await db.insert(notifications).values(
          others.map((assigneeUid) => ({
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
    const statusChanged = rest.status !== undefined && rest.status !== previous.status;
    if (statusChanged) {
      await logActivity(
        projectId,
        uid,
        "updated",
        "task",
        task.id,
        task.title,
        `Changed status of "${task.title}" from ${previous.status} to ${task.status}`,
        { field: "status", from: previous.status, to: task.status },
      );

      // Notify all current assignees (except actor) when a task is marked Done.
      if (task.status === "done") {
        const currentAssignees = (
          await db.select({ userId: taskAssignees.userId }).from(taskAssignees).where(eq(taskAssignees.taskId, taskId))
        ).map((r) => r.userId).filter((id) => id !== uid);
        if (currentAssignees.length > 0) {
          const { notifications } = await import("@workspace/db");
          await db.insert(notifications).values(
            currentAssignees.map((assigneeUid) => ({
              userId: assigneeUid,
              projectId,
              type: "status_change",
              title: "A task was marked Done",
              message: `"${task.title}" was marked Done`,
              entityType: "task",
              entityId: task.id,
              actorUserId: uid,
            })),
          ).onConflictDoNothing();
        }
      }

      // ─── Automation rules ───────────────────────────────────────────────
      // Evaluate user-defined rules stored in the `tasks-automations`
      // designer artifact. v1 supports "when status changes [to X], notify Y".
      try {
        const { designerArtifacts: daTbl, notifications: notifTbl } = await import("@workspace/db");
        const [row] = await db
          .select()
          .from(daTbl)
          .where(and(eq(daTbl.projectId, projectId), eq(daTbl.kind, "tasks-automations")));
        const data = row?.data as { rules?: Array<{
          id: string;
          name: string;
          enabled: boolean;
          trigger: { type: string; toStatus?: string };
          action: { type: string; target: string; userId?: number };
        }> } | undefined;
        const rules = data?.rules ?? [];
        const triggered = rules.filter((r) =>
          r.enabled &&
          r.trigger?.type === "status_change" &&
          (!r.trigger.toStatus || r.trigger.toStatus === "any" || r.trigger.toStatus === task.status),
        );
        if (triggered.length > 0) {
          const currentAssignees = (
            await db.select({ userId: taskAssignees.userId }).from(taskAssignees).where(eq(taskAssignees.taskId, taskId))
          ).map((r) => r.userId);
          const notifRows: Array<typeof notifTbl.$inferInsert> = [];
          for (const r of triggered) {
            if (r.action?.type !== "notify") continue;
            const targets = new Set<number>();
            if (r.action.target === "assignees") {
              currentAssignees.forEach((id) => { if (id !== uid) targets.add(id); });
            } else if (r.action.target === "user" && typeof r.action.userId === "number") {
              if (r.action.userId !== uid) targets.add(r.action.userId);
            }
            for (const t of targets) {
              notifRows.push({
                userId: t,
                projectId,
                type: "system",
                title: `Automation: ${r.name}`,
                message: `"${task.title}" → ${task.status}`,
                entityType: "task",
                entityId: task.id,
                actorUserId: uid,
                metadata: { automationId: r.id, ruleName: r.name },
              });
            }
          }
          if (notifRows.length > 0) {
            await db.insert(notifTbl).values(notifRows);
          }
        }
      } catch (aErr) {
        req.log.warn({ err: aErr }, "automation evaluation failed (non-fatal)");
      }
    } else if (newAssignees.length > 0) {
      await logActivity(
        projectId,
        uid,
        "assigned",
        "task",
        task.id,
        task.title,
        `Assigned ${newAssignees.length} new ${newAssignees.length === 1 ? "person" : "people"} to "${task.title}"`,
        { addedAssigneeIds: newAssignees },
      );
    } else {
      await logActivity(projectId, uid, "updated", "task", task.id, task.title, `Updated task "${task.title}"`);
    }
  }

  const [rich] = await buildRichTasks([task]);
  res.json(rich);
});

// ─── Delete task ─────────────────────────────────────────────────────────────
router.delete("/projects/:projectId/tasks/:taskId", async (req, res): Promise<void> => {
  const projectId = parseProjectId(req);
  const taskId = parseTaskId(req);
  const uid = getUID(req);

  try {
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
  } catch (err) {
    req.log.error({ err }, "delete task failed");
    res.status(500).json({ error: "Failed to delete task" });
  }
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
