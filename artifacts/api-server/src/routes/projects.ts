import { Router, type IRouter } from "express";
import { eq, desc, sql, isNull, and } from "drizzle-orm";
import {
  db,
  projects,
  entities,
  rules,
  players,
  notes,
  tasks,
  chatMessages,
  researchItems,
  assets,
  playtestSessions,
  playtestReports,
  appUsers,
} from "@workspace/db";
import { getAuth } from "@clerk/express";
import { schemas } from "@workspace/api-zod";
import { resolveProjectRole } from "../lib/resolveProjectRole";

const router: IRouter = Router();

router.get("/projects", async (req, res): Promise<void> => {
  const userId = req.appUserId;
  const isAdmin = req.appUserRole === "admin";
  const allRows = await db
    .select()
    .from(projects)
    .where(isNull(projects.deletedAt))
    .orderBy(desc(projects.updatedAt));
  const rows = isAdmin
    ? allRows
    : allRows.filter((p) => p.ownerUserId === userId);
  res.json(schemas.ListProjectsResponse.parse(rows));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = schemas.CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { userId } = getAuth(req);
  let ownerUserId: number | undefined;
  if (userId) {
    const [u] = await db.select().from(appUsers).where(eq(appUsers.clerkUserId, userId));
    if (u) ownerUserId = u.id;
  }
  const [row] = await db
    .insert(projects)
    .values({ ...parsed.data, ...(ownerUserId !== undefined ? { ownerUserId } : {}) })
    .returning();
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
    .where(and(eq(projects.id, params.data.projectId), isNull(projects.deletedAt)));
  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.set("Cache-Control", "no-store");
  res.json(schemas.GetProjectResponse.parse(row));
});

router.get("/projects/:projectId/my-role", async (req, res): Promise<void> => {
  const userId = req.appUserId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const projectId = parseInt(req.params.projectId as string, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid projectId" }); return; }
  const role = await resolveProjectRole(userId, projectId);
  if (!role) { res.status(403).json({ error: "No access" }); return; }
  res.json({
    role,
    canEdit: role === "admin" || role === "editor",
    canComment: role !== null,
    canShare: role === "admin",
    canDelete: role === "admin",
    canManageMembers: role === "admin",
  });
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
  await db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(and(eq(projects.id, params.data.projectId), isNull(projects.deletedAt)));
  res.sendStatus(204);
});

router.get("/projects/:projectId/stats", async (req, res): Promise<void> => {
  const params = schemas.GetProjectStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const projectId = params.data.projectId;
  const c = sql<number>`count(*)::int`;
  const [
    [entityRow],
    [ruleRow],
    [playerRow],
    [noteRow],
    [taskRow],
    [chatRow],
    [researchRow],
    [assetRow],
    [playtestRow],
    [playtestReportRow],
  ] = await Promise.all([
    db.select({ c }).from(entities).where(eq(entities.projectId, projectId)),
    db.select({ c }).from(rules).where(eq(rules.projectId, projectId)),
    db.select({ c }).from(players).where(eq(players.projectId, projectId)),
    db.select({ c }).from(notes).where(eq(notes.projectId, projectId)),
    db.select({ c }).from(tasks).where(eq(tasks.projectId, projectId)),
    db.select({ c }).from(chatMessages).where(eq(chatMessages.projectId, projectId)),
    db.select({ c }).from(researchItems).where(eq(researchItems.projectId, projectId)),
    db.select({ c }).from(assets).where(eq(assets.projectId, projectId)),
    db.select({ c }).from(playtestSessions).where(eq(playtestSessions.projectId, projectId)),
    db.select({ c }).from(playtestReports).where(eq(playtestReports.projectId, projectId)),
  ]);
  res.json(
    schemas.GetProjectStatsResponse.parse({
      entityCount: entityRow?.c ?? 0,
      ruleCount: ruleRow?.c ?? 0,
      playerCount: playerRow?.c ?? 0,
      noteCount: noteRow?.c ?? 0,
      taskCount: taskRow?.c ?? 0,
      chatMessageCount: chatRow?.c ?? 0,
      researchCount: researchRow?.c ?? 0,
      assetCount: assetRow?.c ?? 0,
      playtestCount: playtestRow?.c ?? 0,
      playtestReportCount: playtestReportRow?.c ?? 0,
    }),
  );
});

export default router;
