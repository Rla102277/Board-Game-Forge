import { Router, type IRouter, type Request } from "express";
import { and, eq, desc, asc, inArray, sql } from "drizzle-orm";
import {
  db,
  comments,
  activityFeed,
  projectVersions,
  appUsers,
} from "@workspace/db";

type ReactionRow = { emoji: string; count: number; userIds: number[] };

async function getReactionsForComments(
  commentIds: number[],
): Promise<Map<number, ReactionRow[]>> {
  const map = new Map<number, ReactionRow[]>();
  if (commentIds.length === 0) return map;
  const rows = await db.execute<{ comment_id: number; emoji: string; count: string; user_ids: number[] }>(
    sql.raw(`
      SELECT comment_id, emoji, COUNT(*)::int AS count,
             array_agg(user_id) AS user_ids
      FROM comment_reactions
      WHERE comment_id = ANY(ARRAY[${commentIds.join(",")}]::int[])
      GROUP BY comment_id, emoji
    `),
  );
  for (const r of rows.rows) {
    const cid = Number(r.comment_id);
    if (!map.has(cid)) map.set(cid, []);
    map.get(cid)!.push({ emoji: r.emoji, count: Number(r.count), userIds: r.user_ids ?? [] });
  }
  return map;
}

const router: IRouter = Router();

// `req.appUserId` is populated by the `requireAuth` middleware mounted
// upstream in `routes/index.ts`. The project-scoped routes below also pass
// through `requireProjectAccess`, so we do not re-verify access here.
function currentUserId(req: Request): number | null {
  return typeof req.appUserId === "number" ? req.appUserId : null;
}

type AuthorInfo = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  email: string | null;
} | null;

async function getUsersById(userIds: number[]): Promise<Map<number, AuthorInfo>> {
  const map = new Map<number, AuthorInfo>();
  if (userIds.length === 0) return map;
  const unique = [...new Set(userIds)];
  const rows = await db.select().from(appUsers).where(inArray(appUsers.id, unique));
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const id of unique) {
    const u = byId.get(id);
    map.set(
      id,
      u
        ? {
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            imageUrl: u.imageUrl,
            email: u.email,
          }
        : null,
    );
  }
  return map;
}

function paramAsString(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

function parseProjectId(req: Request): number {
  return parseInt(paramAsString(req.params.projectId), 10);
}

function parseRouteId(req: Request, key: string): number {
  return parseInt(paramAsString(req.params[key]) || "0", 10);
}

// ──────────────────────────────────────────────────────────────────────────
// COMMENTS
// ──────────────────────────────────────────────────────────────────────────

// List comments. POST is used (legacy from frontend) so the body can carry
// optional entityType / entityId filters.
router.post(
  "/projects/:projectId/comments",
  async (req, res): Promise<void> => {
    if (!currentUserId(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const projectId = parseProjectId(req);
    const entityType: string | undefined = req.body?.entityType;
    const entityId: number | undefined = req.body?.entityId;

    const conds = [eq(comments.projectId, projectId)];
    if (entityType) conds.push(eq(comments.entityType, entityType));
    if (entityId !== undefined && entityId !== null) {
      conds.push(eq(comments.entityId, entityId));
    }

    try {
      const allComments = await db
        .select()
        .from(comments)
        .where(and(...conds))
        .orderBy(asc(comments.createdAt));

      const authors = await getUsersById(allComments.map((c) => c.authorId));
      const reactionsMap = await getReactionsForComments(allComments.map((c) => c.id));

      type EnrichedComment = (typeof allComments)[number] & {
        author: AuthorInfo;
        reactions: ReactionRow[];
        replies: EnrichedComment[];
      };
      const enrichedById = new Map<number, EnrichedComment>();
      const roots: EnrichedComment[] = [];

      for (const c of allComments) {
        enrichedById.set(c.id, {
          ...c,
          author: authors.get(c.authorId) ?? null,
          reactions: reactionsMap.get(c.id) ?? [],
          replies: [],
        });
      }
      for (const c of allComments) {
        const node = enrichedById.get(c.id)!;
        if (c.parentId && enrichedById.has(c.parentId)) {
          enrichedById.get(c.parentId)!.replies.push(node);
        } else {
          roots.push(node);
        }
      }
      res.json(roots);
    } catch (err) {
      req.log.error({ err }, "list comments failed");
      res.status(500).json({ error: "Failed to list comments" });
    }
  },
);

// Create a comment.
router.post(
  "/projects/:projectId/comments/create",
  async (req, res): Promise<void> => {
    const userId = currentUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const projectId = parseProjectId(req);
    const { entityType, entityId, content, parentId } = req.body ?? {};
    if (!content || typeof content !== "string") {
      res.status(400).json({ error: "content is required" });
      return;
    }
    try {
      const [newComment] = await db
        .insert(comments)
        .values({
          projectId,
          entityType: entityType || "general",
          entityId: entityId ?? null,
          authorId: userId,
          content,
          parentId: parentId ?? null,
        })
        .returning();

      await db.insert(activityFeed).values({
        projectId,
        userId,
        action: "commented",
        entityType: entityType || "general",
        entityId: entityId ?? null,
        description: "Added a comment",
      });

      // ─── @-mention notifications ─────────────────────────────────────────
      // Parse @FullName tokens, match against app users, and notify each
      // mentioned user (excluding the comment author).
      try {
        const mentionMatches = [
          ...content.matchAll(/@([A-Za-z][A-Za-z0-9_-]*(?:\s+[A-Za-z][A-Za-z0-9_-]*)?)/g),
        ];
        if (mentionMatches.length > 0) {
          const candidates = [...new Set(mentionMatches.map((m) => m[1].trim().toLowerCase()))];
          const everyone = await db
            .select({ id: appUsers.id, firstName: appUsers.firstName, lastName: appUsers.lastName, email: appUsers.email })
            .from(appUsers);
          const mentioned = new Set<number>();
          for (const cand of candidates) {
            for (const u of everyone) {
              if (u.id === userId) continue;
              const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim().toLowerCase();
              const first = (u.firstName ?? "").trim().toLowerCase();
              const emailLocal = (u.email ?? "").split("@")[0].toLowerCase();
              if ((full && (full === cand || cand.startsWith(full))) ||
                  (first && first === cand) ||
                  (emailLocal && emailLocal === cand)) {
                mentioned.add(u.id);
              }
            }
          }
          if (mentioned.size > 0) {
            const author = (await getUsersById([userId])).get(userId);
            const authorName = author
              ? [author.firstName, author.lastName].filter(Boolean).join(" ") || author.email || "Someone"
              : "Someone";
            const snippet = content.length > 100 ? content.slice(0, 97) + "…" : content;
            const { notifications: notifTbl } = await import("@workspace/db");
            await db.insert(notifTbl).values(
              [...mentioned].map((mid) => ({
                userId: mid,
                projectId,
                type: "mention" as const,
                title: `${authorName} mentioned you`,
                message: snippet,
                entityType: entityType || "general",
                entityId: entityId ?? null,
                actorUserId: userId,
              })),
            );
          }
        }
      } catch (mErr) {
        req.log.warn({ err: mErr }, "mention notification creation failed (non-fatal)");
      }

      const authors = await getUsersById([newComment.authorId]);
      res.json({
        ...newComment,
        author: authors.get(newComment.authorId) ?? null,
        reactions: [],
        replies: [],
      });
    } catch (err) {
      req.log.error({ err }, "create comment failed");
      res.status(500).json({ error: "Failed to create comment" });
    }
  },
);

// Update a comment.
router.patch(
  "/projects/:projectId/comments/:commentId",
  async (req, res): Promise<void> => {
    if (!currentUserId(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const commentId = parseRouteId(req, "commentId");
    const { content } = req.body ?? {};
    if (!content || typeof content !== "string") {
      res.status(400).json({ error: "content is required" });
      return;
    }
    try {
      const [updated] = await db
        .update(comments)
        .set({ content })
        .where(eq(comments.id, commentId))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Comment not found" });
        return;
      }
      const authors = await getUsersById([updated.authorId]);
      res.json({
        ...updated,
        author: authors.get(updated.authorId) ?? null,
        replies: [],
      });
    } catch (err) {
      req.log.error({ err }, "update comment failed");
      res.status(500).json({ error: "Failed to update comment" });
    }
  },
);

// Delete a comment.
router.delete(
  "/projects/:projectId/comments/:commentId",
  async (req, res): Promise<void> => {
    if (!currentUserId(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const commentId = parseRouteId(req, "commentId");
    try {
      await db.delete(comments).where(eq(comments.id, commentId));
      res.status(204).send();
    } catch (err) {
      req.log.error({ err }, "delete comment failed");
      res.status(500).json({ error: "Failed to delete comment" });
    }
  },
);

// Resolve / unresolve a comment.
router.patch(
  "/projects/:projectId/comments/:commentId/resolve",
  async (req, res): Promise<void> => {
    const userId = currentUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const projectId = parseProjectId(req);
    const commentId = parseRouteId(req, "commentId");
    const resolved: boolean = !!req.body?.resolved;
    try {
      const [updated] = await db
        .update(comments)
        .set({ resolved })
        .where(eq(comments.id, commentId))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Comment not found" });
        return;
      }
      await db.insert(activityFeed).values({
        projectId,
        userId,
        action: "resolved",
        entityType: "comment",
        entityId: commentId,
        description: resolved ? "Resolved a comment" : "Reopened a comment",
      });
      const reactionsMap = await getReactionsForComments([updated.id]);
      const authors = await getUsersById([updated.authorId]);
      res.json({
        ...updated,
        author: authors.get(updated.authorId) ?? null,
        reactions: reactionsMap.get(updated.id) ?? [],
        replies: [],
      });
    } catch (err) {
      req.log.error({ err }, "resolve comment failed");
      res.status(500).json({ error: "Failed to resolve comment" });
    }
  },
);

// Toggle a reaction (add if not present, remove if already added).
router.post(
  "/projects/:projectId/comments/:commentId/reactions",
  async (req, res): Promise<void> => {
    const userId = currentUserId(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const commentId = parseRouteId(req, "commentId");
    const { emoji } = req.body ?? {};
    if (!emoji || typeof emoji !== "string") { res.status(400).json({ error: "emoji is required" }); return; }
    try {
      // Check if reaction already exists
      const existing = await db.execute<{ id: number }>(
        sql.raw(`SELECT id FROM comment_reactions WHERE comment_id=${commentId} AND user_id=${userId} AND emoji=${sql.raw("'" + emoji.replace(/'/g, "''") + "'")} LIMIT 1`),
      );
      if (existing.rows.length > 0) {
        await db.execute(sql.raw(`DELETE FROM comment_reactions WHERE comment_id=${commentId} AND user_id=${userId} AND emoji='${emoji.replace(/'/g, "''")}' `));
      } else {
        await db.execute(sql.raw(`INSERT INTO comment_reactions (comment_id, user_id, emoji) VALUES (${commentId}, ${userId}, '${emoji.replace(/'/g, "''")}') ON CONFLICT DO NOTHING`));
      }
      const reactionsMap = await getReactionsForComments([commentId]);
      res.json(reactionsMap.get(commentId) ?? []);
    } catch (err) {
      req.log.error({ err }, "toggle reaction failed");
      res.status(500).json({ error: "Failed to toggle reaction" });
    }
  },
);

// List reactions for a comment.
router.get(
  "/projects/:projectId/comments/:commentId/reactions",
  async (req, res): Promise<void> => {
    if (!currentUserId(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
    const commentId = parseRouteId(req, "commentId");
    try {
      const reactionsMap = await getReactionsForComments([commentId]);
      res.json(reactionsMap.get(commentId) ?? []);
    } catch (err) {
      res.status(500).json({ error: "Failed to list reactions" });
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────
// ACTIVITY FEED
// ──────────────────────────────────────────────────────────────────────────

router.get(
  "/projects/:projectId/activity",
  async (req, res): Promise<void> => {
    if (!currentUserId(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const projectId = parseProjectId(req);
    const limitRaw = req.query.limit;
    const limit = limitRaw ? Math.max(1, Math.min(200, parseInt(String(limitRaw), 10) || 10)) : 10;
    try {
      const activities = await db
        .select()
        .from(activityFeed)
        .where(eq(activityFeed.projectId, projectId))
        .orderBy(desc(activityFeed.createdAt))
        .limit(limit);

      const users = await getUsersById(activities.map((a) => a.userId));
      const enriched = activities.map((a) => ({
        ...a,
        user: users.get(a.userId) ?? null,
      }));
      res.json(enriched);
    } catch (err) {
      req.log.error({ err }, "activity feed failed");
      res.status(500).json({ error: "Failed to get activity feed" });
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────
// VERSION HISTORY
//
// Note: a richer snapshot system lives in `routes/snapshots.ts`. These
// endpoints back the legacy `<VersionHistory />` component and intentionally
// keep a thin surface area.
// ──────────────────────────────────────────────────────────────────────────

// List versions.
router.get(
  "/projects/:projectId/versions",
  async (req, res): Promise<void> => {
    if (!currentUserId(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const projectId = parseProjectId(req);
    try {
      const versions = await db
        .select()
        .from(projectVersions)
        .where(eq(projectVersions.projectId, projectId))
        .orderBy(desc(projectVersions.createdAt));

      const users = await getUsersById(versions.map((v) => v.createdBy));
      const enriched = versions.map((v) => ({
        ...v,
        creator: users.get(v.createdBy) ?? null,
      }));
      res.json(enriched);
    } catch (err) {
      req.log.error({ err }, "list versions failed");
      res.status(500).json({ error: "Failed to list versions" });
    }
  },
);

// Create a version snapshot (placeholder — full snapshot logic lives in
// the snapshots router).
router.post(
  "/projects/:projectId/versions",
  async (req, res): Promise<void> => {
    const userId = currentUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const projectId = parseProjectId(req);
    const { version, description } = req.body ?? {};
    if (!version || typeof version !== "string") {
      res.status(400).json({ error: "version is required" });
      return;
    }
    try {
      const snapshot = {
        entities: [],
        rules: [],
        players: [],
        notes: [],
      };
      const [newVersion] = await db
        .insert(projectVersions)
        .values({
          projectId,
          version,
          description: description ?? null,
          createdBy: userId,
          snapshot,
        })
        .returning();

      await db.insert(activityFeed).values({
        projectId,
        userId,
        action: "created",
        entityType: "project",
        entityId: projectId,
        entityName: version,
        description: `Created version ${version}`,
      });

      const users = await getUsersById([newVersion.createdBy]);
      res.json({
        ...newVersion,
        creator: users.get(newVersion.createdBy) ?? null,
      });
    } catch (err) {
      req.log.error({ err }, "create version failed");
      res.status(500).json({ error: "Failed to create version" });
    }
  },
);

// Compare two versions. Declared BEFORE the `:versionId` route so Express
// matches `compare` as a literal segment rather than treating it as an id.
router.get(
  "/projects/:projectId/versions/compare",
  async (req, res): Promise<void> => {
    if (!currentUserId(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const v1 = parseInt(String(req.query.v1 ?? "0"), 10);
    const v2 = parseInt(String(req.query.v2 ?? "0"), 10);
    if (!v1 || !v2) {
      res.status(400).json({ error: "v1 and v2 query params are required" });
      return;
    }
    try {
      const [version1] = await db
        .select()
        .from(projectVersions)
        .where(eq(projectVersions.id, v1))
        .limit(1);
      const [version2] = await db
        .select()
        .from(projectVersions)
        .where(eq(projectVersions.id, v2))
        .limit(1);
      if (!version1 || !version2) {
        res.status(404).json({ error: "One or more versions not found" });
        return;
      }
      // `snapshot` is a JSONB column typed as `unknown` — narrow with a Record
      // cast since we just compare presence of the four known top-level keys.
      const s1 = (version1.snapshot ?? {}) as Record<string, unknown>;
      const s2 = (version2.snapshot ?? {}) as Record<string, unknown>;
      const diff = {
        entities: JSON.stringify(s1.entities) !== JSON.stringify(s2.entities),
        rules: JSON.stringify(s1.rules) !== JSON.stringify(s2.rules),
        players: JSON.stringify(s1.players) !== JSON.stringify(s2.players),
        notes: JSON.stringify(s1.notes) !== JSON.stringify(s2.notes),
      };
      res.json({ diff });
    } catch (err) {
      req.log.error({ err }, "compare versions failed");
      res.status(500).json({ error: "Failed to compare versions" });
    }
  },
);

// Get a specific version.
router.get(
  "/projects/:projectId/versions/:versionId",
  async (req, res): Promise<void> => {
    if (!currentUserId(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const versionId = parseRouteId(req, "versionId");
    try {
      const [version] = await db
        .select()
        .from(projectVersions)
        .where(eq(projectVersions.id, versionId))
        .limit(1);
      if (!version) {
        res.status(404).json({ error: "Version not found" });
        return;
      }
      const users = await getUsersById([version.createdBy]);
      res.json({ ...version, creator: users.get(version.createdBy) ?? null });
    } catch (err) {
      req.log.error({ err }, "get version failed");
      res.status(500).json({ error: "Failed to get version" });
    }
  },
);

// Restore a version (no-op acknowledgement — full restore logic lives in
// the snapshots router).
router.post(
  "/projects/:projectId/versions/:versionId/restore",
  async (req, res): Promise<void> => {
    const userId = currentUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const projectId = parseProjectId(req);
    const versionId = parseRouteId(req, "versionId");
    try {
      await db.insert(activityFeed).values({
        projectId,
        userId,
        action: "updated",
        entityType: "project",
        entityId: projectId,
        description: `Restored project to version ${versionId}`,
      });
      res.json({ message: "Version restored" });
    } catch (err) {
      req.log.error({ err }, "restore version failed");
      res.status(500).json({ error: "Failed to restore version" });
    }
  },
);

export default router;
