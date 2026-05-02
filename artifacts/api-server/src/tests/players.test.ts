/**
 * Integration tests for player profile fields: faction, motivation, flaw, arc,
 * displayOrder, behaviorProfile, relationships.
 *
 * These tests assert that all 7 new profile fields round-trip correctly through
 * the REST API (POST, PATCH, GET) and are persisted in the database.
 */

import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

// Mock AI integration packages so their module initialisation doesn't throw
// when the AI API keys are absent in a test environment.
vi.mock("@workspace/integrations-anthropic-ai", () => ({
  anthropic: { messages: { create: vi.fn() } },
  Anthropic: class Anthropic {},
}));
vi.mock("@workspace/integrations-gemini-ai", () => ({
  ai: { models: { generateContent: vi.fn() } },
  GoogleGenAI: class GoogleGenAI {},
}));
vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
  OpenAI: class OpenAI {},
}));
vi.mock("@workspace/integrations-openrouter-ai", () => ({
  openrouter: { chat: { completions: { create: vi.fn() } } },
}));
vi.mock("@clerk/express", () => ({
  getAuth: vi.fn().mockReturnValue({ userId: null }),
  clerkMiddleware: vi.fn().mockReturnValue(
    (_req: unknown, _res: unknown, next: () => void) => next(),
  ),
}));

import express, { type Request, type Response, type NextFunction } from "express";
import supertest from "supertest";
import { eq } from "drizzle-orm";
import { db, appUsers, projects, players } from "@workspace/db";
import playersRouter from "../routes/players.js";

// ── Minimal test app that injects auth headers directly ──────────────────────

let TEST_APP_USER_ID = 0;

function createTestApp() {
  const app = express();
  app.use(express.json());
  // Inject appUserId so requireAuth/requireProjectAccess aren't needed
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.appUserId = TEST_APP_USER_ID;
    req.appUserRole = "admin";
    // Stub req.log for any router code that calls it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).log = { error: () => {}, warn: () => {}, info: () => {}, debug: () => {}, trace: () => {}, fatal: () => {} };
    next();
  });
  app.use(playersRouter);
  return app;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

let testProjectId = 0;
let testPlayerId = 0;

beforeAll(async () => {
  // Create a test user (needs a unique clerkUserId)
  const [user] = await db
    .insert(appUsers)
    .values({ clerkUserId: `test-player-fields-${Date.now()}`, role: "admin" })
    .returning();
  TEST_APP_USER_ID = user!.id;

  // Create a test project owned by that user
  const [project] = await db
    .insert(projects)
    .values({ name: "Player Field Test Project", ownerUserId: user!.id })
    .returning();
  testProjectId = project!.id;
});

afterAll(async () => {
  // Clean up in reverse dependency order
  await db.delete(players).where(eq(players.projectId, testProjectId));
  await db.delete(projects).where(eq(projects.id, testProjectId));
  await db.delete(appUsers).where(eq(appUsers.id, TEST_APP_USER_ID));
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Player profile fields — save and load", () => {
  const app = createTestApp();
  const agent = supertest(app);

  it("POST /projects/:id/players persists all 7 profile fields", async () => {
    const body = {
      name: "Test Faction Leader",
      playerType: "Faction",
      faction: "Northern Alliance",
      motivation: "Survive the winter and reclaim the homeland",
      flaw: "Trusts too easily — allies may betray them",
      arc: "Starts as a desperate survivor, ends as a unifying leader",
      displayOrder: 3,
      behaviorProfile: {
        riskTolerance: 0.65,
        aggression: 0.4,
        decisionStyle: "reactive",
      },
      relationships: [
        { targetId: 0, type: "Allied", note: "Old war companion" },
        { targetId: 1, type: "Rival", note: "Contested the same seat" },
      ],
    };

    const res = await agent
      .post(`/projects/${testProjectId}/players`)
      .send(body);

    expect(res.status).toBe(201);
    const p = res.body as Record<string, unknown>;

    // Store for subsequent tests
    testPlayerId = p.id as number;

    expect(p.faction).toBe("Northern Alliance");
    expect(p.motivation).toBe("Survive the winter and reclaim the homeland");
    expect(p.flaw).toBe("Trusts too easily — allies may betray them");
    expect(p.arc).toBe("Starts as a desperate survivor, ends as a unifying leader");
    expect(p.displayOrder).toBe(3);

    // JSONB fields
    expect(p.behaviorProfile).toMatchObject({
      riskTolerance: 0.65,
      aggression: 0.4,
      decisionStyle: "reactive",
    });
    const rels = p.relationships as Array<Record<string, unknown>>;
    expect(rels).toHaveLength(2);
    expect(rels[0]).toMatchObject({ type: "Allied", note: "Old war companion" });
    expect(rels[1]).toMatchObject({ type: "Rival", note: "Contested the same seat" });
  });

  it("PATCH /projects/:id/players/:playerId updates all 7 profile fields", async () => {
    expect(testPlayerId).toBeGreaterThan(0);

    const update = {
      faction: "Southern Coalition",
      motivation: "Protect the trade routes at any cost",
      flaw: "Overconfident — ignores warnings from scouts",
      arc: "Humbled by a major defeat, rebuilds with humility",
      displayOrder: 7,
      behaviorProfile: {
        riskTolerance: 0.9,
        aggression: 0.85,
        decisionStyle: "aggressive",
      },
      relationships: [
        { targetId: 5, type: "Neutral", note: "Cautious alliance" },
      ],
    };

    const res = await agent
      .patch(`/projects/${testProjectId}/players/${testPlayerId}`)
      .send(update);

    expect(res.status).toBe(200);
    const p = res.body as Record<string, unknown>;

    expect(p.faction).toBe("Southern Coalition");
    expect(p.motivation).toBe("Protect the trade routes at any cost");
    expect(p.flaw).toBe("Overconfident — ignores warnings from scouts");
    expect(p.arc).toBe("Humbled by a major defeat, rebuilds with humility");
    expect(p.displayOrder).toBe(7);
    expect(p.behaviorProfile).toMatchObject({ riskTolerance: 0.9, aggression: 0.85 });
    const rels = p.relationships as Array<Record<string, unknown>>;
    expect(rels).toHaveLength(1);
    expect(rels[0]).toMatchObject({ type: "Neutral" });
  });

  it("GET /projects/:id/players returns updated profile fields from the database", async () => {
    expect(testPlayerId).toBeGreaterThan(0);

    const res = await agent.get(`/projects/${testProjectId}/players`);

    expect(res.status).toBe(200);
    const list = res.body as Array<Record<string, unknown>>;
    const found = list.find((p) => p.id === testPlayerId);

    expect(found).toBeDefined();
    expect(found!.faction).toBe("Southern Coalition");
    expect(found!.motivation).toBe("Protect the trade routes at any cost");
    expect(found!.flaw).toBe("Overconfident — ignores warnings from scouts");
    expect(found!.arc).toBe("Humbled by a major defeat, rebuilds with humility");
    expect(found!.displayOrder).toBe(7);

    // Verify JSONB round-trips including nested values
    expect(found!.behaviorProfile).toMatchObject({
      riskTolerance: 0.9,
      aggression: 0.85,
      decisionStyle: "aggressive",
    });
    const rels = found!.relationships as Array<Record<string, unknown>>;
    expect(rels).toHaveLength(1);
    expect(rels[0]!.type).toBe("Neutral");
  });

  it("PATCH can clear optional profile fields to null", async () => {
    const res = await agent
      .patch(`/projects/${testProjectId}/players/${testPlayerId}`)
      .send({ faction: null, motivation: null });

    expect(res.status).toBe(200);
    expect(res.body.faction).toBeNull();
    expect(res.body.motivation).toBeNull();
    // Other fields must be unchanged
    expect(res.body.flaw).toBe("Overconfident — ignores warnings from scouts");
  });

  it("displayOrder is preserved in list ordering (reorder endpoint)", async () => {
    // Create a second player to test reorder
    const r = await agent
      .post(`/projects/${testProjectId}/players`)
      .send({ name: "Reorder Target", playerType: "Character", displayOrder: 0 });
    expect(r.status).toBe(201);
    const p2Id = r.body.id as number;

    const playerIds = [p2Id, testPlayerId];
    const reorder = await agent
      .patch(`/projects/${testProjectId}/players/reorder`)
      .send({ playerIds });
    expect(reorder.status).toBe(200);

    const listRes = await agent.get(`/projects/${testProjectId}/players`);
    const list = listRes.body as Array<{ id: number; displayOrder: number }>;
    const p2 = list.find((p) => p.id === p2Id)!;
    const p1 = list.find((p) => p.id === testPlayerId)!;

    expect(p2.displayOrder).toBeLessThan(p1.displayOrder);
  });
});

// ── Edge-case and regression tests ───────────────────────────────────────────

describe("Player profile fields — edge cases", () => {
  const app = createTestApp();
  const agent = supertest(app);

  it("PATCH on a non-existent playerId returns 404", async () => {
    const res = await agent
      .patch(`/projects/${testProjectId}/players/999999999`)
      .send({ faction: "Ghost Faction" });
    expect(res.status).toBe(404);
  });

  it("PATCH does not wipe unrelated profile fields (partial update isolation)", async () => {
    // Create a fresh player with all profile fields set
    const create = await agent
      .post(`/projects/${testProjectId}/players`)
      .send({
        name: "Isolation Test Player",
        faction: "Iron Circle",
        motivation: "Control the southern ports",
        flaw: "Paranoid about betrayal",
        arc: "From tyrant to reluctant hero",
      });
    expect(create.status).toBe(201);
    const id = create.body.id as number;

    // Update only faction — other narrative fields must be unchanged
    const patch = await agent
      .patch(`/projects/${testProjectId}/players/${id}`)
      .send({ faction: "Golden Vale" });
    expect(patch.status).toBe(200);
    expect(patch.body.faction).toBe("Golden Vale");
    expect(patch.body.motivation).toBe("Control the southern ports");
    expect(patch.body.flaw).toBe("Paranoid about betrayal");
    expect(patch.body.arc).toBe("From tyrant to reluctant hero");
  });

  it("GET returns players sorted by displayOrder ascending", async () => {
    // Create two players with known displayOrder values
    const a = await agent
      .post(`/projects/${testProjectId}/players`)
      .send({ name: "Order A", displayOrder: 100 });
    const b = await agent
      .post(`/projects/${testProjectId}/players`)
      .send({ name: "Order B", displayOrder: 50 });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);

    const list = (await agent.get(`/projects/${testProjectId}/players`)).body as Array<{ id: number; displayOrder: number }>;
    const orders = list.map((p) => p.displayOrder);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]!);
    }
  });

  it("Reorder with duplicate IDs returns 400", async () => {
    const create = await agent
      .post(`/projects/${testProjectId}/players`)
      .send({ name: "Dup Reorder Player" });
    expect(create.status).toBe(201);
    const id = create.body.id as number;

    const res = await agent
      .patch(`/projects/${testProjectId}/players/reorder`)
      .send({ playerIds: [id, id] });
    expect(res.status).toBe(400);
  });

  it("Reorder assigns sequential displayOrder values starting from 0", async () => {
    // Gather all current player IDs for this project
    const list = (await agent.get(`/projects/${testProjectId}/players`)).body as Array<{ id: number }>;
    const ids = list.map((p) => p.id);

    const reorder = await agent
      .patch(`/projects/${testProjectId}/players/reorder`)
      .send({ playerIds: ids });
    expect(reorder.status).toBe(200);

    const updated = reorder.body as Array<{ id: number; displayOrder: number }>;
    // Every player that was reordered should have displayOrder equal to its
    // position index in the submitted array
    for (let i = 0; i < ids.length; i++) {
      const found = updated.find((p) => p.id === ids[i])!;
      expect(found.displayOrder).toBe(i);
    }
  });

  it("behaviorProfile JSONB survives a full round-trip without data loss", async () => {
    const profile = {
      riskTolerance: 0.3,
      aggression: 0.7,
      decisionStyle: "calculated",
      customTag: "experimental",
      nestedMeta: { tier: 2, flags: ["alpha", "beta"] },
    };

    const create = await agent
      .post(`/projects/${testProjectId}/players`)
      .send({ name: "JSONB Round-Trip", behaviorProfile: profile });
    expect(create.status).toBe(201);
    const created = create.body as { id: number; behaviorProfile: unknown };
    expect(created.behaviorProfile).toMatchObject(profile);

    // Now PATCH it with a different profile and verify the old one is replaced
    const updated = { riskTolerance: 0.99, decisionStyle: "random" };
    const patch = await agent
      .patch(`/projects/${testProjectId}/players/${created.id}`)
      .send({ behaviorProfile: updated });
    expect(patch.status).toBe(200);
    expect(patch.body.behaviorProfile).toMatchObject(updated);
    // Old keys that weren't in the new object must be gone
    expect((patch.body.behaviorProfile as Record<string, unknown>).customTag).toBeUndefined();
  });
});
