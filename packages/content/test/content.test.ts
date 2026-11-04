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
  it("verse references are well-formed", () => { for (const v of C.VERSES) expect(v.r).toMatch(/^\d{1,3}:\d{1,3}(–\d{1,3})?$/); });
});
