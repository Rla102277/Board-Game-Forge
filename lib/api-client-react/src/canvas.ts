import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './generated/api';

export interface GameBoard {
  id: number;
  projectId: number;
  name: string;
  width: number;
  height: number;
  gridSize: number;
  showGrid: number;
  snapToGrid: number;
  canvasState: any;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoardRequest {
  name?: string;
  width?: number;
  height?: number;
  gridSize?: number;
  showGrid?: boolean;
  snapToGrid?: boolean;
  canvasState?: any;
}

export interface UpdateBoardRequest {
  name?: string;
  width?: number;
  height?: number;
  gridSize?: number;
  showGrid?: boolean;
  snapToGrid?: boolean;
  canvasState?: any;
}

// Query keys
export const getBoardsQueryKey = (projectId: number) => ['boards', projectId];
export const getBoardQueryKey = (projectId: number, boardId: number) => ['board', projectId, boardId];

// Hooks
export function useListBoards(projectId: number) {
  return useQuery({
    queryKey: getBoardsQueryKey(projectId),
    queryFn: async () => {
      const response = await api.GET('/projects/{projectId}/boards', {
        params: { path: { projectId } },
      });
      return response.data as GameBoard[];
    },
    enabled: !!projectId,
  });
}

export function useGetBoard(projectId: number, boardId: number) {
  return useQuery({
    queryKey: getBoardQueryKey(projectId, boardId),
    queryFn: async () => {
      const response = await api.GET('/projects/{projectId}/boards/{boardId}', {
        params: { path: { projectId, boardId } },
      });
      return response.data as GameBoard;
    },
    enabled: !!projectId && !!boardId,
  });
}

export function useCreateBoard(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBoardRequest) => {
      const response = await api.POST('/projects/{projectId}/boards', {
        params: { path: { projectId } },
        body: data,
      });
      return response.data as GameBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBoardsQueryKey(projectId) });
    },
  });
}

export function useUpdateBoard(projectId: number, boardId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateBoardRequest) => {
      const response = await api.PATCH('/projects/{projectId}/boards/{boardId}', {
        params: { path: { projectId, boardId } },
        body: data,
      });
      return response.data as GameBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBoardsQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: getBoardQueryKey(projectId, boardId) });
    },
  });
}

export function useDeleteBoard(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boardId: number) => {
      await api.DELETE('/projects/{projectId}/boards/{boardId}', {
        params: { path: { projectId, boardId } },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBoardsQueryKey(projectId) });
    },
  });
}

export function useDuplicateBoard(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boardId, name }: { boardId: number; name?: string }) => {
      const response = await api.POST('/projects/{projectId}/boards/{boardId}/duplicate', {
        params: { path: { projectId, boardId } },
        body: { name },
      });
      return response.data as GameBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBoardsQueryKey(projectId) });
    },
  });
}