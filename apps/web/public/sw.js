/* OnePlate service worker: app shell cached for offline start; API calls always go to the network. */
const CACHE = "oneplate-shell-v1";
const SHELL = ["./", "./index.html", "./account.html", "./oneplate-adapter.js", "./webauthn.js", "./manifest.webmanifest", "./icon.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => { const u = new URL(e.request.url); if (e.request.method !== "GET" || u.pathname.includes("/households/") || u.pathname.startsWith("/auth") || u.pathname.startsWith("/api")) return; e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { if (u.origin === location.origin && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; }).catch(() => caches.match("./index.html")))); });
