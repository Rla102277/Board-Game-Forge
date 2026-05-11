import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import { db, appUsers, workspaceMembers } from "@workspace/db";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";
import { devAuthMiddleware } from "./middlewares/devAuthMiddleware";
import { getAuthUnified } from "./lib/authUtils";
import router from "./routes";
import { logger } from "./lib/logger";

// Use development auth middleware if Clerk is not properly configured
const useDevAuth = process.env.NODE_ENV === "development" &&
  (!process.env.CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY.includes("REPLACE"));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Use development auth or Clerk based on environment
if (useDevAuth) {
  logger.warn("Using development authentication (Clerk not configured)");
  app.use(devAuthMiddleware());
} else {
  app.use(clerkMiddleware());
}

// Upsert authenticated user into app_users on every authenticated request.
app.use(async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { userId, sessionClaims } = getAuthUnified(req);
    if (userId) {
      const claims = sessionClaims as
        | {
            email?: string;
            primary_email_address?: string;
            firstName?: string;
            first_name?: string;
            lastName?: string;
            last_name?: string;
            imageUrl?: string;
            image_url?: string;
          }
        | undefined;
      const email =
        claims?.email ?? claims?.primary_email_address ?? null;
      const firstName = claims?.firstName ?? claims?.first_name ?? null;
      const lastName = claims?.lastName ?? claims?.last_name ?? null;
      const imageUrl = claims?.imageUrl ?? claims?.image_url ?? null;

      const existing = await db
        .select()
        .from(appUsers)
        .where(eq(appUsers.clerkUserId, userId));
      if (existing.length === 0) {
        // First user gets admin
        const total = await db.select().from(appUsers);
        const role = total.length === 0 ? "admin" : "user";
        const [newUser] = await db.insert(appUsers).values({
          clerkUserId: userId,
          email,
          firstName,
          lastName,
          imageUrl,
          role,
        }).returning();
        // Activate any pending workspace invitations for this email.
        if (newUser && email) {
          await db
            .update(workspaceMembers)
            .set({ userId: newUser.id, status: "active", joinedAt: new Date() })
            .where(
              and(
                eq(workspaceMembers.invitedEmail, email),
                eq(workspaceMembers.status, "pending"),
              ),
            );
        }
      } else {
        const u = existing[0]!;
        const profileChanged =
          email !== u.email || firstName !== u.firstName ||
          lastName !== u.lastName || imageUrl !== u.imageUrl;
        if (profileChanged || u.deletedAt !== null) {
          await db
            .update(appUsers)
            .set({ email, firstName, lastName, imageUrl, deletedAt: null })
            .where(eq(appUsers.clerkUserId, userId));
        }
      }
    }
  } catch (err) {
    req.log.error({ err }, "user upsert failed");
  }
  next();
});

app.use("/api", router);

export default app;
