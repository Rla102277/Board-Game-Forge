import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  RichTask, SubTask, TaskComment, ActivityLogEntry,
  ProjectShare, NotificationItem, PresenceUser,
  TaskFilter, TaskSort, ProjectRole,
} from "@/lib/collaboration-types";
import * as api from "@/lib/mock-collaboration-api";

export function getListRichTasksQueryKey(projectId: number, filter?: TaskFilter, sort?: TaskSort) {
  return ["rich-tasks", projectId, filter, sort];
}

export function useListRichTasks(projectId: number, filter?: TaskFilter, sort?: TaskSort) {
  return useQuery({
    queryKey: getListRichTasksQueryKey(projectId, filter, sort),
    queryFn: () => api.listTasks(projectId, filter, sort),
  });
}

export function useCreateRichTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Partial<RichTask> }) =>
      api.createTask(projectId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["rich-tasks", vars.projectId] });
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
    },
  });
}

export function getListSubtasksQueryKey(taskId: number) {
  return ["subtasks", taskId];
}

export function useListSubtasks(taskId: number) {
  return useQuery({
    queryKey: getListSubtasksQueryKey(taskId),
    queryFn: () => api.listSubtasks(taskId),
  });
}

export function useCreateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: number; title: string }) => api.createSubtask(taskId, title),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: getListSubtasksQueryKey(vars.taskId) });
    },
  });
}

export function useToggleSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subtaskId, taskId }: { subtaskId: number; taskId: number }) => api.toggleSubtask(subtaskId, taskId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: getListSubtasksQueryKey(vars.taskId) });
    },
  });
}

export function useDeleteSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subtaskId, taskId }: { subtaskId: number; taskId: number }) => api.deleteSubtask(subtaskId, taskId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: getListSubtasksQueryKey(vars.taskId) });
    },
  });
}

export function getListCommentsQueryKey(entityType: string, entityId: number) {
  return ["comments", entityType, entityId];
}

export function useListComments(entityType: string, entityId: number) {
  return useQuery({
    queryKey: getListCommentsQueryKey(entityType, entityId),
    queryFn: () => api.listComments(entityType, entityId),
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId, content, parentId }: { entityType: string; entityId: number; content: string; parentId?: number | null }) =>
      api.createComment(entityType, entityId, content, parentId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: getListCommentsQueryKey(vars.entityType, vars.entityId) });
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

export function getListActivityQueryKey(projectId: number) {
  return ["activity", projectId];
}

export function useListActivity(projectId: number, limit?: number) {
  return useQuery({
    queryKey: getListActivityQueryKey(projectId),
    queryFn: () => api.listActivity(projectId, limit),
  });
}

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

export function getListNotificationsQueryKey() {
  return ["notifications"];
}

export function useListNotifications() {
  return useQuery({
    queryKey: getListNotificationsQueryKey(),
    queryFn: () => api.listNotifications(),
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

export function getListPresenceQueryKey(projectId: number) {
  return ["presence", projectId];
}

export function useListPresence(projectId: number) {
  return useQuery({
    queryKey: getListPresenceQueryKey(projectId),
    queryFn: () => api.listPresence(projectId),
    refetchInterval: 5000,
  });
}

export function useListProjectUsers(projectId: number) {
  return useQuery({
    queryKey: ["project-users", projectId],
    queryFn: () => api.listProjectUsers(projectId),
  });
}
