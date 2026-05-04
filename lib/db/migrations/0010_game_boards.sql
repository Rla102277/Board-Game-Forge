CREATE TABLE IF NOT EXISTS game_boards (
  id serial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Board 1',
  width integer NOT NULL DEFAULT 800,
  height integer NOT NULL DEFAULT 600,
  grid_size integer NOT NULL DEFAULT 20,
  show_grid integer NOT NULL DEFAULT 1,
  snap_to_grid integer NOT NULL DEFAULT 1,
  canvas_state jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_boards_project_id ON game_boards(project_id);