import { type Request } from "express";
import { getAuth as clerkGetAuth } from "@clerk/express";
import { getAuthDev } from "../middlewares/devAuthMiddleware";

const useDevAuth = process.env.NODE_ENV === "development" &&
  (!process.env.CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY.includes("REPLACE"));

/**
 * Unified getAuth function that works with both real Clerk and dev auth middleware.
 * Use this instead of importing directly from @clerk/express.
 */
export function getAuthUnified(req: Request) {
  if (useDevAuth) {
    return getAuthDev(req);
  }

  try {
    return clerkGetAuth(req);
  } catch {
    return getAuthDev(req);
  }
}
