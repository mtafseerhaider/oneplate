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
  MAIL_TRANSPORT: z.enum(["console", "memory"]).default("console"),
  PUBLIC_URL: z.string().default("http://localhost:5173")
});
export type Config = z.infer<typeof schema>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config { const c = schema.parse(env); if (c.NODE_ENV === "production" && c.SESSION_SECRET.startsWith("change-me")) throw new Error("SESSION_SECRET must be set in production"); return c; }
