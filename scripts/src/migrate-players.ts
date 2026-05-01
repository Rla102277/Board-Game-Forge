import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

await db.execute(sql.raw(`ALTER TABLE players
  ADD COLUMN IF NOT EXISTS faction text,
  ADD COLUMN IF NOT EXISTS motivation text,
  ADD COLUMN IF NOT EXISTS flaw text,
  ADD COLUMN IF NOT EXISTS arc text,
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS behavior_profile jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS relationships jsonb DEFAULT '[]'::jsonb`));

const result = await db.execute(sql.raw(
  `SELECT column_name FROM information_schema.columns WHERE table_name='players' ORDER BY ordinal_position`
));
console.log("Players columns:", result.rows.map((r) => (r as { column_name: string }).column_name).join(", "));
process.exit(0);
