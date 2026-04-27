const GAMMA_API_BASE = "https://public-api.gamma.app/v0.2";

export interface GammaGenerateOptions {
  inputText: string;
  textMode?: "generate" | "condense" | "preserve";
  format?: "presentation" | "document" | "social";
  themeName?: string;
  numCards?: number;
  cardSplit?: "auto" | "inputTextBreaks";
  additionalInstructions?: string;
  exportAs?: "pdf" | "pptx";
  textOptions?: {
    amount?: "brief" | "medium" | "detailed";
    tone?: string;
    audience?: string;
    language?: string;
  };
  imageOptions?: {
    source?: "aiGenerated" | "stock" | "noImages";
    model?: string;
    style?: string;
  };
  cardOptions?: {
    dimensions?: "fluid" | "16x9" | "4x3" | "letter" | "a4";
  };
  sharingOptions?: {
    workspaceAccess?: "noAccess" | "view" | "comment" | "edit" | "fullAccess";
    externalAccess?: "noAccess" | "view" | "comment" | "edit";
  };
}

export interface GammaGeneration {
  generationId: string;
}

export interface GammaGenerationStatus {
  generationId: string;
  status: "pending" | "processing" | "completed" | "failed";
  gammaUrl?: string;
  pdfUrl?: string | null;
  pptxUrl?: string | null;
  credits?: { deducted?: number; remaining?: number };
  error?: { message?: string; code?: string };
}

function apiKey(): string {
  const k = process.env.GAMMA_API_KEY;
  if (!k) throw new Error("GAMMA_API_KEY is not set");
  return k;
}

export async function startGeneration(opts: GammaGenerateOptions): Promise<GammaGeneration> {
  const res = await fetch(`${GAMMA_API_BASE}/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey(),
    },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gamma start failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GammaGeneration;
}

export async function getGenerationStatus(id: string): Promise<GammaGenerationStatus> {
  const res = await fetch(`${GAMMA_API_BASE}/generations/${id}`, {
    headers: { "X-API-KEY": apiKey() },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gamma status failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GammaGenerationStatus;
}

export async function pollUntilDone(
  id: string,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<GammaGenerationStatus> {
  const interval = opts.intervalMs ?? 5_000;
  const timeout = opts.timeoutMs ?? 5 * 60_000;
  const started = Date.now();
  while (true) {
    const status = await getGenerationStatus(id);
    if (status.status === "completed" || status.status === "failed") {
      return status;
    }
    if (Date.now() - started > timeout) {
      throw new Error(`Gamma generation ${id} timed out after ${timeout}ms`);
    }
    await new Promise(r => setTimeout(r, interval));
  }
}
