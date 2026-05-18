import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

// Suppress SSL warning
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const extraSql = `
-- Missing project columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS narrative TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS forked_from_project_id INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS forked_from_snapshot_id INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- project workspace+slug unique index
CREATE UNIQUE INDEX IF NOT EXISTS projects_workspace_slug_unique ON projects(workspace_id, slug);

-- Missing workspace columns
CREATE TABLE IF NOT EXISTS workspaces (
  id serial PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  owner_user_id integer NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  is_personal integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS invite_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_slug_unique ON workspaces(slug);
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_invite_code_unique ON workspaces(invite_code) WHERE invite_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_personal_owner_unique ON workspaces(owner_user_id) WHERE is_personal = 1;

-- Missing workspace_members columns  
CREATE TABLE IF NOT EXISTS workspace_members (
  id serial PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id integer REFERENCES app_users(id) ON DELETE CASCADE,
  invited_email text,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_ws_user_unique ON workspace_members(workspace_id, user_id);

CREATE TABLE IF NOT EXISTS ai_provider_settings (
  id serial PRIMARY KEY,
  user_id integer NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'anthropic',
  model text,
  api_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_ai_settings (
  id serial PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  encrypted_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_ai_settings_ws_provider_unique
  ON workspace_ai_settings(workspace_id, provider);
`;

const files = [
  "migrations/0006_project_design_fields.sql",
  "migrations/0007_overview_columns.sql",
  "migrations/0008_player_profile_fields.sql",
  "migrations/0009_asset_group_display_order.sql",
  "migrations/0010_game_boards.sql",
];

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();
console.log("Connected to database");

for (const file of files) {
  const sql = readFileSync(join(__dirname, file), "utf8");
  try {
    await client.query(sql);
    console.log(`✓ ${file}`);
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.log(`  (skipped, already exists) ${file}`);
    } else {
      console.error(`✗ ${file}: ${e.message}`);
    }
  }
}

try {
  await client.query(extraSql);
  console.log("✓ extra tables (ai_provider_settings, workspace_ai_settings)");
} catch (e) {
  console.error("✗ extra tables:", e.message);
}

const verify = await client.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name='projects' ORDER BY ordinal_position"
);
console.log("\nprojects columns:", verify.rows.map(r => r.column_name).join(", "));

await client.end();
console.log("Done.");
