import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createPool } from "../src/db/pool.js";
import { migrate } from "../src/db/migrate.js";
const cfg = loadConfig({ ...process.env, NODE_ENV: "test", DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://oneplate:oneplate@localhost:5432/oneplate_test", LOG_LEVEL: "silent" });
const db = createPool(cfg.DATABASE_URL); let app: Awaited<ReturnType<typeof buildApp>>;
const cookieOf = (res: any) => String(res.headers["set-cookie"]).split(";")[0];
beforeAll(async () => { await db.query("drop schema public cascade; create schema public"); await migrate(db); app = await buildApp(cfg, db); });
afterAll(async () => { await app.close(); await db.end(); });
describe("OnePlate API", () => {
  let owner = "", wife = "", hid = "";
  it("registers, creates a household, invites a contributor", async () => {
    const r1 = await app.inject({ method: "POST", url: "/auth/register", payload: { email: "tafseer@example.com", password: "correct horse battery", displayName: "Tafseer" } }); expect(r1.statusCode).toBe(200); owner = cookieOf(r1);
    const h = await app.inject({ method: "POST", url: "/households", headers: { cookie: owner }, payload: { name: "Haider family" } }); expect(h.statusCode).toBe(200); hid = h.json().id;
    const inv = await app.inject({ method: "POST", url: `/households/${hid}/invites`, headers: { cookie: owner }, payload: { level: "contributor", memberId: "uzma" } }); expect(inv.statusCode).toBe(200);
    const r2 = await app.inject({ method: "POST", url: "/auth/register", payload: { email: "uzma@example.com", password: "another good one", displayName: "Uzma" } }); wife = cookieOf(r2);
    const acc = await app.inject({ method: "POST", url: `/invites/${inv.json().code}/accept`, headers: { cookie: wife } }); expect(acc.json().level).toBe("contributor");
    const me = await app.inject({ method: "GET", url: "/auth/me", headers: { cookie: wife } }); expect(me.json().households[0].member_id).toBe("uzma");
  });
  it("writes documents with optimistic versions", async () => {
    const w1 = await app.inject({ method: "PUT", url: `/households/${hid}/docs/days/2026-11-04`, headers: { cookie: owner }, payload: { body: { date: "2026-11-04", water: 2 } } }); expect(w1.json().version).toBe(1);
    const stale = await app.inject({ method: "PUT", url: `/households/${hid}/docs/days/2026-11-04`, headers: { cookie: owner }, payload: { body: { date: "2026-11-04", water: 3 }, ifVersion: 5 } }); expect(stale.statusCode).toBe(409); expect(stale.json().error.currentVersion).toBe(1);
    const ok = await app.inject({ method: "PUT", url: `/households/${hid}/docs/days/2026-11-04`, headers: { cookie: owner }, payload: { body: { date: "2026-11-04", water: 3 }, ifVersion: 1 } }); expect(ok.json().version).toBe(2);
    const list = await app.inject({ method: "GET", url: `/households/${hid}/docs/days`, headers: { cookie: owner } }); expect(list.json().docs[0].body.water).toBe(3);
  });
  it("enforces contributor policy and the child rule", async () => {
    const own = await app.inject({ method: "PUT", url: `/households/${hid}/docs/fast/current`, headers: { cookie: wife }, payload: { body: { startedAt: null } } }); expect(own.statusCode).toBe(403);
    const uz = await app.inject({ method: "PUT", url: `/households/${hid}/docs/weighins/uzma-2026-11-04`, headers: { cookie: wife }, payload: { body: { m: "uzma", date: "2026-11-04", weight: 64 } } }); expect(uz.statusCode).toBe(200);
    const taf = await app.inject({ method: "PUT", url: `/households/${hid}/docs/weighins/2026-11-04`, headers: { cookie: wife }, payload: { body: { date: "2026-11-04", weight: 83 } } }); expect(taf.statusCode).toBe(403);
    const dayJ = await app.inject({ method: "PUT", url: `/households/${hid}/docs/days/2026-11-04`, headers: { cookie: wife }, payload: { body: { date: "2026-11-04", water: 3, journal: { uzma: { learned: "x" } } }, ifVersion: 2 } }); expect(dayJ.statusCode).toBe(200);
    const dayW = await app.inject({ method: "PUT", url: `/households/${hid}/docs/days/2026-11-04`, headers: { cookie: wife }, payload: { body: { date: "2026-11-04", water: 6, journal: { uzma: { learned: "x" } } }, ifVersion: 3 } }); expect(dayW.statusCode).toBe(403);
    const child = await app.inject({ method: "PUT", url: `/households/${hid}/docs/family/abbas`, headers: { cookie: owner }, payload: { body: { id: "abbas", role: "child", targetWeight: 20 } } }); expect(child.statusCode).toBe(422);
    const stranger = await app.inject({ method: "GET", url: `/households/${hid}/docs/days` }); expect(stranger.statusCode).toBe(401);
  });
  it("exports and audits", async () => {
    const ex = await app.inject({ method: "GET", url: `/households/${hid}/export`, headers: { cookie: owner } }); expect(ex.json().documents.length).toBeGreaterThan(1);
    const a = await db.query("select count(*)::int as n from audit_events where household_id=$1", [hid]); expect(a.rows[0].n).toBeGreaterThan(3);
    const docs = await app.inject({ method: "GET", url: "/docs/json" }); expect(docs.statusCode).toBe(200);
  });
});
