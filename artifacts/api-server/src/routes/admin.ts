import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql, desc, isNull, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, appUsers, projects, workspaceAiSettings } from "@workspace/db";
import { schemas } from "@workspace/api-zod";

const router: IRouter = Router();

async function requireAdmin(req: Request): Promise<boolean> {
  const { userId } = getAuth(req);
  if (!userId) return false;
  const [u] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.clerkUserId, userId));
  return u?.role === "admin";
}

router.get("/admin/users", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const rows = await db
    .select({
      id: appUsers.id,
      clerkUserId: appUsers.clerkUserId,
      email: appUsers.email,
      firstName: appUsers.firstName,
      lastName: appUsers.lastName,
      imageUrl: appUsers.imageUrl,
      role: appUsers.role,
      createdAt: appUsers.createdAt,
      projectCount: sql<number>`(SELECT count(*)::int FROM ${projects} WHERE ${projects.ownerUserId} = ${appUsers.id})`,
    })
    .from(appUsers)
    .where(isNull(appUsers.deletedAt))
    .orderBy(desc(appUsers.createdAt));
  res.json(schemas.ListAdminUsersResponse.parse(rows));
});

router.patch("/admin/users/:userId", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const params = schemas.UpdateAdminUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.UpdateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db
    .update(appUsers)
    .set({ role: parsed.data.role ?? "user" })
    .where(eq(appUsers.id, params.data.userId));
  const [row] = await db
    .select({
      id: appUsers.id,
      clerkUserId: appUsers.clerkUserId,
      email: appUsers.email,
      firstName: appUsers.firstName,
      lastName: appUsers.lastName,
      imageUrl: appUsers.imageUrl,
      role: appUsers.role,
      createdAt: appUsers.createdAt,
      projectCount: sql<number>`(SELECT count(*)::int FROM ${projects} WHERE ${projects.ownerUserId} = ${appUsers.id})`,
    })
    .from(appUsers)
    .where(eq(appUsers.id, params.data.userId));
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(schemas.UpdateAdminUserResponse.parse(row));
});

router.delete("/admin/users/:userId", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const params = schemas.DeleteAdminUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .update(appUsers)
    .set({ deletedAt: new Date() })
    .where(and(eq(appUsers.id, params.data.userId), isNull(appUsers.deletedAt)));
  res.sendStatus(204);
});

// AI Provider Management Endpoints
router.get("/ai-providers", async (req: Request, res: Response) => {
  try {
    const providers = await db.query.workspaceAiSettings.findMany({
      orderBy: (settings, { desc }) => [desc(settings.updatedAt)],
    });
    res.json(providers);
    return;
  } catch (err) {
    console.error("[admin] Failed to fetch AI providers:", err);
    res.status(500).json({ error: "Failed to fetch AI providers" });
    return;
  }
});

router.post("/ai-providers", async (req: Request, res: Response) => {
  try {
    const { workspaceId, provider, enabled, encryptedKey } = req.body;
    
    if (!workspaceId || !provider) {
      res.status(400).json({ error: "workspaceId and provider are required" });
      return;
    }
    
    // Insert or update
    const result = await db.insert(workspaceAiSettings)
      .values({
        workspaceId,
        provider,
        enabled: enabled ?? true,
        encryptedKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [workspaceAiSettings.workspaceId, workspaceAiSettings.provider],
        set: {
          enabled: enabled ?? true,
          encryptedKey,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    res.json(result[0]);
    return;
  } catch (err) {
    console.error("[admin] Failed to save AI provider:", err);
    res.status(500).json({ error: "Failed to save AI provider" });
    return;
  }
});

router.delete("/ai-providers/:id", async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    await db.delete(workspaceAiSettings).where(eq(workspaceAiSettings.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error("[admin] Failed to delete AI provider:", err);
    res.status(500).json({ error: "Failed to delete AI provider" });
  }
});

// Available AI providers list
router.get("/ai-providers/available", async (_req: Request, res: Response) => {
  res.json([
    { id: "openai", name: "OpenAI", models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"], requiresKey: true },
    { id: "anthropic", name: "Anthropic (Claude)", models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"], requiresKey: true },
    { id: "gemini", name: "Google Gemini", models: ["gemini-1.5-pro", "gemini-1.5-flash"], requiresKey: true },
    { id: "deepseek", name: "DeepSeek", models: ["deepseek-chat", "deepseek-coder"], requiresKey: true },
    { id: "gamma", name: "Gamma (Presentations)", models: ["default"], requiresKey: true },
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS - Organization-wide security and activity logging
// ─────────────────────────────────────────────────────────────────────────────

router.get("/admin/audit-logs", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const limit = Math.min(parseInt(req.query.limit as string || "100", 10), 500);
  const offset = parseInt(req.query.offset as string || "0", 10);
  const action = req.query.action as string | undefined;
  const severity = req.query.severity as string | undefined;
  const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string, 10) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  let whereClause = sql`1=1`;
  if (action) whereClause = sql`${whereClause} AND action = ${action}`;
  if (severity) whereClause = sql`${whereClause} AND severity = ${severity}`;
  if (userId) whereClause = sql`${whereClause} AND user_id = ${userId}`;
  if (projectId) whereClause = sql`${whereClause} AND project_id = ${projectId}`;
  if (startDate) whereClause = sql`${whereClause} AND created_at >= ${new Date(startDate).toISOString()}`;
  if (endDate) whereClause = sql`${whereClause} AND created_at <= ${new Date(endDate).toISOString()}`;

  const rows = await db.execute(sql`
    SELECT 
      id, user_id, user_email, action, resource_type, resource_id,
      project_id, workspace_id, ip_address, user_agent, metadata, severity, created_at
    FROM audit_logs
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const countResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM audit_logs WHERE ${whereClause}`);
  const total = countResult.rows[0]?.total || 0;

  res.json({
    logs: rows.rows,
    total,
    limit,
    offset,
  });
});

router.get("/admin/audit-logs/summary", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const days = parseInt(req.query.days as string || "30", 10);
  
  const [actionStats, severityStats, recentCount] = await Promise.all([
    db.execute(sql`
      SELECT action, COUNT(*)::int as count 
      FROM audit_logs 
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY action
      ORDER BY count DESC
    `),
    db.execute(sql`
      SELECT severity, COUNT(*)::int as count 
      FROM audit_logs 
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY severity
    `),
    db.execute(sql`
      SELECT COUNT(*)::int as count 
      FROM audit_logs 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `),
  ]);

  res.json({
    actionBreakdown: actionStats.rows,
    severityBreakdown: severityStats.rows,
    last24Hours: recentCount.rows[0]?.count || 0,
    periodDays: days,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ORGANIZATION METRICS - Platform-wide analytics
// ─────────────────────────────────────────────────────────────────────────────

router.get("/admin/metrics", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const days = parseInt(req.query.days as string || "30", 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [
    userStats,
    projectStats,
    activityStats,
    stageDistribution,
    dailyActiveUsers,
  ] = await Promise.all([
    // User statistics
    db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN created_at >= ${startDate.toISOString()} THEN 1 END)::int as new_recent,
        COUNT(CASE WHEN last_sign_in_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int as active_7d
      FROM app_users
      WHERE deleted_at IS NULL
    `),
    // Project statistics
    db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END)::int as active,
        COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END)::int as deleted,
        AVG(CASE 
          WHEN overview_meta->>'stageCompletion' IS NOT NULL 
          THEN (overview_meta->>'stageCompletion')::int 
          ELSE 0 
        END)::int as avg_completion
      FROM projects
    `),
    // Activity statistics
    db.execute(sql`
      SELECT 
        COUNT(CASE WHEN action = 'create' AND resource_type = 'project' THEN 1 END)::int as projects_created,
        COUNT(CASE WHEN action = 'create' AND resource_type = 'comment' THEN 1 END)::int as comments_created,
        COUNT(CASE WHEN action = 'export' THEN 1 END)::int as exports,
        COUNT(CASE WHEN action LIKE 'playtest%' THEN 1 END)::int as playtest_events
      FROM audit_logs
      WHERE created_at >= ${startDate.toISOString()}
    `),
    // Stage distribution
    db.execute(sql`
      SELECT 
        COALESCE(overview_meta->>'currentStage', '1') as stage,
        COUNT(*)::int as count
      FROM projects
      WHERE deleted_at IS NULL
      GROUP BY COALESCE(overview_meta->>'currentStage', '1')
      ORDER BY stage
    `),
    // Daily active users (simplified)
    db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT user_id)::int as dau
      FROM audit_logs
      WHERE created_at >= ${startDate.toISOString()}
        AND user_id IS NOT NULL
      GROUP BY DATE(created_at)
      ORDER BY date
    `),
  ]);

  res.json({
    users: userStats.rows[0] || { total: 0, new_recent: 0, active_7d: 0 },
    projects: projectStats.rows[0] || { total: 0, active: 0, deleted: 0, avg_completion: 0 },
    activity: activityStats.rows[0] || { projects_created: 0, comments_created: 0, exports: 0, playtest_events: 0 },
    stageDistribution: stageDistribution.rows,
    dailyActiveUsers: dailyActiveUsers.rows,
    periodDays: days,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME NOTIFICATIONS - Broadcast via Ably
// ─────────────────────────────────────────────────────────────────────────────

import { publishNotification } from "../lib/presence";

router.post("/admin/broadcast", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const { channel, event, data, userIds } = req.body as {
    channel: string;
    event: string;
    data: unknown;
    userIds?: number[];
  };

  if (!channel || !event) {
    res.status(400).json({ error: "channel and event are required" });
    return;
  }

  try {
    await publishNotification(channel, event, data, userIds);
    res.json({ success: true, message: `Broadcast sent to ${channel}` });
  } catch (err) {
    req.log.error({ err }, "Failed to broadcast message");
    res.status(500).json({ error: "Failed to broadcast" });
  }
});

export default router;
