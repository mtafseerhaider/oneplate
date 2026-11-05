import { describe, it, expect } from "vitest";
import * as C from "../src/index.js";
describe("content libraries", () => {
  it("have the expected sizes and complete fields", () => {
    expect(C.VERSES.length).toBe(35); expect(C.SURAHS.length).toBe(34); expect(C.STORIES.length).toBe(16); expect(C.TEACHINGS.length).toBe(22); expect(C.WORDS.length).toBe(30); expect(C.QPLAN.length).toBe(112); expect(C.MIZAN_EN.length).toBe(40); expect(C.SURAH_INDEX.length).toBe(114); expect(C.QURAN_VERSES).toBe(6236);
    for (const v of C.VERSES) expect(v.r && v.m && v.c && v.k && v.a && v.do).toBeTruthy();
    for (const t of C.TEACHINGS) expect(t.src && t.v).toBeTruthy();
    for (const q of C.QPLAN) expect(q.t >= q.f && q.mz.length > 40).toBe(true);
  });
  it("surah index is complete and consistent with the curated surahs", () => {
    for (const [i, s] of C.SURAH_INDEX.entries()) { expect(s.n).toBe(i + 1); expect(s.a && s.t && s.v > 0 && s.s.length > 20 && s.l && s.k && s.mz.includes("Al-Mizan")).toBeTruthy(); expect(["Meccan", "Medinan"]).toContain(s.p); }
    for (const s of C.SURAHS) { const x = C.SURAH_INDEX[s.n - 1]!; expect(x.a).toBe(s.a); expect(x.v).toBe(s.v); expect(x.s).toBe(s.s); }
    for (const q of C.QPLAN) expect(q.t).toBeLessThanOrEqual(C.SURAH_INDEX[q.s - 1]!.v);
    expect(Object.keys(C.REVIEW_GATES)).toEqual(["draft", "reviewed", "verified", "disputed"]);
  });
  it("every Learn item has a long-form companion, and no companion is orphaned", () => {
    const kinds: [string, any[]][] = [["story", C.STORIES], ["book", C.BOOKS], ["teaching", C.TEACHINGS], ["verse", C.VERSES], ["word", C.WORDS], ["idea", C.IDEAS], ["dua", C.DUAS], ["poem", C.POEMS]];
    for (const [kind, list] of kinds) {
      const keys = new Set(list.map(x => C.depthKey(kind, x))); expect(keys.size).toBe(list.length);
      for (const x of list) { const d = C.depthOf(kind, x); expect(d, `${kind}: ${C.depthKey(kind, x)}`).toBeTruthy(); expect(d!.sections.length).toBeGreaterThanOrEqual(3); for (const sec of d!.sections) expect(sec.h && ((sec.p && sec.p.length) || (sec.l && sec.l.length))).toBeTruthy(); expect(d!.kids && d!.kids.length).toBeTruthy(); }
      for (const k of Object.keys(C.DEPTH[kind]!)) expect(keys.has(k), `${kind} orphan: ${k}`).toBe(true);
    }
    const words = Object.values(C.DEPTH).flatMap(m => Object.values(m)).flatMap(d => d.sections.flatMap(s => [...(s.p ?? []), ...(s.l ?? [])])).join(" ").split(/\s+/).length; expect(words).toBeGreaterThan(30000);
  });
  it("tarbiyah index covers all sixteen lectures with every part the tab needs", () => {
    expect(C.TARBIYAH.length).toBe(16); expect(C.TARBIYAH_SERIES.parts).toBe(16); expect(C.TARBIYAH_NO_REPEAT.length).toBeGreaterThanOrEqual(15);
    for (const [i, l] of C.TARBIYAH.entries()) { expect(l.n).toBe(i + 1); expect(l.video).toMatch(/^[\w-]{11}$/); expect(l.minutes).toBeGreaterThan(20); expect(l.thesis.length).toBeGreaterThan(80); expect(l.topics.length).toBeGreaterThanOrEqual(6); expect(l.topics.filter(t => t.a != null).length).toBeGreaterThanOrEqual(5); expect(l.takeaways.length).toBe(10); expect(l.practices.length).toBeGreaterThanOrEqual(5); expect(l.questions.parent.length).toBe(3); expect(l.questions.spouse.length).toBe(3); expect(l.questions.family.length).toBe(3); expect(l.activities.abbas.length).toBeGreaterThanOrEqual(5); expect(l.activities.eliyya.length).toBeGreaterThanOrEqual(6); expect(l.nuggets.length).toBe(4); expect(l.corrections.length).toBeGreaterThanOrEqual(3); expect(l.principles.length).toBeGreaterThanOrEqual(3); expect(l.counts.narrations).toBeGreaterThanOrEqual(7); }
    expect(C.TARBIYAH_NO_REPEAT.some(r => /Tabuk/.test(r.claim) && r.parts.includes(13))).toBe(true);
  });
  it("verse references are well-formed", () => { for (const v of C.VERSES) expect(v.r).toMatch(/^\d{1,3}:\d{1,3}(–\d{1,3})?$/); });
});
