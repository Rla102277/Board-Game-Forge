import { Router, type IRouter, type Request } from "express";
import { and, eq } from "drizzle-orm";
import { db, projectShares, appUsers } from "@workspace/db";
import { resolveProjectRole } from "../lib/resolveProjectRole";

const router: IRouter = Router();

function getUID(req: Request): number | null {
  return typeof req.appUserId === "number" ? req.appUserId : null;
}

async function enrichShare(share: typeof projectShares.$inferSelect) {
  const invitedByUser = share.invitedByUserId
    ? await db.select({ id: appUsers.id, email: appUsers.email, firstName: appUsers.firstName, lastName: appUsers.lastName, imageUrl: appUsers.imageUrl })
        .from(appUsers).where(eq(appUsers.id, share.invitedByUserId)).then((r) => r[0] ?? null)
    : null;

  const user = share.userId
    ? await db.select({ id: appUsers.id, email: appUsers.email, firstName: appUsers.firstName, lastName: appUsers.lastName, imageUrl: appUsers.imageUrl })
        .from(appUsers).where(eq(appUsers.id, share.userId)).then((r) => r[0] ?? null)
    : null;

  return {
    id: share.id,
    projectId: share.projectId,
    role: share.role,
    invitedEmail: share.invitedEmail,
    publicLink: share.publicLink,
    publicLinkExpiry: share.publicLinkExpiry?.toISOString() ?? null,
    createdAt: share.createdAt.toISOString(),
    user,
    invitedBy: invitedByUser,
  };
}

router.get("/projects/:projectId/shares", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string, 10);
  const rows = await db.select().from(projectShares).where(eq(projectShares.projectId, projectId));
  const enriched = await Promise.all(rows.map(enrichShare));
  res.json(enriched);
});

router.post("/projects/:projectId/shares", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string, 10);
  const uid = getUID(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const callerRole = await resolveProjectRole(uid, projectId);
  if (callerRole !== "admin") { res.status(403).json({ error: "Only project admins can manage shares" }); return; }
  const { email, role, userId } = req.body as { email?: string; role?: string; userId?: number };

  if (!email && !userId) {
    res.status(400).json({ error: "email or userId is required" });
    return;
  }

  // Look up user by email if not given a userId
  let resolvedUserId = userId;
  if (!resolvedUserId && email) {
    const user = await db.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, email)).then((r) => r[0]);
    if (user) resolvedUserId = user.id;
  }

  const [share] = await db
    .insert(projectShares)
    .values({
      projectId,
      userId: resolvedUserId ?? null,
      invitedEmail: email ?? null,
      role: role ?? "viewer",
      invitedByUserId: uid ?? null,
    })
    .returning();

  res.status(201).json(await enrichShare(share));
});

router.patch("/projects/:projectId/shares/:shareId", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string, 10);
  const uid = getUID(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const callerRole = await resolveProjectRole(uid, projectId);
  if (callerRole !== "admin") { res.status(403).json({ error: "Only project admins can manage shares" }); return; }
  const shareId = parseInt(req.params.shareId as string, 10);
  const { role, publicLink, publicLinkExpiry } = req.body as {
    role?: string;
    publicLink?: boolean;
    publicLinkExpiry?: string | null;
  };

  const update: Record<string, unknown> = {};
  if (role !== undefined) update.role = role;
  if (publicLink !== undefined) update.publicLink = publicLink;
  if (publicLinkExpiry !== undefined) update.publicLinkExpiry = publicLinkExpiry ? new Date(publicLinkExpiry) : null;

  const [share] = await db
    .update(projectShares)
    .set(update as unknown as Partial<typeof projectShares.$inferInsert>)
    .where(and(eq(projectShares.id, shareId), eq(projectShares.projectId, projectId)))
    .returning();

  if (!share) { res.status(404).json({ error: "Share not found" }); return; }
  res.json(await enrichShare(share));
});

router.delete("/projects/:projectId/shares/:shareId", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string, 10);
  const uid = getUID(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const callerRole = await resolveProjectRole(uid, projectId);
  if (callerRole !== "admin") { res.status(403).json({ error: "Only project admins can manage shares" }); return; }
  const shareId = parseInt(req.params.shareId as string, 10);
  await db.delete(projectShares).where(and(eq(projectShares.id, shareId), eq(projectShares.projectId, projectId)));
  res.sendStatus(204);
});

export default router;
