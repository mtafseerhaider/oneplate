/** Operations: status, admin, limits, error reporting and data retention. */
import type { FastifyInstance } from "fastify";
import type { Db } from "./db/pool.js";
import type { Config } from "./config.js";
import { randomBytes } from "node:crypto";
export const VERSION = "0.4.0";
const started = Date.now();
export interface ErrorReporter { report(e: { message: string; stack?: string; requestId?: string; route?: string; status?: number }): void }
/** Fire-and-forget JSON webhook; point ERROR_WEBHOOK_URL at a Sentry relay, a Slack hook or your own collector. Off by default. */
export function createErrorReporter(url: string | undefined, log: (m: string) => void): ErrorReporter {
  if (!url) return { report: () => {} };
  return { report: (e) => { fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ service: "oneplate-api", version: VERSION, at: new Date().toISOString(), ...e }) }).catch(err => log("error webhook failed: " + err.message)); } };
}
export async function retention(db: Db, auditDays: number): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  out.sessions = (await db.query("delete from sessions where expires_at<now()")).rowCount ?? 0;
  out.password_resets = (await db.query("delete from password_resets where used_at is not null or expires_at<now()-interval '1 day'")).rowCount ?? 0;
  out.webauthn_challenges = (await db.query("delete from webauthn_challenges where expires_at<now()")).rowCount ?? 0;
  out.audit_events = (await db.query("delete from audit_events where at<now()-($1||' days')::interval", [String(auditDays)])).rowCount ?? 0;
  out.invites = (await db.query("delete from invites where expires_at<now()-interval '30 days'")).rowCount ?? 0;
  return out;
}
export function registerOpsRoutes(app: FastifyInstance, cfg: Config, db: Db, live: () => boolean) {
  const admins = new Set(cfg.ADMIN_EMAILS.split(",").map(s => s.trim().toLowerCase()).filter(Boolean));
  const isAdmin = async (userId?: string) => { if (!userId || !admins.size) return false; const r = await db.query<{ email: string }>("select email from users where id=$1", [userId]); return !!r.rowCount && admins.has(r.rows[0]!.email); };
  app.get("/status", async () => {
    let dbOk = false, counts: any = {}; try { await db.query("select 1"); dbOk = true; const c = await db.query("select (select count(*) from users)::int as users,(select count(*) from households)::int as households,(select count(*) from documents)::int as documents"); counts = c.rows[0]; } catch { /* db down */ }
    return { service: "oneplate-api", version: VERSION, status: dbOk ? "ok" : "degraded", uptimeSeconds: Math.round((Date.now() - started) / 1000), db: dbOk, liveUpdates: live(), ...counts, time: new Date().toISOString() };
  });
  app.get("/metrics", async () => { const m = process.memoryUsage(); const c = await db.query("select (select count(*) from sessions where expires_at>now())::int as active_sessions,(select count(*) from audit_events where at>now()-interval '1 hour')::int as writes_last_hour"); return { uptime_seconds: Math.round((Date.now() - started) / 1000), rss_bytes: m.rss, heap_used_bytes: m.heapUsed, ...c.rows[0] }; });
  const adminOnly = async (req: any, reply: any) => { if (!(await isAdmin(req.userId))) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "not found" } }); };
  app.get("/admin/stats", { preHandler: adminOnly }, async () => (await db.query("select (select count(*) from users)::int as users,(select count(*) from households)::int as households,(select count(*) from documents)::int as documents,(select count(*) from audit_events)::int as audit_events,(select count(*) from passkeys)::int as passkeys,pg_size_pretty(pg_database_size(current_database())) as db_size")).rows[0]);
  app.get("/admin/households", { preHandler: adminOnly }, async () => (await db.query("select h.id,h.name,h.created_at,u.email as owner,u.display_name as owner_name,h.scan_quota,(select d.body->'goals' from documents d where d.household_id=h.id and d.collection='settings' and d.doc_id='main') as goals,coalesce((select n from scan_usage s where s.household_id=h.id and s.month=to_char(now(),'YYYY-MM')),0)::int as scans_this_month,(select count(*) from memberships m where m.household_id=h.id)::int as members,(select count(*) from documents d where d.household_id=h.id)::int as documents,(select max(updated_at) from documents d where d.household_id=h.id) as last_write from households h join users u on u.id=h.owner_user_id order by h.created_at desc limit 500")).rows);
  app.put("/admin/households/:id", { preHandler: adminOnly }, async (req: any, reply) => { const q = Number(req.body?.scan_quota); if (!Number.isInteger(q) || q < 0 || q > 100000) return reply.code(400).send({ error: { code: "INVALID", message: "scan_quota must be a whole number" } }); const r = await db.query("update households set scan_quota=$1 where id=$2", [q, req.params.id]); if (!r.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "no such household" } }); return { ok: true, scan_quota: q }; });
  // ---- household invites: the only way a new family joins this server ----
  app.post("/admin/household-invites", { preHandler: adminOnly }, async (req: any) => { const code = randomBytes(9).toString("base64url"); const days = Math.min(90, Math.max(1, Number(req.body?.days) || 14)); await db.query("insert into household_invites(code,created_by,note,email,expires_at) values($1,$2,$3,$4,now()+($5||' days')::interval)", [code, req.userId, req.body?.note ? String(req.body.note).slice(0, 120) : null, req.body?.email ? String(req.body.email).slice(0, 200) : null, String(days)]); return { code, url: `${cfg.PUBLIC_URL}/account.html?invite=${code}`, expiresInDays: days }; });
  app.get("/admin/household-invites", { preHandler: adminOnly }, async () => (await db.query("select i.code,i.note,i.email,i.expires_at,i.used_at,u.email as used_by_email,i.created_at from household_invites i left join users u on u.id=i.used_by order by i.created_at desc limit 200")).rows);
  app.delete("/admin/household-invites/:code", { preHandler: adminOnly }, async (req: any) => { await db.query("delete from household_invites where code=$1 and used_by is null", [req.params.code]); return { ok: true }; });
  app.get("/admin/me", { preHandler: adminOnly }, async () => ({ admin: true }));
  app.get("/admin/audit", { preHandler: adminOnly }, async (req: any) => (await db.query("select * from audit_events where ($1::uuid is null or household_id=$1) order by at desc limit 200", [req.query.hid ?? null])).rows);
  app.post("/admin/retention", { preHandler: adminOnly }, async () => retention(db, cfg.AUDIT_RETENTION_DAYS));
  // ---- scholar review workflow: anyone signed in reads the statuses, admins (the reviewers) set them ----
  app.get("/content/reviews", async (req: any, reply) => {
    if (!req.userId) return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "sign in" } });
    const r = await db.query<{ key: string; status: string; reviewer_name: string; source: string | null; note: string | null; updated_at: Date }>("select key,status,reviewer_name,source,note,updated_at from content_reviews");
    const reviews: Record<string, any> = {}; for (const row of r.rows) reviews[row.key] = { status: row.status, by: row.reviewer_name, source: row.source ?? undefined, note: row.note ?? undefined, date: row.updated_at.toISOString().slice(0, 10) };
    return { reviews, canReview: await isAdmin(req.userId) };
  });
  app.put("/admin/content/reviews/:key", { preHandler: adminOnly }, async (req: any, reply) => {
    const key = String(req.params.key); if (!/^[a-z]+-[a-z0-9-]{1,60}$/.test(key)) return reply.code(400).send({ error: { code: "INVALID", message: "bad content key" } });
    const b = req.body ?? {}; const status = String(b.status ?? ""); if (!["draft", "reviewed", "verified", "disputed"].includes(status)) return reply.code(400).send({ error: { code: "INVALID", message: "status must be draft, reviewed, verified or disputed" } });
    const by = String(b.by ?? "").trim().slice(0, 80), source = b.source ? String(b.source).slice(0, 200) : null, note = b.note ? String(b.note).slice(0, 1000) : null;
    if (status === "draft") { await db.query("delete from content_reviews where key=$1", [key]); }
    else { if (!by) return reply.code(400).send({ error: { code: "INVALID", message: "a reviewer name is required" } }); if (status === "verified" && !source) return reply.code(400).send({ error: { code: "INVALID", message: "verified needs the edition, volume and page checked" } });
      await db.query("insert into content_reviews(key,status,reviewer_user_id,reviewer_name,source,note) values($1,$2,$3,$4,$5,$6) on conflict (key) do update set status=excluded.status, reviewer_user_id=excluded.reviewer_user_id, reviewer_name=excluded.reviewer_name, source=excluded.source, note=excluded.note, updated_at=now()", [key, status, req.userId, by, source, note]); }
    await db.query("insert into audit_events(household_id,user_id,action,collection,doc_id,ip) values(null,$1,'content.review','content_reviews',$2,$3)", [req.userId, key + ":" + status, req.ip]).catch(() => {});
    return { key, status };
  });
  app.get("/admin/content/reviews", { preHandler: adminOnly }, async () => (await db.query("select r.*,u.email as reviewer_email from content_reviews r left join users u on u.id=r.reviewer_user_id order by updated_at desc limit 1000")).rows);
}
