import { eq, inArray } from "drizzle-orm";
import {
  db as defaultDb,
  entities,
  entityProperties,
  rules,
  players,
  notes,
  tasks,
  researchItems,
  assets,
  playtestSessions,
  storyboardNodes,
} from "@workspace/db";
import type {
  Entity,
  EntityProperty,
  Rule,
  Player,
  Note,
  Task,
  ResearchItem,
  Asset,
  PlaytestSession,
  StoryboardNode,
} from "@workspace/db";

// A "db-like" handle: the global pool OR a transaction handle from
// `db.transaction(async (tx) => …)`. Both expose the same query API.
type DbLike = Parameters<Parameters<typeof defaultDb.transaction>[0]>[0] | typeof defaultDb;

export const SNAPSHOT_PAYLOAD_VERSION = 1;

export interface SnapshotPayload {
  version: number;
  capturedAt: string;
  entities: Entity[];
  entityProperties: EntityProperty[];
  rules: Rule[];
  players: Player[];
  notes: Note[];
  tasks: Task[];
  researchItems: ResearchItem[];
  assets: Asset[];
  playtestSessions: PlaytestSession[];
  storyboardNodes: StoryboardNode[];
}

/*
 * DELIBERATE EXCLUSIONS — these tables are project-scoped but intentionally
 * NOT included in snapshots:
 *  - chatMessages: ephemeral AI conversation; would balloon JSONB size and
 *    rarely matters for a "design state" rollback.
 *  - playtestFeedback: external respondents submit against a shareToken in
 *    real time; restoring would either drop live responses or duplicate them.
 *  - changelogEntries: an append-only audit log; restoring the log itself is
 *    nonsensical (and we want the audit trail to keep flowing).
 *  - kickstarterAssets: asynchronous Gamma generation state with external IDs
 *    that don't survive cloning.
 *  - workspaceAiSettings: workspace-scoped, not project-scoped.
 */

const stripCommon = <T extends { id: number; projectId: number; createdAt?: Date | null; updatedAt?: Date | null }>(
  rows: T[],
) => rows.map(({ id: _id, projectId: _pid, createdAt: _c, updatedAt: _u, ...rest }) => rest);

export async function serializeProject(
  projectId: number,
  conn: DbLike = defaultDb,
): Promise<SnapshotPayload> {
  const [
    entityRows,
    ruleRows,
    playerRows,
    noteRows,
    taskRows,
    researchRows,
    assetRows,
    playtestRows,
    storyboardRows,
  ] = await Promise.all([
    conn.select().from(entities).where(eq(entities.projectId, projectId)),
    conn.select().from(rules).where(eq(rules.projectId, projectId)),
    conn.select().from(players).where(eq(players.projectId, projectId)),
    conn.select().from(notes).where(eq(notes.projectId, projectId)),
    conn.select().from(tasks).where(eq(tasks.projectId, projectId)),
    conn.select().from(researchItems).where(eq(researchItems.projectId, projectId)),
    conn.select().from(assets).where(eq(assets.projectId, projectId)),
    conn.select().from(playtestSessions).where(eq(playtestSessions.projectId, projectId)),
    conn.select().from(storyboardNodes).where(eq(storyboardNodes.projectId, projectId)),
  ]);

  const entityIds = entityRows.map((e) => e.id);
  const propertyRows = entityIds.length
    ? await conn.select().from(entityProperties).where(inArray(entityProperties.entityId, entityIds))
    : [];

  return {
    version: SNAPSHOT_PAYLOAD_VERSION,
    capturedAt: new Date().toISOString(),
    entities: entityRows,
    entityProperties: propertyRows,
    rules: ruleRows,
    players: playerRows,
    notes: noteRows,
    tasks: taskRows,
    researchItems: researchRows,
    assets: assetRows,
    playtestSessions: playtestRows,
    storyboardNodes: storyboardRows,
  };
}

export async function clearProjectData(projectId: number, conn: DbLike = defaultDb): Promise<void> {
  // Order matters: child tables first.
  // entityProperties cascades from entities; assets.entityId is set null on entity delete.
  await conn.delete(storyboardNodes).where(eq(storyboardNodes.projectId, projectId));
  await conn.delete(playtestSessions).where(eq(playtestSessions.projectId, projectId));
  await conn.delete(assets).where(eq(assets.projectId, projectId));
  await conn.delete(researchItems).where(eq(researchItems.projectId, projectId));
  await conn.delete(tasks).where(eq(tasks.projectId, projectId));
  await conn.delete(notes).where(eq(notes.projectId, projectId));
  await conn.delete(players).where(eq(players.projectId, projectId));
  await conn.delete(rules).where(eq(rules.projectId, projectId));
  await conn.delete(entities).where(eq(entities.projectId, projectId)); // cascades entityProperties
}

interface IdMap {
  entities: Map<number, number>;
  rules: Map<number, number>;
  storyboardNodes: Map<number, number>;
}

export function assertSupportedPayload(payload: SnapshotPayload): void {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Snapshot payload is missing or invalid.");
  }
  if (payload.version !== SNAPSHOT_PAYLOAD_VERSION) {
    throw new Error(
      `Snapshot payload version ${payload.version} is not supported (expected ${SNAPSHOT_PAYLOAD_VERSION}).`,
    );
  }
}

export async function restoreProject(
  targetProjectId: number,
  payload: SnapshotPayload,
  conn: DbLike = defaultDb,
): Promise<void> {
  assertSupportedPayload(payload);
  await clearProjectData(targetProjectId, conn);
  await applyPayload(targetProjectId, payload, conn);
}

export async function applyPayload(
  targetProjectId: number,
  payload: SnapshotPayload,
  conn: DbLike = defaultDb,
): Promise<void> {
  assertSupportedPayload(payload);

  const ids: IdMap = {
    entities: new Map(),
    rules: new Map(),
    storyboardNodes: new Map(),
  };

  // 1. Entities
  for (const e of payload.entities ?? []) {
    const [row] = await conn
      .insert(entities)
      .values({ ...stripCommon([e])[0], projectId: targetProjectId })
      .returning({ id: entities.id });
    ids.entities.set(e.id, row.id);
  }

  // 2. Entity properties (remap entityId)
  if (payload.entityProperties?.length) {
    const propRows = payload.entityProperties
      .map((p) => {
        const newEntityId = ids.entities.get(p.entityId);
        if (newEntityId === undefined) return null;
        const { id: _id, entityId: _eid, createdAt: _c, updatedAt: _u, ...rest } = p;
        return { ...rest, entityId: newEntityId };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (propRows.length) await conn.insert(entityProperties).values(propRows);
  }

  // 3. Rules
  for (const r of payload.rules ?? []) {
    const [row] = await conn
      .insert(rules)
      .values({ ...stripCommon([r])[0], projectId: targetProjectId })
      .returning({ id: rules.id });
    ids.rules.set(r.id, row.id);
  }

  // 4. Players
  if (payload.players?.length) {
    await conn
      .insert(players)
      .values(payload.players.map((p) => ({ ...stripCommon([p])[0], projectId: targetProjectId })));
  }

  // 5. Notes
  if (payload.notes?.length) {
    await conn
      .insert(notes)
      .values(payload.notes.map((n) => ({ ...stripCommon([n])[0], projectId: targetProjectId })));
  }

  // 6. Tasks
  if (payload.tasks?.length) {
    await conn
      .insert(tasks)
      .values(payload.tasks.map((t) => ({ ...stripCommon([t])[0], projectId: targetProjectId })));
  }

  // 7. Research items
  if (payload.researchItems?.length) {
    await conn
      .insert(researchItems)
      .values(payload.researchItems.map((r) => ({ ...stripCommon([r])[0], projectId: targetProjectId })));
  }

  // 8. Assets (remap entityId if present)
  if (payload.assets?.length) {
    const assetRows = payload.assets.map((a) => {
      const { id: _id, projectId: _pid, entityId, createdAt: _c, updatedAt: _u, ...rest } = a;
      return {
        ...rest,
        projectId: targetProjectId,
        entityId: entityId !== null && entityId !== undefined ? ids.entities.get(entityId) ?? null : null,
      };
    });
    await conn.insert(assets).values(assetRows);
  }

  // 9. Playtest sessions
  if (payload.playtestSessions?.length) {
    await conn
      .insert(playtestSessions)
      .values(payload.playtestSessions.map((p) => ({ ...stripCommon([p])[0], projectId: targetProjectId })));
  }

  // 10. Storyboard nodes (two-pass for parentId remap; insert then update parentId)
  if (payload.storyboardNodes?.length) {
    for (const n of payload.storyboardNodes) {
      const { id: _id, projectId: _pid, parentId: _pn, linkedRuleId, createdAt: _c, updatedAt: _u, ...rest } = n;
      const [row] = await conn
        .insert(storyboardNodes)
        .values({
          ...rest,
          projectId: targetProjectId,
          parentId: null,
          linkedRuleId: linkedRuleId !== null && linkedRuleId !== undefined
            ? ids.rules.get(linkedRuleId) ?? null
            : null,
        })
        .returning({ id: storyboardNodes.id });
      ids.storyboardNodes.set(n.id, row.id);
    }
    // Second pass: set parentId now that all node IDs exist
    for (const n of payload.storyboardNodes) {
      if (n.parentId === null || n.parentId === undefined) continue;
      const newId = ids.storyboardNodes.get(n.id);
      const newParent = ids.storyboardNodes.get(n.parentId);
      if (newId && newParent) {
        await conn
          .update(storyboardNodes)
          .set({ parentId: newParent })
          .where(eq(storyboardNodes.id, newId));
      }
    }
  }
}
