import { Router, type IRouter, type Request } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, notifications, appUsers } from "@workspace/db";

const router: IRouter = Router();

function getUID(req: Request): number | null {
  return typeof req.appUserId === "number" ? req.appUserId : null;
}

async function enrichNotification(n: typeof notifications.$inferSelect) {
  const actor = n.actorUserId
    ? await db.select({ id: appUsers.id, email: appUsers.email, firstName: appUsers.firstName, lastName: appUsers.lastName, imageUrl: appUsers.imageUrl })
        .from(appUsers).where(eq(appUsers.id, n.actorUserId)).then((r) => r[0] ?? null)
    : null;

  return {
    id: String(n.id),
    type: n.type,
    title: n.title,
    message: n.message,
    projectId: n.projectId ?? undefined,
    read: n.read,
    entityType: n.entityType ?? undefined,
    entityId: n.entityId ?? undefined,
    actionUrl: n.actionUrl ?? undefined,
    actor: actor ?? undefined,
    createdAt: n.createdAt.toISOString(),
  };
}

router.get("/notifications", async (req, res): Promise<void> => {
  const uid = getUID(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const limit = Math.min(parseInt((req.query.limit as string) ?? "50", 10), 200);
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, uid))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  const enriched = await Promise.all(rows.map(enrichNotification));
  res.json(enriched);
});

router.patch("/notifications/:notificationId/read", async (req, res): Promise<void> => {
  const uid = getUID(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const notifId = parseInt(req.params.notificationId as string, 10);
  const [row] = await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notifId), eq(notifications.userId, uid)))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichNotification(row));
});

router.patch("/notifications/read-all", async (req, res): Promise<void> => {
  const uid = getUID(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, uid));
  res.json({ ok: true });
});

router.delete("/notifications/:notificationId", async (req, res): Promise<void> => {
  const uid = getUID(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const notifId = parseInt(req.params.notificationId as string, 10);
  await db.delete(notifications).where(and(eq(notifications.id, notifId), eq(notifications.userId, uid)));
  res.sendStatus(204);
});

export default router;
