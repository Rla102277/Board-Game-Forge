import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, designerArtifacts } from "@workspace/db";

const router: IRouter = Router();

const ALLOWED_KINDS = new Set([
  "rulebook",
  "turn-structure",
  "blind-playtest",
  "scaling-matrix",
  "layout",
  "cost-estimator",
  "scoring-curve",
  "card-templates",
  "graph-layout",
]);

const KIND_RE = /^[a-z][a-z0-9-]{1,63}$/;

function parseProjectId(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function parseKind(raw: unknown): string | null {
  if (typeof raw !== "string" || !KIND_RE.test(raw)) return null;
  if (!ALLOWED_KINDS.has(raw)) return null;
  return raw;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

router.get(
  "/projects/:projectId/artifacts/:kind",
  async (req, res): Promise<void> => {
    const projectId = parseProjectId(req.params.projectId);
    if (projectId == null) {
      res.status(400).json({ error: "Invalid projectId" });
      return;
    }
    const kind = parseKind(req.params.kind);
    if (kind == null) {
      res.status(400).json({ error: "Invalid kind" });
      return;
    }
    const [row] = await db
      .select()
      .from(designerArtifacts)
      .where(
        and(
          eq(designerArtifacts.projectId, projectId),
          eq(designerArtifacts.kind, kind),
        ),
      );
    if (!row) {
      res.json({ projectId, kind, data: {} });
      return;
    }
    res.json({ projectId: row.projectId, kind: row.kind, data: row.data });
  },
);

router.put(
  "/projects/:projectId/artifacts/:kind",
  async (req, res): Promise<void> => {
    const projectId = parseProjectId(req.params.projectId);
    if (projectId == null) {
      res.status(400).json({ error: "Invalid projectId" });
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
    // Reject pathologically large payloads (1MB) to keep one row reasonable.
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
      .insert(designerArtifacts)
      .values({ projectId, kind, data: data as Record<string, unknown> })
      .onConflictDoUpdate({
        target: [designerArtifacts.projectId, designerArtifacts.kind],
        set: { data: data as Record<string, unknown>, updatedAt: new Date() },
      })
      .returning();
    res.json({ projectId: row.projectId, kind: row.kind, data: row.data });
  },
);

export default router;
