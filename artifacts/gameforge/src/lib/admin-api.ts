import { apiBase, getClerkToken } from "./workspaces-api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getClerkToken();
  const res = await fetch(`${apiBase()}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Types
export interface AuditLog {
  id: number;
  userId: number | null;
  userEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  projectId: number | null;
  workspaceId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  severity: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditSummary {
  actionBreakdown: { action: string; count: number }[];
  severityBreakdown: { severity: string; count: number }[];
  last24Hours: number;
  periodDays: number;
}

export interface AdminMetrics {
  users: {
    total: number;
    new_recent: number;
    active_7d: number;
  };
  projects: {
    total: number;
    active: number;
    deleted: number;
    avg_completion: number;
  };
  activity: {
    projects_created: number;
    comments_created: number;
    exports: number;
    playtest_events: number;
  };
  stageDistribution: { stage: string; count: number }[];
  dailyActiveUsers: { date: string; dau: number }[];
  periodDays: number;
}

export interface UserActivity {
  id: number;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  projects: number;
  actions: number;
}

// Admin API functions
export const adminApi = {
  // Audit logs
  getAuditLogs: (params?: {
    limit?: number;
    offset?: number;
    action?: string;
    severity?: string;
    userId?: number;
    projectId?: number;
    workspaceId?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    if (params?.action) query.set("action", params.action);
    if (params?.severity) query.set("severity", params.severity);
    if (params?.userId) query.set("userId", String(params.userId));
    if (params?.projectId) query.set("projectId", String(params.projectId));
    if (params?.workspaceId) query.set("workspaceId", String(params.workspaceId));
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    return request<AuditLogsResponse>(`/admin/audit-logs?${query.toString()}`);
  },

  getAuditSummary: (days?: number) =>
    request<AuditSummary>(`/admin/audit-logs/summary${days ? `?days=${days}` : ""}`),

  // Metrics
  getMetrics: (days?: number) =>
    request<AdminMetrics>(`/admin/metrics${days ? `?days=${days}` : ""}`),

  // Broadcast
  broadcast: (channel: string, event: string, data: unknown, userIds?: number[]) =>
    request<{ success: boolean; message: string }>("/admin/broadcast", {
      method: "POST",
      body: JSON.stringify({ channel, event, data, userIds }),
    }),
};
