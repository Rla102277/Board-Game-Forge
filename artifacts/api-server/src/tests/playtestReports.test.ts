import { beforeAll, afterAll, describe, expect, it } from "vitest";
import express from "express";
import supertest from "supertest";
import { eq } from "drizzle-orm";
import { db, projects } from "@workspace/db";
import reportsRouter from "../routes/playtestReports.js";

const app = express();
app.use(express.json(), reportsRouter);
const api = supertest(app);
let projectId: number;
let otherProjectId: number;
beforeAll(async () => {
  const rows = await db.insert(projects).values([{ name: "Reports test" }, { name: "Other reports test" }]).returning();
  projectId = rows[0]!.id;
  otherProjectId = rows[1]!.id;
});
afterAll(async () => {
  if (projectId) await db.delete(projects).where(eq(projects.id, projectId));
  if (otherProjectId) await db.delete(projects).where(eq(projects.id, otherProjectId));
});

describe("Playtest report contract and persistence", () => {
  it("creates, lists, partially updates, clears and deletes a report", async () => {
    const url = `/projects/${projectId}/playtest-reports`;
    const body = { date: "2026-11-11T12:00:00.000Z", attendees: ["Tester"], rating: 4, whatWorked: "Turns", actionItems: [{ text: "Balance", done: false }] };
    const created = await api.post(url).send(body);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject(body);
    const id = created.body.id;
    expect((await api.get(url)).body).toEqual([created.body]);
    const updated = await api.patch(`${url}/${id}`).send({ rating: null, actionItems: [] });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ rating: null, actionItems: [], whatWorked: "Turns", attendees: ["Tester"] });
    expect((await api.patch(`/projects/${otherProjectId}/playtest-reports/${id}`).send({ rating: 1 })).status).toBe(404);
    await api.delete(`/projects/${otherProjectId}/playtest-reports/${id}`).expect(204);
    expect((await api.get(url)).body).toHaveLength(1);
    await api.delete(`${url}/${id}`).expect(204);
    expect((await api.get(url)).body).toEqual([]);
  });

  it.each([{ date: "not-a-date" }, { date: null }, { date: 0 }, { date: "" }, { actionItems: [{text: "Task", linkedTaskId: 1.5}] }, { rating: 6 }, { rating: 2.5 }, { attendees: "Tester" }, { actionItems: [{}] }, { projectId: 1 }])("rejects invalid bodies: %j", async (body) => {
    await api.post(`/projects/${projectId}/playtest-reports`).send(body).expect(400);
  });

  it("rejects malformed IDs and empty updates", async () => {
    await api.get("/projects/nope/playtest-reports").expect(400);
    await api.get("/projects/0/playtest-reports").expect(400);
    await api.patch(`/projects/${projectId}/playtest-reports/1`).send({}).expect(400);
  });
});
