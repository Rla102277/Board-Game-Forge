import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  db,
  projects,
  projectSnapshots,
  appUsers,
} from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import {
  serializeProject,
  restoreProject,
  applyPayload,
  SNAPSHOT_PAYLOAD_VERSION,
  type SnapshotPayload,
} from "../lib/projectSerializer";

const router: IRouter = Router();

const projectMetaCols = {
  id: projects.id,
  workspaceId: projects.workspaceId,
  ownerUserId: projects.ownerUserId,
  name: projects.name,
  description: projects.description,
  gameType: projects.gameType,
  genre: projects.genre,
  playerCount: projects.playerCount,
  targetDuration: projects.targetDuration,
  complexityScore: projects.complexityScore,
  blueprint: projects.blueprint,
  narrative: projects.narrative,
};

async function authorInfo(appUserId: number | undefined) {
  if (!appUserId) return { id: undefined as number | undefined, name: undefined as string | undefined };
  const [u] = await db.select().from(appUsers).where(eq(appUsers.id, appUserId));
  if (!u) return { id: appUserId, name: undefined };
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || undefined;
  return { id: appUserId, name };
}

async function loadProject(projectId: number) {
  const [row] = await db.select().from(projects).where(eq(projects.id, projectId));
  return row ?? null;
}

async function createSnapshotRow(opts: {
  projectId: number;
  workspaceId: number | null | undefined;
  name: string;
  description?: string | null;
  isAutoSnapshot: boolean;
  appUserId: number | undefined;
}) {
  const author = await authorInfo(opts.appUserId);
  const payload = await serializeProject(opts.projectId);
  const [row] = await db
    .insert(projectSnapshots)
    .values({
      projectId: opts.projectId,
      workspaceId: opts.workspaceId ?? null,
      name: opts.name.trim() || `Snapshot ${new Date().toISOString()}`,
      description: opts.description ?? null,
      payload: payload as unknown as Record<string, unknown>,
      payloadVersion: SNAPSHOT_PAYLOAD_VERSION,
      isAutoSnapshot: opts.isAutoSnapshot,
      createdByUserId: author.id ?? null,
      createdByName: author.name ?? null,
    })
    .returning();
  return row;
}

function snapshotMeta(row: typeof projectSnapshots.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    description: row.description,
    isAutoSnapshot: row.isAutoSnapshot,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// List snapshots for a project
router.get("/projects/:projectId/snapshots", async (req, res): Promise<void> => {
  const params = schemas.ListSnapshotsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(projectSnapshots)
    .where(eq(projectSnapshots.projectId, params.data.projectId))
    .orderBy(desc(projectSnapshots.createdAt));
  res.json(schemas.ListSnapshotsResponse.parse(rows.map(snapshotMeta)));
});

// Create a snapshot of current project state
router.post("/projects/:projectId/snapshots", async (req, res): Promise<void> => {
  const params = schemas.CreateSnapshotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = schemas.CreateSnapshotBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const project = await loadProject(params.data.projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const row = await createSnapshotRow({
    projectId: project.id,
    workspaceId: project.workspaceId,
    name: body.data.name,
    description: body.data.description ?? null,
    isAutoSnapshot: false,
    appUserId: req.appUserId,
  });
  res.status(201).json(schemas.ListSnapshotsResponseItem.parse(snapshotMeta(row)));
});

// Delete a snapshot
router.delete(
  "/projects/:projectId/snapshots/:snapshotId",
  async (req, res): Promise<void> => {
    const params = schemas.DeleteSnapshotParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(projectSnapshots)
      .where(
        and(
          eq(projectSnapshots.id, params.data.snapshotId),
          eq(projectSnapshots.projectId, params.data.projectId),
        ),
      );
    res.sendStatus(204);
  },
);

// Restore a snapshot in place (auto-snapshots current state first)
router.post(
  "/projects/:projectId/snapshots/:snapshotId/restore",
  async (req, res): Promise<void> => {
    const params = schemas.RestoreSnapshotParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const project = await loadProject(params.data.projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const [snap] = await db
      .select()
      .from(projectSnapshots)
      .where(
        and(
          eq(projectSnapshots.id, params.data.snapshotId),
          eq(projectSnapshots.projectId, params.data.projectId),
        ),
      );
    if (!snap) {
      res.status(404).json({ error: "Snapshot not found" });
      return;
    }
    // Auto-snapshot the current state so the user can always undo a restore.
    // The auto-save and the restore must be atomic — if the restore fails,
    // we don't want a dangling auto-save with no actual rollback applied.
    try {
      await db.transaction(async (tx) => {
        const payload = await serializeProject(project.id, tx);
        const author = await authorInfo(req.appUserId);
        await tx.insert(projectSnapshots).values({
          projectId: project.id,
          workspaceId: project.workspaceId ?? null,
          name: `Auto-saved before restoring "${snap.name}"`,
          description: null,
          payload: payload as unknown as Record<string, unknown>,
          payloadVersion: SNAPSHOT_PAYLOAD_VERSION,
          isAutoSnapshot: true,
          createdByUserId: author.id ?? null,
          createdByName: author.name ?? null,
        });
        await restoreProject(project.id, snap.payload as unknown as SnapshotPayload, tx);
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Restore failed",
      });
      return;
    }
    res.json({ ok: true });
  },
);

// Duplicate a project (creates a new project from current state)
router.post(
  "/projects/:projectId/duplicate",
  async (req, res): Promise<void> => {
    const params = schemas.DuplicateProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = schemas.DuplicateProjectBody.safeParse(req.body ?? {});
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const source = await loadProject(params.data.projectId);
    if (!source) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const newName = (body.data.name?.trim() ||
      `${source.name} (Copy)`).slice(0, 200);
    try {
      const created = await db.transaction(async (tx) => {
        const payload = await serializeProject(source.id, tx);
        const [row] = await tx
          .insert(projects)
          .values({
            workspaceId: source.workspaceId,
            ownerUserId: req.appUserId ?? source.ownerUserId,
            name: newName,
            description: source.description,
            gameType: source.gameType,
            genre: source.genre,
            playerCount: source.playerCount,
            targetDuration: source.targetDuration,
            complexityScore: source.complexityScore,
            blueprint: source.blueprint,
            narrative: source.narrative,
            forkedFromProjectId: source.id,
          })
          .returning(projectMetaCols);
        await applyPayload(row.id, payload, tx);
        return row;
      });
      res.status(201).json(schemas.GetProjectResponse.parse(created));
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Duplicate failed",
      });
    }
  },
);

// Fork from a specific snapshot (creates a new project from that snapshot's state)
router.post(
  "/projects/:projectId/snapshots/:snapshotId/fork",
  async (req, res): Promise<void> => {
    const params = schemas.ForkSnapshotParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = schemas.ForkSnapshotBody.safeParse(req.body ?? {});
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const source = await loadProject(params.data.projectId);
    if (!source) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const [snap] = await db
      .select()
      .from(projectSnapshots)
      .where(
        and(
          eq(projectSnapshots.id, params.data.snapshotId),
          eq(projectSnapshots.projectId, params.data.projectId),
        ),
      );
    if (!snap) {
      res.status(404).json({ error: "Snapshot not found" });
      return;
    }
    const newName = (body.data.name?.trim() ||
      `${source.name} — ${snap.name}`).slice(0, 200);
    try {
      const created = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(projects)
          .values({
            workspaceId: source.workspaceId,
            ownerUserId: req.appUserId ?? source.ownerUserId,
            name: newName,
            description: source.description,
            gameType: source.gameType,
            genre: source.genre,
            playerCount: source.playerCount,
            targetDuration: source.targetDuration,
            complexityScore: source.complexityScore,
            blueprint: source.blueprint,
            narrative: source.narrative,
            forkedFromProjectId: source.id,
            forkedFromSnapshotId: snap.id,
          })
          .returning(projectMetaCols);
        await applyPayload(row.id, snap.payload as unknown as SnapshotPayload, tx);
        return row;
      });
      res.status(201).json(schemas.GetProjectResponse.parse(created));
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Fork failed",
      });
    }
  },
);

export default router;
