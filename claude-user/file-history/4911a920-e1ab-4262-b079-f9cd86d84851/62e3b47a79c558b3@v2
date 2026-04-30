-- Asset: quantity per game copy, workflow status, type-specific details
ALTER TABLE assets ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS component_details TEXT;

-- Entity: workflow status
ALTER TABLE entities ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

-- Entity-Rule many-to-many junction
CREATE TABLE IF NOT EXISTS entity_rules (
  id SERIAL PRIMARY KEY,
  entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  rule_id INTEGER NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, rule_id)
);
CREATE INDEX IF NOT EXISTS entity_rules_entity_idx ON entity_rules(entity_id);
CREATE INDEX IF NOT EXISTS entity_rules_rule_idx ON entity_rules(rule_id);
