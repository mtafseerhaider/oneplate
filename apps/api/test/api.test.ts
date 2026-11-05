import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createPool } from "../src/db/pool.js";
import { migrate } from "../src/db/migrate.js";
import { ChangeBus } from "../src/events.js";
import { MemoryMailer, createMailer, SmtpMailer } from "../src/mail.js";
import { normalizeHealth, applyHealthToDay, dueReminders, localParts, schedulerTick } from "../src/integrations.js";
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
  it("ingests Apple Health numbers through a per-person token", async () => {
    const mk = await app.inject({ method: "POST", url: `/households/${hid}/ingest-tokens`, headers: { cookie: owner }, payload: { memberId: "tafseer" } }); expect(mk.statusCode).toBe(200); const token = mk.json().url.split("/ingest/")[1];
    const kid = await app.inject({ method: "POST", url: `/households/${hid}/ingest-tokens`, headers: { cookie: owner }, payload: { memberId: "abbas" } }); expect(kid.statusCode).toBe(422);
    const other = await app.inject({ method: "POST", url: `/households/${hid}/ingest-tokens`, headers: { cookie: wife }, payload: { memberId: "tafseer" } }); expect(other.statusCode).toBe(403);
    const self = await app.inject({ method: "POST", url: `/households/${hid}/ingest-tokens`, headers: { cookie: wife }, payload: { memberId: "uzma" } }); expect(self.statusCode).toBe(200);
    const bad = await app.inject({ method: "POST", url: `/ingest/not-a-token`, payload: { steps: 100 } }); expect(bad.statusCode).toBe(404);
    const r1 = await app.inject({ method: "POST", url: `/ingest/${token}`, payload: { date: "2026-11-03", weight: "83.4 kg", steps: "9120", sleepMin: 455, cycleMin: 32, activeKcal: 410 } }); expect(r1.statusCode).toBe(200); expect(r1.json().written).toEqual(["day", "weighin"]);
    const day = await app.inject({ method: "GET", url: `/households/${hid}/docs/days/2026-11-03`, headers: { cookie: owner } }); expect(day.json().body.health.steps).toBe(9120); expect(day.json().body.steps).toBe(true); expect(day.json().body.train).toBe(true); expect(day.json().body.sleep).toBe(7.5);
    const w = await app.inject({ method: "GET", url: `/households/${hid}/docs/weighins/2026-11-03`, headers: { cookie: owner } }); expect(w.json().body).toEqual({ date: "2026-11-03", weight: 83.4, src: "health" });
    await app.inject({ method: "PUT", url: `/households/${hid}/docs/weighins/2026-11-02`, headers: { cookie: owner }, payload: { body: { date: "2026-11-02", weight: 83.9 } } });
    const r2 = await app.inject({ method: "POST", url: `/ingest/${token}`, payload: { date: "2026-11-02", weight: 83.1 } }); expect(r2.json().written).toEqual([]); // a manual weigh-in is never overwritten
    const latest = await app.inject({ method: "GET", url: `/ingest/${token}/latest` }); expect(latest.json().weight).toBe(83.4);
    const list = await app.inject({ method: "GET", url: `/households/${hid}/ingest-tokens`, headers: { cookie: owner } }); expect(list.json().length).toBe(2); expect(list.json().find((t: any) => t.member_id === "tafseer").uses).toBe(2);
    const wifeList = await app.inject({ method: "GET", url: `/households/${hid}/ingest-tokens`, headers: { cookie: wife } }); expect(wifeList.json().length).toBe(1);
    await app.inject({ method: "DELETE", url: `/households/${hid}/ingest-tokens/${mk.json().id}`, headers: { cookie: owner } }); const gone = await app.inject({ method: "POST", url: `/ingest/${token}`, payload: { steps: 1 } }); expect(gone.statusCode).toBe(404);
  });
  it("normalises Health payloads and sets habits without clearing them", () => {
    const n = normalizeHealth({ weight: "185 lb", steps: "7,950", sleepHours: "7.25", waist: 95 } as any, "2026-11-04"); expect(n.weight).toBe(83.9); expect(n.health.steps).toBe(7950); expect(n.health.sleepMin).toBe(435); expect(n.waist).toBe(95); expect(n.date).toBe("2026-11-04");
    const d = applyHealthToDay({ date: "2026-11-04", steps: true, sleep: 6 }, "2026-11-04", { steps: 3000, sleepMin: 480 }); expect(d.steps).toBe(true); expect(d.sleep).toBe(6); expect(d.health.steps).toBe(3000);
    const d2 = applyHealthToDay(null, "2026-11-04", { sleepMin: 470 }); expect(d2.sleep).toBe(8); expect(d2.sleepSrc).toBe("health");
  });
  it("decides reminders by household local time, once each", () => {
    const base = { timezone: "Asia/Karachi", settings: { fastHours: 21, quranStart: "2026-11-01" }, fast: {}, days: {}, weighins: {}, qprog: {}, sentKeys: new Set<string>() };
    const at = (iso: string) => new Date(iso); // 19:05 Karachi = 14:05 UTC
    expect(dueReminders(at("2026-11-04T14:05:00Z"), base).map(r => r.kind)).toEqual(["starter"]);
    expect(dueReminders(at("2026-11-04T15:35:00Z"), base).map(r => r.kind)).toEqual(["circle"]);
    expect(dueReminders(at("2026-11-04T16:40:00Z"), base).map(r => r.kind)).toEqual(["quran"]);
    expect(dueReminders(at("2026-11-06T02:10:00Z"), base).map(r => r.kind)).toEqual(["weighin"]); // Friday 07:10
    expect(dueReminders(at("2026-11-06T02:10:00Z"), { ...base, weighins: { "2026-11-06": { date: "2026-11-06", weight: 82 } } })).toEqual([]);
    const fasting = { ...base, fast: { startedAt: "2026-11-03T17:00:00Z" } }; expect(dueReminders(at("2026-11-04T14:05:00Z"), fasting).map(r => r.kind)).toEqual(["fastEnd", "starter"]);
    const sent = { ...fasting, sentKeys: new Set(["fastend:2026-11-03T17:00:00Z", "starter:2026-11-04"]) }; expect(dueReminders(at("2026-11-04T14:05:00Z"), sent)).toEqual([]);
    expect(dueReminders(at("2026-11-04T15:35:00Z"), { ...base, days: { "2026-11-04": { circle: true } } })).toEqual([]);
    expect(localParts(at("2026-11-04T19:30:00Z"), "Asia/Karachi")).toEqual({ date: "2026-11-05", hm: 30, weekday: "Thu" });
  });
  it("registers and tests push subscriptions", async () => {
    const vapid = await app.inject({ method: "GET", url: "/push/vapid" }); expect(vapid.json().publicKey.length).toBeGreaterThan(60); const again = await app.inject({ method: "GET", url: "/push/vapid" }); expect(again.json().publicKey).toBe(vapid.json().publicKey);
    const sub = { endpoint: "https://push.example.com/send/abc", keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } };
    const r = await app.inject({ method: "POST", url: `/households/${hid}/push/subscribe`, headers: { cookie: owner }, payload: { subscription: sub, prefs: { quran: false } } }); expect(r.statusCode).toBe(200);
    const st = await app.inject({ method: "GET", url: `/households/${hid}/push/status`, headers: { cookie: owner } }); expect(st.json().subscriptions[0].prefs.quran).toBe(false);
    const t = await app.inject({ method: "POST", url: `/households/${hid}/push/test`, headers: { cookie: owner } }); expect(t.statusCode).toBe(200); expect(t.json().sent).toBe(0); // the example endpoint rejects, so nothing is counted as sent
    const un = await app.inject({ method: "POST", url: `/households/${hid}/push/unsubscribe`, headers: { cookie: owner }, payload: { endpoint: sub.endpoint } }); expect(un.statusCode).toBe(200);
    const st2 = await app.inject({ method: "GET", url: `/households/${hid}/push/status`, headers: { cookie: owner } }); expect(st2.json().subscriptions.length).toBe(0);
  });
  it("runs the scheduler once per reminder per household", async () => {
    const sub = { endpoint: "https://push.example.com/send/tick", keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } };
    await app.inject({ method: "POST", url: `/households/${hid}/push/subscribe`, headers: { cookie: owner }, payload: { subscription: sub, prefs: {} } });
    const at = new Date("2026-11-04T15:35:00Z"); // 20:35 in Karachi: family circle
    await schedulerTick(db, cfg, at); const log = await db.query("select key from push_log where household_id=$1 order by key", [hid]); expect(log.rows.map((r: any) => r.key)).toEqual(["circle:2026-11-04"]);
    await schedulerTick(db, cfg, at); const log2 = await db.query("select count(*)::int as n from push_log where household_id=$1", [hid]); expect(log2.rows[0].n).toBe(1);
    const failed = await db.query("select failures from push_subscriptions where endpoint=$1", [sub.endpoint]); expect(failed.rows[0].failures).toBeGreaterThanOrEqual(1); // the example push service is unreachable; the subscription is kept
    await app.inject({ method: "POST", url: `/households/${hid}/push/unsubscribe`, headers: { cookie: owner }, payload: { endpoint: sub.endpoint } });
  });
  it("scans a plate through an injected scanner and explains a missing key", async () => {
    const tiny = "data:image/jpeg;base64," + Buffer.alloc(120, 1).toString("base64");
    const noKey = await app.inject({ method: "POST", url: `/households/${hid}/scan`, headers: { cookie: owner }, payload: { mode: "plate", image: tiny } }); expect(noKey.statusCode).toBe(503); expect(noKey.json().error.code).toBe("NO_SCAN_KEY");
    const status = await app.inject({ method: "GET", url: "/scan/status" }); expect(status.json().available).toBe(false);
    const seen: any[] = []; const fake = await buildApp(cfg, db, { mailer, scanner: async (a) => { seen.push(a); return { name: "Daal chawal", items: [{ food: "daal", qty: 1 }, { food: "rice", qty: 1.5 }, { food: "salad", qty: 1 }], verdict: "v", suggestions: ["s"], proteinFirst: false }; } });
    const ok = await fake.inject({ method: "POST", url: `/households/${hid}/scan`, headers: { cookie: owner }, payload: { mode: "plate", image: tiny, who: "Uzma" } }); expect(ok.statusCode).toBe(200); expect(ok.json().plate.items).toEqual([{ f: "daal", q: 1 }, { f: "rice", q: 1.5 }, { f: "salad", q: 1 }]); expect(ok.json().plate.thirds).toBe("heavy-carb"); expect(ok.json().proteinFirst).toBe(false);
    expect(seen[0].mediaType).toBe("image/jpeg"); expect(seen[0].who).toBe("Uzma"); expect(seen[0].data.length).toBeGreaterThan(100);
    const bad = await fake.inject({ method: "POST", url: `/households/${hid}/scan`, headers: { cookie: owner }, payload: { mode: "plate", image: "short" } }); expect(bad.statusCode).toBe(400);
    const st2 = await fake.inject({ method: "GET", url: "/scan/status" }); expect(st2.json().available).toBe(true);
    const log = await db.query("select count(*)::int as n from audit_events where action='scan'"); expect(log.rows[0].n).toBe(1); await fake.close();
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
