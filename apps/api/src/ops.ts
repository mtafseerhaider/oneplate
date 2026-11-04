/** Operations: status, admin, limits, error reporting and data retention. */
import type { FastifyInstance } from "fastify";
import type { Db } from "./db/pool.js";
import type { Config } from "./config.js";
export const VERSION = "0.3.0";
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
  app.get("/admin/households", { preHandler: adminOnly }, async () => (await db.query("select h.id,h.name,h.created_at,u.email as owner,(select count(*) from memberships m where m.household_id=h.id)::int as members,(select count(*) from documents d where d.household_id=h.id)::int as documents,(select max(updated_at) from documents d where d.household_id=h.id) as last_write from households h join users u on u.id=h.owner_user_id order by h.created_at desc limit 500")).rows);
  app.get("/admin/audit", { preHandler: adminOnly }, async (req: any) => (await db.query("select * from audit_events where ($1::uuid is null or household_id=$1) order by at desc limit 200", [req.query.hid ?? null])).rows);
  app.post("/admin/retention", { preHandler: adminOnly }, async () => retention(db, cfg.AUDIT_RETENTION_DAYS));
}
