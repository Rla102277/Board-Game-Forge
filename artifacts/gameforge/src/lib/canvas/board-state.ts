import { CanvasState } from './fabric-utils';

export interface GameBoard {
  id: string;
  projectId: number;
  name: string;
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  canvasState: CanvasState;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  category: 'board' | 'card' | 'token' | 'tile';
  thumbnail?: string;
  canvasState: CanvasState;
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'standard-board',
    name: 'Standard Game Board',
    description: 'A basic rectangular game board with grid',
    category: 'board',
    canvasState: {
      version: 1,
      objects: [],
      background: '#f8f9fa',
      width: 800,
      height: 600,
    },
  },
  {
    id: 'hex-board',
    name: 'Hexagonal Board',
    description: 'Board with hexagonal grid pattern',
    category: 'board',
    canvasState: {
      version: 1,
      objects: [],
      background: '#f8f9fa',
      width: 800,
      height: 600,
    },
  },
  {
    id: 'card-template',
    name: 'Playing Card',
    description: 'Standard playing card template',
    category: 'card',
    canvasState: {
      version: 1,
      objects: [],
      background: '#ffffff',
      width: 250,
      height: 350,
    },
  },
  {
    id: 'token-template',
    name: 'Game Token',
    description: 'Circular token template',
    category: 'token',
    canvasState: {
      version: 1,
      objects: [],
      background: '#ffffff',
      width: 100,
      height: 100,
    },
  },
];

export class BoardStateManager {
  private boards: Map<string, GameBoard> = new Map();
  private currentBoardId: string | null = null;

  createBoard(projectId: number, name: string, width: number = 800, height: number = 600): GameBoard {
    const board: GameBoard = {
      id: crypto.randomUUID(),
      projectId,
      name,
      width,
      height,
      gridSize: 20,
      showGrid: true,
      snapToGrid: true,
      canvasState: {
        version: 1,
        objects: [],
        background: '#f8f9fa',
        width,
        height,
      },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.boards.set(board.id, board);
    this.currentBoardId = board.id;
    return board;
  }

  getBoard(boardId: string): GameBoard | undefined {
    return this.boards.get(boardId);
  }

  getCurrentBoard(): GameBoard | undefined {
    return this.currentBoardId ? this.boards.get(this.currentBoardId) : undefined;
  }

  updateBoard(boardId: string, updates: Partial<GameBoard>): GameBoard | undefined {
    const board = this.boards.get(boardId);
    if (board) {
      Object.assign(board, updates, { updatedAt: new Date() });
      return board;
    }
    return undefined;
  }

  deleteBoard(boardId: string): boolean {
    return this.boards.delete(boardId);
  }

  listBoards(projectId: number): GameBoard[] {
    return Array.from(this.boards.values()).filter(board => board.projectId === projectId);
  }

  setCurrentBoard(boardId: string): boolean {
    if (this.boards.has(boardId)) {
      this.currentBoardId = boardId;
      return true;
    }
    return false;
  }

  duplicateBoard(boardId: string, newName: string): GameBoard | undefined {
    const original = this.boards.get(boardId);
    if (original) {
      const duplicate: GameBoard = {
        ...original,
        id: crypto.randomUUID(),
        name: newName,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.boards.set(duplicate.id, duplicate);
      return duplicate;
    }
    return undefined;
  }

  exportBoard(boardId: string): string | undefined {
    const board = this.boards.get(boardId);
    if (board) {
      return JSON.stringify(board, null, 2);
    }
    return undefined;
  }

  importBoard(boardData: string): GameBoard | undefined {
    try {
      const board: GameBoard = JSON.parse(boardData);
      // Validate required fields
      if (!board.id || !board.projectId || !board.canvasState) {
        throw new Error('Invalid board data');
      }
      this.boards.set(board.id, board);
      return board;
    } catch (error) {
      console.error('Failed to import board:', error);
      return undefined;
    }
  }
}

export const boardStateManager = new BoardStateManager();