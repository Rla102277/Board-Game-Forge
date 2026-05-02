import { sql } from "drizzle-orm";
import { db, referenceGames } from "@workspace/db";

type LegacyRefGame = {
  id?: string;
  name?: string;
  borrowing?: string;
  avoiding?: string;
  researchId?: number;
  gameData?: Record<string, unknown>;
};

function parseLegacyRefGames(raw: string | null | undefined): LegacyRefGame[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((g) => g && typeof g.name === "string" && g.name.trim());
  } catch {
    return [];
  }
}

// Read the legacy column via raw SQL (column was removed from Drizzle schema but may still exist in DB)
type ProjectRow = { id: number; reference_games: string | null };
let allProjects: ProjectRow[] = [];
try {
  const result = await db.execute(
    sql`SELECT id, reference_games FROM projects WHERE reference_games IS NOT NULL`,
  );
  allProjects = result.rows as ProjectRow[];
} catch {
  console.log("projects.reference_games column not found — migration already applied or not needed.");
  process.exit(0);
}

let migrated = 0;
let skipped = 0;

for (const project of allProjects) {
  const legacy = parseLegacyRefGames(project.reference_games);
  if (legacy.length === 0) {
    skipped++;
    continue;
  }

  const existingRows = await db
    .select({ id: referenceGames.id })
    .from(referenceGames)
    .where(sql`project_id = ${project.id}`);

  if (existingRows.length > 0) {
    console.log(`Project ${project.id}: already has ${existingRows.length} reference game(s), skipping migration`);
    skipped++;
    continue;
  }

  const inserts = legacy.map((g, idx) => ({
    projectId: project.id,
    name: (g.name ?? "Unknown Game").slice(0, 200),
    borrowing: g.borrowing ?? null,
    avoiding: g.avoiding ?? null,
    researchId: g.researchId ?? null,
    gameData: g.gameData ?? null,
    position: idx,
  }));

  await db.insert(referenceGames).values(inserts);
  console.log(`Project ${project.id}: migrated ${inserts.length} reference game(s)`);
  migrated++;
}

console.log(`\nDone. Migrated ${migrated} project(s), skipped ${skipped} project(s).`);
process.exit(0);
