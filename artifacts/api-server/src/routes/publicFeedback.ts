import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db, projects, playtestFeedback } from "@workspace/db";
import { schemas } from "@workspace/api-zod";

const router: IRouter = Router();

async function findProjectByToken(token: string) {
  const all = await db.select().from(projects);
  return (
    all.find((p) => {
      const hash = crypto
        .createHash("sha256")
        .update(`gameforge-feedback-${p.id}`)
        .digest("hex")
        .slice(0, 16);
      return hash === token;
    }) ?? null
  );
}

router.get("/public/feedback/:shareToken", async (req, res): Promise<void> => {
  const params = schemas.GetPublicFeedbackProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await findProjectByToken(params.data.shareToken);
  if (!project) {
    res.status(404).json({ error: "Invalid feedback link" });
    return;
  }
  res.json(
    schemas.GetPublicFeedbackProjectResponse.parse({
      projectName: project.name,
      gameType: project.gameType,
      genre: project.genre,
      description: project.description,
    }),
  );
});

router.post("/public/feedback/:shareToken", async (req, res): Promise<void> => {
  const params = schemas.SubmitPublicFeedbackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = schemas.SubmitPublicFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const project = await findProjectByToken(params.data.shareToken);
  if (!project) {
    res.status(404).json({ error: "Invalid feedback link" });
    return;
  }
  const [row] = await db
    .insert(playtestFeedback)
    .values({
      projectId: project.id,
      shareToken: params.data.shareToken,
      respondentName: parsed.data.respondentName ?? null,
      funScore: parsed.data.funScore ?? null,
      balanceScore: parsed.data.balanceScore ?? null,
      clarityScore: parsed.data.clarityScore ?? null,
      whatWorked: parsed.data.whatWorked ?? null,
      whatDidNot: parsed.data.whatDidNot ?? null,
      suggestions: parsed.data.suggestions ?? null,
    })
    .returning();
  res.status(201).json(row);
});

export default router;
