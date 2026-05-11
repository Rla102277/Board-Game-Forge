import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import { db, appUsers, workspaceMembers } from "@workspace/db";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";

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

// CORS configuration for cross-origin authentication
const corsOptions = {
  credentials: true,
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "https://boardlab.games",
      "https://www.boardlab.games",
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

// Upsert authenticated user into app_users on every authenticated request.
app.use(async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { userId, sessionClaims } = getAuth(req);
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

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Serve frontend static files in production
app.use(express.static(path.join(__dirname, "../../../gameforge/dist/public")));

// SPA fallback - serve index.html for all non-API routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../../gameforge/dist/public/index.html"));
});

export default app;
