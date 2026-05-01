ALTER TABLE players
  ADD COLUMN IF NOT EXISTS faction text,
  ADD COLUMN IF NOT EXISTS motivation text,
  ADD COLUMN IF NOT EXISTS flaw text,
  ADD COLUMN IF NOT EXISTS arc text,
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS behavior_profile jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS relationships jsonb DEFAULT '[]'::jsonb;
