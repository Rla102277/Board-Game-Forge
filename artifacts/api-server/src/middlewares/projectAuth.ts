import type { Request, Response, NextFunction } from "express";
import { and, eq } from "drizzle-orm";
import { db, appUsers, projects, workspaceMembers } from "@workspace/db";
import { getAuthUnified } from "../lib/authUtils";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      appUserId?: number;
      appUserRole?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId } = getAuthUnified(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [u] = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.clerkUserId, userId));
    if (!u) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.appUserId = u.id;
    req.appUserRole = u.role;
    next();
  } catch (err) {
    req.log.error({ err }, "auth check failed");
    res.status(500).json({ error: "Auth error" });
  }
}

export async function requireProjectAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const projectIdRaw = req.params.projectId;
  const projectIdStr = Array.isArray(projectIdRaw) ? projectIdRaw[0] : projectIdRaw;
  const projectId = parseInt(projectIdStr || "0", 10);
  if (!projectId || Number.isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  if (!req.appUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [proj] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    if (!proj) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const isOwner = proj.ownerUserId === req.appUserId;
    const isAdmin = req.appUserRole === "admin";
    let isWorkspaceMember = false;
    if (proj.workspaceId) {
      const [m] = await db
        .select({ id: workspaceMembers.id, status: workspaceMembers.status })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, proj.workspaceId),
            eq(workspaceMembers.userId, req.appUserId),
          ),
        );
      if (m && m.status === "active") isWorkspaceMember = true;
    }
    if (!isOwner && !isAdmin && !isWorkspaceMember) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  } catch (err) {
    req.log.error({ err }, "project access check failed");
    res.status(500).json({ error: "Access check error" });
  }
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.appUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.appUserRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
