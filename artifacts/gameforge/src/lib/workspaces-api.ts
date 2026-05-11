export function apiBase(): string {
  // Use VITE_API_URL for separate frontend/backend deployment (e.g., Render)
  // Falls back to empty string for same-domain or proxy setups
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/$/, "");
  }
  // Local dev with proxy - use relative path
  return "";
}

// Get Clerk token for cross-origin authentication
async function getClerkToken(): Promise<string | null> {
  try {
    // @ts-ignore - Clerk may be available on window
    const clerk = window.Clerk;
    if (clerk && clerk.session) {
      return await clerk.session.getToken();
    }
  } catch {
    // ignore
  }
  return null;
}

export interface Workspace {
  id: number;
  slug: string;
  name: string;
  ownerUserId: number;
  isPersonal: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceProject {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  workspaceId: number | null;
  ownerUserId: number | null;
  gameType: string | null;
  genre: string | null;
  playerCount: string | null;
  targetDuration: string | null;
  complexityScore: number | null;
  blueprint: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: number;
  role: string;
  status: string;
  invitedEmail: string | null;
  joinedAt: string | null;
  invitedAt: string;
  user: {
    id: number;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  } | null;
}

export interface WorkspaceDetail {
  workspace: Workspace;
  role: string;
  projects: WorkspaceProject[];
  members: WorkspaceMember[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getClerkToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (init?.headers) {
    Object.entries(init.headers).forEach(([key, value]) => {
      if (typeof value === "string") headers[key] = value;
    });
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${apiBase()}/api${path}`, {
    credentials: "include",
    headers,
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    let parsed: { error?: string } | null = null;
    try { parsed = JSON.parse(text); } catch { /* ignore */ }
    throw new Error(parsed?.error || text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const workspacesApi = {
  list: () => request<Workspace[]>("/workspaces"),
  create: (body: { name: string; slug?: string }) =>
    request<Workspace>("/workspaces", { method: "POST", body: JSON.stringify(body) }),
  detail: (slug: string) => request<WorkspaceDetail>(`/workspaces/${slug}`),
  rename: (slug: string, name: string) =>
    request<Workspace>(`/workspaces/${slug}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  remove: (slug: string) => request<void>(`/workspaces/${slug}`, { method: "DELETE" }),
  invite: (slug: string, email: string, role: "member" | "admin" = "member") =>
    request<unknown>(`/workspaces/${slug}/members`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),
  removeMember: (slug: string, memberId: number) =>
    request<void>(`/workspaces/${slug}/members/${memberId}`, { method: "DELETE" }),
  createProject: (slug: string, body: { name: string; description?: string; gameType?: string; genre?: string; playerCount?: string; targetDuration?: string }) =>
    request<{ project: WorkspaceProject; workspaceSlug: string }>(`/workspaces/${slug}/projects`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resolveProject: (slug: string, projectSlug: string) =>
    request<WorkspaceProject>(`/workspaces/${slug}/projects/${projectSlug}`),
  generate: (slug: string, body: { prompt?: string; template?: string }) =>
    request<{ project: WorkspaceProject; workspaceSlug: string }>(`/workspaces/${slug}/generate`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getInviteCode: (slug: string) =>
    request<{ inviteCode: string; joinUrl: string }>(`/workspaces/${slug}/invite-code`),
  refreshInviteCode: (slug: string) =>
    request<{ inviteCode: string; joinUrl: string }>(`/workspaces/${slug}/invite-code/refresh`, { method: "POST" }),
  previewJoin: (code: string) =>
    request<{ id: number; name: string; slug: string; memberCount: number }>(`/workspaces/join/${code}`),
  joinByCode: (code: string) =>
    request<{ slug: string; name: string }>(`/workspaces/join/${code}`, { method: "POST" }),
  listAiSettings: (slug: string) =>
    request<WorkspaceProviderSetting[]>(`/workspaces/${slug}/ai-settings`),
  updateAiSetting: (
    slug: string,
    provider: WorkspaceProviderName,
    body: { enabled?: boolean; apiKey?: string | null },
  ) =>
    request<WorkspaceProviderSetting>(`/workspaces/${slug}/ai-settings/${provider}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

export type WorkspaceProviderName = "anthropic" | "openai" | "gemini" | "openrouter";

export interface WorkspaceProviderSetting {
  provider: WorkspaceProviderName;
  enabled: boolean;
  hasKey: boolean;
}
