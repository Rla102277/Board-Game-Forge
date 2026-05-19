/**
 * Hybrid permission resolution:
 *   1. If a project_shares row exists for the user+project, that role wins.
 *   2. Otherwise derive from their workspace_members role:
 *      owner  → "admin"
 *      admin  → "editor"
 *      member → "viewer"
 *   3. If they are the project owner they always get "admin".
 *   4. Returns null if the user has no access at all.
 */

import { and, eq, isNull } from "drizzle-orm";
import { db, projectShares, workspaceMembers, projects as projectsTbl } from "@workspace/db";

export type ProjectRole = "admin" | "editor" | "commenter" | "viewer";

const WORKSPACE_ROLE_MAP: Record<string, ProjectRole> = {
  owner: "admin",
  admin: "editor",
  member: "viewer",
};

export async function resolveProjectRole(
  userId: number,
  projectId: number,
): Promise<ProjectRole | null> {
  // 1. Load the project to check owner and workspaceId
  const [project] = await db
    .select({ ownerUserId: projectsTbl.ownerUserId, workspaceId: projectsTbl.workspaceId })
    .from(projectsTbl)
    .where(and(eq(projectsTbl.id, projectId), isNull(projectsTbl.deletedAt)));

  if (!project) return null;

  // 2. Project owner always has admin
  if (project.ownerUserId === userId) return "admin";

  // 3. Check for a project-level share override
  const [share] = await db
    .select({ role: projectShares.role })
    .from(projectShares)
    .where(and(eq(projectShares.projectId, projectId), eq(projectShares.userId, userId)));

  if (share) return share.role as ProjectRole;

  // 4. Fall back to workspace membership
  if (project.workspaceId) {
    const [member] = await db
      .select({ role: workspaceMembers.role, status: workspaceMembers.status })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, project.workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      );

    if (member && member.status === "active") {
      return WORKSPACE_ROLE_MAP[member.role] ?? "viewer";
    }
  }

  return null;
}

export function canEditRole(role: ProjectRole | null): boolean {
  return role === "admin" || role === "editor";
}

export function canManageRole(role: ProjectRole | null): boolean {
  return role === "admin";
}
