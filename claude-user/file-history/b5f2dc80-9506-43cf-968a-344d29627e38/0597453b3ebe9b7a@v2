import { apiBase } from "./workspaces-api";

export interface ParsedMechanic {
  content: string;
  designNotes?: string;
}

export async function parseMechanic(
  projectId: number,
  mechanicName: string,
  gameName: string,
): Promise<ParsedMechanic> {
  const res = await fetch(`${apiBase()}/api/projects/${projectId}/rules/parse-mechanic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mechanicName, gameName }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}
