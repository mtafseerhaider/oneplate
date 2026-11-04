import { describe, it, expect } from "vitest";
import * as C from "../src/index.js";
describe("content libraries", () => {
  it("have the expected sizes and complete fields", () => {
    expect(C.VERSES.length).toBe(35); expect(C.SURAHS.length).toBe(34); expect(C.STORIES.length).toBe(16); expect(C.TEACHINGS.length).toBe(22); expect(C.WORDS.length).toBe(30); expect(C.QPLAN.length).toBe(67); expect(C.MIZAN_EN.length).toBe(40);
    for (const v of C.VERSES) expect(v.r && v.m && v.c && v.k && v.a && v.do).toBeTruthy();
    for (const t of C.TEACHINGS) expect(t.src && t.v).toBeTruthy();
    for (const q of C.QPLAN) expect(q.t >= q.f && q.mz.length > 40).toBe(true);
  });
  it("verse references are well-formed", () => { for (const v of C.VERSES) expect(v.r).toMatch(/^\d{1,3}:\d{1,3}(–\d{1,3})?$/); });
});
