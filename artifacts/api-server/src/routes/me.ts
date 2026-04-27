import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, appUsers, aiProviderSettings } from "@workspace/db";
import { schemas } from "@workspace/api-zod";

const router: IRouter = Router();

async function requireUser(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return null;
  const [u] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.clerkUserId, userId));
  return u ?? null;
}

router.get("/me", async (req, res): Promise<void> => {
  const u = await requireUser(req);
  if (!u) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  res.json(
    schemas.GetMeResponse.parse({
      id: u.id,
      clerkUserId: u.clerkUserId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      imageUrl: u.imageUrl,
      role: u.role,
    }),
  );
});

router.get("/me/ai-settings", async (req, res): Promise<void> => {
  const u = await requireUser(req);
  if (!u) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  const [pref] = await db
    .select()
    .from(aiProviderSettings)
    .where(eq(aiProviderSettings.userId, u.id));
  res.json(
    schemas.GetAiSettingsResponse.parse({
      provider: pref?.provider ?? "anthropic",
      model: pref?.model ?? null,
      hasApiKey: Boolean(pref?.apiKey),
    }),
  );
});

router.put("/me/ai-settings", async (req, res): Promise<void> => {
  const u = await requireUser(req);
  if (!u) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  const parsed = schemas.UpdateAiSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(aiProviderSettings)
    .where(eq(aiProviderSettings.userId, u.id));
  if (existing) {
    const update: Record<string, unknown> = {};
    if (parsed.data.provider !== undefined) update.provider = parsed.data.provider;
    if (parsed.data.model !== undefined) update.model = parsed.data.model;
    if (parsed.data.apiKey !== undefined) update.apiKey = parsed.data.apiKey || null;
    await db
      .update(aiProviderSettings)
      .set(update)
      .where(eq(aiProviderSettings.userId, u.id));
  } else {
    await db.insert(aiProviderSettings).values({
      userId: u.id,
      provider: parsed.data.provider ?? "anthropic",
      model: parsed.data.model ?? null,
      apiKey: parsed.data.apiKey ?? null,
    });
  }
  const [pref] = await db
    .select()
    .from(aiProviderSettings)
    .where(eq(aiProviderSettings.userId, u.id));
  res.json(
    schemas.UpdateAiSettingsResponse.parse({
      provider: pref?.provider ?? "anthropic",
      model: pref?.model ?? null,
      hasApiKey: Boolean(pref?.apiKey),
    }),
  );
});

export default router;
