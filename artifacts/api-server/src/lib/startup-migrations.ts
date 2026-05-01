import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "./logger";

const MIGRATIONS = [
  // 0008 – player profile fields
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS faction text`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS motivation text`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS flaw text`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS arc text`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS behavior_profile jsonb`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS relationships jsonb`,
  // 0009 – graph layout persistence per project
  `CREATE TABLE IF NOT EXISTS graph_layouts (
    id serial PRIMARY KEY,
    project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    positions jsonb NOT NULL DEFAULT '{}',
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS graph_layouts_project_id_unique ON graph_layouts (project_id)`,
  // 0010 – playtest reports table
  `CREATE TABLE IF NOT EXISTS playtest_reports (
    id serial PRIMARY KEY,
    project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    date timestamptz NOT NULL DEFAULT now(),
    attendees jsonb DEFAULT '[]'::jsonb,
    rating integer CHECK (rating BETWEEN 1 AND 5),
    what_worked text,
    what_broke text,
    action_items jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  // 0010 – add rating check constraint to existing playtest_reports table
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'playtest_reports_rating_check'
        AND conrelid = 'playtest_reports'::regclass
    ) THEN
      ALTER TABLE playtest_reports ADD CONSTRAINT playtest_reports_rating_check CHECK (rating BETWEEN 1 AND 5);
    END IF;
  END $$`,
];

export async function runStartupMigrations(): Promise<void> {
  for (const stmt of MIGRATIONS) {
    try {
      await db.execute(sql.raw(stmt));
      logger.info({ stmt }, "startup migration applied");
    } catch (err) {
      logger.warn({ err, stmt }, "startup migration skipped (column may already exist)");
    }
  }
}
