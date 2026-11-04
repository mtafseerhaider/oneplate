/* OnePlate local adapter: exposes the same window.claude.use("db"|"user") surface the artifact runtime provides, backed by the OnePlate API.
   Reads come from an in-memory cache seeded from the API and refreshed by polling /changes; writes carry ifVersion for optimistic concurrency. */
(function(){
  const API = (window.ONEPLATE_API || "") + "";
  const state = { hid: null, admin: false, level: null, memberId: null, cache: {}, listeners: [], since: new Date(0).toISOString(), timer: null, es: null, live: false };
  const j = async (method, url, body) => { const r = await fetch(API + url, { method, credentials: "include", headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let d = {}; try { d = t ? JSON.parse(t) : {}; } catch {} if (!r.ok) { const e = new Error((d.error && d.error.message) || r.statusText); e.code = r.status === 401 ? "not_granted" : r.status === 403 ? "invalid_argument" : r.status === 409 ? "conflict" : "unavailable"; e.body = d; throw e; } return d; };
  const key = (c, id) => c + "/" + id;
  function snapOf(c, id) { const e = state.cache[key(c, id)]; return { id, exists: !!e, data: () => e ? e.body : undefined, metadata: { fromCache: false, hasPendingWrites: false } }; }
  function notify() { for (const l of state.listeners) { try { l(); } catch (e) { console.warn(e); } } }
  async function pull() { if (!state.hid) return; try { const r = await j("GET", `/households/${state.hid}/changes?since=${encodeURIComponent(state.since)}`); for (const d of r.docs) state.cache[key(d.collection, d.doc_id)] = { body: d.body, version: d.version }; state.since = r.serverTime; if (r.docs.length) notify(); } catch (e) { console.warn("sync", e.message); } }
  function connectEvents() { if (state.es || typeof EventSource === "undefined") return; try { const es = new EventSource(API + `/households/${state.hid}/events`, { withCredentials: true }); es.addEventListener("hello", () => { state.live = true; }); es.addEventListener("change", () => { pull(); }); es.onerror = () => { state.live = false; }; state.es = es; } catch (e) { state.live = false; } }
  async function ensureHousehold() { if (state.hid) return; const me = await j("GET", "/auth/me"); const h = me.households[0]; if (!h) throw Object.assign(new Error("no household"), { code: "not_granted" }); state.hid = h.id; state.admin = !!me.admin; state.level = h.level; state.memberId = h.member_id; await pull(); connectEvents(); if (!state.timer) state.timer = setInterval(() => { if (!state.live || document.hidden === false) pull(); }, state.live ? 60000 : 30000); document.addEventListener("visibilitychange", () => { if (!document.hidden) { pull(); connectEvents(); } }); }
  async function writeDoc(c, id, body) { const cur = state.cache[key(c, id)]; try { const r = await j("PUT", `/households/${state.hid}/docs/${c}/${id}`, { body, ifVersion: cur ? cur.version : undefined }); state.cache[key(c, id)] = { body, version: r.version }; notify(); } catch (e) { if (e.code === "conflict" && e.body && e.body.error) { state.cache[key(c, id)] = { body: e.body.error.body, version: e.body.error.currentVersion }; notify(); } throw e; } }
  function docRef(path) { const parts = path.split("/"); if (parts.length % 2) throw new TypeError("document path needs an even number of segments"); const c = parts.slice(0, -1).join("/"), id = parts[parts.length - 1];
    return { id, path, get: async () => { await ensureHousehold(); return snapOf(c, id); },
      set: async (body) => { await ensureHousehold(); await writeDoc(c, id, body); },
      update: async (patch) => { await ensureHousehold(); const cur = state.cache[key(c, id)]; if (!cur) throw Object.assign(new Error("missing"), { code: "invalid_argument" }); await writeDoc(c, id, Object.assign({}, cur.body, patch)); },
      delete: async () => { await ensureHousehold(); await j("DELETE", `/households/${state.hid}/docs/${c}/${id}`); delete state.cache[key(c, id)]; notify(); },
      onSnapshot: (next, error) => { let alive = true; const fire = () => { if (alive) next(snapOf(c, id)); }; ensureHousehold().then(fire).catch(e => error && error(e)); state.listeners.push(fire); return () => { alive = false; state.listeners = state.listeners.filter(x => x !== fire); }; },
      collection: (sub) => colRef(path + "/" + sub), acquire: async () => ({ acquired: true }) };
  }
  function colRef(path, q) { q = q || { where: [], order: null, limit: 1000 };
    const run = () => { let rows = Object.keys(state.cache).filter(k => k.startsWith(path + "/") && k.slice(path.length + 1).indexOf("/") < 0).map(k => ({ id: k.slice(path.length + 1), body: state.cache[k].body }));
      for (const [f, op, v] of q.where) rows = rows.filter(r => { const x = r.body[f]; return op === "==" ? x === v : op === "!=" ? x !== v : op === "<" ? x < v : op === "<=" ? x <= v : op === ">" ? x > v : op === ">=" ? x >= v : true; });
      if (q.order) rows.sort((a, b) => (a.body[q.order[0]] < b.body[q.order[0]] ? -1 : a.body[q.order[0]] > b.body[q.order[0]] ? 1 : 0) * (q.order[1] === "desc" ? -1 : 1)); else rows.sort((a, b) => a.id < b.id ? -1 : 1);
      rows = rows.slice(0, q.limit); const docs = rows.map(r => ({ id: r.id, exists: true, data: () => r.body, metadata: { fromCache: false, hasPendingWrites: false } }));
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => docs.map((d, i) => ({ type: "added", doc: d, oldIndex: -1, newIndex: i })), metadata: { fromCache: false, hasPendingWrites: false } }; };
    return { path, doc: (id) => docRef(path + "/" + (id || ("c_" + Date.now().toString(36)))), add: async (body) => { const r = docRef(path + "/c_" + Date.now().toString(36)); await r.set(body); return r; },
      where: (f, op, v) => colRef(path, { ...q, where: q.where.concat([[f, op, v]]) }), orderBy: (f, dir) => colRef(path, { ...q, order: [f, dir || "asc"] }), limit: (n) => colRef(path, { ...q, limit: n }),
      get: async () => { await ensureHousehold(); return run(); },
      onSnapshot: (next, error) => { let alive = true; const fire = () => { if (alive) next(run()); }; ensureHousehold().then(fire).catch(e => error && error(e)); state.listeners.push(fire); return () => { alive = false; state.listeners = state.listeners.filter(x => x !== fire); }; } };
  }
  const db = Object.freeze({ doc: docRef, collection: (p) => colRef(p) });
  const user = Object.freeze({ isOwner: async () => { await ensureHousehold(); return state.level === "owner"; }, canEdit: async () => { await ensureHousehold(); return state.level === "owner"; }, can: async (n) => { await ensureHousehold(); return n === "data.write" ? state.level !== "viewer" : state.level === "owner"; }, id: async () => { await ensureHousehold(); return state.memberId; }, me: async () => ({ id: state.memberId, name: "", isMe: true }) });
  window.oneplate = { api: API, householdId: () => state.hid, level: () => state.level, live: () => state.live, isAdmin: () => state.admin,
    reviews: () => ensureHousehold().then(() => j("GET", "/content/reviews")),
    setReview: (key, body) => j("PUT", "/admin/content/reviews/" + encodeURIComponent(key), body),
    invite: (level, memberId, email) => ensureHousehold().then(() => j("POST", `/households/${state.hid}/invites`, { level, memberId, email: email || undefined })),
    exportHousehold: () => ensureHousehold().then(() => j("GET", `/households/${state.hid}/export`)),
    deleteHousehold: () => ensureHousehold().then(() => j("DELETE", `/households/${state.hid}`)),
    signOut: () => j("POST", "/auth/logout").then(() => { location.href = "./account.html"; }),
    addPasskey: async () => { const PK = window.SimpleWebAuthnBrowser; if (!PK || !PK.browserSupportsWebAuthn()) throw new Error("This browser has no passkey support"); const o = await j("POST", "/auth/passkey/register/options"); const resp = await PK.startRegistration({ optionsJSON: o.options }); return j("POST", "/auth/passkey/register/verify", { challengeId: o.challengeId, response: resp, label: navigator.platform }); } };
  window.claude = { use: async (name) => { try { await ensureHousehold(); } catch (e) { if (e.code === "not_granted") { location.href = "./account.html"; return null; } return null; } return name === "db" ? db : name === "user" ? user : null; } };
})();
