/** Household change bus on Postgres LISTEN/NOTIFY, so several API instances share one stream. */
import pg from "pg";
export interface Change { hid: string; collection: string; doc_id: string; version: number; deleted?: boolean }
export class ChangeBus {
  private subs = new Map<string, Set<(c: Change) => void>>();
  private client: pg.Client | null = null;
  constructor(private url: string) {}
  async start(log: (m: string) => void = () => {}) {
    const c = new pg.Client({ connectionString: this.url }); await c.connect(); await c.query("listen oneplate_changes");
    c.on("notification", n => { if (!n.payload) return; try { const ch = JSON.parse(n.payload) as Change; for (const fn of this.subs.get(ch.hid) ?? []) fn(ch); } catch { /* ignore malformed */ } });
    c.on("error", e => log("change bus error: " + e.message)); this.client = c; log("change bus listening");
  }
  async stop() { await this.client?.end(); this.client = null; }
  subscribe(hid: string, fn: (c: Change) => void): () => void { if (!this.subs.has(hid)) this.subs.set(hid, new Set()); this.subs.get(hid)!.add(fn); return () => { this.subs.get(hid)?.delete(fn); }; }
  static async publish(db: pg.Pool | pg.PoolClient, ch: Change) { await db.query("select pg_notify('oneplate_changes', $1)", [JSON.stringify(ch)]); }
}
