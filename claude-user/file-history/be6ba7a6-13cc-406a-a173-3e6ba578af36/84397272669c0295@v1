import { Router, type IRouter, type Request } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, appUsers, projects } from "@workspace/db";
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
  await db.delete(appUsers).where(eq(appUsers.id, params.data.userId));
  res.sendStatus(204);
});

export default router;
