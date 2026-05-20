export type ProjectRole = "owner" | "admin" | "editor" | "commenter" | "viewer";
export type TaskStatus = "backlog" | "in_progress" | "review" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type ActivityAction = "created" | "updated" | "deleted" | "commented" | "assigned" | "moved" | "joined" | "shared";

export interface CollaboratorUser {
  id: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

export interface RichTask {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: number[];
  dueDate: string | null;
  tags: string[];
  parentTaskId: number | null;
  estimatedHours: number | null;
  actualHours: number | null;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubTask {
  id: number;
  taskId: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface CommentReaction {
  emoji: string;
  count: number;
  userIds: number[];
}

export interface TaskComment {
  id: number;
  entityType: "task" | "note" | "rule" | "asset" | "project";
  entityId: number;
  parentId: number | null;
  author: CollaboratorUser;
  content: string;
  mentions: number[];
  resolved: boolean;
  reactions: CommentReaction[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogEntry {
  id: number;
  projectId: number;
  user: CollaboratorUser;
  action: ActivityAction;
  entityType: string;
  entityId: number;
  entityTitle: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ProjectShare {
  id: number;
  projectId: number;
  user: CollaboratorUser | null;
  email: string | null;
  role: ProjectRole;
  invitedBy: CollaboratorUser;
  createdAt: string;
}

export interface ProjectPermission {
  role: ProjectRole;
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
}

export interface NotificationItem {
  id: string;
  type: "comment" | "mention" | "assignment" | "status_change" | "invite" | "due_soon" | "system";
  title: string;
  message: string;
  projectId?: number;
  projectName?: string;
  entityType?: string;
  entityId?: number;
  actor?: CollaboratorUser;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface PresenceUser {
  userId: number;
  userName: string;
  avatarUrl: string | null;
  cursorX: number;
  cursorY: number;
  section: string | null;
  lastSeen: string;
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeIds?: number[];
  tags?: string[];
  search?: string;
  dueBefore?: string;
  dueAfter?: string;
}

export interface TaskSort {
  field: "dueDate" | "priority" | "createdAt" | "title";
  direction: "asc" | "desc";
}

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  review: "Review",
  blocked: "Blocked",
  done: "Done",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: "bg-slate-500/10 text-slate-400",
  in_progress: "bg-blue-500/10 text-blue-400",
  review: "bg-purple-500/10 text-purple-400",
  blocked: "bg-red-500/10 text-red-400",
  done: "bg-green-500/10 text-green-400",
};

export const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  commenter: "Commenter",
  viewer: "Viewer",
};

export const ROLE_PERMISSIONS: Record<ProjectRole, ProjectPermission> = {
  owner: { role: "owner", canEdit: true, canComment: true, canShare: true, canDelete: true, canManageMembers: true },
  admin: { role: "admin", canEdit: true, canComment: true, canShare: true, canDelete: true, canManageMembers: true },
  editor: { role: "editor", canEdit: true, canComment: true, canShare: false, canDelete: false, canManageMembers: false },
  commenter: { role: "commenter", canEdit: false, canComment: true, canShare: false, canDelete: false, canManageMembers: false },
  viewer: { role: "viewer", canEdit: false, canComment: false, canShare: false, canDelete: false, canManageMembers: false },
};

export function getPermission(role: ProjectRole): ProjectPermission {
  return ROLE_PERMISSIONS[role];
}

export function canEdit(role: ProjectRole): boolean {
  return ROLE_PERMISSIONS[role].canEdit;
}

export function canComment(role: ProjectRole): boolean {
  return ROLE_PERMISSIONS[role].canComment;
}

export function canShare(role: ProjectRole): boolean {
  return ROLE_PERMISSIONS[role].canShare;
}

export function canDelete(role: ProjectRole): boolean {
  return ROLE_PERMISSIONS[role].canDelete;
}

export function canManageMembers(role: ProjectRole): boolean {
  return ROLE_PERMISSIONS[role].canManageMembers;
}
