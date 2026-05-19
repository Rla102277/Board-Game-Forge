/**
 * Presence endpoints — issue Ably token requests so the frontend
 * can connect directly to Ably channels without exposing the API key.
 *
 * Channel naming: presence:project-{projectId}
 *
 * Requires ABLY_API_KEY env var (set in Render dashboard).
 */

import { Router, type IRouter, type Request } from "express";
import Ably from "ably";

const router: IRouter = Router();

function getUID(req: Request): number | null {
  return typeof req.appUserId === "number" ? req.appUserId : null;
}

function getAblyRest(): Ably.Rest | null {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  return new Ably.Rest(key);
}

router.post("/presence/token", async (req, res): Promise<void> => {
  const uid = getUID(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }

  const ably = getAblyRest();
  if (!ably) {
    res.status(503).json({ error: "Presence not configured (missing ABLY_API_KEY)" });
    return;
  }

  const { projectId, userName, avatarUrl } = req.body as {
    projectId?: number;
    userName?: string;
    avatarUrl?: string | null;
  };

  try {
    const tokenParams: Ably.TokenParams = {
      clientId: String(uid),
      capability: projectId
        ? JSON.stringify({ [`presence:project-${projectId}`]: ["subscribe", "publish", "presence"] })
        : JSON.stringify({ "presence:project-*": ["subscribe", "publish", "presence"] }),
      ttl: 3600_000,
    };

    const tokenRequest = await ably.auth.createTokenRequest(tokenParams);
    res.json({ tokenRequest, clientId: String(uid), meta: { userName, avatarUrl } });
  } catch (err) {
    res.status(500).json({ error: "Failed to create Ably token" });
  }
});

export default router;
