-- Add invite_code to workspaces for shareable join links.
-- NULL until first generated; enforced unique by index.

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS invite_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_invite_code_unique ON workspaces (invite_code) WHERE invite_code IS NOT NULL;
