/**
 * Real collaboration API client — replaces the in-memory mock.
 * All functions talk to the Express backend over HTTP.
 */
import type {
  RichTask,
  SubTask,
  TaskComment,
  ActivityLogEntry,
  ProjectShare,
  NotificationItem,
  PresenceUser,
  TaskFilter,
  TaskSort,
  ProjectRole,
  CollaboratorUser,
} from "./collaboration-types";

function apiBase(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/$/, "");
  }
  return "";
}

async function getClerkToken(): Promise<string | null> {
  try {
    // @ts-ignore
    const clerk = window.Clerk;
    if (clerk && clerk.session) {
      return await clerk.session.getToken();
    }
  } catch {}
  return null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getClerkToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init?.headers) {
    Object.entries(init.headers).forEach(([k, v]) => { if (typeof v === "string") headers[k] = v; });
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${apiBase()}/api${path}`, {
    credentials: "include",
    headers,
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function listTasks(
  projectId: number,
  filter?: TaskFilter,
  sort?: TaskSort,
): Promise<RichTask[]> {
  const params = new URLSearchParams();

  // Pass all filters to server - no client-side filtering needed
  if (filter?.status?.length) params.set("status", filter.status.join(","));
  if (filter?.priority?.length) params.set("priority", filter.priority.join(","));
  if (filter?.tags?.length) params.set("tags", filter.tags.join(","));
  if (filter?.assigneeIds?.length) params.set("assigneeIds", filter.assigneeIds.join(","));
  if (filter?.search) params.set("search", filter.search);
  if (filter?.dueBefore) params.set("dueBefore", filter.dueBefore);
  if (filter?.dueAfter) params.set("dueAfter", filter.dueAfter);

  // Pass sorting to server
  if (sort) {
    params.set("sortBy", sort.field);
    params.set("sortOrder", sort.direction);
  }

  const qs = params.toString();
  // Server now handles all filtering and sorting - just return the result
  return apiFetch<RichTask[]>(`/projects/${projectId}/tasks${qs ? `?${qs}` : ""}`);
}

export async function createTask(projectId: number, data: Partial<RichTask>): Promise<RichTask> {
  return apiFetch<RichTask>(`/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  projectId: number,
  taskId: number,
  data: Partial<RichTask>,
): Promise<RichTask> {
  return apiFetch<RichTask>(`/projects/${projectId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTask(projectId: number, taskId: number): Promise<void> {
  return apiFetch<void>(`/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });
}

// ─── Subtasks ─────────────────────────────────────────────────────────────────

export async function listSubtasks(taskId: number, projectId?: number): Promise<SubTask[]> {
  // taskId-only endpoint — we need projectId for the path
  // The hooks pass taskId; we stored projectId separately. Use a project-scoped path.
  // If projectId is unknown here we can use a workaround path.
  // Backend also exposes GET /projects/:pid/tasks/:taskId/subtasks.
  // The hook passes taskId only, so we cache via the task cache to find projectId.
  // Use the global cache approach: store taskId→projectId in a map.
  const pid = _taskProjectMap.get(taskId) ?? 0;
  if (!pid) return [];
  return apiFetch<SubTask[]>(`/projects/${pid}/tasks/${taskId}/subtasks`);
}

export async function createSubtask(taskId: number, title: string): Promise<SubTask> {
  const pid = _taskProjectMap.get(taskId) ?? 0;
  return apiFetch<SubTask>(`/projects/${pid}/tasks/${taskId}/subtasks`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function toggleSubtask(subtaskId: number, taskId: number): Promise<SubTask> {
  const pid = _taskProjectMap.get(taskId) ?? 0;
  // Fetch current state, toggle
  const subtasks = await listSubtasks(taskId, pid);
  const current = subtasks.find((s) => s.id === subtaskId);
  return apiFetch<SubTask>(`/projects/${pid}/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "PATCH",
    body: JSON.stringify({ completed: !current?.completed }),
  });
}

export async function deleteSubtask(subtaskId: number, taskId: number): Promise<void> {
  const pid = _taskProjectMap.get(taskId) ?? 0;
  return apiFetch<void>(`/projects/${pid}/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" });
}

// ─── Task project ID cache ────────────────────────────────────────────────────
// Subtask hooks only receive taskId; we need projectId for the URL.
// Components should call registerTaskProject() when they know both.
const _taskProjectMap = new Map<number, number>();
export function registerTaskProject(taskId: number, projectId: number) {
  _taskProjectMap.set(taskId, projectId);
}

// ─── Task dependencies ────────────────────────────────────────────────────────

export async function listTaskDependencies(projectId: number, taskId: number) {
  return apiFetch<{ id: number; taskId: number; dependsOnTaskId: number; type: string; dependsOnTitle: string | null }[]>(
    `/projects/${projectId}/tasks/${taskId}/dependencies`,
  );
}

export async function addTaskDependency(
  projectId: number,
  taskId: number,
  dependsOnTaskId: number,
  type: string,
) {
  return apiFetch(`/projects/${projectId}/tasks/${taskId}/dependencies`, {
    method: "POST",
    body: JSON.stringify({ dependsOnTaskId, type }),
  });
}

export async function removeTaskDependency(projectId: number, taskId: number, depId: number) {
  return apiFetch<void>(`/projects/${projectId}/tasks/${taskId}/dependencies/${depId}`, { method: "DELETE" });
}

// ─── Comments ─────────────────────────────────────────────────────────────────

interface RawComment {
  id: number;
  entityType: string;
  entityId: number | null;
  parentId: number | null;
  authorId: number;
  author: CollaboratorUser | null;
  content: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: RawComment[];
}

function rawToTaskComment(raw: RawComment): TaskComment {
  // Extract @mention user IDs from content (e.g. @[123])
  const mentions = [...raw.content.matchAll(/@\[(\d+)\]/g)].map((m) => parseInt(m[1], 10));
  return {
    id: raw.id,
    entityType: (raw.entityType as TaskComment["entityType"]) ?? "task",
    entityId: raw.entityId ?? 0,
    parentId: raw.parentId,
    author: raw.author ?? { id: raw.authorId, email: null, firstName: null, lastName: null, imageUrl: null },
    content: raw.content,
    mentions,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function flattenComments(roots: RawComment[]): TaskComment[] {
  const result: TaskComment[] = [];
  function walk(c: RawComment) {
    result.push(rawToTaskComment(c));
    (c.replies ?? []).forEach(walk);
  }
  roots.forEach(walk);
  return result;
}

export async function listComments(entityType: string, entityId: number): Promise<TaskComment[]> {
  const projectId = _entityProjectMap.get(`${entityType}-${entityId}`) ?? 0;
  if (!projectId) return [];
  const raw = await apiFetch<RawComment[]>(`/projects/${projectId}/comments`, {
    method: "POST",
    body: JSON.stringify({ entityType, entityId }),
  });
  return flattenComments(raw);
}

export async function createComment(
  entityType: string,
  entityId: number,
  content: string,
  parentId?: number,
  _mentions?: number[],
): Promise<TaskComment> {
  const projectId = _entityProjectMap.get(`${entityType}-${entityId}`) ?? 0;
  const raw = await apiFetch<RawComment>(`/projects/${projectId}/comments/create`, {
    method: "POST",
    body: JSON.stringify({ entityType, entityId, content, parentId }),
  });
  return rawToTaskComment(raw);
}

export async function deleteComment(commentId: number, _entityType: string, _entityId: number): Promise<void> {
  // We need the projectId; get it from the entity map
  const projectId = [..._entityProjectMap.values()][0] ?? 0;
  return apiFetch<void>(`/projects/${projectId}/comments/${commentId}`, { method: "DELETE" });
}

// ─── Entity project ID cache ─────────────────────────────────────────────────
const _entityProjectMap = new Map<string, number>();
export function registerEntityProject(entityType: string, entityId: number, projectId: number) {
  _entityProjectMap.set(`${entityType}-${entityId}`, projectId);
}
export function registerProjectForEntity(projectId: number) {
  // Register a fallback projectId so comment functions work
  _entityProjectMap.set("_default", projectId);
}

// ─── Activity ─────────────────────────────────────────────────────────────────

interface RawActivity {
  id: number;
  projectId: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  entityName: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: CollaboratorUser;
}

export async function listActivity(projectId: number, limit = 50): Promise<ActivityLogEntry[]> {
  const raw = await apiFetch<RawActivity[]>(`/projects/${projectId}/activity?limit=${limit}`);
  return raw.map((a) => ({
    id: a.id,
    projectId: a.projectId,
    user: a.user ?? { id: a.userId, email: null, firstName: null, lastName: null, imageUrl: null },
    action: a.action as ActivityLogEntry["action"],
    entityType: a.entityType,
    entityId: a.entityId ?? 0,
    entityTitle: a.entityName ?? null,
    metadata: a.metadata ?? {},
    createdAt: a.createdAt,
  }));
}

// ─── Shares ───────────────────────────────────────────────────────────────────

interface RawShare {
  id: number;
  projectId: number;
  role: string;
  invitedEmail: string | null;
  publicLink: boolean;
  publicLinkExpiry: string | null;
  createdAt: string;
  user: CollaboratorUser | null;
  invitedBy: CollaboratorUser | null;
}

function rawToProjectShare(raw: RawShare): ProjectShare {
  return {
    id: raw.id,
    projectId: raw.projectId,
    role: raw.role as ProjectRole,
    email: raw.invitedEmail,
    user: raw.user,
    invitedBy: raw.invitedBy ?? { id: 0, email: null, firstName: null, lastName: null, imageUrl: null },
    createdAt: raw.createdAt,
  };
}

export async function listShares(projectId: number): Promise<ProjectShare[]> {
  const raw = await apiFetch<RawShare[]>(`/projects/${projectId}/shares`);
  return raw.map(rawToProjectShare);
}

export async function createShare(
  projectId: number,
  email: string,
  role: ProjectRole,
): Promise<ProjectShare> {
  const raw = await apiFetch<RawShare>(`/projects/${projectId}/shares`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
  return rawToProjectShare(raw);
}

export async function updateShare(
  projectId: number,
  shareId: number,
  role: ProjectRole,
): Promise<ProjectShare> {
  const raw = await apiFetch<RawShare>(`/projects/${projectId}/shares/${shareId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  return rawToProjectShare(raw);
}

export async function removeShare(projectId: number, shareId: number): Promise<void> {
  return apiFetch<void>(`/projects/${projectId}/shares/${shareId}`, { method: "DELETE" });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function listNotifications(): Promise<NotificationItem[]> {
  return apiFetch<NotificationItem[]>("/notifications?limit=50");
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  return apiFetch<void>(`/notifications/${notificationId}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  return apiFetch<void>("/notifications/read-all", { method: "PATCH" });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  return apiFetch<void>(`/notifications/${notificationId}`, { method: "DELETE" });
}

// ─── Presence (polling-based) ─────────────────────────────────────────────────
// Real-time presence via WebSocket is not yet enabled.
// We return an empty array — presence avatars will show only when WS is live.
export async function listPresence(_projectId: number): Promise<PresenceUser[]> {
  return [];
}

// ─── Project users ────────────────────────────────────────────────────────────

export async function listProjectUsers(projectId: number): Promise<CollaboratorUser[]> {
  return apiFetch<CollaboratorUser[]>(`/projects/${projectId}/users`);
}
