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
  // 0021 – assets: many-to-many entity links (one image used by multiple components)
  `CREATE TABLE IF NOT EXISTS asset_entity_links (
    asset_id integer NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    entity_id integer NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (asset_id, entity_id)
  )`,
  `CREATE INDEX IF NOT EXISTS asset_entity_links_entity_idx ON asset_entity_links (entity_id)`,
  // 0022 – asset version history (manual snapshots of image + metadata)
  `CREATE TABLE IF NOT EXISTS asset_versions (
    id serial PRIMARY KEY,
    asset_id integer NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    version_label text,
    image_data_url text,
    image_prompt text,
    notes text,
    created_by_user_id integer,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS asset_versions_asset_id_idx ON asset_versions (asset_id, created_at DESC)`,
  // 0023 – per-user artifacts table (Category B localStorage → DB migration)
  // Used by Learn (chat history per topic, bible chapter completion, design-101 lesson completion)
  `CREATE TABLE IF NOT EXISTS user_artifacts (
    id serial PRIMARY KEY,
    app_user_id integer NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    kind text NOT NULL,
    data jsonb NOT NULL DEFAULT '{}',
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS user_artifacts_user_kind_unique ON user_artifacts (app_user_id, kind)`,
  `CREATE INDEX IF NOT EXISTS user_artifacts_app_user_id_idx ON user_artifacts (app_user_id)`,
  // 0024 – additional performance indexes for hot query paths
  `CREATE INDEX IF NOT EXISTS entity_properties_entity_id_idx ON entity_properties (entity_id)`,
  `CREATE INDEX IF NOT EXISTS comments_entity_lookup_idx ON comments (entity_type, entity_id)`,
  `CREATE INDEX IF NOT EXISTS tasks_status_priority_idx ON tasks (project_id, status, priority)`,
  `CREATE INDEX IF NOT EXISTS task_assignees_user_id_idx ON task_assignees (user_id)`,
  `CREATE INDEX IF NOT EXISTS projects_workspace_slug_idx ON projects (workspace_id, slug) WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS app_users_clerk_user_id_idx ON app_users (clerk_user_id)`,
  `CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx ON workspace_members (user_id)`,
  `CREATE INDEX IF NOT EXISTS workspace_members_workspace_id_idx ON workspace_members (workspace_id)`,
  // 0025 – partial indexes for active tasks (improves Kanban board queries)
  `CREATE INDEX IF NOT EXISTS tasks_active_idx ON tasks (project_id, status) WHERE status NOT IN ('done', 'cancelled')`,
  // 0026 – index for AI provider settings lookups by user
  `CREATE INDEX IF NOT EXISTS ai_provider_settings_user_id_idx ON ai_provider_settings (user_id)`,
  // 0027 – AI response cache table for persistent caching
  `CREATE TABLE IF NOT EXISTS ai_response_cache (
    id serial PRIMARY KEY,
    cache_key text NOT NULL UNIQUE,
    prompt_hash text NOT NULL,
    model text NOT NULL,
    response text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS ai_cache_key_idx ON ai_response_cache (cache_key)`,
  `CREATE INDEX IF NOT EXISTS ai_cache_expires_idx ON ai_response_cache (expires_at)`,
  // 0028 – GIN index for project metadata JSONB queries
  `CREATE INDEX IF NOT EXISTS projects_metadata_gin_idx ON projects USING GIN (overview_meta) WHERE overview_meta IS NOT NULL`,
  // 0029 – project_shares missing columns
  `ALTER TABLE project_shares ADD COLUMN IF NOT EXISTS user_id integer REFERENCES app_users(id) ON DELETE CASCADE`,
  `ALTER TABLE project_shares ADD COLUMN IF NOT EXISTS invited_email text`,
  `ALTER TABLE project_shares ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'viewer'`,
  `ALTER TABLE project_shares ADD COLUMN IF NOT EXISTS invited_by_user_id integer REFERENCES app_users(id)`,
  `ALTER TABLE project_shares ADD COLUMN IF NOT EXISTS public_link boolean NOT NULL DEFAULT false`,
  `ALTER TABLE project_shares ADD COLUMN IF NOT EXISTS public_link_expiry timestamptz`,
  `ALTER TABLE project_shares ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`,
  // 0030 – activity_feed missing columns (entity_name, description, metadata)
  `ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS entity_name text`,
  `ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS description text`,
  `ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS metadata jsonb`,
  // 0031 – tasks missing columns
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category text`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours numeric(6,2)`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours numeric(6,2)`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id integer`,
  // 0032 – notifications missing columns
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type text`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id integer`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url text`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_user_id integer REFERENCES app_users(id)`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb`,
  // 0033 – task_assignees missing assigned_at column
  `ALTER TABLE task_assignees ADD COLUMN IF NOT EXISTS assigned_at timestamptz NOT NULL DEFAULT now()`,
  // 0034 – comment_reactions table for emoji reactions on comments
  `CREATE TABLE IF NOT EXISTS comment_reactions (
    id serial PRIMARY KEY,
    comment_id integer NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    emoji text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (comment_id, user_id, emoji)
  )`,
  `CREATE INDEX IF NOT EXISTS comment_reactions_comment_id_idx ON comment_reactions (comment_id)`,
  // 0035 – comprehensive audit logging table
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id serial PRIMARY KEY,
    user_id integer REFERENCES app_users(id) ON DELETE SET NULL,
    user_email text,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    project_id integer REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id integer,
    ip_address inet,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    severity text NOT NULL DEFAULT 'info',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs (user_id)`,
  `CREATE INDEX IF NOT EXISTS audit_logs_project_id_idx ON audit_logs (project_id)`,
  `CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action)`,
  `CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS audit_logs_severity_idx ON audit_logs (severity)`,
  // 0036 – kickstarter_assets missing title column
  `ALTER TABLE kickstarter_assets ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT ''`,
  // 0037 – kickstarter_assets missing columns that may not exist in older tables
  `ALTER TABLE kickstarter_assets ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'`,
  `ALTER TABLE kickstarter_assets ADD COLUMN IF NOT EXISTS generation_id text`,
  `ALTER TABLE kickstarter_assets ADD COLUMN IF NOT EXISTS gamma_url text`,
  `ALTER TABLE kickstarter_assets ADD COLUMN IF NOT EXISTS pdf_url text`,
  `ALTER TABLE kickstarter_assets ADD COLUMN IF NOT EXISTS pptx_url text`,
  `ALTER TABLE kickstarter_assets ADD COLUMN IF NOT EXISTS error_message text`,
  `ALTER TABLE kickstarter_assets ADD COLUMN IF NOT EXISTS meta jsonb`,
  `ALTER TABLE kickstarter_assets ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`,
  `ALTER TABLE kickstarter_assets ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`,
  `ALTER TABLE kickstarter_assets ADD COLUMN IF NOT EXISTS completed_at timestamptz`,
  // 0038 – research_items missing source column
  `ALTER TABLE research_items ADD COLUMN IF NOT EXISTS source text`,
  // 0039 – reference_games missing avoiding column
  `ALTER TABLE reference_games ADD COLUMN IF NOT EXISTS avoiding text`,
  // 0040 – chat_messages missing project_id column
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS project_id integer REFERENCES projects(id) ON DELETE CASCADE`,
  `CREATE INDEX IF NOT EXISTS chat_messages_project_id_idx ON chat_messages (project_id)`,
  // 0041 – chat_messages missing tab column
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS tab text NOT NULL DEFAULT 'overview'`,
  // 0042 – entity_properties missing name column
  `ALTER TABLE entity_properties ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT ''`,
  // 0043 – reference_games missing research_id column
  `ALTER TABLE reference_games ADD COLUMN IF NOT EXISTS research_id integer`,
  // 0044 – research_items missing updated_at column
  `ALTER TABLE research_items ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`,
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
