import type {
  RichTask,
  SubTask,
  TaskComment,
  ActivityLogEntry,
  ProjectShare,
  NotificationItem,
  PresenceUser,
  TaskStatus,
  TaskPriority,
  TaskFilter,
  TaskSort,
  ProjectRole,
  CollaboratorUser,
} from "./collaboration-types";

let taskIdCounter = 1000;
let commentIdCounter = 1000;
let activityIdCounter = 1000;
let shareIdCounter = 1000;
let notifIdCounter = 1000;
let subtaskIdCounter = 100;

function nextTaskId() { return ++taskIdCounter; }
function nextCommentId() { return ++commentIdCounter; }
function nextActivityId() { return ++activityIdCounter; }
function nextShareId() { return ++shareIdCounter; }
function nextNotifId() { return `notif-${++notifIdCounter}`; }
function nextSubtaskId() { return ++subtaskIdCounter; }

const currentUser: CollaboratorUser = {
  id: 1,
  email: "user@example.com",
  firstName: "Current",
  lastName: "User",
  imageUrl: null,
};

const mockUsers: CollaboratorUser[] = [
  currentUser,
  { id: 2, email: "alice@example.com", firstName: "Alice", lastName: "Designer", imageUrl: null },
  { id: 3, email: "bob@example.com", firstName: "Bob", lastName: "Dev", imageUrl: null },
  { id: 4, email: "charlie@example.com", firstName: "Charlie", lastName: "PM", imageUrl: null },
];

const mockTasksStore: Map<number, RichTask> = new Map([
  [1, {
    id: 1, projectId: 1, title: "Design core mechanics",
    description: "Define the core loop and primary mechanics",
    status: "in_progress", priority: "high",
    assigneeIds: [2], dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    tags: ["design", "core"], parentTaskId: null,
    estimatedHours: 8, actualHours: 3,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  }],
  [2, {
    id: 2, projectId: 1, title: "Create card templates",
    description: "Design the visual layout for game cards",
    status: "backlog", priority: "medium",
    assigneeIds: [2, 3], dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    tags: ["art", "cards"], parentTaskId: null,
    estimatedHours: 12, actualHours: 0,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  }],
  [3, {
    id: 3, projectId: 1, title: "Balance first pass",
    description: "Run simulations and adjust values",
    status: "backlog", priority: "urgent",
    assigneeIds: [], dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    tags: ["balance", "sim"], parentTaskId: null,
    estimatedHours: 6, actualHours: 0,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  }],
  [4, {
    id: 4, projectId: 1, title: "Write rulebook draft",
    description: "First draft of game rules for playtesters",
    status: "review", priority: "high",
    assigneeIds: [4], dueDate: new Date(Date.now() + 86400000 * 1).toISOString(),
    tags: ["docs", "rules"], parentTaskId: null,
    estimatedHours: 4, actualHours: 5,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  }],
  [5, {
    id: 5, projectId: 1, title: "Player board layout",
    description: null,
    status: "done", priority: "low",
    assigneeIds: [2], dueDate: null,
    tags: ["art"], parentTaskId: null,
    estimatedHours: 3, actualHours: 3,
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  }],
]);

const mockSubtasksStore: Map<number, SubTask[]> = new Map([
  [1, [
    { id: nextSubtaskId(), taskId: 1, title: "Research similar games", completed: true, createdAt: new Date().toISOString() },
    { id: nextSubtaskId(), taskId: 1, title: "Draft mechanic list", completed: false, createdAt: new Date().toISOString() },
  ]],
]);

const mockCommentsStore: Map<string, TaskComment[]> = new Map([
  ["task-1", [
    {
      id: nextCommentId(), entityType: "task", entityId: 1, parentId: null,
      author: mockUsers[1], content: "Should we look at Wingspan for inspiration?",
      mentions: [], createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: nextCommentId(), entityType: "task", entityId: 1, parentId: null,
      author: mockUsers[2], content: "Great idea, I'll add a research subtask.",
      mentions: [], createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: nextCommentId(), entityType: "task", entityId: 1, parentId: 2,
      author: mockUsers[1], content: "Let me know when you have a first draft.",
      mentions: [], createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ]],
  ["task-4", [
    {
      id: nextCommentId(), entityType: "task", entityId: 4, parentId: null,
      author: mockUsers[3], content: "Reviewed and left some feedback in the doc.",
      mentions: [], createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
  ]],
]);

const mockActivityStore: Map<number, ActivityLogEntry[]> = new Map([
  [1, [
    {
      id: nextActivityId(), projectId: 1,
      user: mockUsers[1], action: "created", entityType: "task", entityId: 1,
      entityTitle: "Design core mechanics", metadata: {},
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: nextActivityId(), projectId: 1,
      user: mockUsers[1], action: "assigned", entityType: "task", entityId: 1,
      entityTitle: "Design core mechanics", metadata: { assigneeId: 2 },
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: nextActivityId(), projectId: 1,
      user: mockUsers[2], action: "moved", entityType: "task", entityId: 1,
      entityTitle: "Design core mechanics", metadata: { from: "backlog", to: "in_progress" },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: nextActivityId(), projectId: 1,
      user: mockUsers[3], action: "commented", entityType: "task", entityId: 4,
      entityTitle: "Write rulebook draft", metadata: {},
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: nextActivityId(), projectId: 1,
      user: mockUsers[2], action: "updated", entityType: "task", entityId: 2,
      entityTitle: "Create card templates", metadata: { field: "priority" },
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
  ]],
]);

const mockSharesStore: Map<number, ProjectShare[]> = new Map([
  [1, [
    {
      id: nextShareId(), projectId: 1, user: mockUsers[0], email: null,
      role: "owner", invitedBy: mockUsers[0], createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: nextShareId(), projectId: 1, user: mockUsers[1], email: null,
      role: "editor", invitedBy: mockUsers[0], createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    },
    {
      id: nextShareId(), projectId: 1, user: mockUsers[2], email: null,
      role: "editor", invitedBy: mockUsers[0], createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
      id: nextShareId(), projectId: 1, user: mockUsers[3], email: null,
      role: "viewer", invitedBy: mockUsers[0], createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ]],
]);

const mockNotificationsStore: NotificationItem[] = [
  {
    id: nextNotifId(), type: "assignment", title: "Assigned to task",
    message: "Alice assigned you to \"Design core mechanics\"",
    projectId: 1, projectName: "Dragon's Hoard",
    entityType: "task", entityId: 1,
    actor: mockUsers[1], read: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    actionUrl: "/workspace/1/tasks",
  },
  {
    id: nextNotifId(), type: "mention", title: "You were mentioned",
    message: "Bob mentioned you in \"Write rulebook draft\"",
    projectId: 1, projectName: "Dragon's Hoard",
    entityType: "task", entityId: 4,
    actor: mockUsers[2], read: false,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    actionUrl: "/workspace/1/tasks",
  },
  {
    id: nextNotifId(), type: "comment", title: "New comment",
    message: "Alice commented on \"Design core mechanics\"",
    projectId: 1, projectName: "Dragon's Hoard",
    entityType: "task", entityId: 1,
    actor: mockUsers[1], read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    actionUrl: "/workspace/1/tasks",
  },
  {
    id: nextNotifId(), type: "status_change", title: "Task status changed",
    message: "\"Design core mechanics\" moved to In Progress",
    projectId: 1, projectName: "Dragon's Hoard",
    entityType: "task", entityId: 1,
    actor: mockUsers[2], read: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    actionUrl: "/workspace/1/tasks",
  },
];

const mockPresenceStore: Map<number, PresenceUser[]> = new Map([
  [1, [
    { userId: 2, userName: "Alice", avatarUrl: null, cursorX: 120, cursorY: 300, section: "tasks", lastSeen: new Date().toISOString() },
    { userId: 3, userName: "Bob", avatarUrl: null, cursorX: 400, cursorY: 150, section: "overview", lastSeen: new Date().toISOString() },
  ]],
]);

function delay(ms = 300) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function listTasks(projectId: number, filter?: TaskFilter, sort?: TaskSort): Promise<RichTask[]> {
  await delay();
  let tasks = Array.from(mockTasksStore.values()).filter((t) => t.projectId === projectId);
  if (filter) {
    if (filter.status?.length) tasks = tasks.filter((t) => filter.status!.includes(t.status));
    if (filter.priority?.length) tasks = tasks.filter((t) => filter.priority!.includes(t.priority));
    if (filter.assigneeIds?.length) tasks = tasks.filter((t) => t.assigneeIds.some((id) => filter.assigneeIds!.includes(id)));
    if (filter.tags?.length) tasks = tasks.filter((t) => filter.tags!.some((tag) => t.tags.includes(tag)));
    if (filter.search) {
      const q = filter.search.toLowerCase();
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q));
    }
    if (filter.dueBefore) tasks = tasks.filter((t) => t.dueDate && t.dueDate <= filter.dueBefore!);
    if (filter.dueAfter) tasks = tasks.filter((t) => t.dueDate && t.dueDate >= filter.dueAfter!);
  }
  if (sort) {
    tasks.sort((a, b) => {
      const dir = sort.direction === "asc" ? 1 : -1;
      if (sort.field === "dueDate") {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return (a.dueDate < b.dueDate ? -1 : 1) * dir;
      }
      if (sort.field === "priority") {
        const priMap = { low: 1, medium: 2, high: 3, urgent: 4 };
        return (priMap[a.priority] - priMap[b.priority]) * dir;
      }
      if (sort.field === "createdAt") return (a.createdAt < b.createdAt ? -1 : 1) * dir;
      if (sort.field === "title") return a.title.localeCompare(b.title) * dir;
      return 0;
    });
  }
  return tasks;
}

export async function createTask(projectId: number, data: Partial<RichTask>): Promise<RichTask> {
  await delay();
  const task: RichTask = {
    id: nextTaskId(),
    projectId,
    title: data.title ?? "New Task",
    description: data.description ?? null,
    status: data.status ?? "backlog",
    priority: data.priority ?? "medium",
    assigneeIds: data.assigneeIds ?? [],
    dueDate: data.dueDate ?? null,
    tags: data.tags ?? [],
    parentTaskId: data.parentTaskId ?? null,
    estimatedHours: data.estimatedHours ?? null,
    actualHours: data.actualHours ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockTasksStore.set(task.id, task);
  return task;
}

export async function updateTask(projectId: number, taskId: number, data: Partial<RichTask>): Promise<RichTask> {
  await delay();
  const existing = mockTasksStore.get(taskId);
  if (!existing) throw new Error("Task not found");
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  mockTasksStore.set(taskId, updated);
  return updated;
}

export async function deleteTask(projectId: number, taskId: number): Promise<void> {
  await delay();
  mockTasksStore.delete(taskId);
}

export async function listSubtasks(taskId: number): Promise<SubTask[]> {
  await delay();
  return mockSubtasksStore.get(taskId) ?? [];
}

export async function createSubtask(taskId: number, title: string): Promise<SubTask> {
  await delay();
  const sub: SubTask = { id: nextSubtaskId(), taskId, title, completed: false, createdAt: new Date().toISOString() };
  const list = mockSubtasksStore.get(taskId) ?? [];
  list.push(sub);
  mockSubtasksStore.set(taskId, list);
  return sub;
}

export async function toggleSubtask(subtaskId: number, taskId: number): Promise<SubTask> {
  await delay();
  const list = mockSubtasksStore.get(taskId) ?? [];
  const sub = list.find((s) => s.id === subtaskId);
  if (!sub) throw new Error("Subtask not found");
  sub.completed = !sub.completed;
  return sub;
}

export async function deleteSubtask(subtaskId: number, taskId: number): Promise<void> {
  await delay();
  const list = mockSubtasksStore.get(taskId) ?? [];
  mockSubtasksStore.set(taskId, list.filter((s) => s.id !== subtaskId));
}

export async function listComments(entityType: string, entityId: number): Promise<TaskComment[]> {
  await delay();
  return mockCommentsStore.get(`${entityType}-${entityId}`) ?? [];
}

export async function createComment(
  entityType: string, entityId: number, content: string, parentId?: number | null
): Promise<TaskComment> {
  await delay();
  const comment: TaskComment = {
    id: nextCommentId(),
    entityType: entityType as any,
    entityId,
    parentId: parentId ?? null,
    author: currentUser,
    content,
    mentions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const key = `${entityType}-${entityId}`;
  const list = mockCommentsStore.get(key) ?? [];
  list.push(comment);
  mockCommentsStore.set(key, list);
  return comment;
}

export async function deleteComment(commentId: number, entityType: string, entityId: number): Promise<void> {
  await delay();
  const key = `${entityType}-${entityId}`;
  const list = mockCommentsStore.get(key) ?? [];
  mockCommentsStore.set(key, list.filter((c) => c.id !== commentId));
}

export async function listActivity(projectId: number, limit = 50): Promise<ActivityLogEntry[]> {
  await delay();
  return (mockActivityStore.get(projectId) ?? []).slice(0, limit);
}

export async function listShares(projectId: number): Promise<ProjectShare[]> {
  await delay();
  return mockSharesStore.get(projectId) ?? [];
}

export async function createShare(
  projectId: number, email: string, role: ProjectRole
): Promise<ProjectShare> {
  await delay();
  const share: ProjectShare = {
    id: nextShareId(), projectId, user: null, email, role,
    invitedBy: currentUser, createdAt: new Date().toISOString(),
  };
  const list = mockSharesStore.get(projectId) ?? [];
  list.push(share);
  mockSharesStore.set(projectId, list);
  return share;
}

export async function updateShare(projectId: number, shareId: number, role: ProjectRole): Promise<ProjectShare> {
  await delay();
  const list = mockSharesStore.get(projectId) ?? [];
  const share = list.find((s) => s.id === shareId);
  if (!share) throw new Error("Share not found");
  share.role = role;
  return share;
}

export async function removeShare(projectId: number, shareId: number): Promise<void> {
  await delay();
  const list = mockSharesStore.get(projectId) ?? [];
  mockSharesStore.set(projectId, list.filter((s) => s.id !== shareId));
}

export async function listNotifications(): Promise<NotificationItem[]> {
  await delay();
  return [...mockNotificationsStore];
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await delay();
  const n = mockNotificationsStore.find((x) => x.id === notificationId);
  if (n) n.read = true;
}

export async function markAllNotificationsRead(): Promise<void> {
  await delay();
  mockNotificationsStore.forEach((n) => (n.read = true));
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await delay();
  const idx = mockNotificationsStore.findIndex((x) => x.id === notificationId);
  if (idx >= 0) mockNotificationsStore.splice(idx, 1);
}

export async function listPresence(projectId: number): Promise<PresenceUser[]> {
  await delay(100);
  return mockPresenceStore.get(projectId) ?? [];
}

export async function listProjectUsers(projectId: number): Promise<CollaboratorUser[]> {
  await delay();
  return [...mockUsers];
}
