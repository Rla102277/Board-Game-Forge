-- Core game loop structured fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS win_condition TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS turn_phases TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS elimination_rule TEXT;

-- Reference game shelf (JSON array)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reference_games TEXT;

-- Design phase tracker
ALTER TABLE projects ADD COLUMN IF NOT EXISTS design_phase TEXT NOT NULL DEFAULT 'concept';
