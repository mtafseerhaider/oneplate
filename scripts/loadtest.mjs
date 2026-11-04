/* Load test of the sync endpoints. Usage: node scripts/loadtest.mjs http://localhost:3000 [clients=20] [seconds=10]
   Registers one user and household, then runs `clients` loops of: PUT a day document, GET /changes. Reports throughput and latency percentiles. */
const base = process.argv[2] ?? "http://localhost:3000", clients = Number(process.argv[3] ?? 20), seconds = Number(process.argv[4] ?? 10);
const email = `load-${Date.now()}@example.com`;
const j = async (m, u, b, cookie) => { const r = await fetch(base + u, { method: m, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { r, d: await r.json().catch(() => ({})) }; };
const reg = await j("POST", "/auth/register", { email, password: "load-test-password" }); const cookie = String(reg.r.headers.get("set-cookie")).split(";")[0];
const hid = (await j("POST", "/households", { name: "load" }, cookie)).d.id;
const lat = []; let ok = 0, fail = 0; const end = Date.now() + seconds * 1000;
await Promise.all(Array.from({ length: clients }, async (_, i) => { let v; while (Date.now() < end) { const t0 = performance.now(); const w = await j("PUT", `/households/${hid}/docs/days/c${i}`, { body: { date: "2026-11-04", water: Math.random() }, ifVersion: v }, cookie); if (w.r.ok) { v = w.d.version; ok++; } else fail++; const g = await j("GET", `/households/${hid}/changes?since=${new Date(Date.now() - 60000).toISOString()}`, undefined, cookie); if (g.r.ok) ok++; else fail++; lat.push(performance.now() - t0); } }));
lat.sort((a, b) => a - b); const p = q => lat[Math.min(lat.length - 1, Math.floor(lat.length * q))].toFixed(1);
console.log(JSON.stringify({ clients, seconds, requests: ok + fail, ok, fail, rps: Math.round((ok + fail) / seconds), round_trip_ms: { p50: p(0.5), p95: p(0.95), p99: p(0.99), max: lat[lat.length - 1].toFixed(1) } }, null, 1));
await j("DELETE", `/households/${hid}`, undefined, cookie);
