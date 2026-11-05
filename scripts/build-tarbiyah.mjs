/* Builds the Tarbiyah library from docs/tarbiyah: the sixteen lecture analyses of Shaykh Usama Abdulghani's series, with their audits.
   Writes:  packages/content/src/tarbiyah.ts            the index the app bundles (meta, thesis, outline, takeaways, daily pool, corrections)
            apps/web/public/tarbiyah/lecture-NN.json    every section of one lecture, fetched when opened
            apps/web/public/tarbiyah/lecture-NN.md      the full analysis
            apps/web/public/tarbiyah/corrections.md     the series corrections sheet
   Run: node scripts/build-tarbiyah.mjs            node scripts/build-tarbiyah.mjs --check   (fails if tarbiyah.ts is out of date) */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const src = path.join(root, "docs/tarbiyah"); const pub = path.join(root, "apps/web/public/tarbiyah");
const playlist = JSON.parse(await readFile(path.join(src, "transcripts/_playlist.json"), "utf8"));
const files = (await readdir(path.join(src, "lectures"))).filter(f => /^lecture-\d\d-.*\.md$/.test(f)).sort();

const secs = (n) => n * 60; const toSec = (ts) => { const p = ts.split(":").map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0); };
const strip = (s) => s.replace(/\*\*|__/g, "").replace(/(^|[^\w])[*_](?=\S)(.+?)(?<=\S)[*_](?=[^\w]|$)/g, "$1$2").replace(/`/g, "").replace(/\s+/g, " ").trim();
const cleanTitle = (s) => strip(s).replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "").replace(/\s*[←⭐✅⚠].*$/, "").trim();
/** Splits a markdown document into its 17 numbered top-level sections. */
function sections(md) { const out = {}; let cur = null; for (const line of md.split("\n")) { const m = line.match(/^# (\d+)\.\s*(.*)$/); if (m) { cur = Number(m[1]); out[cur] = { title: m[2].trim(), lines: [] }; continue; } if (cur) out[cur].lines.push(line); } return out; }
/** Splits a section's lines into blocks by a heading level. */
function split(lines, level) { const re = new RegExp(`^#{${level}} (.*)$`); const out = []; let cur = { h: "", lines: [] }; for (const l of lines) { const m = l.match(re); if (m) { if (cur.h || cur.lines.some(x => x.trim())) out.push(cur); cur = { h: m[1].trim(), lines: [] }; } else cur.lines.push(l); } if (cur.h || cur.lines.some(x => x.trim())) out.push(cur); return out; }
const bullets = (lines) => lines.filter(l => /^\s*[-*] /.test(l)).map(l => strip(l.replace(/^\s*[-*] /, "")));
const numbered = (lines) => lines.filter(l => /^\s*\d+\. /.test(l)).map(l => strip(l.replace(/^\s*\d+\. /, "")));
const boldNumbered = (lines) => lines.filter(l => /^\*\*\d+\.\s/.test(l)).map(l => strip(l.replace(/^\*\*\d+\.\s*/, "")));
const items = (lines) => { const a = bullets(lines).concat(numbered(lines)); return a.length ? a : boldNumbered(lines); };
const text = (lines) => lines.join("\n").trim();
const has = (h, ...words) => words.some(w => h.toLowerCase().includes(w));

async function build(file) {
  const md = await readFile(path.join(src, "lectures", file), "utf8"); const n = Number(file.slice(8, 10)); const v = playlist.videos.find(x => x.n === n);
  const title = cleanTitle(md.split("\n")[0]).replace(/^Lecture \d+\s*[—–-]\s*/, ""); const S = sections(md);
  // 1. thesis: the first paragraph after "Main thesis."
  const sum = text(S[1]?.lines ?? []); const thesisM = sum.match(/\*\*Main thesis\.\*\*\s*([\s\S]*?)(?:\n\n|$)/); const thesis = strip(thesisM ? thesisM[1] : sum.split("\n\n")[0] || "");
  const why = (() => { const m = sum.match(/\*\*Why it matters\.\*\*\s*([\s\S]*?)(?:\n\n|$)/); return m ? strip(m[1]) : ""; })();
  // 3. outline
  const topics = split(S[3]?.lines ?? [], 2).filter(b => b.h).map(b => { const m = b.h.match(/\[(\d{1,2}:\d{2})(?:[–-](\d{1,2}:\d{2}))?\]/); return { t: cleanTitle(b.h.replace(/^Topic\s*\d+\.\d+\s*[—–-]\s*/, "").replace(/\s*\[[^\]]*\]\s*$/, "")), a: m ? toSec(m[1]) : null, b: m && m[2] ? toSec(m[2]) : null, md: text(b.lines) }; });
  // 4. takeaways
  const takeaways = []; { const lines = S[4]?.lines ?? []; let cur = null; for (const l of lines) { const m = l.match(/^\*\*(\d+)\.\s*(.*?)\*\*\s*(.*)$/) || l.match(/^###\s*(\d+)\.\s*(.*)$/); if (m) { cur = { t: cleanTitle(m[2]), why: "", imp: "", extra: strip(m[3] || "") }; takeaways.push(cur); continue; } if (!cur) continue; const w = l.match(/^\*?\*?Why it matters[:.]\*?\*?\s*(.*)$/); const i = l.match(/^\*?\*?Parenting implication[:.]\*?\*?\s*(.*)$/); const sm = l.match(/^\*\*Summary\.\*\*\s*(.*)$/); if (w) cur.why = strip(w[1]); else if (i) cur.imp = strip(i[1]); else if (sm) cur.extra = strip(sm[1]); else if (l.trim() && !cur.why && !/^#/.test(l)) cur.why = strip(l); } }
  // 5. verses
  const vb2 = split(S[5]?.lines ?? [], 2).filter(b => b.h && /\d+:\d+/.test(b.h)); const verses = (vb2.length ? vb2 : split(S[5]?.lines ?? [], 3).filter(b => b.h && /^\d+:\d+/.test(b.h))).map(b => ({ ref: (b.h.match(/\d+:\d+(?:[–-]\d+)?/) || [""])[0], t: cleanTitle(b.h.replace(/^\d+:\d+(?:[–-]\d+)?\s*(?:\([^)]*\))?\s*[—–-]\s*/, "")), md: text(b.lines) }));
  // 6. narrations with confidence
  const narrations = split(S[6]?.lines ?? [], 3).filter(b => /^\d+\./.test(b.h)).map(b => { const body = text(b.lines); const c = body.match(/\*\*Confidence:?\*\*:?\s*\**([A-Za-z ]+?)\**[.\s]/) || body.match(/Confidence(?: rating)?:\s*\**([A-Za-z ]+?)\**[.\s]/); const conf = c ? c[1].trim().toLowerCase() : ""; return { t: cleanTitle(b.h), conf: conf.includes("strong") ? "strong" : conf.includes("moder") ? "moderate" : conf.includes("needs") || conf.includes("not") ? "weak" : "", flag: /⚠|❌/.test(b.h) ? "warn" : /✅/.test(b.h) ? "ok" : "", md: body }; });
  // 7. audit table
  const audit = (S[7]?.lines ?? []).filter(l => /^\|/.test(l) && !/^\|\s*-+/.test(l) && !/^\|\s*Claim/i.test(l)).map(l => l.split("|").slice(1, -1).map(c => strip(c))).filter(r => r.length >= 3).map(r => ({ claim: r[0], src: r[1], status: r[2], note: r[3] || "" }));
  const fair = split(S[7]?.lines ?? [], 2).find(b => has(b.h, "fairly"));
  // 8. actions
  const act = { daily: [], weekly: [], habits: [], mistakes: [], today: [], week: [], month: [] };
  for (const b of split(S[8]?.lines ?? [], 3).concat(split(S[8]?.lines ?? [], 2))) { const h = b.h.toLowerCase(); const its = items(b.lines); if (!its.length) continue; if (has(h, "daily")) act.daily.push(...its); else if (has(h, "weekly")) act.weekly.push(...its); else if (has(h, "habit")) act.habits.push(...its); else if (has(h, "mistake")) act.mistakes.push(...its); else if (has(h, "today")) act.today.push(...its); else if (has(h, "this week")) act.week.push(...its); else if (has(h, "month")) act.month.push(...its); }
  for (const k of Object.keys(act)) act[k] = [...new Set(act[k])];
  // 9. questions
  const q = { parent: [], spouse: [], family: [] };
  for (const b of split(S[9]?.lines ?? [], 2)) { const h = b.h.toLowerCase(); const items = numbered(b.lines).concat(bullets(b.lines)); if (has(h, "spouse")) q.spouse.push(...items); else if (has(h, "family", "together", "conversation")) q.family.push(...items); else if (has(h, "parent")) q.parent.push(...items); }
  // 10. activities
  const activities = { abbas: [], eliyya: [], rewards: [] };
  for (const b of split(S[10]?.lines ?? [], 2)) { const who = has(b.h.toLowerCase(), "abbas") ? "abbas" : has(b.h.toLowerCase(), "eliyya") ? "eliyya" : null; if (!who) continue; for (const a of split(b.lines, 3)) { if (has(a.h.toLowerCase(), "reward")) { activities.rewards.push(...bullets(a.lines)); continue; } if (!a.h.trim()) continue; const f = {}; for (const l of a.lines) { const m = l.match(/^\s*[-*]?\s*\*\*([^:*]+)[:.]\*\*\s*(.*)$/); if (m) f[m[1].trim().toLowerCase()] = strip(m[2]); } const firstPara = strip((a.lines.join("\n").split(/\n\s*\n/).map(x => x.trim()).find(x => x && !x.startsWith("#") && !x.startsWith("|")) || "")); activities[who].push({ t: cleanTitle(a.h.replace(/^(?:Activity\s*)?[AE]\d+(?:\.\d+)?[.:]?\s*[—–-]?\s*/, "")), kind: ((a.h.match(/\*\(([^)]*)\)\*/) || [])[1] || "").trim(), objective: f.objective || f.purpose || firstPara.slice(0, 240), materials: f.materials || "", steps: f.steps || f.how || "", lesson: f["islamic lesson"] || f.lesson || "", success: f["success indicators"] || f["success indicator"] || f["age-appropriate adaptation"] || f["age adaptation"] || f.adaptation || "", md: text(a.lines) }); } }
  // 14. memorisation: principles
  const memo = S[14]?.lines ?? []; const princ = (() => { const b = split(memo, 2).find(x => has(x.h.toLowerCase(), "principle")); return b ? items(b.lines).flatMap(x => x.split(/\s(?=\d{1,2}\.\s)/).map(y => y.replace(/^\d{1,2}\.\s*/, "").trim()).filter(Boolean)) : []; })();
  // 16. nuggets: blockquote lines with a timestamp
  const nuggets = []; { const lines = S[16]?.lines ?? []; for (let i = 0; i < lines.length; i++) { const l = lines[i];
      const bn = l.match(/^\*\*\d+\.\s*(.+?)\*\*.*?(?:\[(\d{1,2}:\d{2})\])?\s*$/); if (bn) { let j = i + 1; while (j < lines.length && !lines[j].trim()) j++; const qt = (lines[j] || "").match(/^>\s*(.+)$/); const tsm = (l + " " + (lines[j] || "")).match(/\[(\d{1,2}:\d{2})\]/); nuggets.push({ q: qt ? strip(qt[1]).replace(/^["“]|["”]$/g, "") : strip(bn[1]), ts: tsm ? toSec(tsm[1]) : null, note: qt ? strip(bn[1]) : "" }); continue; } const m = l.match(/^>\s*\*\*(.+?)\*\*\s*(?:[—–-]\s*\*?(.*?)\*?)?\s*(\[(\d{1,2}:\d{2})\])?\s*$/) || l.match(/^>\s*\*\*(.+?)\*\*.*\[(\d{1,2}:\d{2})\]/); if (!m) continue; const ts = (l.match(/\[(\d{1,2}:\d{2})\]/) || [])[1]; const next = lines[i + 1] || ""; const note = /^>\s*(?!\*\*)(.+)/.test(next) ? strip(next.replace(/^>\s*/, "")) : ""; nuggets.push({ q: strip(m[1]).replace(/^["“]|["”]$/g, ""), ts: ts ? toSec(ts) : null, note }); } }
  // corrections for this lecture: audit rows that failed, and the ⚠ list in 17
  const failed = audit.filter(r => /❌|⚠|not located|disputed|forged|fabricat|spliced|no chain|unverif|not a hadith|wrong/i.test(r.status + " " + r.note)).map(r => ({ claim: r.claim, status: r.status, note: r.note }));
  const minutes = v ? Math.round(toSec(v.duration) / 60) : null;
  const index = { n, slug: file.replace(/\.md$/, ""), title, video: v?.id ?? null, minutes, thesis, why: why.slice(0, 400), topics: topics.map(t => ({ t: t.t, a: t.a, b: t.b })), takeaways: takeaways.map(t => t.t), principles: princ, nuggets: nuggets.slice(0, 4), practices: act.daily.slice(0, 5), questions: { parent: q.parent.slice(0, 3), spouse: q.spouse.slice(0, 3), family: q.family.slice(0, 3) }, activities: { abbas: activities.abbas.map(a => a.t), eliyya: activities.eliyya.map(a => a.t) }, corrections: failed.slice(0, 6), counts: { verses: verses.length, narrations: narrations.length, audit: audit.length } };
  const full = { n, title, video: v?.id ?? null, duration: v?.duration ?? null, summary: sum, series: text(S[2]?.lines ?? []), topics, takeaways, verses, narrations, audit, fair: fair ? text(fair.lines) : "", actions: act, questions: q, activities, character: text(S[11]?.lines ?? []), framework: text(S[12]?.lines ?? []), mistakes: text(S[13]?.lines ?? []), memo: text(memo), journal: text(S[15]?.lines ?? []), nuggets, confidence: text(S[17]?.lines ?? []) };
  return { index, full, md };
}

const built = []; for (const f of files) built.push(await build(f));
const seriesMd = await readFile(path.join(src, "lectures/00-SERIES-CORRECTIONS.md"), "utf8");
// Series corrections: every row of the "do not repeat" table, with its part numbers.
const noRepeat = seriesMd.split("\n").filter(l => /^\|/.test(l) && !/^\|\s*-+/.test(l) && !/^\|\s*The claim/i.test(l)).map(l => l.split("|").slice(1, -1).map(c => strip(c))).filter(r => r.length >= 3).map(r => ({ claim: r[0], where: r[1], what: r[2], parts: [...r[1].matchAll(/Parts?\s*([\d,\s–—and-]+)/g)].flatMap(m => m[1].split(/[,\s–—-]+|and/).map(Number).filter(Boolean)) }));
const ts = `/** GENERATED by scripts/build-tarbiyah.mjs from docs/tarbiyah. Do not edit. */
export interface TarbiyahTopic { t: string; a: number | null; b: number | null }
export interface TarbiyahNugget { q: string; ts: number | null; note: string }
export interface TarbiyahLecture { n: number; slug: string; title: string; video: string | null; minutes: number | null; thesis: string; why: string; topics: TarbiyahTopic[]; takeaways: string[]; principles: string[]; nuggets: TarbiyahNugget[]; practices: string[]; questions: { parent: string[]; spouse: string[]; family: string[] }; activities: { abbas: string[]; eliyya: string[] }; corrections: { claim: string; status: string; note: string }[]; counts: { verses: number; narrations: number; audit: number } }
export const TARBIYAH_SERIES = ${JSON.stringify({ title: "Raising Our Children as God Intended: A Guide to Islamic Child Raising (Tarbiyah)", speaker: playlist.speaker, channel: playlist.channel, playlist: playlist.playlist, parts: playlist.videos.length, hours: Math.round(playlist.videos.reduce((a, x) => a + toSec(x.duration), 0) / 360) / 10, source: "Sixteen analysis documents written for Tafseer from the transcripts, each audited against al-Kafi (with al-Majlisi's and Behbudi's gradings), al-Mizan, Majma' al-Bayan, Nahj al-Balagha and the Sunni corpus. Every narration carries its grading; the speaker's book-learned citations are strong, his orally transmitted stories are where the failures cluster." })};
export const TARBIYAH_NO_REPEAT: { claim: string; where: string; what: string; parts: number[] }[] = ${JSON.stringify(noRepeat)};
export const TARBIYAH: TarbiyahLecture[] = ${JSON.stringify(built.map(b => b.index))};
`;
const tsPath = path.join(root, "packages/content/src/tarbiyah.ts");
if (process.argv.includes("--check")) { const cur = await readFile(tsPath, "utf8").catch(() => ""); if (cur !== ts) { console.error("packages/content/src/tarbiyah.ts is out of date: run node scripts/build-tarbiyah.mjs"); process.exit(1); } console.log("tarbiyah.ts matches docs/tarbiyah"); }
else { await writeFile(tsPath, ts); }
await mkdir(pub, { recursive: true });
for (const b of built) { const nn = String(b.index.n).padStart(2, "0"); await writeFile(path.join(pub, `lecture-${nn}.json`), JSON.stringify(b.full)); await writeFile(path.join(pub, `lecture-${nn}.md`), b.md); }
await writeFile(path.join(pub, "corrections.md"), seriesMd);
const kb = (s) => (s.length / 1024).toFixed(0);
console.log(`tarbiyah: ${built.length} lectures · index ${kb(ts)} KB · lecture files ${built.map(b => kb(JSON.stringify(b.full))).join("/")} KB · no-repeat rows ${noRepeat.length}`);
for (const b of built) { const i = b.index, f = b.full; console.log(`  ${i.n}: topics ${i.topics.length} takeaways ${i.takeaways.length} verses ${f.verses.length} narr ${f.narrations.length} audit ${f.audit.length} daily ${f.actions.daily.length} q ${f.questions.parent.length}/${f.questions.spouse.length}/${f.questions.family.length} act ${f.activities.abbas.length}/${f.activities.eliyya.length} princ ${i.principles.length} nug ${f.nuggets.length} corr ${i.corrections.length}${i.video ? "" : " NO VIDEO"}`); }
