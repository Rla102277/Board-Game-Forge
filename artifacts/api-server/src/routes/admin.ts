import { Router, type IRouter, type Request } from "express";
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
  } catch (err) {
    console.error("[admin] Failed to fetch AI providers:", err);
    res.status(500).json({ error: "Failed to fetch AI providers" });
  }
});

router.post("/ai-providers", async (req: Request, res: Response) => {
  try {
    const { workspaceId, provider, enabled, encryptedKey } = req.body;
    
    if (!workspaceId || !provider) {
      return res.status(400).json({ error: "workspaceId and provider are required" });
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
  } catch (err) {
    console.error("[admin] Failed to save AI provider:", err);
    res.status(500).json({ error: "Failed to save AI provider" });
  }
});

router.delete("/ai-providers/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
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

export default router;
