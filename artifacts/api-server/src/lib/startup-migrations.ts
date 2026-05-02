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
  // 0011 – assets extended fields
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS component_details text`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS display_order integer`,
  // 0012 – asset group display order (independent ordering for grouped/flat views)
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS group_display_order integer`,
  // 0013 – reference games table (replaces projects.reference_games JSON blob)
  `CREATE TABLE IF NOT EXISTS reference_games (
    id serial PRIMARY KEY,
    project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    game_data jsonb,
    borrowing text,
    avoiding text,
    research_id integer REFERENCES research_items(id) ON DELETE SET NULL,
    position integer,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS reference_games_project_id_idx ON reference_games (project_id)`,
  // 0014 – entity display order (drag-to-reorder in Component Workshop)
  `ALTER TABLE entities ADD COLUMN IF NOT EXISTS display_order integer`,
  // 0015 – drop obsolete projects.reference_games text blob (replaced by reference_games table)
  `DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'projects' AND column_name = 'reference_games'
    ) THEN
      ALTER TABLE projects DROP COLUMN reference_games;
    END IF;
  END $$`,
  // 0016 – generic designer artifacts table (replaces 9 localStorage-only features)
  `CREATE TABLE IF NOT EXISTS designer_artifacts (
    id serial PRIMARY KEY,
    project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind text NOT NULL,
    data jsonb NOT NULL DEFAULT '{}',
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS designer_artifacts_project_kind_unique ON designer_artifacts (project_id, kind)`,
  `CREATE INDEX IF NOT EXISTS designer_artifacts_project_id_idx ON designer_artifacts (project_id)`,
  // 0017 – performance indexes on hot foreign keys
  `CREATE INDEX IF NOT EXISTS entities_project_id_idx ON entities (project_id)`,
  `CREATE INDEX IF NOT EXISTS rules_project_id_idx ON rules (project_id)`,
  `CREATE INDEX IF NOT EXISTS players_project_id_idx ON players (project_id)`,
  `CREATE INDEX IF NOT EXISTS assets_project_id_idx ON assets (project_id)`,
  `CREATE INDEX IF NOT EXISTS research_items_project_id_idx ON research_items (project_id)`,
  `CREATE INDEX IF NOT EXISTS notes_project_id_idx ON notes (project_id)`,
  `CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks (project_id)`,
  `CREATE INDEX IF NOT EXISTS chat_messages_project_id_idx ON chat_messages (project_id)`,
  `CREATE INDEX IF NOT EXISTS comments_project_id_idx ON comments (project_id)`,
  `CREATE INDEX IF NOT EXISTS playtest_sessions_project_id_idx ON playtest_sessions (project_id)`,
  // 0018 – sort indexes for ordered list views
  `CREATE INDEX IF NOT EXISTS entities_project_order_idx ON entities (project_id, display_order)`,
  `CREATE INDEX IF NOT EXISTS players_project_order_idx ON players (project_id, display_order)`,
  `CREATE INDEX IF NOT EXISTS assets_project_order_idx ON assets (project_id, display_order)`,
  // 0019 – soft-delete column + index for project list filtering
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,
  `CREATE INDEX IF NOT EXISTS projects_deleted_at_idx ON projects (deleted_at) WHERE deleted_at IS NULL`,
  // 0020 – rule hierarchy (free-form section) + drag-to-reorder display_order
  `ALTER TABLE rules ADD COLUMN IF NOT EXISTS section text`,
  `ALTER TABLE rules ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS rules_project_order_idx ON rules (project_id, display_order)`,
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
