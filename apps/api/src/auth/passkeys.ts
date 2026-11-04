/** Passkey (WebAuthn) registration and sign-in on @simplewebauthn/server. Discoverable credentials, so sign-in needs no email first. */
import type { FastifyInstance } from "fastify";
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";
import type { Db } from "../db/pool.js";
import type { Config } from "../config.js";
export function rpFrom(cfg: Config) { const u = new URL(cfg.PUBLIC_URL); return { rpID: u.hostname, origin: u.origin, rpName: "OnePlate" }; }
export function registerPasskeyRoutes(app: FastifyInstance, cfg: Config, db: Db, helpers: { setSession: (reply: any, userId: string, ua?: string) => Promise<void>; audit: (req: any, action: string) => Promise<void> }) {
  const { rpID, origin, rpName } = rpFrom(cfg);
  const putChallenge = async (kind: "register"|"login", challenge: string, userId: string | null) => { const id = randomBytes(16).toString("base64url"); await db.query("insert into webauthn_challenges(id,user_id,challenge,kind,expires_at) values($1,$2,$3,$4,now()+interval '5 minutes')", [id, userId, challenge, kind]); return id; };
  const takeChallenge = async (id: string, kind: string) => { const r = await db.query<{ challenge: string; user_id: string | null }>("delete from webauthn_challenges where id=$1 and kind=$2 and expires_at>now() returning challenge,user_id", [id, kind]); return r.rows[0] ?? null; };
  app.post("/auth/passkey/register/options", async (req: any, reply) => {
    if (!req.userId) return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "sign in first" } });
    const u = await db.query<{ email: string; display_name: string }>("select email,display_name from users where id=$1", [req.userId]);
    const existing = await db.query<{ id: string; transports: string[] }>("select id,transports from passkeys where user_id=$1", [req.userId]);
    const options = await generateRegistrationOptions({ rpName, rpID, userName: u.rows[0]!.email, userDisplayName: u.rows[0]!.display_name, attestationType: "none", excludeCredentials: existing.rows.map(c => ({ id: c.id, transports: c.transports as any })), authenticatorSelection: { residentKey: "required", userVerification: "preferred" } });
    const challengeId = await putChallenge("register", options.challenge, req.userId); return { challengeId, options };
  });
  app.post("/auth/passkey/register/verify", async (req: any, reply) => {
    if (!req.userId) return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "sign in first" } });
    const { challengeId, response, label } = (req.body ?? {}) as any; const ch = challengeId ? await takeChallenge(String(challengeId), "register") : null;
    if (!ch || ch.user_id !== req.userId) return reply.code(400).send({ error: { code: "INVALID", message: "challenge expired; try again" } });
    try { const v = await verifyRegistrationResponse({ response, expectedChallenge: ch.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false });
      if (!v.verified || !v.registrationInfo) return reply.code(400).send({ error: { code: "NOT_VERIFIED", message: "passkey could not be verified" } });
      const { credential, credentialDeviceType, credentialBackedUp } = v.registrationInfo;
      await db.query("insert into passkeys(id,user_id,public_key,counter,transports,device_type,backed_up,label) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict (id) do nothing", [credential.id, req.userId, Buffer.from(credential.publicKey), credential.counter, credential.transports ?? [], credentialDeviceType, credentialBackedUp, (label && String(label).slice(0, 60)) || null]);
      await helpers.audit(req, "passkey.register"); return { ok: true, id: credential.id };
    } catch (e: any) { return reply.code(400).send({ error: { code: "NOT_VERIFIED", message: e.message } }); }
  });
  app.post("/auth/passkey/login/options", { config: { rateLimit: { max: 30, timeWindow: "15 minutes" } } }, async () => {
    const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" }); const challengeId = await putChallenge("login", options.challenge, null); return { challengeId, options };
  });
  app.post("/auth/passkey/login/verify", { config: { rateLimit: { max: 30, timeWindow: "15 minutes" } } }, async (req: any, reply) => {
    const { challengeId, response } = (req.body ?? {}) as any; const ch = challengeId ? await takeChallenge(String(challengeId), "login") : null;
    if (!ch || !response?.id) return reply.code(400).send({ error: { code: "INVALID", message: "challenge expired; try again" } });
    const pk = await db.query<{ id: string; user_id: string; public_key: Buffer; counter: string; transports: string[] }>("select id,user_id,public_key,counter,transports from passkeys where id=$1", [String(response.id)]);
    if (!pk.rowCount) return reply.code(400).send({ error: { code: "UNKNOWN_PASSKEY", message: "this passkey is not registered here" } });
    const k = pk.rows[0]!;
    try { const v = await verifyAuthenticationResponse({ response, expectedChallenge: ch.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false, credential: { id: k.id, publicKey: new Uint8Array(k.public_key), counter: Number(k.counter), transports: k.transports as any } });
      if (!v.verified) return reply.code(401).send({ error: { code: "NOT_VERIFIED", message: "passkey could not be verified" } });
      await db.query("update passkeys set counter=$1, last_used_at=now() where id=$2", [v.authenticationInfo.newCounter, k.id]);
      await helpers.setSession(reply, k.user_id, req.headers["user-agent"]); req.userId = k.user_id; await helpers.audit(req, "passkey.login"); return { id: k.user_id };
    } catch (e: any) { return reply.code(401).send({ error: { code: "NOT_VERIFIED", message: e.message } }); }
  });
  app.get("/auth/passkeys", async (req: any, reply) => { if (!req.userId) return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "sign in" } }); return (await db.query("select id,label,device_type,backed_up,created_at,last_used_at from passkeys where user_id=$1 order by created_at", [req.userId])).rows; });
  app.delete("/auth/passkeys/:id", async (req: any, reply) => { if (!req.userId) return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "sign in" } }); await db.query("delete from passkeys where id=$1 and user_id=$2", [req.params.id, req.userId]); await helpers.audit(req, "passkey.remove"); return { ok: true }; });
}
