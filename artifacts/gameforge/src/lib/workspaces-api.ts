export function apiBase(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
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
  const res = await fetch(`${apiBase()}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
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
};
