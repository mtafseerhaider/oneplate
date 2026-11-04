/* End-to-end: the API serving the built web app, a family link opened by date of birth, a passkey set up through a virtual authenticator, and the app opening by itself afterwards.
   Needs TEST_DATABASE_URL and the built dist (pnpm --filter @oneplate/web build); skipped otherwise. */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path"; import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const TEST_DB = process.env.TEST_DATABASE_URL, DB = TEST_DB && TEST_DB.replace(/\/[^/?]+(\?|$)/, "/oneplate_e2e$1"), PORT = 3456, BASE = `http://localhost:${PORT}`;
const executablePath = process.env.ONEPLATE_CHROMIUM || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const enabled = !!DB && existsSync(path.join(root, "apps/web/dist/index.html")) && existsSync(path.join(root, "apps/api/dist/server.js"));
let api, browser;
before(async () => {
  if (!enabled) return;
  // Its own database, so it can run beside the API unit tests that reset oneplate_test.
  const { default: pg } = await import(path.join(root, "apps/api/node_modules/pg/lib/index.js")); const admin = new pg.Pool({ connectionString: TEST_DB }); const ex = await admin.query("select 1 from pg_database where datname='oneplate_e2e'"); if (!ex.rowCount) await admin.query("create database oneplate_e2e"); await admin.end();
  const pool = new pg.Pool({ connectionString: DB }); await pool.query("drop schema public cascade; create schema public"); await pool.end();
  api = spawn(process.execPath, ["apps/api/dist/server.js"], { cwd: root, env: { ...process.env, NODE_ENV: "test", PORT: String(PORT), DATABASE_URL: DB, PUBLIC_URL: BASE, WEB_DIST: path.join(root, "apps/web/dist"), LOG_LEVEL: "silent", SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret" }, stdio: "ignore" });
  for (let i = 0; i < 100; i++) { try { const r = await fetch(BASE + "/health"); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch({ executablePath });
});
after(async () => { await browser?.close(); api?.kill(); });
const attachAuthenticator = async (ctx, page) => { const cdp = await ctx.newCDPSession(page); await cdp.send("WebAuthn.enable"); await cdp.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } }); };
test("family link: date of birth, then a passkey, then it opens by itself", { skip: !enabled && "needs TEST_DATABASE_URL and built dist" }, async () => {
  // Tafseer creates the household and the family through the web app.
  const own = await browser.newContext({ viewport: { width: 402, height: 874 } }); const p = await own.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(BASE + "/account.html"); await p.click("#toggle"); await p.fill("#email", "tafseer@example.com"); await p.fill("#pw", "correct horse battery"); await p.fill("#name", "Tafseer"); await p.click("#go"); await p.waitForURL(BASE + "/"); await p.waitForTimeout(800);
  await p.evaluate(async () => { for (const m of [{ id: "tafseer", name: "Tafseer", rel: "me", role: "adult", sex: "male", goal: "fat_loss", dob: "1988-02-05" }, { id: "uzma", name: "Uzma", rel: "wife", role: "adult", sex: "female", goal: "maintain", dob: "1993-02-03" }, { id: "abbas", name: "Abbas", rel: "son", role: "child", sex: "male", goal: "growth", dob: "2019-02-09" }]) { S.family[m.id] = m; persistFamily(m.id); } await new Promise(r => setTimeout(r, 500)); tab = "progress"; render(); });
  await p.click('[data-a="acc_link"][data-m="uzma"]'); await p.waitForSelector("#linkUrl"); const link = await p.$eval("#linkUrl", e => e.value); assert.match(link, /\/account\.html\?open=[A-Za-z0-9_-]{32}$/);
  assert.equal(await p.$('[data-a="acc_link"][data-m="abbas"]'), null); // children get no link
  assert.deepEqual(errs, []); await own.close();
  // Uzma opens the link on her phone: wrong date, right date, passkey.
  const her = await browser.newContext({ viewport: { width: 402, height: 874 } }); const q = await her.newPage(); await attachAuthenticator(her, q);
  await q.goto(link); await q.waitForSelector("#dob"); assert.equal(await q.$eval("#email", e => e.parentElement.hidden), true);
  await q.fill("#dob", "1993-02-04"); await q.click("#go"); await q.waitForFunction(() => document.getElementById("err").textContent.length > 0); assert.match(await q.$eval("#err", e => e.textContent), /does not match/);
  await q.fill("#dob", "1993-02-03"); await q.click("#go"); await q.waitForSelector("#pkSetup:not([hidden])"); assert.match(await q.$eval("#hint", e => e.textContent), /Welcome, Uzma/);
  await q.click("#pkSetup"); await q.waitForURL(BASE + "/"); await q.waitForTimeout(1200);
  assert.match(await q.$eval("#syncChip", e => e.textContent), /Family editor/); assert.equal(await q.evaluate(() => isOwner), false); assert.equal(await q.evaluate(() => readOnly), false);
  // The same link again on the same device goes straight in; after signing out, the passkey signs her back in.
  await q.goto(link); await q.waitForURL(BASE + "/"); 
  await q.evaluate(() => fetch("/auth/logout", { method: "POST" })); await q.goto(BASE + "/account.html"); assert.match(await q.$eval("#hint", e => e.textContent), /Face ID or fingerprint/);
  await q.click("#pk"); await q.waitForURL(BASE + "/"); await q.waitForTimeout(800); assert.match(await q.$eval("#syncChip", e => e.textContent), /Family editor/);
  await her.close();
});
