import { Router } from 'express';
import { requireAuth, requireProjectAccess } from '../middlewares/projectAuth';
import { db, gameBoardsTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import type { Request, Response } from 'express';

const router = Router();

// Get all boards for a project
router.get('/projects/:projectId/boards', requireAuth, requireProjectAccess, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const boards = await db
      .select()
      .from(gameBoardsTable)
      .where(eq(gameBoardsTable.projectId, parseInt(projectId)))
      .orderBy(gameBoardsTable.createdAt);

    res.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

// Get a specific board
router.get('/projects/:projectId/boards/:boardId', requireAuth, requireProjectAccess, async (req: Request, res: Response) => {
  try {
    const { projectId, boardId } = req.params;
    const [board] = await db
      .select()
      .from(gameBoardsTable)
      .where(and(
        eq(gameBoardsTable.id, parseInt(boardId)),
        eq(gameBoardsTable.projectId, parseInt(projectId))
      ));

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

// Create a new board
router.post('/projects/:projectId/boards', requireAuth, requireProjectAccess, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, width, height, gridSize, showGrid, snapToGrid, canvasState } = req.body;

    const [newBoard] = await db
      .insert(gameBoardsTable)
      .values({
        projectId: parseInt(projectId),
        name: name || 'New Board',
        width: width || 800,
        height: height || 600,
        gridSize: gridSize || 20,
        showGrid: showGrid ? 1 : 0,
        snapToGrid: snapToGrid ? 1 : 0,
        canvasState: canvasState || { version: 1, objects: [], background: '#f8f9fa', width: 800, height: 600 },
        version: 1,
      })
      .returning();

    res.status(201).json(newBoard);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

// Update a board
router.patch('/projects/:projectId/boards/:boardId', requireAuth, requireProjectAccess, async (req: Request, res: Response) => {
  try {
    const { projectId, boardId } = req.params;
    const updates = req.body;

    // Remove undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    // Convert boolean to int for database
    if (updates.showGrid !== undefined) {
      updates.showGrid = updates.showGrid ? 1 : 0;
    }
    if (updates.snapToGrid !== undefined) {
      updates.snapToGrid = updates.snapToGrid ? 1 : 0;
    }

    updates.updatedAt = new Date();

    const [updatedBoard] = await db
      .update(gameBoardsTable)
      .set(updates)
      .where(and(
        eq(gameBoardsTable.id, parseInt(boardId)),
        eq(gameBoardsTable.projectId, parseInt(projectId))
      ))
      .returning();

    if (!updatedBoard) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.json(updatedBoard);
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({ error: 'Failed to update board' });
  }
});

// Delete a board
router.delete('/projects/:projectId/boards/:boardId', requireAuth, requireProjectAccess, async (req: Request, res: Response) => {
  try {
    const { projectId, boardId } = req.params;

    const [deletedBoard] = await db
      .delete(gameBoardsTable)
      .where(and(
        eq(gameBoardsTable.id, parseInt(boardId)),
        eq(gameBoardsTable.projectId, parseInt(projectId))
      ))
      .returning();

    if (!deletedBoard) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting board:', error);
    res.status(500).json({ error: 'Failed to delete board' });
  }
});

// Duplicate a board
router.post('/projects/:projectId/boards/:boardId/duplicate', requireAuth, requireProjectAccess, async (req: Request, res: Response) => {
  try {
    const { projectId, boardId } = req.params;
    const { name } = req.body;

    const [originalBoard] = await db
      .select()
      .from(gameBoardsTable)
      .where(and(
        eq(gameBoardsTable.id, parseInt(boardId)),
        eq(gameBoardsTable.projectId, parseInt(projectId))
      ));

    if (!originalBoard) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const [newBoard] = await db
      .insert(gameBoardsTable)
      .values({
        projectId: parseInt(projectId),
        name: name || `${originalBoard.name} Copy`,
        width: originalBoard.width,
        height: originalBoard.height,
        gridSize: originalBoard.gridSize,
        showGrid: originalBoard.showGrid,
        snapToGrid: originalBoard.snapToGrid,
        canvasState: originalBoard.canvasState,
        version: 1,
      })
      .returning();

    res.status(201).json(newBoard);
  } catch (error) {
    console.error('Error duplicating board:', error);
    res.status(500).json({ error: 'Failed to duplicate board' });
  }
});

export default router;