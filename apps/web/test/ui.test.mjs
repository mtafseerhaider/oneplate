/* Component-level tests of the built app (app/index.html) in a real browser. Run: pnpm --filter @oneplate/web test */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import path from "node:path"; import os from "node:os"; import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { existsSync } from "node:fs";
// A pre-installed Chromium can be pointed at with ONEPLATE_CHROMIUM (the cloud sandbox ships one at /opt/pw-browsers/chromium); CI installs Playwright's own.
const executablePath = process.env.ONEPLATE_CHROMIUM || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
let browser, page, errs = [];
before(async () => {
  const body = await readFile(path.join(root, "app/index.html"), "utf8");
  const dir = await mkdtemp(path.join(os.tmpdir(), "oneplate-")); const file = path.join(dir, "index.html");
  await writeFile(file, '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + body + "</body></html>");
  browser = await chromium.launch({ executablePath }); const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, timezoneId: "Asia/Karachi" }); page = await ctx.newPage();
  page.on("pageerror", e => errs.push(e.message)); await page.goto("file://" + file); await page.waitForTimeout(500);
});
after(async () => { await browser?.close(); });
test("plate builder: every built-in meal computes and formats", async () => {
  const r = await page.evaluate(() => allMeals().map(m => ({ id: m.id, kcal: mealCalc(m).kcal, line: handLine(m) })));
  assert.equal(r.length, 17); for (const m of r) { assert.ok(m.kcal > 300 && m.kcal < 1200, m.id); assert.ok(m.line.includes("palm") || m.line.includes("egg") || m.line.includes("bowl"), m.id); }
});
test("meal editor: changing a quantity recalculates and saving persists", async () => {
  await page.evaluate(() => { tab = "plate"; render(); S._mopen = "karahi"; render(); });
  await page.click('details[data-mid="karahi"] [data-a="me_edit"]'); await page.fill('[data-me="qty"][data-i="0"]', "3"); await page.waitForTimeout(100);
  const live = await page.$eval("#mtot .mkey", e => e.textContent); assert.match(live, /1050 kcal/);
  await page.click('[data-a="me_save"]'); await page.waitForTimeout(100);
  const saved = await page.evaluate(() => mealCalc(allMeals().find(m => m.id === "karahi")).kcal); assert.equal(saved, 1050);
  await page.evaluate(() => { S._medit = draftFrom(allMeals().find(m => m.id === "karahi")); mealAction("me_reset", {}); });
  assert.equal(await page.evaluate(() => mealCalc(allMeals().find(m => m.id === "karahi")).kcal), 800);
});
test("family portions follow the children's rule", async () => {
  const r = await page.evaluate(() => { const m = allMeals().find(x => x.id === "pulao"); return members().map(p => memberPortions(m, p)[0]); });
  assert.equal(r[0], "2 palms chicken (leg or thigh)"); assert.equal(r[2], "1 palm chicken (leg or thigh)"); assert.equal(r[3], "1 palm chicken (leg or thigh)");
  const cook = await page.evaluate(() => cookQuantities(allMeals().find(x => x.id === "pulao"))[0]); assert.equal(cook, "6 palms chicken (leg or thigh)");
});
test("progress grid: states cycle and bulk update marks a range", async () => {
  await page.evaluate(() => { tab = "learn"; render(); });
  await page.click('.qc[data-i="3"]'); await page.click('.qc[data-i="3"]'); assert.equal(await page.evaluate(() => qState(3)), "revisit");
  await page.click("details[data-qbulk] summary"); await page.fill("#qb_from", "1"); await page.fill("#qb_to", "10"); await page.click('[data-a="qbulk"][data-s="read"]'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => qCount()), 10); assert.equal(await page.evaluate(() => qState(3)), "read");
});
test("quran course: whole Quran in 365 readings, old progress migrates by passage", async () => {
  const st = await page.evaluate(() => Object.assign(core.courseStats(QPLAN), { n: QPLAN_CURATED.length })); assert.equal(st.readings, 365); assert.equal(st.verses, 6236); assert.equal(st.curated, st.n);
  const m = await page.evaluate(() => { S.qprog = { done: { "0": "2026-10-01", "1": "2026-10-02" }, flag: { "1": true } }; S.qnotes = { "1": { i: "1", page: "55" } }; migrateCourse(false); const v2 = core.progressByKey(COURSE_V2_KEYS, { done: { "2": "2026-10-03" }, v: 2 }); if (v2.done["quran-2-6-29"] !== "2026-10-03") throw new Error("v2 migration"); return { v: S.qprog.v, d0: qState(0), d1: qState(QPLAN.findIndex(r => r.key === "quran-2-1-5")), note: S.qnotes["quran-2-1-5"] && S.qnotes["quran-2-1-5"].page, old: S.qnotes["1"] }; });
  assert.equal(m.v, 3); assert.equal(m.d0, "read"); assert.equal(m.d1, "revisit"); assert.equal(m.note, "55"); assert.equal(m.old, undefined);
  await page.evaluate(() => { tab = "learn"; render(); }); assert.equal(await page.$$eval(".qc", els => els.length), 365);
  await page.click("details:has(#qsurah) summary"); await page.selectOption("#qsurah", "114"); await page.waitForTimeout(100); assert.match(await page.$eval("details .tbl", e => e.textContent), /114:1–6/);
});
test("scholar review: a reviewer records a status and the badge shows it", async () => {
  await page.evaluate(() => { canReview = true; S.reviews = {}; tab = "learn"; render(); });
  const key = await page.evaluate(() => QPLAN[qIndex()].key); assert.match(await page.$eval(`[data-a="rvopen"][data-k="${key}"]`, e => e.parentElement.textContent), /Draft/);
  await page.click(`[data-a="rvopen"][data-k="${key}"]`); await page.selectOption("#rv_status", "verified"); await page.fill("#rv_by", "Tafseer"); await page.click(`[data-a="rvsave"][data-k="${key}"]`); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(k => (S.reviews[k] || {}).status, key), undefined); // refused without a source
  await page.fill("#rv_src", "WOFIS vol. 1, p. 20"); await page.click(`[data-a="rvsave"][data-k="${key}"]`); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(k => S.reviews[k].status, key), "verified"); assert.match(await page.$eval(`[data-a="rvopen"][data-k="${key}"]`, e => e.parentElement.textContent), /Verified · Tafseer/);
  const c = await page.evaluate(() => core.reviewCounts(allContentKeys(), REVIEWS_SHIPPED, S.reviews)); assert.equal(c.verified, 1);
  await page.evaluate(() => { canReview = false; render(); }); assert.equal(await page.$(`[data-a="rvopen"]`), null);
});
test("review queue lists drafts of a kind in course order and imports reviews", async () => {
  await page.evaluate(() => { canReview = true; S.reviews = {}; S._rq = null; tab = "learn"; render(); document.querySelector("details:has(#rq_kind) summary").click(); });
  const first = await page.$eval(".rqrow .t b", e => e.textContent); assert.match(first, /Al-Fatiha/); assert.equal(await page.$$eval(".rqrow", r => r.length), 40);
  await page.selectOption("#rq_kind", "story"); await page.waitForTimeout(100); assert.equal(await page.$$eval(".rqrow", r => r.length), 16);
  await page.click(".rqrow [data-a='rvopen']"); await page.selectOption(".rqrow #rv_status", "reviewed"); await page.fill(".rqrow #rv_by", "Uzma"); await page.click(".rqrow [data-a='rvsave']"); await page.waitForTimeout(100);
  assert.equal(await page.$$eval(".rqrow", r => r.length), 15); assert.equal(await page.evaluate(() => Object.values(S.reviews)[0].by), "Uzma");
  await page.click("[data-a='rvexport']"); await page.fill("#rv_json", JSON.stringify({ "quran-1-1-7": { status: "verified", by: "Tafseer", source: "WOFIS vol. 1 p. 20" }, "bad key": { status: "verified" }, "surah-2": { status: "nope" } }));
  await page.click("[data-a='rvimport']"); await page.waitForTimeout(150); assert.equal(await page.evaluate(() => Object.keys(S.reviews).length), 2); assert.equal(await page.evaluate(() => S.reviews["quran-1-1-7"].status), "verified");
  await page.evaluate(() => { canReview = false; S.reviews = {}; S._rvx = false; render(); });
});
test("urdu toggle flips direction without overflow", async () => {
  await page.click("#langBtn"); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.documentElement.dir), "rtl"); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 402);
  await page.click("#langBtn"); assert.equal(await page.evaluate(() => document.documentElement.dir), "ltr");
});
test("no script errors across all tabs", async () => {
  for (const v of ["today", "plate", "family", "train", "progress", "learn"]) await page.evaluate(x => { tab = x; render(); }, v);
  assert.deepEqual(errs, []);
});
