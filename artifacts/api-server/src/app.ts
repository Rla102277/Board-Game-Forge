import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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

// Rate limiting configurations
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for expensive AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute per IP
  message: { error: "AI rate limit exceeded. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per 15 minutes
  message: { error: "Too many authentication attempts." },
  skipSuccessfulRequests: true,
});

const app: Express = express();

// Security headers via Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for some frontend frameworks
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow loading images from external sources
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

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

// Apply standard rate limiting to all API routes
app.use("/api", standardLimiter);

// Apply stricter rate limiting to AI endpoints
app.use("/api/projects/:projectId/ai-", aiLimiter);
app.use("/api/projects/:projectId/enhance", aiLimiter);
app.use("/api/projects/:projectId/generate-", aiLimiter);
app.use("/api/projects/:projectId/simulate", aiLimiter);

app.use(cors({ credentials: true, origin: true }));
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

export default app;
