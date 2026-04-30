-- Add parent entity reference for deck/collection hierarchy
ALTER TABLE entities ADD COLUMN IF NOT EXISTS parent_entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL;

-- Add player type for grouping (Character, NPC, Enemy, Boss, Creature, Ally)
ALTER TABLE players ADD COLUMN IF NOT EXISTS player_type TEXT NOT NULL DEFAULT 'Character';
