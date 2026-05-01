import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  RichTask, SubTask, TaskComment, ActivityLogEntry,
  ProjectShare, NotificationItem, PresenceUser,
  TaskFilter, TaskSort, ProjectRole,
} from "@/lib/collaboration-types";
import * as api from "@/lib/collaboration-api";

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function getListRichTasksQueryKey(projectId: number, filter?: TaskFilter, sort?: TaskSort) {
  return ["rich-tasks", projectId, filter, sort];
}

export function useListRichTasks(projectId: number, filter?: TaskFilter, sort?: TaskSort) {
  return useQuery({
    queryKey: getListRichTasksQueryKey(projectId, filter, sort),
    queryFn: () => api.listTasks(projectId, filter, sort),
    staleTime: 30_000,
  });
}

export function useCreateRichTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Partial<RichTask> }) =>
      api.createTask(projectId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["rich-tasks", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["activity", vars.projectId] });
    },
  });
}

export function useUpdateRichTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId, data }: { projectId: number; taskId: number; data: Partial<RichTask> }) =>
      api.updateTask(projectId, taskId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["rich-tasks", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["task-detail", vars.taskId] });
      qc.invalidateQueries({ queryKey: ["activity", vars.projectId] });
    },
  });
}

export function useDeleteRichTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId }: { projectId: number; taskId: number }) =>
      api.deleteTask(projectId, taskId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["rich-tasks", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["activity", vars.projectId] });
    },
  });
}

// ─── Subtasks ─────────────────────────────────────────────────────────────────

export function getListSubtasksQueryKey(taskId: number) {
  return ["subtasks", taskId];
}

export function useListSubtasks(taskId: number, projectId?: number) {
  // Register the taskId→projectId mapping so the API client can build URLs
  useEffect(() => {
    if (projectId && taskId) api.registerTaskProject(taskId, projectId);
  }, [taskId, projectId]);

  return useQuery({
    queryKey: getListSubtasksQueryKey(taskId),
    queryFn: () => api.listSubtasks(taskId, projectId),
    enabled: taskId > 0,
    staleTime: 30_000,
  });
}

export function useCreateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, title, projectId }: { taskId: number; title: string; projectId?: number }) => {
      if (projectId) api.registerTaskProject(taskId, projectId);
      return api.createSubtask(taskId, title);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: getListSubtasksQueryKey(vars.taskId) });
    },
  });
}

export function useToggleSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subtaskId, taskId, projectId }: { subtaskId: number; taskId: number; projectId?: number }) => {
      if (projectId) api.registerTaskProject(taskId, projectId);
      return api.toggleSubtask(subtaskId, taskId);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: getListSubtasksQueryKey(vars.taskId) });
    },
  });
}

export function useDeleteSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subtaskId, taskId, projectId }: { subtaskId: number; taskId: number; projectId?: number }) => {
      if (projectId) api.registerTaskProject(taskId, projectId);
      return api.deleteSubtask(subtaskId, taskId);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: getListSubtasksQueryKey(vars.taskId) });
    },
  });
}

// ─── Task dependencies ────────────────────────────────────────────────────────

export function useListTaskDependencies(projectId: number, taskId: number) {
  return useQuery({
    queryKey: ["task-deps", taskId],
    queryFn: () => api.listTaskDependencies(projectId, taskId),
    enabled: taskId > 0,
  });
}

export function useAddTaskDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId, dependsOnTaskId, type }: {
      projectId: number; taskId: number; dependsOnTaskId: number; type: string;
    }) => api.addTaskDependency(projectId, taskId, dependsOnTaskId, type),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["task-deps", vars.taskId] });
    },
  });
}

export function useRemoveTaskDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId, depId }: { projectId: number; taskId: number; depId: number }) =>
      api.removeTaskDependency(projectId, taskId, depId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["task-deps", vars.taskId] });
    },
  });
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export function getListCommentsQueryKey(entityType: string, entityId: number) {
  return ["comments", entityType, entityId];
}

export function useListComments(entityType: string, entityId: number, projectId?: number) {
  useEffect(() => {
    if (projectId && entityId) api.registerEntityProject(entityType, entityId, projectId);
  }, [entityType, entityId, projectId]);

  return useQuery({
    queryKey: getListCommentsQueryKey(entityType, entityId),
    queryFn: () => api.listComments(entityType, entityId),
    enabled: entityId > 0,
    staleTime: 30_000,
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entityType, entityId, content, parentId, projectId,
    }: {
      entityType: string; entityId: number; content: string; parentId?: number | null; projectId?: number;
    }) => {
      if (projectId) api.registerEntityProject(entityType, entityId, projectId);
      return api.createComment(entityType, entityId, content, parentId ?? undefined);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: getListCommentsQueryKey(vars.entityType, vars.entityId) });
      if (vars.projectId) qc.invalidateQueries({ queryKey: ["activity", vars.projectId] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, entityType, entityId }: { commentId: number; entityType: string; entityId: number }) =>
      api.deleteComment(commentId, entityType, entityId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: getListCommentsQueryKey(vars.entityType, vars.entityId) });
    },
  });
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export function getListActivityQueryKey(projectId: number) {
  return ["activity", projectId];
}

export function useListActivity(projectId: number, limit?: number) {
  return useQuery({
    queryKey: getListActivityQueryKey(projectId),
    queryFn: () => api.listActivity(projectId, limit),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

// ─── Shares ───────────────────────────────────────────────────────────────────

export function getListSharesQueryKey(projectId: number) {
  return ["shares", projectId];
}

export function useListShares(projectId: number) {
  return useQuery({
    queryKey: getListSharesQueryKey(projectId),
    queryFn: () => api.listShares(projectId),
  });
}

export function useCreateShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, email, role }: { projectId: number; email: string; role: ProjectRole }) =>
      api.createShare(projectId, email, role),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: getListSharesQueryKey(vars.projectId) });
    },
  });
}

export function useUpdateShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, shareId, role }: { projectId: number; shareId: number; role: ProjectRole }) =>
      api.updateShare(projectId, shareId, role),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: getListSharesQueryKey(vars.projectId) });
    },
  });
}

export function useRemoveShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, shareId }: { projectId: number; shareId: number }) =>
      api.removeShare(projectId, shareId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: getListSharesQueryKey(vars.projectId) });
    },
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function getListNotificationsQueryKey() {
  return ["notifications"];
}

export function useListNotifications() {
  return useQuery({
    queryKey: getListNotificationsQueryKey(),
    queryFn: () => api.listNotifications(),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => api.markNotificationRead(notificationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => api.deleteNotification(notificationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
  });
}

// ─── Presence (polling, ready for WS upgrade) ─────────────────────────────────

export function getListPresenceQueryKey(projectId: number) {
  return ["presence", projectId];
}

export function useListPresence(projectId: number) {
  return useQuery({
    queryKey: getListPresenceQueryKey(projectId),
    queryFn: () => api.listPresence(projectId),
    refetchInterval: 30_000,
  });
}

// ─── Project users ────────────────────────────────────────────────────────────

export function useListProjectUsers(projectId: number) {
  return useQuery({
    queryKey: ["project-users", projectId],
    queryFn: () => api.listProjectUsers(projectId),
    staleTime: 60_000,
  });
}
