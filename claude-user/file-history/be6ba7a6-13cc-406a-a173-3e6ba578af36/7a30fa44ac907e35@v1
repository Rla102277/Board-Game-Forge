// Collaboration feature types and API

export interface Comment {
  id: number;
  projectId: number;
  entityType: "entity" | "rule" | "note" | "task" | "general";
  entityId: number | null;
  content: string;
  authorId: number;
  author: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    email: string | null;
  };
  parentId: number | null;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

export interface ActivityFeedItem {
  id: number;
  projectId: number;
  userId: number;
  user: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  };
  action: "created" | "updated" | "deleted" | "commented" | "resolved" | "mentioned";
  entityType: "project" | "entity" | "rule" | "note" | "task" | "comment";
  entityId: number | null;
  entityName: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ProjectVersion {
  id: number;
  projectId: number;
  version: string;
  description: string | null;
  createdBy: number;
  creator: {
    id: number;
    firstName: string | null;
    lastName: string | null;
  };
  snapshot: {
    entities?: unknown[];
    rules?: unknown[];
    players?: unknown[];
    notes?: unknown[];
  };
  createdAt: string;
}

export interface PresenceUser {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  color: string;
  cursor: {
    x: number;
    y: number;
    visible: boolean;
  } | null;
  selection: {
    entityType: string;
    entityId: number | null;
  } | null;
  lastSeen: string;
}

export interface CollaborationState {
  projectId: number;
  connectedUsers: PresenceUser[];
  isOnline: boolean;
}

// API functions for collaboration features
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${apiBase}/api${path}`, {
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

export const collaborationApi = {
  // Comments
  listComments: (projectId: number, entityType?: string, entityId?: number) =>
    request<Comment[]>(`/projects/${projectId}/comments`, {
      method: "POST",
      body: JSON.stringify({ entityType, entityId }),
    }),
  createComment: (projectId: number, data: {
    entityType: string;
    entityId: number | null;
    content: string;
    parentId?: number;
  }) =>
    request<Comment>(`/projects/${projectId}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateComment: (projectId: number, commentId: number, content: string) =>
    request<Comment>(`/projects/${projectId}/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }),
  deleteComment: (projectId: number, commentId: number) =>
    request<void>(`/projects/${projectId}/comments/${commentId}`, {
      method: "DELETE",
    }),
  resolveComment: (projectId: number, commentId: number, resolved: boolean) =>
    request<Comment>(`/projects/${projectId}/comments/${commentId}/resolve`, {
      method: "PATCH",
      body: JSON.stringify({ resolved }),
    }),

  // Activity Feed
  getActivityFeed: (projectId: number, limit?: number) =>
    request<ActivityFeedItem[]>(`/projects/${projectId}/activity${limit ? `?limit=${limit}` : ""}`),

  // Version History
  listVersions: (projectId: number) =>
    request<ProjectVersion[]>(`/projects/${projectId}/versions`),
  createVersion: (projectId: number, data: { version: string; description?: string }) =>
    request<ProjectVersion>(`/projects/${projectId}/versions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getVersion: (projectId: number, versionId: number) =>
    request<ProjectVersion>(`/projects/${projectId}/versions/${versionId}`),
  restoreVersion: (projectId: number, versionId: number) =>
    request<{ project: unknown }>(`/projects/${projectId}/versions/${versionId}/restore`, {
      method: "POST",
    }),
  compareVersions: (projectId: number, versionId1: number, versionId2: number) =>
    request<{ diff: unknown }>(`/projects/${projectId}/versions/compare?v1=${versionId1}&v2=${versionId2}`),
};
