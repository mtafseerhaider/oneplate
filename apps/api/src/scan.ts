/** Plate and kitchen scans through the Claude API. The prompt and the normaliser live in @oneplate/core so the artifact uses the same ones. */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "./config.js";
import type { Db } from "./db/pool.js";
import { scanPrompt, normalizeScan, type ScanMode, type ScanResult } from "@oneplate/core";

export type Scanner = (args: { mode: ScanMode; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: string; who: string }) => Promise<any>;
/** The default scanner: one Claude request with the image and the plan's instruction, asking for JSON. */
export function claudeScanner(cfg: Config): Scanner | null {
  if (!cfg.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: cfg.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 120_000 });
  return async ({ mode, mediaType, data, who }) => {
    const response = await client.messages.create({
      model: cfg.SCAN_MODEL, max_tokens: 8000, output_config: { effort: "medium" },
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data } }, { type: "text", text: scanPrompt(mode, who) }] }],
    });
    if (response.stop_reason === "refusal") throw Object.assign(new Error("the model declined to look at this photo"), { code: "REFUSED" });
    const text = response.content.filter(b => b.type === "text").map(b => (b as any).text).join("\n");
    return parseJsonLoose(text);
  };
}
/** The whole reply as JSON, else the body of one code fence, else the text from the first { to the last }. */
export function parseJsonLoose(text: string): any {
  const t = String(text || "").trim(); try { return JSON.parse(t); } catch { /* fall through */ }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (fence) { try { return JSON.parse(fence[1]!.trim()); } catch { /* fall through */ } }
  const a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* fall through */ } }
  throw Object.assign(new Error("the model's reply was not JSON"), { code: "BAD_REPLY" });
}
export function registerScanRoutes(app: FastifyInstance, cfg: Config, db: Db, deps: { withHousehold: any; audit: (req: any, action: string, extra?: any) => Promise<void>; scanner?: Scanner | null }) {
  const scanner = deps.scanner === undefined ? claudeScanner(cfg) : deps.scanner;
  app.get("/scan/status", async () => ({ available: !!scanner, model: scanner ? cfg.SCAN_MODEL : null }));
  const month = () => new Date().toISOString().slice(0, 7);
  const usage = async (hid: string) => { const q = await db.query<{ scan_quota: number }>("select scan_quota from households where id=$1", [hid]); const u = await db.query<{ n: number }>("select n from scan_usage where household_id=$1 and month=$2", [hid, month()]); const quota = q.rows[0]?.scan_quota ?? 0, used = u.rows[0]?.n ?? 0; return { quota, used, remaining: Math.max(0, quota - used) }; };
  app.get("/households/:hid/scan/status", { preHandler: deps.withHousehold }, async (req: any) => ({ available: !!scanner, model: scanner ? cfg.SCAN_MODEL : null, month: month(), ...(await usage(req.householdId)) }));
  app.post("/households/:hid/scan", { preHandler: deps.withHousehold, config: { rateLimit: { max: 40, timeWindow: "1 hour" } } }, async (req: any, reply) => {
    if (req.actor.level === "viewer") return reply.code(403).send({ error: { code: "FORBIDDEN", message: "viewers cannot scan" } });
    if (!scanner) return reply.code(503).send({ error: { code: "NO_SCAN_KEY", message: "scanning needs an Anthropic API key on the server (ANTHROPIC_API_KEY)" } });
    const u = await usage(req.householdId); if (u.remaining <= 0) return reply.code(429).send({ error: { code: "QUOTA", message: `this household's ${u.quota} scans for the month are used; the count resets on the 1st` } });
    const p = z.object({ mode: z.enum(["plate", "pantry"]).default("plate"), image: z.string().min(100).max(6_000_000), who: z.string().max(60).optional() }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: { code: "INVALID", message: "image (data URL or base64 JPEG) required" } });
    const m = p.data.image.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/s); const mediaType = (m ? m[1] : "image/jpeg") as any, data = m ? m[2]! : p.data.image;
    if (data.length > 4_200_000) return reply.code(413).send({ error: { code: "TOO_LARGE", message: "photo over 3 MB; the app resizes photos, so send it from the app" } });
    let raw: any; try { raw = await scanner({ mode: p.data.mode, mediaType, data, who: p.data.who || "an adult on the plan" }); }
    catch (e: any) {
      if (e instanceof Anthropic.RateLimitError) return reply.code(429).send({ error: { code: "UPSTREAM_BUSY", message: "the model is busy; try again in a minute" } });
      if (e instanceof Anthropic.AuthenticationError) return reply.code(503).send({ error: { code: "BAD_SCAN_KEY", message: "the server's Anthropic key was rejected" } });
      if (e?.code === "REFUSED" || e?.code === "BAD_REPLY") return reply.code(422).send({ error: { code: e.code, message: e.message } });
      if (e instanceof Anthropic.APIConnectionError) return reply.code(502).send({ error: { code: "UPSTREAM_DOWN", message: "could not reach the model" } });
      throw e;
    }
    const result: ScanResult = normalizeScan(p.data.mode, raw); await db.query("insert into scan_usage(household_id,month,n) values($1,$2,1) on conflict (household_id,month) do update set n=scan_usage.n+1", [req.householdId, month()]); await deps.audit(req, "scan", { doc_id: p.data.mode });
    return { ...result, usage: { ...u, used: u.used + 1, remaining: u.remaining - 1 } };
  });
}
