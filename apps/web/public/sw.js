/* OnePlate service worker. Pages, scripts and the manifest are fetched from the network first so a new deploy shows on the next open, and served from the cache only when offline.
   Other same-origin assets are served from the cache and refreshed in the background. API calls never touch the cache. The build stamps CACHE with a hash of the app, so every deploy is a new cache. */
const CACHE = "oneplate-shell-__BUILD__";
const SHELL = ["./", "./index.html", "./account.html", "./oneplate-adapter.js", "./webauthn.js", "./manifest.webmanifest", "./icon.svg", "./privacy.html", "./terms.html", "./status.html", "./admin.html"];
const API = ["/households/", "/auth", "/api", "/open/", "/ingest/", "/push", "/content", "/admin", "/invites"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url); const p = u.pathname;
  if (e.request.method !== "GET" || u.origin !== location.origin || API.some(x => p.startsWith(x)) || ["/status", "/metrics", "/health", "/ready", "/docs"].includes(p)) return;
  const shell = e.request.mode === "navigate" || /\.(html|js|webmanifest)$/.test(p) || p.endsWith("/");
  if (shell) { e.respondWith(fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" }).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))); return; }
  e.respondWith(caches.match(e.request).then(r => { const net = fetch(e.request).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; }).catch(() => r); return r || net; }));
});
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("push", e => { let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; } e.waitUntil(self.registration.showNotification(d.title || "OnePlate", { body: d.body || "", icon: "./icon.svg", badge: "./icon.svg", tag: d.kind || "oneplate", data: { url: d.url || "./" } })); });
self.addEventListener("notificationclick", e => { e.notification.close(); const url = new URL((e.notification.data && e.notification.data.url) || "./", self.location.href).href; e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => { for (const c of cs) { if (c.url.startsWith(self.registration.scope) && "focus" in c) return c.focus(); } return self.clients.openWindow(url); })); });
