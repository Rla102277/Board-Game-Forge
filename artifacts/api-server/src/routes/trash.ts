import { Router, type IRouter } from "express";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db, projects } from "@workspace/db";
import { requireAuth } from "../middlewares/projectAuth";
import { schemas } from "@workspace/api-zod";

const router: IRouter = Router();

// List soft-deleted projects visible to the current user.
router.get("/trash/projects", requireAuth, async (req, res): Promise<void> => {
  const userId = req.appUserId;
  const isAdmin = req.appUserRole === "admin";
  const allRows = await db
    .select()
    .from(projects)
    .where(isNotNull(projects.deletedAt))
    .orderBy(desc(projects.deletedAt));
  const rows = isAdmin ? allRows : allRows.filter((p) => p.ownerUserId === userId);
  res.json(rows.map((r) => schemas.GetProjectResponse.parse(r)));
});

// Restore a soft-deleted project. requireProjectAccess upstream already
// gated this on ownership / admin / workspace-membership.
router.post(
  "/projects/:projectId/restore",
  async (req, res): Promise<void> => {
    const projectId = parseInt(req.params.projectId, 10);
    if (!projectId || Number.isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }
    const [row] = await db
      .update(projects)
      .set({ deletedAt: null })
      .where(and(eq(projects.id, projectId), isNotNull(projects.deletedAt)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Project not found in trash" });
      return;
    }
    res.json(schemas.GetProjectResponse.parse(row));
  },
);

// Permanently delete a soft-deleted project. Only allowed once it is in trash
// to avoid accidental hard-delete of live projects.
router.delete(
  "/projects/:projectId/purge",
  async (req, res): Promise<void> => {
    const projectId = parseInt(req.params.projectId, 10);
    if (!projectId || Number.isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }
    const result = await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), isNotNull(projects.deletedAt)))
      .returning({ id: projects.id });
    if (result.length === 0) {
      res.status(404).json({ error: "Project not found in trash" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
