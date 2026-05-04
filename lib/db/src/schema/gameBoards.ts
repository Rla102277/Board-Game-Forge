import { pgTable, serial, integer, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

export const gameBoardsTable = pgTable('game_boards', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projectsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('Board 1'),
  width: integer('width').notNull().default(800),
  height: integer('height').notNull().default(600),
  gridSize: integer('grid_size').notNull().default(20),
  showGrid: integer('show_grid').notNull().default(1), // boolean as int
  snapToGrid: integer('snap_to_grid').notNull().default(1),
  canvasState: jsonb('canvas_state').notNull(), // Fabric.js canvas JSON
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

export type GameBoard = typeof gameBoardsTable.$inferSelect;
export type GameBoardInsert = typeof gameBoardsTable.$inferInsert;