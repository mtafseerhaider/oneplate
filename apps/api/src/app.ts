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
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { registerPasskeyRoutes } from "./auth/passkeys.js";
import { registerOpsRoutes, createErrorReporter } from "./ops.js";
import { registerIntegrationRoutes } from "./integrations.js";
import { registerScanRoutes, type Scanner } from "./scan.js";
import { memberIdFor, isGoal } from "@oneplate/core";

declare module "fastify" { interface FastifyRequest { userId?: string; actor?: Actor; householdId?: string; ownerMemberId?: string } }

export interface AppDeps { bus?: ChangeBus; mailer?: Mailer; scanner?: Scanner | null }
export async function buildApp(cfg: Config, db: Db, deps: AppDeps = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: cfg.LOG_LEVEL, ...(cfg.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : {}) }, trustProxy: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: cfg.CORS_ORIGIN.split(","), credentials: true });
  await app.register(cookie, { secret: cfg.SESSION_SECRET });
  await app.register(rateLimit, { max: cfg.RATE_LIMIT_PER_MINUTE, timeWindow: "1 minute" });
  await app.register(swagger, { openapi: { info: { title: "OnePlate API", version: "0.1.0" } } });
  await app.register(swaggerUi, { routePrefix: "/docs" });
  const COOKIE = "op_session";
  const mailer = deps.mailer ?? createMailer(cfg.MAIL_TRANSPORT, m => app.log.info(m), { smtpUrl: cfg.SMTP_URL, from: cfg.MAIL_FROM });
  const bus = deps.bus ?? null;
  app.decorate("mailer", mailer);
  const reporter = createErrorReporter(cfg.ERROR_WEBHOOK_URL, m => app.log.warn(m));
  registerOpsRoutes(app, cfg, db, () => !!bus);
  const audit = (req: any, action: string, extra: Partial<{ collection: string; doc_id: string; version: number }> = {}) => db.query("insert into audit_events(household_id,user_id,action,collection,doc_id,version,ip) values($1,$2,$3,$4,$5,$6,$7)", [req.householdId ?? null, req.userId ?? null, action, extra.collection ?? null, extra.doc_id ?? null, extra.version ?? null, req.ip]).catch(e => app.log.warn(e, "audit failed"));

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_req, reply) => { try { await db.query("select 1"); return { status: "ready" }; } catch { return reply.code(503).send({ status: "db unavailable" }); } });

  // ---- auth ----
  app.addHook("preHandler", async (req) => {
    const sid = req.cookies[COOKIE]; if (!sid) return;
    const r = await db.query<{ user_id: string }>("select user_id from sessions where id=$1 and expires_at>now()", [sid]); if (r.rowCount) req.userId = r.rows[0]!.user_id;
  });
  const setSession = async (reply: any, userId: string, ua?: string) => { const id = newSessionId(); const exp = new Date(Date.now() + cfg.SESSION_DAYS * 864e5); await db.query("insert into sessions(id,user_id,expires_at,user_agent) values($1,$2,$3,$4)", [id, userId, exp, ua ?? null]); reply.setCookie(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: cfg.COOKIE_SECURE, path: "/", expires: exp }); };
  const Creds = z.object({ email: z.string().email().max(200), password: z.string().min(8).max(200), displayName: z.string().min(1).max(60).optional(), code: z.string().max(80).optional(), householdName: z.string().max(80).optional(), goals: z.array(z.string()).max(6).optional() });
  /** The owner's family record and the household's settings, so a new household opens with its owner on the Family tab. */
  const seedHousehold = async (c: any, hid: string, userId: string, memberId: string, name: string, goals: string[] = []) => {
    await c.query("insert into documents(household_id,collection,doc_id,body,version,updated_by) values($1,'family',$2,$3,1,$4) on conflict do nothing", [hid, memberId, JSON.stringify({ id: memberId, name, rel: "me", role: "adult", sex: "male", goal: "fat_loss" }), userId]);
    await c.query("insert into documents(household_id,collection,doc_id,body,version,updated_by) values($1,'settings','main',$2,1,$3) on conflict do nothing", [hid, JSON.stringify({ ownerMember: memberId, goals: goals.filter(isGoal), startWeight: null, targetWeight: null, startDate: new Date().toISOString().slice(0, 10), fastHours: 21, unlockKg: 5, city: "karachi", hijriOffset: 0, ramadan: "auto", tradition: "sunni" }), userId]);
  };
  const createHousehold = async (userId: string, name: string, memberId: string, ownerName: string, goals: string[] = []): Promise<string> => {
    const c = await db.connect(); try { await c.query("begin"); const h = await c.query<{ id: string }>("insert into households(name,owner_user_id,scan_quota) values($1,$2,$3) returning id", [name, userId, cfg.SCAN_QUOTA_DEFAULT]); await c.query("insert into memberships(household_id,user_id,level,member_id) values($1,$2,'owner',$3)", [h.rows[0]!.id, userId, memberId]); await seedHousehold(c, h.rows[0]!.id, userId, memberId, ownerName, goals); await c.query("commit"); return h.rows[0]!.id; } catch (e) { await c.query("rollback"); throw e; } finally { c.release(); }
  };
  /** Registration is by invitation: a household invite from an admin opens a new household; a join invite from an owner adds the person to theirs. The very first account needs no invite. */
  app.post("/auth/register", { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, async (req, reply) => {
    const p = Creds.safeParse(req.body); if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: p.error.issues[0]?.message } });
    const email = p.data.email.toLowerCase(), name = p.data.displayName ?? email.split("@")[0]!;
    const exists = await db.query("select 1 from users where email=$1", [email]); if (exists.rowCount) return reply.code(409).send({ error: { code: "EXISTS", message: "email already registered" } });
    const first = (await db.query<{ n: number }>("select count(*)::int as n from users")).rows[0]!.n === 0; const code = (p.data.code ?? "").trim();
    let kind: "first" | "household" | "join" = "first"; let join: { household_id: string; level: Level; member_id: string | null } | null = null;
    if (!first) {
      if (!code) return reply.code(403).send({ error: { code: "INVITE_REQUIRED", message: "OnePlate is by invitation: ask the person who runs it for an invite code" } });
      const hi = await db.query("select code from household_invites where code=$1 and used_by is null and expires_at>now()", [code]);
      if (hi.rowCount) kind = "household";
      else { const inv = await db.query<{ household_id: string; level: Level; member_id: string | null }>("select household_id,level,member_id from invites where code=$1 and used_by is null and expires_at>now()", [code]); if (!inv.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "that invite code is not valid or has expired" } }); kind = "join"; join = inv.rows[0]!; }
    }
    const r = await db.query<{ id: string }>("insert into users(email,password_hash,display_name) values($1,$2,$3) returning id", [email, await hashPassword(p.data.password), name]); const userId = r.rows[0]!.id;
    let householdId: string | null = null, level: Level = "owner";
    if (kind === "join" && join) { await db.query("insert into memberships(household_id,user_id,level,member_id) values($1,$2,$3,$4)", [join.household_id, userId, join.level, join.member_id]); await db.query("update invites set used_by=$1 where code=$2", [userId, code]); householdId = join.household_id; level = join.level; }
    else { const memberId = memberIdFor(name.split(/\s+/)[0]!, []); householdId = await createHousehold(userId, p.data.householdName?.trim() || `${name.split(/\s+/)[0]}'s family`, memberId, name, p.data.goals ?? []); if (kind === "household") await db.query("update household_invites set used_by=$1, used_at=now() where code=$2", [userId, code]); }
    await setSession(reply, userId, req.headers["user-agent"]); req.userId = userId; req.householdId = householdId ?? undefined; await audit(req, "register", { doc_id: kind }); return { id: userId, householdId, level, kind };
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
  app.get("/invites/kind/:code", { config: { rateLimit: { max: 30, timeWindow: "15 minutes" } } }, async (req: any) => {
    const code = String(req.params.code); const hi = await db.query<{ note: string | null }>("select note from household_invites where code=$1 and used_by is null and expires_at>now()", [code]); if (hi.rowCount) return { kind: "household", note: hi.rows[0]!.note };
    const inv = await db.query<{ level: string; name: string }>("select i.level,h.name from invites i join households h on h.id=i.household_id where i.code=$1 and i.used_by is null and i.expires_at>now()", [code]); if (inv.rowCount) return { kind: "join", level: inv.rows[0]!.level, household: inv.rows[0]!.name };
    return { kind: "invalid" };
  });
  app.post("/auth/logout", async (req, reply) => { const sid = req.cookies[COOKIE]; if (sid) await db.query("delete from sessions where id=$1", [sid]); reply.clearCookie(COOKIE, { path: "/" }); return { ok: true }; });
  app.get("/auth/me", async (req, reply) => {
    if (!req.userId) return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "sign in" } });
    const u = await db.query("select id,email,display_name from users where id=$1", [req.userId]);
    const hh = await db.query("select h.id,h.name,m.level,m.member_id,(select o.member_id from memberships o where o.household_id=h.id and o.level='owner' limit 1) as owner_member_id,h.scan_quota from memberships m join households h on h.id=m.household_id where m.user_id=$1 order by h.created_at", [req.userId]);
    const admins = cfg.ADMIN_EMAILS.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    return { user: u.rows[0], households: hh.rows, admin: admins.includes(String((u.rows[0] as any)?.email ?? "").toLowerCase()) };
  });

  const requireUser = async (req: any, reply: any) => { if (!req.userId) { reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "sign in" } }); return reply; } };
  // ---- households ----
  app.post("/households", { preHandler: requireUser }, async (req: any, reply) => {
    const p = z.object({ name: z.string().min(1).max(80), memberId: z.string().min(1).max(40).optional() }).safeParse(req.body); if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: "name required" } });
    const owned = await db.query("select count(*)::int as n from households where owner_user_id=$1", [req.userId]); if (owned.rows[0]!.n >= cfg.MAX_HOUSEHOLDS_PER_USER) return reply.code(429).send({ error: { code: "LIMIT", message: `at most ${cfg.MAX_HOUSEHOLDS_PER_USER} household(s) per account` } });
    const u = await db.query<{ display_name: string }>("select display_name from users where id=$1", [req.userId]); const ownerName = u.rows[0]?.display_name || "Owner";
    const id = await createHousehold(req.userId, p.data.name, p.data.memberId || memberIdFor(ownerName.split(/\s+/)[0]!, []), ownerName);
    req.householdId = id; await audit(req, "household.create"); return { id };
  });
  const withHousehold = async (req: any, reply: any) => {
    if (!req.userId) return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "sign in" } });
    const hid = req.params.hid; const m = await db.query<{ level: Level; member_id: string | null }>("select level,member_id from memberships where household_id=$1 and user_id=$2", [hid, req.userId]);
    if (!m.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "no such household" } });
    req.householdId = hid; req.actor = { userId: req.userId, level: m.rows[0]!.level, memberId: m.rows[0]!.member_id };
    const o = await db.query<{ member_id: string | null }>("select member_id from memberships where household_id=$1 and level='owner' limit 1", [hid]); req.ownerMemberId = o.rows[0]?.member_id || "owner";
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

  // ---- family links: open by date of birth, then a passkey ----
  const linkUrl = (token: string) => `${cfg.PUBLIC_URL}/account.html?open=${token}`;
  app.post("/households/:hid/member-links", { preHandler: withHousehold }, async (req: any, reply) => {
    if (req.actor.level !== "owner") return reply.code(403).send({ error: { code: "FORBIDDEN", message: "owner only" } });
    const p = z.object({ memberId: z.string().min(1).max(40) }).safeParse(req.body); if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: "memberId required" } });
    const fam = await db.query<{ body: any }>("select body from documents where household_id=$1 and collection='family' and doc_id=$2", [req.householdId, p.data.memberId]);
    const dob = fam.rows[0]?.body?.dob; if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(String(dob))) return reply.code(422).send({ error: { code: "NO_DOB", message: "add this member's date of birth on the Family tab first" } });
    if (fam.rows[0]!.body.role === "child") return reply.code(422).send({ error: { code: "CHILD_RULE", message: "links are for adults; children are logged for by their parents" } });
    const level: Level = p.data.memberId === req.ownerMemberId ? "owner" : "contributor";
    const token = randomBytes(24).toString("base64url"), id = randomBytes(5).toString("base64url");
    await db.query("insert into member_links(id,token_hash,household_id,member_id,level,created_by) values($1,$2,$3,$4,$5,$6)", [id, createHash("sha256").update(token).digest("hex"), req.householdId, p.data.memberId, level, req.userId]);
    await audit(req, "member_link.create", { doc_id: p.data.memberId }); return { id, memberId: p.data.memberId, level, url: linkUrl(token) };
  });
  app.get("/households/:hid/member-links", { preHandler: withHousehold }, async (req: any, reply) => { if (req.actor.level !== "owner") return reply.code(403).send({ error: { code: "FORBIDDEN", message: "owner only" } }); return (await db.query("select id,member_id,level,created_at,last_used_at,uses,disabled from member_links where household_id=$1 order by created_at desc", [req.householdId])).rows; });
  app.delete("/households/:hid/member-links/:id", { preHandler: withHousehold }, async (req: any, reply) => { if (req.actor.level !== "owner") return reply.code(403).send({ error: { code: "FORBIDDEN", message: "owner only" } }); await db.query("update member_links set disabled=true where household_id=$1 and id=$2", [req.householdId, req.params.id]); await audit(req, "member_link.revoke", { doc_id: req.params.id }); return { ok: true }; });
  app.post("/open/:token", { config: { rateLimit: { max: 8, timeWindow: "15 minutes" } } }, async (req: any, reply) => {
    const p = z.object({ dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(req.body); if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: "date of birth required as YYYY-MM-DD" } });
    const h = createHash("sha256").update(String(req.params.token)).digest("hex");
    const l = await db.query<{ id: string; household_id: string; member_id: string; level: Level }>("select id,household_id,member_id,level from member_links where token_hash=$1 and disabled=false", [h]);
    if (!l.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "this link is not valid any more; ask for a new one" } });
    const link = l.rows[0]!; const fam = await db.query<{ body: any }>("select body from documents where household_id=$1 and collection='family' and doc_id=$2", [link.household_id, link.member_id]);
    if (!fam.rowCount || String(fam.rows[0]!.body.dob) !== p.data.dob) { await db.query("insert into audit_events(household_id,user_id,action,doc_id,ip) values($1,null,'member_link.denied',$2,$3)", [link.household_id, link.member_id, req.ip]).catch(() => {}); return reply.code(401).send({ error: { code: "DOB_MISMATCH", message: "that date of birth does not match" } }); }
    let m = await db.query<{ user_id: string }>("select user_id from memberships where household_id=$1 and member_id=$2 order by created_at limit 1", [link.household_id, link.member_id]); let userId: string;
    if (m.rowCount) userId = m.rows[0]!.user_id;
    else { const name = String(fam.rows[0]!.body.name || link.member_id); const email = `${link.member_id}.${link.household_id.slice(0, 8)}@members.oneplate.invalid`;
      const u = await db.query<{ id: string }>("insert into users(email,password_hash,display_name) values($1,$2,$3) on conflict (email) do update set updated_at=now() returning id", [email, await hashPassword(randomBytes(24).toString("base64url")), name]); userId = u.rows[0]!.id;
      await db.query("insert into memberships(household_id,user_id,level,member_id) values($1,$2,$3,$4) on conflict (household_id,user_id) do nothing", [link.household_id, userId, link.level, link.member_id]); }
    await db.query("update member_links set uses=uses+1, last_used_at=now() where id=$1", [link.id]); await setSession(reply, userId, req.headers["user-agent"]); req.userId = userId; req.householdId = link.household_id; await audit(req, "member_link.open", { doc_id: link.member_id });
    const pk = await db.query("select count(*)::int as n from passkeys where user_id=$1", [userId]);
    return { householdId: link.household_id, memberId: link.member_id, level: link.level, name: fam.rows[0]!.body.name, passkeys: pk.rows[0]!.n };
  });

  registerIntegrationRoutes(app, cfg, db, { audit: async (r, a, x) => { await audit(r, a, x); }, withHousehold, requireUser });
  registerScanRoutes(app, cfg, db, { withHousehold, audit: async (r, a, x) => { await audit(r, a, x); }, scanner: deps.scanner });

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
    const c = await db.connect(); let written = 0; try {
      await c.query("begin"); const ex = await c.query<{ body: any; version: number }>("select body,version from documents where household_id=$1 and collection=$2 and doc_id=$3 for update", [req.householdId, collection, docId]); const existing = ex.rows[0];
      if (!canWrite(req.actor, collection, docId, p.data.body, existing?.body, req.ownerMemberId)) { await c.query("rollback"); return reply.code(403).send({ error: { code: "FORBIDDEN", message: "your access level cannot change this" } }); }
      if (existing && p.data.ifVersion !== undefined && p.data.ifVersion !== existing.version) { await c.query("rollback"); return reply.code(409).send({ error: { code: "CONFLICT", message: "document changed", currentVersion: existing.version, body: existing.body } }); }
      if (!existing) { const n = await c.query("select count(*)::int as n from documents where household_id=$1", [req.householdId]); if (n.rows[0]!.n >= cfg.MAX_DOCS_PER_HOUSEHOLD) { await c.query("rollback"); return reply.code(429).send({ error: { code: "QUOTA", message: "this household has reached its document limit; delete old entries or export" } }); } }
      const v = existing ? existing.version + 1 : 1;
      await c.query("insert into documents(household_id,collection,doc_id,body,version,updated_by) values($1,$2,$3,$4,$5,$6) on conflict (household_id,collection,doc_id) do update set body=excluded.body, version=excluded.version, updated_by=excluded.updated_by, updated_at=now()", [req.householdId, collection, docId, p.data.body, v, req.userId]);
      await ChangeBus.publish(c, { hid: req.householdId, collection, doc_id: docId, version: v }); await c.query("commit"); written = v;
    } catch (e) { await c.query("rollback"); throw e; } finally { c.release(); }
    await audit(req, "doc.write", { collection, doc_id: docId, version: written }); return { version: written };
  });
  app.delete("/households/:hid/docs/:collection/:docId", { preHandler: withHousehold }, async (req: any, reply) => {
    const { collection, docId } = req.params; const ex = await db.query<{ body: any }>("select body from documents where household_id=$1 and collection=$2 and doc_id=$3", [req.householdId, collection, docId]);
    if (!ex.rowCount) return { ok: true }; if (!canWrite(req.actor, collection, docId, {}, ex.rows[0]!.body, req.ownerMemberId)) return reply.code(403).send({ error: { code: "FORBIDDEN", message: "your access level cannot delete this" } });
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
  if (cfg.WEB_DIST) { await app.register(fastifyStatic, { root: path.resolve(cfg.WEB_DIST), prefix: "/", wildcard: true, index: ["index.html"], decorateReply: false, cacheControl: true, maxAge: "1h" });
    // Pages, scripts and the service worker are revalidated on every open, so a deploy shows on the next launch; images and fonts keep the hour.
    app.addHook("onSend", async (req, reply) => { const u = req.url.split("?")[0] ?? ""; if (req.method === "GET" && (/\.(html|js|webmanifest)$/.test(u) || u.endsWith("/"))) reply.header("cache-control", "no-cache"); }); }
  app.setErrorHandler((err: any, req, reply) => { app.log.error(err); const status = (err as any).statusCode ?? 500; if (status >= 500) reporter.report({ message: err.message, stack: err.stack, requestId: req.id, route: req.routeOptions?.url, status }); reply.code(status).send({ error: { code: status >= 500 ? "INTERNAL" : "ERROR", message: status >= 500 ? "something went wrong" : err.message, requestId: req.id } }); });
  return app;
}
