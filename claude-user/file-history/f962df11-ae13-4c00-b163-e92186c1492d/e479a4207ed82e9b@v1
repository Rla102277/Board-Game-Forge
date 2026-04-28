import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, appUsers } from "@workspace/db";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

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
        await db.insert(appUsers).values({
          clerkUserId: userId,
          email,
          firstName,
          lastName,
          imageUrl,
          role,
        });
      } else if (
        email !== existing[0]!.email ||
        firstName !== existing[0]!.firstName ||
        lastName !== existing[0]!.lastName ||
        imageUrl !== existing[0]!.imageUrl
      ) {
        await db
          .update(appUsers)
          .set({ email, firstName, lastName, imageUrl })
          .where(eq(appUsers.clerkUserId, userId));
      }
    }
  } catch (err) {
    req.log.error({ err }, "user upsert failed");
  }
  next();
});

app.use("/api", router);

export default app;
