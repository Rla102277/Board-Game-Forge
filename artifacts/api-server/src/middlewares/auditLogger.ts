/**
 * Comprehensive audit logging middleware
 * Tracks all CRUD operations, auth events, and security-relevant actions
 */
import { Request, Response, NextFunction } from "express";
import { db, activityFeed, appUsers } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  userId: number | null;
  userEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | number;
  projectId: number | null;
  workspaceId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  severity: "info" | "warning" | "error" | "critical";
}

type AuditAction = 
  | "create" | "read" | "update" | "delete" | "restore"
  | "login" | "logout" | "token_refresh" | "mfa_verify"
  | "share_grant" | "share_revoke" | "role_change"
  | "export" | "import" | "backup"
  | "playtest_start" | "playtest_complete" | "feedback_submit"
  | "comment_create" | "comment_resolve" | "reaction_add"
  | "ai_generate" | "ai_edit" | "version_create" | "version_restore";

const SENSITIVE_FIELDS = ["password", "token", "secret", "apiKey", "privateKey", "creditCard"];

function sanitizeMetadata(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || null;
}

export async function logAuditEvent(params: {
  req: Request;
  action: AuditAction;
  resourceType: string;
  resourceId: string | number;
  projectId?: number;
  workspaceId?: number;
  metadata?: Record<string, unknown>;
  severity?: AuditLogEntry["severity"];
}): Promise<void> {
  const { req, action, resourceType, resourceId, projectId, workspaceId, metadata = {}, severity = "info" } = params;
  
  const userId = typeof req.appUserId === "number" ? req.appUserId : null;
  const ipAddress = getClientIp(req);
  const userAgent = req.headers["user-agent"] || null;
  
  const sanitizedMetadata = sanitizeMetadata(metadata);
  
  try {
    await db.execute(sql`
      INSERT INTO audit_logs (
        user_id, user_email, action, resource_type, resource_id,
        project_id, workspace_id, ip_address, user_agent, metadata, severity, created_at
      ) VALUES (
        ${userId},
        (SELECT email FROM app_users WHERE id = ${userId}),
        ${action},
        ${resourceType},
        ${String(resourceId)},
        ${projectId || null},
        ${workspaceId || null},
        ${ipAddress},
        ${userAgent},
        ${JSON.stringify(sanitizedMetadata)}::jsonb,
        ${severity},
        NOW()
      )
    `);
  } catch (err) {
    req.log.error({ err }, "Failed to write audit log");
  }
}

// Express middleware to wrap routes with audit logging
export function auditLog(params: {
  action: AuditAction;
  resourceType: string;
  getResourceId?: (req: Request) => string | number | string[];
  getProjectId?: (req: Request) => number | undefined;
  getMetadata?: (req: Request, res: Response) => Record<string, unknown>;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Capture original end to intercept response
    const originalEnd = res.end.bind(res);
    
    res.end = function(chunk: any, encoding?: any, callback?: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      const rawResourceId = params.getResourceId?.(req) || req.params.id || req.params.projectId || "unknown";
    const resourceId = Array.isArray(rawResourceId) ? rawResourceId[0] : rawResourceId;
      const projectId = params.getProjectId?.(req);
      const metadata = params.getMetadata?.(req, res) || {};
      
      // Determine severity based on status code
      let severity: AuditLogEntry["severity"] = "info";
      if (statusCode >= 500) severity = "critical";
      else if (statusCode >= 400) severity = "warning";
      
      logAuditEvent({
        req,
        action: params.action,
        resourceType: params.resourceType,
        resourceId,
        projectId,
        metadata: {
          ...metadata,
          statusCode,
          durationMs: duration,
          method: req.method,
          path: req.path,
        },
        severity,
      }).catch(() => {}); // Don't block response
      
      return originalEnd(chunk, encoding, callback);
    };
    
    next();
  };
}

// Specific audit wrappers for common operations
export const audit = {
  project: {
    create: auditLog({ action: "create", resourceType: "project", getMetadata: (req) => ({ name: req.body?.name }) }),
    update: auditLog({ action: "update", resourceType: "project", getResourceId: (req) => String(req.params.projectId || "unknown") }),
    delete: auditLog({ action: "delete", resourceType: "project", getResourceId: (req) => String(req.params.projectId || "unknown") }),
    restore: auditLog({ action: "restore", resourceType: "project", getResourceId: (req) => String(req.params.projectId || "unknown") }),
    export: auditLog({ action: "export", resourceType: "project", getResourceId: (req) => String(req.params.projectId || "unknown"), getMetadata: (req) => ({ format: req.body?.format }) }),
  },
  entity: {
    create: auditLog({ action: "create", resourceType: "entity", getProjectId: (req) => {
      const pid = req.params.projectId;
      return typeof pid === "string" ? parseInt(pid, 10) : Array.isArray(pid) ? parseInt(pid[0], 10) : 0;
    } }),
    update: auditLog({ action: "update", resourceType: "entity", getResourceId: (req) => String(req.params.entityId || "unknown"), getProjectId: (req) => {
      const pid = req.params.projectId;
      return typeof pid === "string" ? parseInt(pid, 10) : Array.isArray(pid) ? parseInt(pid[0], 10) : 0;
    } }),
    delete: auditLog({ action: "delete", resourceType: "entity", getResourceId: (req) => String(req.params.entityId || "unknown"), getProjectId: (req) => {
      const pid = req.params.projectId;
      return typeof pid === "string" ? parseInt(pid, 10) : Array.isArray(pid) ? parseInt(pid[0], 10) : 0;
    } }),
  },
  rule: {
    create: auditLog({ action: "create", resourceType: "rule", getProjectId: (req) => {
      const pid = req.params.projectId;
      return typeof pid === "string" ? parseInt(pid, 10) : Array.isArray(pid) ? parseInt(pid[0], 10) : 0;
    } }),
    update: auditLog({ action: "update", resourceType: "rule", getResourceId: (req) => String(req.params.ruleId || "unknown"), getProjectId: (req) => {
      const pid = req.params.projectId;
      return typeof pid === "string" ? parseInt(pid, 10) : Array.isArray(pid) ? parseInt(pid[0], 10) : 0;
    } }),
    delete: auditLog({ action: "delete", resourceType: "rule", getResourceId: (req) => String(req.params.ruleId || "unknown"), getProjectId: (req) => {
      const pid = req.params.projectId;
      return typeof pid === "string" ? parseInt(pid, 10) : Array.isArray(pid) ? parseInt(pid[0], 10) : 0;
    } }),
  },
  share: {
    grant: auditLog({ action: "share_grant", resourceType: "project_share", getResourceId: (req) => String(req.params.projectId || "unknown"), getMetadata: (req) => ({ email: req.body?.email, role: req.body?.role }) }),
    revoke: auditLog({ action: "share_revoke", resourceType: "project_share", getResourceId: (req) => String(req.params.shareId || "unknown") }),
    roleChange: auditLog({ action: "role_change", resourceType: "project_share", getResourceId: (req) => String(req.params.shareId || "unknown"), getMetadata: (req, res) => ({ newRole: req.body?.role }) }),
  },
  comment: {
    create: auditLog({ action: "comment_create", resourceType: "comment", getMetadata: (req) => ({ entityType: req.body?.entityType, entityId: req.body?.entityId }) }),
    resolve: auditLog({ action: "comment_resolve", resourceType: "comment", getResourceId: (req) => String(req.params.commentId || "unknown") }),
  },
  playtest: {
    start: auditLog({ action: "playtest_start", resourceType: "playtest_session", getProjectId: (req) => {
      const pid = req.params.projectId;
      return typeof pid === "string" ? parseInt(pid, 10) : Array.isArray(pid) ? parseInt(pid[0], 10) : 0;
    } }),
    complete: auditLog({ action: "playtest_complete", resourceType: "playtest_session", getResourceId: (req) => String(req.params.sessionId || "unknown") }),
    feedback: auditLog({ action: "feedback_submit", resourceType: "playtest_feedback", getResourceId: (req) => String(req.params.sessionId || "unknown") }),
  },
  ai: {
    generate: auditLog({ action: "ai_generate", resourceType: "ai_content", getMetadata: (req) => ({ prompt: typeof req.body?.prompt === "string" ? req.body.prompt.substring(0, 100) : undefined, model: req.body?.model }) }),
    edit: auditLog({ action: "ai_edit", resourceType: "ai_content", getMetadata: (req) => ({ instruction: typeof req.body?.instruction === "string" ? req.body.instruction.substring(0, 100) : undefined }) }),
  },
  version: {
    create: auditLog({ action: "version_create", resourceType: "project_version", getResourceId: (req) => String(req.params.projectId || "unknown") }),
    restore: auditLog({ action: "version_restore", resourceType: "project_version", getResourceId: (req) => String(req.params.versionId || "unknown") }),
  },
};
