import { Router, type IRouter } from "express";
import { schemas } from "@workspace/api-zod";
import { complete, AiProviderDisabledError } from "../lib/aiRouter";

const router: IRouter = Router();

const ACTION_INSTRUCTIONS: Record<string, string> = {
  shorter: "Rewrite the text below so it is noticeably shorter and tighter (aim for ~40-60% of the original length) while keeping every important fact and the same tone.",
  longer: "Expand the text below into a more developed version (about 1.5x to 2x the length) by adding concrete detail, vivid imagery, and helpful clarification — do not invent facts that contradict what is there.",
  rephrase: "Rewrite the text below in a different voice while preserving its meaning, length, and tone. Vary sentence structure and word choice; do not add or remove information.",
  vivid: "Rewrite the text below to feel more vivid and evocative — concrete sensory details, stronger verbs, fresher imagery — while keeping its meaning and approximate length.",
  punchy: "Rewrite the text below in a punchy, high-energy voice. Short sentences. Strong verbs. Confident. Keep the meaning intact.",
  formal: "Rewrite the text below in a more formal, professional register suitable for a published rulebook or pitch document. Keep the meaning intact.",
};

router.post(
  "/projects/:projectId/ai/text-edit",
  async (req, res): Promise<void> => {
    const params = z_safeProjectId(req.params.projectId);
    if (!params.ok) {
      res.status(400).json({ error: "Invalid projectId" });
      return;
    }
    const body = schemas.AiTextEditBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const { text, action, contextLabel } = body.data;
    const trimmed = text.trim();
    if (!trimmed) {
      res.status(400).json({ error: "Text is empty." });
      return;
    }
    const instruction = ACTION_INSTRUCTIONS[action];
    if (!instruction) {
      res.status(400).json({ error: "Unknown action." });
      return;
    }
    const labelLine = contextLabel ? `\nContext: this text is the ${contextLabel} for a tabletop board game project.` : "";
    const prompt = `${instruction}${labelLine}

Return ONLY the rewritten text as plain prose — no JSON, no markdown formatting, no preamble, no quotes around it, no labels like "Rewritten:". Just the new version of the text.

Text:
${trimmed}`;

    try {
      const out = await complete(req, { prompt, maxTokens: 1200 });
      const cleaned = stripWrapping(out);
      if (!cleaned) {
        req.log.warn({ aiTextSnippet: out.slice(0, 500) }, "ai text-edit: empty output");
        res.status(502).json({ error: "AI returned no usable content" });
        return;
      }
      res.json({ rewritten: cleaned });
    } catch (err) {
      if (err instanceof AiProviderDisabledError) {
        res.status(503).json({ error: err.message, provider: err.provider });
        return;
      }
      req.log.error({ err }, "ai text-edit failed");
      res.status(500).json({ error: "Text edit failed" });
    }
  },
);

function z_safeProjectId(p: unknown): { ok: true; id: number } | { ok: false } {
  const n = Number(p);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return { ok: false };
  return { ok: true, id: n };
}

function stripWrapping(s: string): string {
  let out = s.trim();
  out = out.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))) {
    out = out.slice(1, -1).trim();
  }
  out = out.replace(/^(rewritten|result|output|new version)\s*:\s*/i, "").trim();
  return out;
}

export default router;
