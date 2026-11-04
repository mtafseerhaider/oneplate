/* Dev server: serves dist/ and proxies API paths to the API process. */
import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path"; import { fileURLToPath } from "node:url";
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist"); const API = process.env.API_URL ?? "http://localhost:3000"; const port = Number(process.env.PORT ?? 5173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml" };
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"); if (/^\/(auth|households|invites|health|ready|docs)/.test(u.pathname)) { const r = await fetch(API + u.pathname + u.search, { method: req.method, headers: { ...req.headers, host: new URL(API).host }, body: ["GET", "HEAD"].includes(req.method) ? undefined : req, duplex: "half" }); res.writeHead(r.status, Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "transfer-encoding"].includes(k)))); res.end(Buffer.from(await r.arrayBuffer())); return; }
  const f = path.join(dist, u.pathname === "/" ? "index.html" : u.pathname); try { const b = await readFile(f); res.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); res.end(b); } catch { res.writeHead(404); res.end("not found"); }
}).listen(port, () => console.log(`web on http://localhost:${port} → API ${API}`));
