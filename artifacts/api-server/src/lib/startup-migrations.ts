import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "./logger";

const MIGRATIONS = [
  // 0008 – player profile fields
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS faction text`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS motivation text`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS flaw text`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS arc text`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS behavior_profile jsonb`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS relationships jsonb`,
];

export async function runStartupMigrations(): Promise<void> {
  for (const stmt of MIGRATIONS) {
    try {
      await db.execute(sql.raw(stmt));
      logger.info({ stmt }, "startup migration applied");
    } catch (err) {
      logger.warn({ err, stmt }, "startup migration skipped (column may already exist)");
    }
  }
}
