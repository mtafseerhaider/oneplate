import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createPool } from "../src/db/pool.js";
import { migrate } from "../src/db/migrate.js";
import { ChangeBus } from "../src/events.js";
import { MemoryMailer, createMailer, SmtpMailer } from "../src/mail.js";
const cfg = loadConfig({ ...process.env, NODE_ENV: "test", ADMIN_EMAILS: "tafseer@example.com", MAX_HOUSEHOLDS_PER_USER: "2", DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://oneplate:oneplate@localhost:5432/oneplate_test", LOG_LEVEL: "silent" });
const db = createPool(cfg.DATABASE_URL); let app: Awaited<ReturnType<typeof buildApp>>; const mailer = new MemoryMailer(); const bus = new ChangeBus(cfg.DATABASE_URL);
const cookieOf = (res: any) => String(res.headers["set-cookie"]).split(";")[0];
beforeAll(async () => { await db.query("drop schema public cascade; create schema public"); await migrate(db); await bus.start(); app = await buildApp(cfg, db, { bus, mailer }); });
afterAll(async () => { await app.close(); await bus.stop(); await db.end(); });
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
  it("resets a password by emailed token and emails invites", async () => {
    const f = await app.inject({ method: "POST", url: "/auth/forgot", payload: { email: "uzma@example.com" } }); expect(f.statusCode).toBe(200);
    const mail = mailer.sent.find(m => m.subject.includes("Reset")); expect(mail).toBeTruthy(); const token = mail!.text.split("reset=")[1]!.trim();
    const bad = await app.inject({ method: "POST", url: "/auth/reset", payload: { token: "nope-nope-nope", password: "whatever123" } }); expect(bad.statusCode).toBe(400);
    const ok = await app.inject({ method: "POST", url: "/auth/reset", payload: { token, password: "a brand new password" } }); expect(ok.statusCode).toBe(200);
    const old = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "uzma@example.com", password: "another good one" } }); expect(old.statusCode).toBe(401);
    const fresh = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "uzma@example.com", password: "a brand new password" } }); expect(fresh.statusCode).toBe(200); wife = cookieOf(fresh);
    const inv = await app.inject({ method: "POST", url: `/households/${hid}/invites`, headers: { cookie: owner }, payload: { level: "viewer", email: "cousin@example.com" } }); expect(inv.statusCode).toBe(200); expect(mailer.sent.some(m => m.to === "cousin@example.com" && m.text.includes(inv.json().code))).toBe(true);
    const unknown = await app.inject({ method: "POST", url: "/auth/forgot", payload: { email: "nobody@example.com" } }); expect(unknown.statusCode).toBe(200);
  });
  it("broadcasts document changes through the change bus", async () => {
    const got: any[] = []; const unsub = bus.subscribe(hid, c => got.push(c));
    const w = await app.inject({ method: "PUT", url: `/households/${hid}/docs/meals/c_test`, headers: { cookie: owner }, payload: { body: { id: "c_test", n: "Test", tag: "other", items: [] } } }); expect(w.statusCode).toBe(200);
    await new Promise(r => setTimeout(r, 300)); unsub(); expect(got.some(c => c.collection === "meals" && c.doc_id === "c_test")).toBe(true);
  });
  it("issues passkey options and rejects forged responses", async () => {
    const ro = await app.inject({ method: "POST", url: "/auth/passkey/register/options", headers: { cookie: owner } }); expect(ro.statusCode).toBe(200); expect(ro.json().options.rp.id).toBe("localhost"); expect(ro.json().options.authenticatorSelection.residentKey).toBe("required");
    const forged = await app.inject({ method: "POST", url: "/auth/passkey/register/verify", headers: { cookie: owner }, payload: { challengeId: ro.json().challengeId, response: { id: "x", rawId: "eA", type: "public-key", response: { clientDataJSON: "e30", attestationObject: "AAAA" }, clientExtensionResults: {} } } }); expect(forged.statusCode).toBe(400);
    const lo = await app.inject({ method: "POST", url: "/auth/passkey/login/options" }); expect(lo.statusCode).toBe(200); expect(typeof lo.json().options.challenge).toBe("string");
    const unknown = await app.inject({ method: "POST", url: "/auth/passkey/login/verify", payload: { challengeId: lo.json().challengeId, response: { id: "nope", rawId: "bm9wZQ", type: "public-key", response: {}, clientExtensionResults: {} } } }); expect(unknown.statusCode).toBe(400);
    const anon = await app.inject({ method: "POST", url: "/auth/passkey/register/options" }); expect(anon.statusCode).toBe(401);
  });
  it("runs the scholar review workflow for admins only", async () => {
    const anon = await app.inject({ method: "GET", url: "/content/reviews" }); expect(anon.statusCode).toBe(401);
    const notAdmin = await app.inject({ method: "PUT", url: "/admin/content/reviews/quran-1-1-7", headers: { cookie: wife }, payload: { status: "reviewed", by: "Uzma" } }); expect(notAdmin.statusCode).toBe(404);
    const noName = await app.inject({ method: "PUT", url: "/admin/content/reviews/quran-1-1-7", headers: { cookie: owner }, payload: { status: "reviewed" } }); expect(noName.statusCode).toBe(400);
    const noSource = await app.inject({ method: "PUT", url: "/admin/content/reviews/quran-1-1-7", headers: { cookie: owner }, payload: { status: "verified", by: "Tafseer" } }); expect(noSource.statusCode).toBe(400);
    const ok = await app.inject({ method: "PUT", url: "/admin/content/reviews/quran-1-1-7", headers: { cookie: owner }, payload: { status: "verified", by: "Tafseer", source: "WOFIS vol. 1, pp. 20-48" } }); expect(ok.statusCode).toBe(200);
    const badKey = await app.inject({ method: "PUT", url: "/admin/content/reviews/Bad%20Key", headers: { cookie: owner }, payload: { status: "reviewed", by: "T" } }); expect(badKey.statusCode).toBe(400);
    const seen = await app.inject({ method: "GET", url: "/content/reviews", headers: { cookie: wife } }); expect(seen.json().reviews["quran-1-1-7"].status).toBe("verified"); expect(seen.json().reviews["quran-1-1-7"].by).toBe("Tafseer"); expect(seen.json().canReview).toBe(false);
    const mine = await app.inject({ method: "GET", url: "/content/reviews", headers: { cookie: owner } }); expect(mine.json().canReview).toBe(true);
    const me = await app.inject({ method: "GET", url: "/auth/me", headers: { cookie: owner } }); expect(me.json().admin).toBe(true);
    const back = await app.inject({ method: "PUT", url: "/admin/content/reviews/quran-1-1-7", headers: { cookie: owner }, payload: { status: "draft" } }); expect(back.statusCode).toBe(200);
    const gone = await app.inject({ method: "GET", url: "/content/reviews", headers: { cookie: owner } }); expect(gone.json().reviews["quran-1-1-7"]).toBeUndefined();
    const list = await app.inject({ method: "GET", url: "/admin/content/reviews", headers: { cookie: owner } }); expect(list.statusCode).toBe(200);
  });
  it("opens a family link by date of birth and signs the device in", async () => {
    const noDob = await app.inject({ method: "POST", url: `/households/${hid}/member-links`, headers: { cookie: owner }, payload: { memberId: "uzma" } }); expect(noDob.statusCode).toBe(422);
    await app.inject({ method: "PUT", url: `/households/${hid}/docs/family/uzma`, headers: { cookie: owner }, payload: { body: { id: "uzma", name: "Uzma", rel: "wife", role: "adult", sex: "female", goal: "maintain", dob: "1993-02-03" } } });
    await app.inject({ method: "PUT", url: `/households/${hid}/docs/family/abbas`, headers: { cookie: owner }, payload: { body: { id: "abbas", name: "Abbas", rel: "son", role: "child", sex: "male", goal: "growth", dob: "2019-02-09" } } });
    const child = await app.inject({ method: "POST", url: `/households/${hid}/member-links`, headers: { cookie: owner }, payload: { memberId: "abbas" } }); expect(child.statusCode).toBe(422);
    const notOwner = await app.inject({ method: "POST", url: `/households/${hid}/member-links`, headers: { cookie: wife }, payload: { memberId: "uzma" } }); expect(notOwner.statusCode).toBe(403);
    const mk = await app.inject({ method: "POST", url: `/households/${hid}/member-links`, headers: { cookie: owner }, payload: { memberId: "uzma" } }); expect(mk.statusCode).toBe(200); expect(mk.json().level).toBe("contributor"); const token = mk.json().url.split("open=")[1];
    const wrong = await app.inject({ method: "POST", url: `/open/${token}`, payload: { dob: "1993-02-04" } }); expect(wrong.statusCode).toBe(401); expect(wrong.headers["set-cookie"]).toBeUndefined();
    const ok = await app.inject({ method: "POST", url: `/open/${token}`, payload: { dob: "1993-02-03" } }); expect(ok.statusCode).toBe(200); expect(ok.json().memberId).toBe("uzma"); expect(ok.json().passkeys).toBe(0); const dev = cookieOf(ok);
    const me = await app.inject({ method: "GET", url: "/auth/me", headers: { cookie: dev } }); expect(me.json().households[0].member_id).toBe("uzma"); expect(me.json().user.email).toBe("uzma@example.com"); // the existing account for that member, not a new one
    const list = await app.inject({ method: "GET", url: `/households/${hid}/member-links`, headers: { cookie: owner } }); expect(list.json()[0].uses).toBe(1);
    await app.inject({ method: "DELETE", url: `/households/${hid}/member-links/${mk.json().id}`, headers: { cookie: owner } });
    const gone = await app.inject({ method: "POST", url: `/open/${token}`, payload: { dob: "1993-02-03" } }); expect(gone.statusCode).toBe(404);
    const own = await app.inject({ method: "POST", url: `/households/${hid}/member-links`, headers: { cookie: owner }, payload: { memberId: "tafseer" } }); expect(own.statusCode).toBe(422); // no family doc for tafseer yet
    await app.inject({ method: "PUT", url: `/households/${hid}/docs/family/tafseer`, headers: { cookie: owner }, payload: { body: { id: "tafseer", name: "Tafseer", rel: "me", role: "adult", sex: "male", goal: "fat_loss", dob: "1988-02-05" } } });
    const own2 = await app.inject({ method: "POST", url: `/households/${hid}/member-links`, headers: { cookie: owner }, payload: { memberId: "tafseer" } }); expect(own2.json().level).toBe("owner");
  });
  it("serves the web app from WEB_DIST when configured", async () => {
    const { mkdtemp, writeFile } = await import("node:fs/promises"); const os = await import("node:os"); const pathMod = await import("node:path"); const dir = await mkdtemp(pathMod.join(os.tmpdir(), "oneplate-web-")); await writeFile(pathMod.join(dir, "index.html"), "<!doctype html><title>OnePlate</title>"); await writeFile(pathMod.join(dir, "account.html"), "<p>account</p>");
    const one = await buildApp(loadConfig({ ...process.env, NODE_ENV: "test", DATABASE_URL: cfg.DATABASE_URL, LOG_LEVEL: "silent", WEB_DIST: dir }), db, { mailer });
    const root = await one.inject({ method: "GET", url: "/" }); expect(root.statusCode).toBe(200); expect(root.body).toContain("OnePlate"); const acc = await one.inject({ method: "GET", url: "/account.html" }); expect(acc.body).toContain("account");
    const health = await one.inject({ method: "GET", url: "/health" }); expect(health.json().status).toBe("ok"); await one.close();
  });
  it("builds the SMTP mailer from configuration", () => {
    expect(createMailer("smtp", () => {}, { smtpUrl: "smtp://user:pass@localhost:2525", from: "OnePlate <x@y.z>" })).toBeInstanceOf(SmtpMailer);
    expect(() => createMailer("smtp", () => {})).toThrow(/SMTP_URL/);
  });
  it("serves status and metrics, guards admin routes, and enforces limits", async () => {
    const st = await app.inject({ method: "GET", url: "/status" }); expect(st.json().status).toBe("ok"); expect(st.json().households).toBeGreaterThan(0);
    const met = await app.inject({ method: "GET", url: "/metrics" }); expect(met.json().active_sessions).toBeGreaterThan(0);
    const anon = await app.inject({ method: "GET", url: "/admin/stats" }); expect(anon.statusCode).toBe(404);
    const notAdmin = await app.inject({ method: "GET", url: "/admin/stats", headers: { cookie: wife } }); expect(notAdmin.statusCode).toBe(404);
    const adm = await app.inject({ method: "GET", url: "/admin/stats", headers: { cookie: owner } }); expect(adm.statusCode).toBe(200); expect(adm.json().users).toBe(2);
    const hh = await app.inject({ method: "GET", url: "/admin/households", headers: { cookie: owner } }); expect(hh.json()[0].owner).toBe("tafseer@example.com");
    const h2 = await app.inject({ method: "POST", url: "/households", headers: { cookie: owner }, payload: { name: "second" } }); expect(h2.statusCode).toBe(200);
    const h3 = await app.inject({ method: "POST", url: "/households", headers: { cookie: owner }, payload: { name: "third" } }); expect(h3.statusCode).toBe(429);
    const ret = await app.inject({ method: "POST", url: "/admin/retention", headers: { cookie: owner } }); expect(ret.statusCode).toBe(200); expect(typeof ret.json().sessions).toBe("number");
  });
  it("exports and audits", async () => {
    const ex = await app.inject({ method: "GET", url: `/households/${hid}/export`, headers: { cookie: owner } }); expect(ex.json().documents.length).toBeGreaterThan(1);
    const a = await db.query("select count(*)::int as n from audit_events where household_id=$1", [hid]); expect(a.rows[0].n).toBeGreaterThan(3);
    const docs = await app.inject({ method: "GET", url: "/docs/json" }); expect(docs.statusCode).toBe(200);
  });
});
