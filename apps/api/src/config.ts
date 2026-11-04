import { z } from "zod";
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().default("postgres://oneplate:oneplate@localhost:5432/oneplate"),
  SESSION_SECRET: z.string().min(16).default("change-me-in-production-please-32"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  SESSION_DAYS: z.coerce.number().default(30),
  LOG_LEVEL: z.string().default("info"),
  MAIL_TRANSPORT: z.enum(["console", "memory", "smtp"]).default("console"),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default("OnePlate <no-reply@localhost>"),
  ADMIN_EMAILS: z.string().default(""),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().default(300),
  ERROR_WEBHOOK_URL: z.string().optional(),
  AUDIT_RETENTION_DAYS: z.coerce.number().default(365),
  MAX_HOUSEHOLDS_PER_USER: z.coerce.number().default(3),
  MAX_DOCS_PER_HOUSEHOLD: z.coerce.number().default(25000),
  PUBLIC_URL: z.string().default("http://localhost:5173"),
  WEB_DIST: z.string().optional()                         // when set, the API also serves the built web app from this directory (single-service deploys)
});
export type Config = z.infer<typeof schema>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Hosts such as Render give the public URL in their own variable; same-origin deploys need no separate CORS origin.
  const e: NodeJS.ProcessEnv = { ...env }; if (!e.PUBLIC_URL && e.RENDER_EXTERNAL_URL) e.PUBLIC_URL = e.RENDER_EXTERNAL_URL; if (!e.CORS_ORIGIN && e.PUBLIC_URL) e.CORS_ORIGIN = e.PUBLIC_URL;
  const c = schema.parse(e); if (c.NODE_ENV === "production" && c.SESSION_SECRET.startsWith("change-me")) throw new Error("SESSION_SECRET must be set in production"); return c; }
