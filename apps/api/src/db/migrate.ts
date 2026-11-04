import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Db } from "./pool.js";
import { createPool } from "./pool.js";
import { loadConfig } from "../config.js";
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../migrations");
export async function migrate(db: Db, log: (m: string) => void = () => {}): Promise<string[]> {
  await db.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const files = (await readdir(dir)).filter(f => f.endsWith(".sql")).sort();
  const done = new Set((await db.query<{ name: string }>("select name from schema_migrations")).rows.map(r => r.name));
  const applied: string[] = [];
  for (const f of files) { if (done.has(f)) continue; const sql = await readFile(path.join(dir, f), "utf8"); const c = await db.connect(); try { await c.query("begin"); await c.query(sql); await c.query("insert into schema_migrations(name) values($1)", [f]); await c.query("commit"); applied.push(f); log(`applied ${f}`); } catch (e) { await c.query("rollback"); throw e; } finally { c.release(); } }
  return applied;
}
if (process.argv[1] && process.argv[1].endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js")) {
  const cfg = loadConfig(); const db = createPool(cfg.DATABASE_URL);
  migrate(db, m => console.log(m)).then(a => { console.log(a.length ? `${a.length} migration(s) applied` : "up to date"); return db.end(); }).catch(e => { console.error(e); process.exit(1); });
}
