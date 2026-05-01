ALTER TABLE projects ADD COLUMN IF NOT EXISTS overview_meta jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS design_problems jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS next_playtest jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS decision_log jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS mechanic_fingerprint jsonb;
