import { db, changelogEntries } from "@workspace/db";
import type { Request } from "express";
import { getAuth } from "@clerk/express";

export async function logChange(
  req: Request,
  projectId: number,
  action: string,
  summary: string,
  options?: { entityKind?: string; entityRef?: string; details?: string },
): Promise<void> {
  try {
    const { userId } = getAuth(req);
    await db.insert(changelogEntries).values({
      projectId,
      actor: userId ?? null,
      action,
      summary,
      entityKind: options?.entityKind ?? null,
      entityRef: options?.entityRef ?? null,
      details: options?.details ?? null,
    });
  } catch {
    // best-effort
  }
}
