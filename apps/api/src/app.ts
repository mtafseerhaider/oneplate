import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { z } from "zod";
import type { Config } from "./config.js";
import type { Db } from "./db/pool.js";
import { hashPassword, verifyPassword, newSessionId, newInviteCode } from "./auth/password.js";
import { canWrite, validateFamilyDoc, type Actor, type Level } from "./auth/policy.js";
import { ChangeBus, type Change } from "./events.js";
import { createMailer, type Mailer } from "./mail.js";
import { createHash, randomBytes } from "node:crypto";
import { registerPasskeyRoutes } from "./auth/passkeys.js";

declare module "fastify" { interface FastifyRequest { userId?: string; actor?: Actor; householdId?: string } }

export interface AppDeps { bus?: ChangeBus; mailer?: Mailer }
export async function buildApp(cfg: Config, db: Db, deps: AppDeps = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: cfg.LOG_LEVEL, ...(cfg.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : {}) }, trustProxy: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: cfg.CORS_ORIGIN.split(","), credentials: true });
  await app.register(cookie, { secret: cfg.SESSION_SECRET });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  await app.register(swagger, { openapi: { info: { title: "OnePlate API", version: "0.1.0" } } });
  await app.register(swaggerUi, { routePrefix: "/docs" });
  const COOKIE = "op_session";
  const mailer = deps.mailer ?? createMailer(cfg.MAIL_TRANSPORT, m => app.log.info(m), { smtpUrl: cfg.SMTP_URL, from: cfg.MAIL_FROM });
  const bus = deps.bus ?? null;
  app.decorate("mailer", mailer);
  const audit = (req: any, action: string, extra: Partial<{ collection: string; doc_id: string; version: number }> = {}) => db.query("insert into audit_events(household_id,user_id,action,collection,doc_id,version,ip) values($1,$2,$3,$4,$5,$6,$7)", [req.householdId ?? null, req.userId ?? null, action, extra.collection ?? null, extra.doc_id ?? null, extra.version ?? null, req.ip]).catch(e => app.log.warn(e, "audit failed"));

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_req, reply) => { try { await db.query("select 1"); return { status: "ready" }; } catch { return reply.code(503).send({ status: "db unavailable" }); } });

  // ---- auth ----
  app.addHook("preHandler", async (req) => {
    const sid = req.cookies[COOKIE]; if (!sid) return;
    const r = await db.query<{ user_id: string }>("select user_id from sessions where id=$1 and expires_at>now()", [sid]); if (r.rowCount) req.userId = r.rows[0]!.user_id;
  });
  const setSession = async (reply: any, userId: string, ua?: string) => { const id = newSessionId(); const exp = new Date(Date.now() + cfg.SESSION_DAYS * 864e5); await db.query("insert into sessions(id,user_id,expires_at,user_agent) values($1,$2,$3,$4)", [id, userId, exp, ua ?? null]); reply.setCookie(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: cfg.COOKIE_SECURE, path: "/", expires: exp }); };
  const Creds = z.object({ email: z.string().email().max(200), password: z.string().min(8).max(200), displayName: z.string().min(1).max(60).optional() });
  app.post("/auth/register", { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, async (req, reply) => {
    const p = Creds.safeParse(req.body); if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: p.error.issues[0]?.message } });
    const exists = await db.query("select 1 from users where email=$1", [p.data.email.toLowerCase()]); if (exists.rowCount) return reply.code(409).send({ error: { code: "EXISTS", message: "email already registered" } });
    const r = await db.query<{ id: string }>("insert into users(email,password_hash,display_name) values($1,$2,$3) returning id", [p.data.email.toLowerCase(), await hashPassword(p.data.password), p.data.displayName ?? p.data.email.split("@")[0]]);
    await setSession(reply, r.rows[0]!.id, req.headers["user-agent"]); req.userId = r.rows[0]!.id; await audit(req, "register"); return { id: r.rows[0]!.id };
  });
  app.post("/auth/login", { config: { rateLimit: { max: 20, timeWindow: "15 minutes" } } }, async (req, reply) => {
    const p = Creds.safeParse(req.body); if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: "email and password required" } });
    const r = await db.query<{ id: string; password_hash: string }>("select id,password_hash from users where email=$1", [p.data.email.toLowerCase()]);
    if (!r.rowCount || !(await verifyPassword(p.data.password, r.rows[0]!.password_hash))) return reply.code(401).send({ error: { code: "BAD_CREDENTIALS", message: "wrong email or password" } });
    await setSession(reply, r.rows[0]!.id, req.headers["user-agent"]); req.userId = r.rows[0]!.id; await audit(req, "login"); return { id: r.rows[0]!.id };
  });
  app.post("/auth/forgot", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, async (req, reply) => {
    const p = z.object({ email: z.string().email() }).safeParse(req.body); if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: "email required" } });
    const u = await db.query<{ id: string }>("select id from users where email=$1", [p.data.email.toLowerCase()]);
    if (u.rowCount) { const token = randomBytes(24).toString("base64url"); await db.query("insert into password_resets(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')", [createHash("sha256").update(token).digest("hex"), u.rows[0]!.id]); await mailer.send({ to: p.data.email, subject: "Reset your OnePlate password", text: `Open this link within an hour to choose a new password:\n${cfg.PUBLIC_URL}/account.html?reset=${token}` }); }
    return { ok: true }; // never reveal whether the email exists
  });
  app.post("/auth/reset", { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, async (req, reply) => {
    const p = z.object({ token: z.string().min(10), password: z.string().min(8).max(200) }).safeParse(req.body); if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: "token and a password of 8+ characters required" } });
    const h = createHash("sha256").update(p.data.token).digest("hex"); const r = await db.query<{ user_id: string }>("select user_id from password_resets where token_hash=$1 and used_at is null and expires_at>now()", [h]);
    if (!r.rowCount) return reply.code(400).send({ error: { code: "INVALID_TOKEN", message: "this link is invalid or has expired" } });
    await db.query("update users set password_hash=$1, updated_at=now() where id=$2", [await hashPassword(p.data.password), r.rows[0]!.user_id]); await db.query("update password_resets set used_at=now() where token_hash=$1", [h]); await db.query("delete from sessions where user_id=$1", [r.rows[0]!.user_id]);
    req.userId = r.rows[0]!.user_id; await audit(req, "password.reset"); return { ok: true };
  });
  registerPasskeyRoutes(app, cfg, db, { setSession, audit: async (r, a) => { await audit(r, a); } });
  app.post("/auth/logout", async (req, reply) => { const sid = req.cookies[COOKIE]; if (sid) await db.query("delete from sessions where id=$1", [sid]); reply.clearCookie(COOKIE, { path: "/" }); return { ok: true }; });
  app.get("/auth/me", async (req, reply) => {
    if (!req.userId) return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "sign in" } });
    const u = await db.query("select id,email,display_name from users where id=$1", [req.userId]);
    const hh = await db.query("select h.id,h.name,m.level,m.member_id from memberships m join households h on h.id=m.household_id where m.user_id=$1 order by h.created_at", [req.userId]);
    return { user: u.rows[0], households: hh.rows };
  });

  const requireUser = async (req: any, reply: any) => { if (!req.userId) { reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "sign in" } }); return reply; } };
  // ---- households ----
  app.post("/households", { preHandler: requireUser }, async (req, reply) => {
    const p = z.object({ name: z.string().min(1).max(80), memberId: z.string().min(1).max(40).default("tafseer") }).safeParse(req.body); if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: "name required" } });
    const c = await db.connect(); try { await c.query("begin"); const h = await c.query<{ id: string }>("insert into households(name,owner_user_id) values($1,$2) returning id", [p.data.name, req.userId]); await c.query("insert into memberships(household_id,user_id,level,member_id) values($1,$2,'owner',$3)", [h.rows[0]!.id, req.userId, p.data.memberId]); await c.query("commit"); req.householdId = h.rows[0]!.id; await audit(req, "household.create"); return { id: h.rows[0]!.id }; } catch (e) { await c.query("rollback"); throw e; } finally { c.release(); }
  });
  const withHousehold = async (req: any, reply: any) => {
    if (!req.userId) return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "sign in" } });
    const hid = req.params.hid; const m = await db.query<{ level: Level; member_id: string | null }>("select level,member_id from memberships where household_id=$1 and user_id=$2", [hid, req.userId]);
    if (!m.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "no such household" } });
    req.householdId = hid; req.actor = { userId: req.userId, level: m.rows[0]!.level, memberId: m.rows[0]!.member_id };
  };
  app.post("/households/:hid/invites", { preHandler: withHousehold }, async (req: any, reply) => {
    if (req.actor.level !== "owner") return reply.code(403).send({ error: { code: "FORBIDDEN", message: "owner only" } });
    const p = z.object({ level: z.enum(["contributor", "viewer"]), memberId: z.string().max(40).nullable().default(null), days: z.number().int().min(1).max(30).default(7), email: z.string().email().optional() }).safeParse(req.body); if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: "level required" } });
    const code = newInviteCode(); await db.query("insert into invites(code,household_id,level,member_id,expires_at) values($1,$2,$3,$4,now()+($5||' days')::interval)", [code, req.householdId, p.data.level, p.data.memberId, String(p.data.days)]); await audit(req, "invite.create");
    if (p.data.email) await mailer.send({ to: p.data.email, subject: "You are invited to OnePlate", text: `Create your account at ${cfg.PUBLIC_URL}/account.html and enter the invite code ${code}. It expires in ${p.data.days} days.` });
    return { code, expiresInDays: p.data.days };
  });
  app.post("/invites/:code/accept", { preHandler: requireUser }, async (req: any, reply) => {
    const inv = await db.query<{ household_id: string; level: Level; member_id: string | null }>("select household_id,level,member_id from invites where code=$1 and used_by is null and expires_at>now()", [req.params.code]);
    if (!inv.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "invite invalid or expired" } });
    const i = inv.rows[0]!; await db.query("insert into memberships(household_id,user_id,level,member_id) values($1,$2,$3,$4) on conflict (household_id,user_id) do update set level=excluded.level, member_id=excluded.member_id", [i.household_id, req.userId, i.level, i.member_id]); await db.query("update invites set used_by=$1 where code=$2", [req.userId, req.params.code]);
    req.householdId = i.household_id; await audit(req, "invite.accept"); return { householdId: i.household_id, level: i.level };
  });
  app.get("/households/:hid/members", { preHandler: withHousehold }, async (req: any) => (await db.query("select u.id,u.display_name,u.email,m.level,m.member_id from memberships m join users u on u.id=m.user_id where m.household_id=$1", [req.householdId])).rows);
  app.delete("/households/:hid", { preHandler: withHousehold }, async (req: any, reply) => { if (req.actor.level !== "owner") return reply.code(403).send({ error: { code: "FORBIDDEN", message: "owner only" } }); await audit(req, "household.delete"); await db.query("delete from households where id=$1", [req.householdId]); return { ok: true }; });
  app.get("/households/:hid/export", { preHandler: withHousehold }, async (req: any, reply) => { if (req.actor.level !== "owner") return reply.code(403).send({ error: { code: "FORBIDDEN", message: "owner only" } }); const docs = await db.query("select collection,doc_id,body,version,updated_at from documents where household_id=$1 order by collection,doc_id", [req.householdId]); await audit(req, "household.export"); return { exportedAt: new Date().toISOString(), documents: docs.rows }; });

  // ---- documents: the same contract the artifact database serves ----
  const COLL = /^[a-z][a-z0-9_-]{0,39}$/, DOC = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
  app.get("/households/:hid/docs/:collection", { preHandler: withHousehold }, async (req: any, reply) => {
    if (!COLL.test(req.params.collection)) return reply.code(400).send({ error: { code: "INVALID", message: "bad collection" } });
    const since = req.query.since ? new Date(String(req.query.since)) : null; const limit = Math.min(1000, Number(req.query.limit) || 500);
    const r = since && !isNaN(since.getTime()) ? await db.query("select doc_id,body,version,updated_at from documents where household_id=$1 and collection=$2 and updated_at>$3 order by updated_at limit $4", [req.householdId, req.params.collection, since, limit]) : await db.query("select doc_id,body,version,updated_at from documents where household_id=$1 and collection=$2 order by doc_id limit $3", [req.householdId, req.params.collection, limit]);
    return { docs: r.rows, serverTime: new Date().toISOString() };
  });
  app.get("/households/:hid/docs/:collection/:docId", { preHandler: withHousehold }, async (req: any, reply) => {
    const r = await db.query("select body,version,updated_at from documents where household_id=$1 and collection=$2 and doc_id=$3", [req.householdId, req.params.collection, req.params.docId]);
    if (!r.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "no such document" } }); return r.rows[0];
  });
  app.put("/households/:hid/docs/:collection/:docId", { preHandler: withHousehold }, async (req: any, reply) => {
    const { collection, docId } = req.params; if (!COLL.test(collection) || !DOC.test(docId)) return reply.code(400).send({ error: { code: "INVALID", message: "bad path" } });
    const p = z.object({ body: z.record(z.any()), ifVersion: z.number().int().optional() }).safeParse(req.body); if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: "body must be an object" } });
    if (JSON.stringify(p.data.body).length > 256 * 1024) return reply.code(413).send({ error: { code: "TOO_LARGE", message: "document over 256 KiB" } });
    if (collection === "family") { const err = validateFamilyDoc(p.data.body); if (err) return reply.code(422).send({ error: { code: "CHILD_RULE", message: err } }); }
    const c = await db.connect(); try {
      await c.query("begin"); const ex = await c.query<{ body: any; version: number }>("select body,version from documents where household_id=$1 and collection=$2 and doc_id=$3 for update", [req.householdId, collection, docId]); const existing = ex.rows[0];
      if (!canWrite(req.actor, collection, docId, p.data.body, existing?.body)) { await c.query("rollback"); return reply.code(403).send({ error: { code: "FORBIDDEN", message: "your access level cannot change this" } }); }
      if (existing && p.data.ifVersion !== undefined && p.data.ifVersion !== existing.version) { await c.query("rollback"); return reply.code(409).send({ error: { code: "CONFLICT", message: "document changed", currentVersion: existing.version, body: existing.body } }); }
      const v = existing ? existing.version + 1 : 1;
      await c.query("insert into documents(household_id,collection,doc_id,body,version,updated_by) values($1,$2,$3,$4,$5,$6) on conflict (household_id,collection,doc_id) do update set body=excluded.body, version=excluded.version, updated_by=excluded.updated_by, updated_at=now()", [req.householdId, collection, docId, p.data.body, v, req.userId]);
      await ChangeBus.publish(c, { hid: req.householdId, collection, doc_id: docId, version: v }); await c.query("commit"); await audit(req, "doc.write", { collection, doc_id: docId, version: v }); return { version: v };
    } catch (e) { await c.query("rollback"); throw e; } finally { c.release(); }
  });
  app.delete("/households/:hid/docs/:collection/:docId", { preHandler: withHousehold }, async (req: any, reply) => {
    const { collection, docId } = req.params; const ex = await db.query<{ body: any }>("select body from documents where household_id=$1 and collection=$2 and doc_id=$3", [req.householdId, collection, docId]);
    if (!ex.rowCount) return { ok: true }; if (!canWrite(req.actor, collection, docId, {}, ex.rows[0]!.body)) return reply.code(403).send({ error: { code: "FORBIDDEN", message: "your access level cannot delete this" } });
    await db.query("delete from documents where household_id=$1 and collection=$2 and doc_id=$3", [req.householdId, collection, docId]); await ChangeBus.publish(db, { hid: req.householdId, collection, doc_id: docId, version: 0, deleted: true }); await audit(req, "doc.delete", { collection, doc_id: docId }); return { ok: true };
  });
  app.get("/households/:hid/changes", { preHandler: withHousehold }, async (req: any) => { const since = new Date(String(req.query.since ?? 0)); const r = await db.query("select collection,doc_id,body,version,updated_at from documents where household_id=$1 and updated_at>$2 order by updated_at limit 1000", [req.householdId, isNaN(since.getTime()) ? new Date(0) : since]); return { docs: r.rows, serverTime: new Date().toISOString() }; });
  app.get("/households/:hid/events", { preHandler: withHousehold }, async (req: any, reply) => {
    reply.raw.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "x-accel-buffering": "no", "access-control-allow-origin": req.headers.origin ?? "*", "access-control-allow-credentials": "true" });
    reply.raw.write(`retry: 5000\nevent: hello\ndata: ${JSON.stringify({ serverTime: new Date().toISOString(), live: !!bus })}\n\n`);
    const send = (c: Change) => reply.raw.write(`event: change\ndata: ${JSON.stringify(c)}\n\n`);
    const unsub = bus ? bus.subscribe(req.householdId, send) : () => {};
    const beat = setInterval(() => reply.raw.write(": ping\n\n"), 25000);
    req.raw.on("close", () => { clearInterval(beat); unsub(); });
    await new Promise(() => {}); // held open until the client disconnects
  });
  app.setErrorHandler((err: any, _req, reply) => { app.log.error(err); reply.code((err as any).statusCode ?? 500).send({ error: { code: "INTERNAL", message: (err as any).statusCode ? err.message : "something went wrong" } }); });
  return app;
}
