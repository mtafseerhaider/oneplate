/* Component-level tests of the built app (app/index.html) in a real browser. Run: pnpm --filter @oneplate/web test */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import path from "node:path"; import os from "node:os"; import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
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
test("the home screen names who is signed in", async () => {
  await page.evaluate(() => { S.family.tafseer = { id: "tafseer", name: "Tafseer", rel: "me", role: "adult", sex: "male", goal: "fat_loss", dob: "1988-02-05" }; isOwner = true; readOnly = false; tab = "today"; render(); });
  assert.match(await page.$eval(".hdr h1", e => e.textContent), /, Tafseer$/); assert.match(await page.$eval(".hdr p.small", e => e.textContent), /Signed in as Tafseer · owner/);
  await page.evaluate(() => { readOnly = true; isOwner = false; render(); }); assert.doesNotMatch(await page.$eval(".hdr h1", e => e.textContent), /,/);
  await page.evaluate(() => { readOnly = false; isOwner = true; render(); });
});
test("learn cards carry a long-form companion and copyable text", async () => {
  await page.evaluate(() => { tab = "learn"; render(); });
  const kinds = await page.$$eval("details[data-depth]", els => els.map(e => e.dataset.depth)); for (const k of ["story", "book", "teaching", "verse", "word", "idea", "dua", "poem"]) assert.ok(kinds.includes(k), k);
  await page.click('details[data-depth="story"] summary'); const heads = await page.$$eval('details[data-depth="story"] .depth p.eyebrow', els => els.map(e => e.textContent)); assert.ok(heads.includes("The story") && heads.includes("Al-Mizan's reading"), heads.join(","));
  const txt = await page.evaluate(() => shareTextFor("story", STORIES[0], false)); assert.match(txt, /^Story · Adam and the first mistake/); assert.ok(txt.length > 3000); assert.match(txt, /THE STORY[\s\S]*LESSONS[\s\S]*— OnePlate/);
  const kidTxt = await page.evaluate(() => shareTextFor("story", STORIES[0], true)); assert.ok(kidTxt.length < txt.length && kidTxt.includes("Iblis"));
  const reading = await page.evaluate(() => shareTextFor("reading", QPLAN[0], false)); assert.match(reading, /Quran reading · Al-Fatiha[\s\S]*quran\.com\/1\/1-7/);
  assert.ok((await page.$$('[data-a="copytext"]')).length >= 9);
  await page.evaluate(() => { S._lm = "abbas"; render(); }); assert.match(await page.$eval('details[data-depth="story"] summary', e => e.textContent), /for the children/); await page.evaluate(() => { S._lm = "tafseer"; render(); });
});
test("scan: a result renders in hand portions, adjusts, and saves as tonight's plate", async () => {
  await page.evaluate(() => { SCAN = { ok: true, why: "" }; tab = "plate"; render(); });
  assert.ok(await page.$('[data-a="scan_pick"][data-mode="plate"]')); assert.ok(await page.$('[data-a="scan_pick"][data-mode="pantry"]')); assert.ok(await page.$("#scanFile[accept='image/*']"));
  await page.evaluate(() => { S._scan = { mode: "plate", result: normalizeScan("plate", { name: "Karahi dinner", items: [{ food: "chk_karahi", qty: 1.5 }, { food: "roti", qty: 2 }, { food: null, name: "Pakoray", qty: 3, unit: "piece", kcal: 60, p: 2, c: 6, f: 3, cat: "carb" }], verdict: "Protein is good; two rotis is one too many.", suggestions: ["Keep one roti"], proteinFirst: true }) }; render(); });
  assert.match(await page.$eval(".scanplate .pill", e => e.textContent), /Carb-heavy/); assert.equal(await page.$$eval(".scanrow", r => r.length), 3); assert.match(await page.$eval(".scanplate", e => e.textContent), /Pakoray[\s\S]*estimated/);
  await page.click('[data-a="scan_qty"][data-pi="0"][data-i="1"][data-d="-0.25"]'); await page.click('[data-a="scan_qty"][data-pi="0"][data-i="1"][data-d="-0.25"]'); await page.click('[data-a="scan_qty"][data-pi="0"][data-i="1"][data-d="-0.25"]'); await page.click('[data-a="scan_qty"][data-pi="0"][data-i="1"][data-d="-0.25"]');
  assert.match(await page.$eval(".scanplate .pill", e => e.textContent), /No vegetables/); assert.equal(await page.evaluate(() => scanPlates()[0].items[1].q), 1);
  await page.click('[data-a="scan_save"][data-tonight="1"]'); await page.waitForTimeout(100);
  const saved = await page.evaluate(() => { const d = S.days[logDate()]; const m = S.meals[d.meal]; return { n: m.n, tag: m.tag, items: m.items, kcal: mealCalc(m).kcal, line: handLine(m), tonight: tonightMeal().id === d.meal, scanned: m.scanned }; });
  assert.equal(saved.n, "Karahi dinner"); assert.equal(saved.tag, "chicken"); assert.equal(saved.items.length, 3); assert.ok(saved.items[2].x && saved.items[2].x.n === "Pakoray"); assert.equal(saved.kcal, 675); assert.match(saved.line, /1 ½ palms chicken karahi · 1 roti/); assert.ok(saved.tonight && saved.scanned);
  const pantry = await page.evaluate(() => { S._scan = { mode: "pantry", result: normalizeScan("pantry", { ingredients: ["eggs", "palak", "atta"], plates: [{ name: "Palak anda", why: "cheap", missing: ["tomato"], items: [{ food: "egg", qty: 2 }, { food: "palak", qty: 2 }, { food: "roti", qty: 1 }] }, { name: "Egg bhurji", items: [{ food: "egg", qty: 3 }, { food: "salad", qty: 1 }] }] }) }; render(); return document.querySelectorAll(".scanplate").length; }); assert.equal(pantry, 2);
  assert.match(await page.$eval(".card.accent", e => e.textContent), /At home:[\s\S]*eggs, palak, atta[\s\S]*To buy:[\s\S]*tomato/);
  await page.evaluate(() => { S._scan = null; render(); });
});
test("tarbiyah: week card, library and a lecture's sections from the fetched file", async () => {
  await page.evaluate(() => { tab = "tarbiyah"; S._tl = null; render(); });
  assert.equal(await page.$$eval("#tabs button", b => b.length), 7); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 402);
  assert.equal(await page.$$eval(".tbrow", r => r.length), 16); assert.match(await page.$eval(".card.accent h2", e => e.textContent), /\S{3,}/); assert.ok(await page.$('[data-a="tb_done"][data-m="tafseer"]'));
  const file = JSON.parse(readFileSync(path.join(root, "apps/web/public/tarbiyah/lecture-02.json"), "utf8")); await page.evaluate(f => { TB_CACHE["02"] = f; }, file);
  await page.click('.tbrow[data-n="2"]'); await page.waitForTimeout(100); assert.match(await page.$eval(".hdr h1", e => e.textContent), /Founding Principles/);
  const secs = ["outline", "takeaways", "verses", "narrations", "actions", "questions", "activities", "memo", "nuggets", "corrections", "journal"]; for (const sct of secs) { await page.click(`[data-a="tb_sec"][data-s="${sct}"]`); const n = await page.$eval(".tbbody", e => e.textContent.trim().length); assert.ok(n > 200, sct + " " + n); }
  await page.click('[data-a="tb_sec"][data-s="outline"]'); assert.match(await page.$eval(".tboutline a", e => e.getAttribute("href")), /youtube\.com\/watch\?v=4UqbGXdlz10&t=\d+s/);
  await page.click('[data-a="tb_sec"][data-s="narrations"]'); assert.ok((await page.$$(".tbbody .pill")).length >= 10);
  await page.click('[data-a="tb_mark"][data-n="2"][data-m="tafseer"][data-k="w"]'); assert.equal(await page.evaluate(() => tbState(2, "tafseer").w), true); assert.ok(await page.evaluate(() => tbState(2, "tafseer").wAt));
  await page.click('[data-a="tb_sec"][data-s="journal"]'); await page.fill('textarea[data-tbnote="2"][data-m="tafseer"]', "Salaam first."); await page.$eval('textarea[data-tbnote="2"][data-m="tafseer"]', e => e.dispatchEvent(new Event("change", { bubbles: true }))); assert.equal(await page.evaluate(() => tbProg().notes["2"].tafseer), "Salaam first.");
  const html = await page.evaluate(() => md2html("# T\n\nA **bold** and *it* [12:30]\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n> q\n\n- x\n- y\n\n1. one")); assert.match(html, /<h2>T<\/h2>[\s\S]*<b>bold<\/b>[\s\S]*<i>it<\/i>[\s\S]*<table[\s\S]*<blockquote>[\s\S]*<ul>[\s\S]*<ol>/);
  await page.click('[data-a="tb_back"]'); await page.click('[data-a="tb_done"][data-m="tafseer"]'); assert.equal(await page.evaluate(() => !!S.days[logDate()].tarbiyah.tafseer), true);
  await page.evaluate(() => { S._tl = null; tab = "today"; render(); });
});
test("appearance cycles auto, light, dark and is remembered per device", async () => {
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), null);
  await page.click("#themeBtn"); assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), "light");
  await page.click("#themeBtn"); assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), "dark"); assert.equal(await page.evaluate(() => localStorage.getItem("oneplate.theme")), "dark");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor); assert.equal(bg, "rgb(15, 20, 18)");
  await page.click("#themeBtn"); assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), null);
  await page.evaluate(() => { tab = "progress"; render(); document.querySelector("details:has(#s_theme) summary").click(); }); await page.selectOption("#s_theme", "light"); await page.click("#sform button[type=submit], #sform .btn.primary"); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => localStorage.getItem("oneplate.theme")), "light"); await page.evaluate(() => setTheme("auto"));
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
