import { Router, type IRouter, type Request } from "express";
import { and, eq } from "drizzle-orm";
import { db, userArtifacts } from "@workspace/db";

const router: IRouter = Router();

const ALLOWED_KINDS = new Set([
  "learn-chat",
  "learn-bible-completed",
  "learn-design101-completed",
]);

const KIND_RE = /^[a-z][a-z0-9-]{1,63}$/;

function parseKind(raw: unknown): string | null {
  if (typeof raw !== "string" || !KIND_RE.test(raw)) return null;
  if (!ALLOWED_KINDS.has(raw)) return null;
  return raw;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function currentUserId(req: Request): number | null {
  return typeof req.appUserId === "number" ? req.appUserId : null;
}

router.get("/me/artifacts/:kind", async (req, res): Promise<void> => {
  const appUserId = currentUserId(req);
  if (appUserId == null) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  const kind = parseKind(req.params.kind);
  if (kind == null) {
    res.status(400).json({ error: "Invalid kind" });
    return;
  }
  const [row] = await db
    .select()
    .from(userArtifacts)
    .where(and(eq(userArtifacts.appUserId, appUserId), eq(userArtifacts.kind, kind)));
  if (!row) {
    res.json({ kind, data: {} });
    return;
  }
  res.json({ kind: row.kind, data: row.data });
});

router.put("/me/artifacts/:kind", async (req, res): Promise<void> => {
  const appUserId = currentUserId(req);
  if (appUserId == null) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  const kind = parseKind(req.params.kind);
  if (kind == null) {
    res.status(400).json({ error: "Invalid kind" });
    return;
  }
  const data = (req.body as { data?: unknown } | undefined)?.data;
  if (!isPlainObject(data)) {
    res.status(400).json({ error: "data must be an object" });
    return;
  }
  try {
    const size = Buffer.byteLength(JSON.stringify(data), "utf8");
    if (size > 1_000_000) {
      res.status(413).json({ error: "Payload too large (max 1MB per artifact)" });
      return;
    }
  } catch {
    res.status(400).json({ error: "Invalid data payload" });
    return;
  }
  const [row] = await db
    .insert(userArtifacts)
    .values({ appUserId, kind, data: data as Record<string, unknown> })
    .onConflictDoUpdate({
      target: [userArtifacts.appUserId, userArtifacts.kind],
      set: { data: data as Record<string, unknown>, updatedAt: new Date() },
    })
    .returning();
  res.json({ kind: row.kind, data: row.data });
});

export default router;
