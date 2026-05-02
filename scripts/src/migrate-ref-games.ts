import { sql } from "drizzle-orm";
import { db, projects, referenceGames } from "@workspace/db";

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

const allProjects = await db
  .select({ id: projects.id, referenceGames: projects.referenceGames })
  .from(projects);

let migrated = 0;
let skipped = 0;

for (const project of allProjects) {
  const legacy = parseLegacyRefGames(project.referenceGames);
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
