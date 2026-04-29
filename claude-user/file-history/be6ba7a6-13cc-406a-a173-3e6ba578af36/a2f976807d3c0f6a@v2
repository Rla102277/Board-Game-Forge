-- Add soft-delete columns to projects and app_users.
-- Rows with a non-null deleted_at are considered deleted and excluded from
-- normal queries. Hard DELETE is no longer used for these tables.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
