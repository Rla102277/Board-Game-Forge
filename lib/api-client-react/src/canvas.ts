import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customFetch } from './custom-fetch';

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

const getProjectBoardsUrl = (projectId: number) => `/api/projects/${projectId}/boards`;
const getProjectBoardUrl = (projectId: number, boardId: number) => `/api/projects/${projectId}/boards/${boardId}`;
const getDuplicateBoardUrl = (projectId: number, boardId: number) => `/api/projects/${projectId}/boards/${boardId}/duplicate`;

// Query keys
export const getBoardsQueryKey = (projectId: number) => ['boards', projectId];
export const getBoardQueryKey = (projectId: number, boardId: number) => ['board', projectId, boardId];

// Hooks
export function useListBoards(projectId: number) {
  return useQuery({
    queryKey: getBoardsQueryKey(projectId),
    queryFn: async () => {
      return customFetch<GameBoard[]>(getProjectBoardsUrl(projectId));
    },
    enabled: !!projectId,
  });
}

export function useGetBoard(projectId: number, boardId: number) {
  return useQuery({
    queryKey: getBoardQueryKey(projectId, boardId),
    queryFn: async () => {
      return customFetch<GameBoard>(getProjectBoardUrl(projectId, boardId));
    },
    enabled: !!projectId && !!boardId,
  });
}

export function useCreateBoard(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBoardRequest) => {
      return customFetch<GameBoard>(getProjectBoardsUrl(projectId), {
        method: 'POST',
        body: data,
      });
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
      return customFetch<GameBoard>(getProjectBoardUrl(projectId, boardId), {
        method: 'PATCH',
        body: data,
      });
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
      await customFetch<void>(getProjectBoardUrl(projectId, boardId), {
        method: 'DELETE',
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
      return customFetch<GameBoard>(getDuplicateBoardUrl(projectId, boardId), {
        method: 'POST',
        body: { name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBoardsQueryKey(projectId) });
    },
  });
}