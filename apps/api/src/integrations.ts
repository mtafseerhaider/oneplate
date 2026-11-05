/** Integrations: Apple Health through Shortcuts (ingest tokens), web push notifications, and the reminder scheduler. */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import webpush from "web-push";
import type { Config } from "./config.js";
import type { Db } from "./db/pool.js";
import { ChangeBus } from "./events.js";
import { buildCourse, qIndex, listNames, goalConfig, type Member } from "@oneplate/core";
import { SURAH_INDEX, QPLAN } from "@oneplate/content";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/* ---------- document writes from the server (same table and change bus as the API's PUT) ---------- */
export async function upsertDoc(db: Db, hid: string, collection: string, docId: string, mutate: (existing: any | null) => any | null, userId: string | null): Promise<boolean> {
  const c = await db.connect(); try {
    await c.query("begin"); const ex = await c.query<{ body: any; version: number }>("select body,version from documents where household_id=$1 and collection=$2 and doc_id=$3 for update", [hid, collection, docId]);
    const next = mutate(ex.rows[0]?.body ?? null); if (!next) { await c.query("rollback"); return false; }
    const v = ex.rows[0] ? ex.rows[0].version + 1 : 1;
    await c.query("insert into documents(household_id,collection,doc_id,body,version,updated_by) values($1,$2,$3,$4,$5,$6) on conflict (household_id,collection,doc_id) do update set body=excluded.body, version=excluded.version, updated_by=excluded.updated_by, updated_at=now()", [hid, collection, docId, next, v, userId]);
    await ChangeBus.publish(c, { hid, collection, doc_id: docId, version: v }); await c.query("commit"); return true;
  } catch (e) { await c.query("rollback"); throw e; } finally { c.release(); }
}

/* ---------- Apple Health payload → OnePlate records (pure, tested) ---------- */
export const STEP_GOAL = 8000;
export interface HealthPayload { date?: string; weight?: number | string; steps?: number | string; sleepMin?: number | string; sleepHours?: number | string; cycleMin?: number | string; activeKcal?: number | string; waist?: number | string }
const num = (v: any): number | undefined => { if (v === undefined || v === null || v === "") return undefined; const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : undefined; };
export function normalizeHealth(p: HealthPayload, today: string): { date: string; weight?: number; waist?: number; health: Record<string, number> } {
  const date = p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : today; const health: Record<string, number> = {};
  const steps = num(p.steps); if (steps !== undefined && steps >= 0) health.steps = Math.round(steps);
  const sleepMin = num(p.sleepMin) ?? (num(p.sleepHours) !== undefined ? num(p.sleepHours)! * 60 : undefined); if (sleepMin !== undefined && sleepMin > 0 && sleepMin < 24 * 60) health.sleepMin = Math.round(sleepMin);
  const cyc = num(p.cycleMin); if (cyc !== undefined && cyc >= 0) health.cycleMin = Math.round(cyc);
  const kcal = num(p.activeKcal); if (kcal !== undefined && kcal >= 0) health.activeKcal = Math.round(kcal);
  let weight = num(p.weight); if (weight !== undefined) { if (/lb/i.test(String(p.weight)) || weight > 250) weight = weight / 2.2046; if (weight < 20 || weight > 250) weight = undefined; else weight = Math.round(weight * 10) / 10; }
  let waist = num(p.waist); if (waist !== undefined) { if (waist < 40 || waist > 200) waist = undefined; else waist = Math.round(waist * 2) / 2; }
  return { date, weight, waist, health };
}
/** Day document after a Health update: raw numbers under `health`, and the habit switches set only when Health shows they were met (never cleared). Manual sleep is kept. */
export function applyHealthToDay(day: any | null, date: string, health: Record<string, number>): any {
  const d = Object.assign({ date }, day || {}); d.health = Object.assign({}, d.health || {}, health, { at: new Date().toISOString() });
  if (health.steps !== undefined && health.steps >= STEP_GOAL) d.steps = true;
  if (health.cycleMin !== undefined && health.cycleMin >= 20) d.train = true;
  if (health.sleepMin !== undefined && (d.sleep === undefined || d.sleep === null || d.sleepSrc === "health")) { d.sleep = Math.round(health.sleepMin / 30) / 2; d.sleepSrc = "health"; }
  return d;
}

/* ---------- reminder decisions (pure, tested) ---------- */
export interface HouseholdState { timezone: string; settings: any; fast: any; days: Record<string, any>; weighins: Record<string, any>; qprog: any; sentKeys: Set<string>; family?: Member[]; ownerMemberId?: string }
export interface Reminder { key: string; title: string; body: string; kind: "fastEnd" | "starter" | "circle" | "quran" | "weighin"; ownerOnly: boolean }
export function localParts(now: Date, tz: string) { const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false }); const p: any = {}; for (const x of f.formatToParts(now)) p[x.type] = x.value; return { date: `${p.year}-${p.month}-${p.day}`, hm: Number(p.hour === "24" ? 0 : p.hour) * 60 + Number(p.minute), weekday: p.weekday as string }; }
export function dueReminders(now: Date, st: HouseholdState): Reminder[] {
  const out: Reminder[] = []; const { date, hm, weekday } = localParts(now, st.timezone || "Asia/Karachi"); const day = st.days[date] || {}; const allowed = new Set(goalConfig(st.settings?.goals).reminders);
  const win = (start: number, r: Reminder) => { if (hm >= start && hm < start + 30 && !st.sentKeys.has(r.key)) out.push(r); };
  if (st.fast?.startedAt) { const goal = Number(st.settings?.fastHours || 21); const end = new Date(st.fast.startedAt).getTime() + goal * 36e5; const key = `fastend:${st.fast.startedAt}`; if (now.getTime() >= end && now.getTime() < end + 30 * 6e4 && !st.sentKeys.has(key)) out.push({ key, kind: "fastEnd", ownerOnly: true, title: `${goal} h fast complete`, body: "Alhamdulillah. Protein starter first, then the one plate at home. Spoon down between bites." }); }
  if (!day.starter && (st.fast?.startedAt || !day.closed)) win(19 * 60, { key: `starter:${date}`, kind: "starter", ownerOnly: true, title: "Protein starter", body: "Two eggs or a bowl of yogurt now; the plate when you are home." });
  const kids = listNames((st.family ?? []).filter(m => m.role === "child").map(m => m.name), "the children");
  if (!day.circle) win(20 * 60 + 30, { key: `circle:${date}`, kind: "circle", ownerOnly: false, title: "Family circle · 5 minutes", body: `Tonight's verse, story and question for ${kids} are on the Learn tab.` });
  const course = courseCache(); const qs = st.settings?.quranStart || st.settings?.startDate || date; const idx = qIndex(qs, date, course.length); const r = course[idx]!;
  if (!(st.qprog?.done || {})[r.key]) win(21 * 60 + 30, { key: `quran:${date}`, kind: "quran", ownerOnly: false, title: `Today's reading · ${r.n}`, body: r.cur ? "A close reading with its al-Mizan note. Ten minutes before bed." : `${r.portion}. The surah's summary and al-Mizan's purpose note are on the Learn tab.` });
  if (weekday === "Fri" && !Object.values(st.weighins).some((w: any) => w?.date === date && !w?.m)) win(7 * 60, { key: `weighin:${date}`, kind: "weighin", ownerOnly: true, title: "Weigh-in morning", body: "After the bathroom, before water. Same scale, same place. Log it on Progress." });
  return out.filter(r => allowed.has(r.kind));
}
let _course: ReturnType<typeof buildCourse> | null = null; function courseCache() { return _course ?? (_course = buildCourse(SURAH_INDEX, QPLAN, 365)); }

/* ---------- VAPID keys: configured, or generated once and kept in kv ---------- */
export async function vapidKeys(db: Db, cfg: Config): Promise<{ publicKey: string; privateKey: string }> {
  if (cfg.VAPID_PUBLIC_KEY && cfg.VAPID_PRIVATE_KEY) return { publicKey: cfg.VAPID_PUBLIC_KEY, privateKey: cfg.VAPID_PRIVATE_KEY };
  const r = await db.query<{ value: any }>("select value from kv where key='vapid'"); if (r.rowCount) return r.rows[0]!.value;
  const k = webpush.generateVAPIDKeys(); await db.query("insert into kv(key,value) values('vapid',$1) on conflict (key) do nothing", [JSON.stringify(k)]);
  const again = await db.query<{ value: any }>("select value from kv where key='vapid'"); return again.rows[0]!.value;
}

export interface IntegrationDeps { audit: (req: any, action: string, extra?: any) => Promise<void>; withHousehold: any; requireUser: any }
export function registerIntegrationRoutes(app: FastifyInstance, cfg: Config, db: Db, deps: IntegrationDeps) {
  const ownerOrSelf = (req: any, memberId: string) => req.actor.level === "owner" || (req.actor.level === "contributor" && req.actor.memberId === memberId);
  // ---- Apple Health ingest tokens ----
  app.post("/households/:hid/ingest-tokens", { preHandler: deps.withHousehold }, async (req: any, reply) => {
    const p = z.object({ memberId: z.string().min(1).max(40) }).safeParse(req.body); if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: "memberId required" } });
    if (!ownerOrSelf(req, p.data.memberId)) return reply.code(403).send({ error: { code: "FORBIDDEN", message: "owner, or your own member" } });
    const fam = await db.query<{ body: any }>("select body from documents where household_id=$1 and collection='family' and doc_id=$2", [req.householdId, p.data.memberId]);
    if (fam.rowCount && fam.rows[0]!.body.role === "child") return reply.code(422).send({ error: { code: "CHILD_RULE", message: "no automatic tracking for children" } });
    const token = randomBytes(24).toString("base64url"), id = randomBytes(5).toString("base64url");
    await db.query("insert into ingest_tokens(id,token_hash,household_id,member_id,created_by) values($1,$2,$3,$4,$5)", [id, sha(token), req.householdId, p.data.memberId, req.userId]);
    await deps.audit(req, "ingest_token.create", { doc_id: p.data.memberId }); return { id, memberId: p.data.memberId, url: `${cfg.PUBLIC_URL}/ingest/${token}` };
  });
  app.get("/households/:hid/ingest-tokens", { preHandler: deps.withHousehold }, async (req: any) => (await db.query("select id,member_id,created_at,last_used_at,uses,disabled from ingest_tokens where household_id=$1 and ($2::text is null or member_id=$2) order by created_at desc", [req.householdId, req.actor.level === "owner" ? null : req.actor.memberId])).rows);
  app.delete("/households/:hid/ingest-tokens/:id", { preHandler: deps.withHousehold }, async (req: any, reply) => { const t = await db.query<{ member_id: string }>("select member_id from ingest_tokens where household_id=$1 and id=$2", [req.householdId, req.params.id]); if (!t.rowCount) return { ok: true }; if (!ownerOrSelf(req, t.rows[0]!.member_id)) return reply.code(403).send({ error: { code: "FORBIDDEN", message: "owner, or your own member" } }); await db.query("update ingest_tokens set disabled=true where id=$1", [req.params.id]); await deps.audit(req, "ingest_token.revoke", { doc_id: req.params.id }); return { ok: true }; });
  const findToken = async (token: string) => { const r = await db.query<{ id: string; household_id: string; member_id: string }>("select id,household_id,member_id from ingest_tokens where token_hash=$1 and disabled=false", [sha(String(token))]); return r.rows[0] ?? null; };
  app.post("/ingest/:token", { config: { rateLimit: { max: 60, timeWindow: "1 hour" } } }, async (req: any, reply) => {
    const t = await findToken(req.params.token); if (!t) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "unknown or revoked token" } });
    const hh = await db.query<{ timezone: string }>("select timezone from households where id=$1", [t.household_id]); const today = localParts(new Date(), hh.rows[0]?.timezone || "Asia/Karachi").date;
    const n = normalizeHealth((req.body ?? {}) as HealthPayload, today); const written: string[] = [];
    if (Object.keys(n.health).length) { await upsertDoc(db, t.household_id, "days", n.date, d => applyHealthToDay(d, n.date, n.health), null); written.push("day"); }
    if (n.weight !== undefined) { const owner = (await db.query<{ member_id: string }>("select member_id from memberships where household_id=$1 and level='owner' limit 1", [t.household_id])).rows[0]?.member_id || "owner"; const key = t.member_id === owner ? n.date : `${t.member_id}-${n.date}`; const ok = await upsertDoc(db, t.household_id, "weighins", key, ex => { if (ex && ex.src !== "health") return null; const r: any = { date: n.date, weight: n.weight, src: "health" }; if (t.member_id !== owner) r.m = t.member_id; if (n.waist !== undefined) r.waist = n.waist; else if (ex?.waist) r.waist = ex.waist; return r; }, null); if (ok) written.push("weighin"); }
    await db.query("update ingest_tokens set uses=uses+1, last_used_at=now() where id=$1", [t.id]); return { ok: true, date: n.date, written, received: n };
  });
  app.get("/ingest/:token/latest", async (req: any, reply) => { // for the Shortcut that writes OnePlate's weigh-in back into Health
    const t = await findToken(req.params.token); if (!t) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "unknown or revoked token" } });
    const owner = (await db.query<{ member_id: string }>("select member_id from memberships where household_id=$1 and level='owner' limit 1", [t.household_id])).rows[0]?.member_id || "owner";
    const r = await db.query<{ body: any }>("select body from documents where household_id=$1 and collection='weighins' and (($2 and doc_id !~ '^[a-z]') or doc_id like $3) order by body->>'date' desc limit 1", [t.household_id, t.member_id === owner, t.member_id + "-%"]);
    const w = r.rows[0]?.body; if (!w) return { weight: null }; return { weight: w.weight, date: w.date, waist: w.waist ?? null, manual: w.src !== "health" };
  });
  // ---- web push ----
  app.get("/push/vapid", async () => ({ publicKey: (await vapidKeys(db, cfg)).publicKey }));
  app.post("/households/:hid/push/subscribe", { preHandler: deps.withHousehold }, async (req: any, reply) => {
    const p = z.object({ subscription: z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) }).passthrough(), prefs: z.record(z.boolean()).default({}) }).safeParse(req.body); if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: "subscription required" } });
    const id = randomBytes(6).toString("base64url");
    await db.query("insert into push_subscriptions(id,household_id,user_id,member_id,endpoint,subscription,prefs) values($1,$2,$3,$4,$5,$6,$7) on conflict (endpoint) do update set household_id=excluded.household_id,user_id=excluded.user_id,member_id=excluded.member_id,subscription=excluded.subscription,prefs=excluded.prefs,failures=0", [id, req.householdId, req.userId, req.actor.memberId, p.data.subscription.endpoint, JSON.stringify(p.data.subscription), JSON.stringify(p.data.prefs)]);
    await deps.audit(req, "push.subscribe"); return { ok: true };
  });
  app.post("/households/:hid/push/unsubscribe", { preHandler: deps.withHousehold }, async (req: any) => { const p = z.object({ endpoint: z.string() }).safeParse(req.body); if (p.success) await db.query("delete from push_subscriptions where household_id=$1 and endpoint=$2", [req.householdId, p.data.endpoint]); return { ok: true }; });
  app.get("/households/:hid/push/status", { preHandler: deps.withHousehold }, async (req: any) => { const r = await db.query("select endpoint,prefs,last_ok_at from push_subscriptions where household_id=$1 and user_id=$2", [req.householdId, req.userId]); return { subscriptions: r.rows }; });
  app.post("/households/:hid/push/test", { preHandler: deps.withHousehold }, async (req: any) => { const n = await sendTo(db, cfg, req.householdId, { key: "", kind: "circle", ownerOnly: false, title: "OnePlate", body: "Notifications are on for this device." }, req.userId); return { sent: n }; });
}

async function sendTo(db: Db, cfg: Config, hid: string, r: Reminder, onlyUser?: string): Promise<number> {
  const keys = await vapidKeys(db, cfg); const ownerMember = (await db.query<{ member_id: string }>("select member_id from memberships where household_id=$1 and level='owner' limit 1", [hid])).rows[0]?.member_id || "owner"; webpush.setVapidDetails(`mailto:${cfg.MAIL_FROM.replace(/.*<|>.*/g, "") || "admin@example.com"}`, keys.publicKey, keys.privateKey);
  const subs = await db.query<{ id: string; subscription: any; prefs: any; member_id: string | null; user_id: string }>("select id,subscription,prefs,member_id,user_id from push_subscriptions where household_id=$1", [hid]); let n = 0;
  for (const s of subs.rows) {
    if (onlyUser && s.user_id !== onlyUser) continue; if (!onlyUser && s.prefs && s.prefs[r.kind] === false) continue; if (!onlyUser && r.ownerOnly && s.member_id !== ownerMember) continue;
    try { await webpush.sendNotification(s.subscription, JSON.stringify({ title: r.title, body: r.body, kind: r.kind, url: "./" }), { TTL: 1800 }); await db.query("update push_subscriptions set last_ok_at=now(), failures=0 where id=$1", [s.id]); n++; }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await db.query("delete from push_subscriptions where id=$1", [s.id]); else await db.query("update push_subscriptions set failures=failures+1 where id=$1", [s.id]); }
  }
  return n;
}
/** One scheduler pass: every household with a subscription, its state, the reminders due in this half-hour, each sent once. */
export async function schedulerTick(db: Db, cfg: Config, now = new Date(), log: (m: string) => void = () => {}): Promise<number> {
  const hh = await db.query<{ id: string; timezone: string }>("select distinct h.id,h.timezone from households h join push_subscriptions p on p.household_id=h.id"); let total = 0;
  for (const h of hh.rows) {
    const docs = await db.query<{ collection: string; doc_id: string; body: any }>("select collection,doc_id,body from documents where household_id=$1 and (collection in ('settings','fast','quran','family') or (collection='days' and doc_id>=to_char(now() - interval '2 days','YYYY-MM-DD')) or (collection='weighins' and body->>'date'>=to_char(now() - interval '2 days','YYYY-MM-DD')))", [h.id]);
    const st: HouseholdState = { timezone: h.timezone, settings: {}, fast: {}, days: {}, weighins: {}, qprog: {}, sentKeys: new Set(), family: [] };
    for (const d of docs.rows) { if (d.collection === "settings") st.settings = d.body; else if (d.collection === "fast") st.fast = d.body; else if (d.collection === "quran") st.qprog = d.body; else if (d.collection === "family") st.family!.push(d.body); else if (d.collection === "days") st.days[d.doc_id] = d.body; else st.weighins[d.doc_id] = d.body; }
    const sent = await db.query<{ key: string }>("select key from push_log where household_id=$1 and sent_at>now()-interval '2 days'", [h.id]); for (const s of sent.rows) st.sentKeys.add(s.key);
    for (const r of dueReminders(now, st)) { const ins = await db.query("insert into push_log(household_id,key) values($1,$2) on conflict do nothing", [h.id, r.key]); if (!ins.rowCount) continue; const n = await sendTo(db, cfg, h.id, r); total += n; log(`push ${r.kind} to ${n} device(s)`); }
  }
  return total;
}
