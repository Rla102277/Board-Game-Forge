import pg from "/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js";

const { Client } = pg;

const OLD_DB_URL = process.env.OLD_DB_URL;
const NEW_DB_URL = process.env.DATABASE_URL;
if (!OLD_DB_URL) throw new Error("OLD_DB_URL env var is required");
if (!NEW_DB_URL) throw new Error("DATABASE_URL env var is required");

const OWNER_USER_ID = Number(process.env.OWNER_USER_ID || 1);

const oldDb = new Client({ connectionString: OLD_DB_URL });
const newDb = new Client({ connectionString: NEW_DB_URL });
await Promise.all([oldDb.connect(), newDb.connect()]);

const counts = {};
const tally = (k, n = 1) => { counts[k] = (counts[k] || 0) + n; };

await newDb.query("BEGIN");
try {
  // ----- projects -----
  const projectIdMap = new Map();
  const oldProjects = (await oldDb.query("SELECT * FROM projects ORDER BY id")).rows;
  for (const p of oldProjects) {
    const r = await newDb.query(
      `INSERT INTO projects (owner_user_id, name, description, genre, player_count, target_duration, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [OWNER_USER_ID, p.name, p.description, p.genre,
       p.player_count == null ? null : String(p.player_count),
       p.target_duration == null ? null : String(p.target_duration),
       p.created_at, p.updated_at]
    );
    projectIdMap.set(p.id, r.rows[0].id);
    tally("projects");
  }

  // ----- entities -----
  const entityIdMap = new Map();
  const oldEntities = (await oldDb.query("SELECT * FROM entities ORDER BY id")).rows;
  for (const e of oldEntities) {
    const newProjId = projectIdMap.get(e.project_id);
    if (!newProjId) continue;
    const r = await newDb.query(
      `INSERT INTO entities (project_id, name, type, description, color, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [newProjId, e.name, e.type || "Item", e.description, e.color, e.created_at, e.updated_at]
    );
    entityIdMap.set(e.id, r.rows[0].id);
    tally("entities");
  }

  // ----- entity_properties (from old `properties`) -----
  const oldProps = (await oldDb.query("SELECT * FROM properties ORDER BY id")).rows;
  for (const p of oldProps) {
    const newEntityId = entityIdMap.get(p.entity_id);
    if (!newEntityId) continue;
    const dt = p.data_type || "number";
    const isText = dt === "string" || dt === "text" || dt === "enum";
    const numVal = isText ? null
      : (p.default_value == null || p.default_value === "" ? null
         : (Number.isFinite(Number(p.default_value)) ? Number(p.default_value) : null));
    const textVal = isText ? p.default_value
      : (p.default_value != null && !Number.isFinite(Number(p.default_value)) ? p.default_value : null);
    await newDb.query(
      `INSERT INTO entity_properties (entity_id, name, data_type, unit, value, text_value, min_value, max_value, default_value, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
      [newEntityId, p.name, dt, p.unit,
       numVal, textVal,
       p.min_value == null ? null : Number(p.min_value),
       p.max_value == null ? null : Number(p.max_value),
       numVal,
       p.created_at]
    );
    tally("entity_properties");
  }

  // ----- rules -----
  const ruleTitleToNewId = new Map();
  const oldRules = (await oldDb.query("SELECT * FROM rules ORDER BY id")).rows;
  for (const r of oldRules) {
    const newProjId = projectIdMap.get(r.project_id);
    if (!newProjId) continue;
    const ins = await newDb.query(
      `INSERT INTO rules (project_id, title, content, category, priority, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [newProjId, r.title, r.content, r.category, r.priority ?? 0, r.created_at, r.updated_at]
    );
    ruleTitleToNewId.set(`${newProjId}::${r.title}`, ins.rows[0].id);
    tally("rules");
  }

  // ----- players -----
  const oldPlayers = (await oldDb.query("SELECT * FROM players ORDER BY id")).rows;
  for (const p of oldPlayers) {
    const newProjId = projectIdMap.get(p.project_id);
    if (!newProjId) continue;
    const sr = p.starting_resources == null ? null
      : (typeof p.starting_resources === "string" ? p.starting_resources : JSON.stringify(p.starting_resources));
    await newDb.query(
      `INSERT INTO players (project_id, name, archetype, description, starting_resources, victory_condition, special_ability, playstyle, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [newProjId, p.name, p.archetype, p.description, sr, p.victory_condition, p.special_ability, p.playstyle, p.created_at, p.updated_at]
    );
    tally("players");
  }

  // ----- notes -----
  const oldNotes = (await oldDb.query("SELECT * FROM notes ORDER BY id")).rows;
  for (const n of oldNotes) {
    const newProjId = projectIdMap.get(n.project_id);
    if (!newProjId) continue;
    await newDb.query(
      `INSERT INTO notes (project_id, title, topic, content, color, pinned, look_at_later, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [newProjId, n.title, n.topic, n.content, n.color, !!n.pinned, !!n.look_at_later, n.created_at, n.updated_at]
    );
    tally("notes");
  }

  // ----- assets -----
  const oldAssets = (await oldDb.query("SELECT * FROM assets ORDER BY id")).rows;
  for (const a of oldAssets) {
    const newProjId = projectIdMap.get(a.project_id);
    if (!newProjId) continue;
    const newEntityId = a.entity_id ? entityIdMap.get(a.entity_id) || null : null;
    await newDb.query(
      `INSERT INTO assets (project_id, entity_id, name, kind, description, flavor_text, image_data_url, image_prompt, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [newProjId, newEntityId, a.name, a.asset_type || "card", a.description, a.flavor_text, a.image_data, a.image_prompt, a.created_at, a.created_at]
    );
    tally("assets");
  }

  // ----- research_items -----
  const oldRI = (await oldDb.query("SELECT * FROM research_items ORDER BY id")).rows;
  for (const r of oldRI) {
    const newProjId = projectIdMap.get(r.project_id);
    if (!newProjId) continue;
    const tags = r.tags == null ? null
      : (Array.isArray(r.tags) ? r.tags.join(",") : (typeof r.tags === "string" ? r.tags : JSON.stringify(r.tags)));
    await newDb.query(
      `INSERT INTO research_items (project_id, title, content, source, tags, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$6)`,
      [newProjId, r.title, r.content, r.source_url, tags, r.created_at]
    );
    tally("research_items");
  }

  // ----- chat_messages -----
  const oldChat = (await oldDb.query("SELECT * FROM project_chat_messages ORDER BY id")).rows;
  for (const m of oldChat) {
    const newProjId = projectIdMap.get(m.project_id);
    if (!newProjId) continue;
    await newDb.query(
      `INSERT INTO chat_messages (project_id, tab, role, content, created_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [newProjId, m.chat_type || "overview", m.role, m.content, m.created_at]
    );
    tally("chat_messages");
  }
  const oldSandbox = (await oldDb.query("SELECT * FROM sandbox_messages ORDER BY id")).rows;
  for (const m of oldSandbox) {
    const newProjId = projectIdMap.get(m.project_id);
    if (!newProjId) continue;
    await newDb.query(
      `INSERT INTO chat_messages (project_id, tab, role, content, created_at)
       VALUES ($1,'sandbox',$2,$3,$4)`,
      [newProjId, m.role, m.content, m.created_at]
    );
    tally("chat_messages");
  }

  // ----- changelog_entries -----
  const oldCL = (await oldDb.query("SELECT * FROM change_log ORDER BY id")).rows;
  for (const c of oldCL) {
    const newProjId = projectIdMap.get(c.project_id);
    if (!newProjId) continue;
    await newDb.query(
      `INSERT INTO changelog_entries (project_id, actor, action, entity_kind, entity_ref, summary, details, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [newProjId, c.author, c.action, c.entity_type, c.entity_id == null ? null : String(c.entity_id),
       c.description || c.action, c.new_value || c.previous_value, c.created_at]
    );
    tally("changelog_entries");
  }

  // ----- storyboard_nodes -----
  const oldStory = (await oldDb.query("SELECT * FROM storyboard_nodes ORDER BY id")).rows;
  const storyIdMap = new Map();
  for (const s of oldStory) {
    const newProjId = projectIdMap.get(s.project_id);
    if (!newProjId) continue;
    const linkedRuleId = s.linked_rule_title
      ? ruleTitleToNewId.get(`${newProjId}::${s.linked_rule_title}`) || null
      : null;
    const ins = await newDb.query(
      `INSERT INTO storyboard_nodes (project_id, parent_id, title, content, node_type, status, color, position_x, position_y, linked_rule_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [newProjId, null, s.title, s.content,
       s.type || "idea", s.status || "idea", s.color,
       Number(s.position) || 0, 0, linkedRuleId, s.created_at, s.updated_at]
    );
    storyIdMap.set(s.id, ins.rows[0].id);
    tally("storyboard_nodes");
  }
  for (const s of oldStory) {
    if (s.parent_id == null) continue;
    const newId = storyIdMap.get(s.id);
    const newParent = storyIdMap.get(s.parent_id);
    if (newId && newParent) {
      await newDb.query("UPDATE storyboard_nodes SET parent_id=$1 WHERE id=$2", [newParent, newId]);
    }
  }

  await newDb.query("COMMIT");
  console.log("MIGRATION COMPLETE");
  console.log("Counts:", counts);
  console.log("Project ID mapping:", [...projectIdMap.entries()]);
} catch (err) {
  await newDb.query("ROLLBACK");
  console.error("ROLLED BACK:", err.message);
  console.error(err.stack);
  process.exitCode = 1;
} finally {
  await Promise.all([oldDb.end(), newDb.end()]);
}
