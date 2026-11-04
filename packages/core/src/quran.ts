/** Quran course index and the English al-Mizan volume map (data lives in @oneplate/content). */
export type MizanRow = [number, [number, number, number, number], string];
export function qIndex(startDate: string, date: string, length: number): number { const a = new Date(startDate + "T00:00:00").getTime(), b = new Date(date + "T00:00:00").getTime(); const n = Math.floor((b - a) / 864e5); return ((n % length) + length) % length; }
export function qRound(startDate: string, date: string, length: number): number { const a = new Date(startDate + "T00:00:00").getTime(), b = new Date(date + "T00:00:00").getTime(); return Math.floor(Math.max(0, Math.floor((b - a) / 864e5)) / length) + 1; }
export interface MizanRef { vol: number; range: [number, number, number, number]; conf: string; ar: number; pub: string; url: string }
export function mizanVol(rows: MizanRow[], s: number, v: number): MizanRef | null {
  const key = s * 1000 + v;
  for (const [n, r, c] of rows) { const a = r[0] * 1000 + r[1], b = r[2] * 1000 + r[3]; if (key >= a && key <= b) return { vol: n, range: r, conf: c, ar: Math.ceil(n / 2), pub: n <= 13 ? "WOFIS, tr. S. S. A. Rizvi" : "Tawheed Institute Australia", url: n <= 13 ? `https://al-islam.org/al-mizan-exegesis-quran-volume-${n}-sayyid-muhammad-husayn-tabatabai` : "https://www.shiabooks.com.au/collections/quran/al-mizan" }; }
  return null;
}
export const quranComLink = (s: number, f: number, t: number) => `https://quran.com/${s}/${f === t ? f : `${f}-${t}`}`;

/* ---------- The whole-Quran course ---------- */
export interface SurahLike { n: number; a: string; t: string; v: number; p: string; mz: string; s: string; l: string; k: string }
export interface CuratedLike { s: number; f: number; t: number; n: string; sum: string; mz: string; q: string; k: string }
export interface Reading extends CuratedLike { cur: boolean; key: string; surah: string; portion: string }
/** Splits the Quran into `days` readings in canonical order. A reading never spans two surahs. Every curated passage is its own reading, with its close-reading notes;
 *  the rest of each surah is divided into readings of similar length that carry the surah's summary and al-Mizan purpose note. Deterministic: the longest segment is halved until the count is reached. */
export function buildCourse(surahs: SurahLike[], curated: CuratedLike[], days = 365): Reading[] {
  type Seg = { s: number; f: number; t: number; c?: CuratedLike };
  const segs: Seg[] = [];
  for (const su of surahs) {
    const cs = curated.filter(c => c.s === su.n).sort((a, b) => a.f - b.f); let pos = 1;
    for (const c of cs) { if (c.f < pos || c.t > su.v) throw new Error(`curated reading ${c.s}:${c.f}-${c.t} overlaps or exceeds the surah`); if (c.f > pos) segs.push({ s: su.n, f: pos, t: c.f - 1 }); segs.push({ s: su.n, f: c.f, t: c.t, c }); pos = c.t + 1; }
    if (pos <= su.v) segs.push({ s: su.n, f: pos, t: su.v });
  }
  if (segs.length > days) throw new Error(`cannot fit ${segs.length} segments into ${days} readings`);
  while (segs.length < days) {
    let bi = -1, bl = 1; for (let i = 0; i < segs.length; i++) { const g = segs[i]!; if (g.c) continue; const l = g.t - g.f + 1; if (l > bl) { bl = l; bi = i; } }
    if (bi < 0) break; const g = segs[bi]!; const mid = g.f + Math.ceil((g.t - g.f + 1) / 2) - 1; segs.splice(bi, 1, { s: g.s, f: g.f, t: mid }, { s: g.s, f: mid + 1, t: g.t });
  }
  const bySurah = new Map(surahs.map(s => [s.n, s]));
  return segs.map(g => {
    const su = bySurah.get(g.s)!; const portion = g.f === 1 && g.t === su.v ? "the whole surah" : `verses ${g.f}–${g.t} of ${su.v}`; const key = `quran-${g.s}-${g.f}-${g.t}`;
    if (g.c) return { ...g.c, cur: true, key, surah: su.a, portion };
    return { s: g.s, f: g.f, t: g.t, n: `${su.a}, ${portion}`, sum: su.s, mz: su.mz, q: su.l, k: su.k, cur: false, key, surah: su.a, portion };
  });
}
export function courseStats(course: Reading[]) { const verses = course.reduce((a, r) => a + r.t - r.f + 1, 0); const lens = course.map(r => r.t - r.f + 1).sort((a, b) => a - b); return { readings: course.length, verses, curated: course.filter(r => r.cur).length, surahs: new Set(course.map(r => r.s)).size, longest: lens[lens.length - 1] ?? 0, median: lens[Math.floor(lens.length / 2)] ?? 0 }; }
/** Progress is stored by reading key (quran-s-f-t), so the course can change without moving anyone's marks. Older versions stored it by index: v1 against the 67 curated readings, v2 against the first 365-reading course; this turns either into keys with the matching frozen key list. Nothing is dropped. */
export interface Progress { done: Record<string, string>; flag: Record<string, boolean>; v: number }
export function progressByKey(oldKeys: string[], prog: { done?: Record<string, string>; flag?: Record<string, boolean> }): Progress {
  const out: Progress = { done: {}, flag: {}, v: 3 };
  for (const [k, v] of Object.entries(prog.done ?? {})) { const key = /^\d+$/.test(k) ? oldKeys[Number(k)] : k; if (key) out.done[key] = v; }
  for (const [k, on] of Object.entries(prog.flag ?? {})) { const key = /^\d+$/.test(k) ? oldKeys[Number(k)] : k; if (key && on && out.done[key]) out.flag[key] = true; }
  return out;
}
/* ---------- Content keys and review status ---------- */
/** Stable id for a content item: readings and surahs by reference, everything else by a short hash of its text, so reordering a list never moves a review. */
export function contentKey(kind: string, item: any): string {
  if (kind === "quran") return `quran-${item.s}-${item.f}-${item.t}`;
  if (kind === "surah") return `surah-${item.n}`;
  const text = String(item.q ?? item.m ?? item.t ?? item.l ?? JSON.stringify(item)); let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return `${kind}-${h.toString(36)}`;
}
export type ReviewStatus = "draft" | "reviewed" | "verified" | "disputed";
export interface ReviewLike { status: ReviewStatus; by?: string; date?: string; source?: string; note?: string }
const ORDER: ReviewStatus[] = ["draft", "reviewed", "verified", "disputed"];
export function isReviewStatus(s: any): s is ReviewStatus { return ORDER.includes(s); }
/** Shipped reviews first, then the installation's own; a local "disputed" always wins over a shipped status. */
export function reviewOf(key: string, ...layers: (Record<string, ReviewLike> | undefined)[]): ReviewLike {
  let r: ReviewLike = { status: "draft" };
  for (const layer of layers) { const x = layer?.[key]; if (x && isReviewStatus(x.status)) r = x.status === "disputed" || r.status !== "disputed" ? x : r; }
  return r;
}
export function reviewCounts(keys: string[], ...layers: (Record<string, ReviewLike> | undefined)[]): Record<ReviewStatus, number> { const c: Record<ReviewStatus, number> = { draft: 0, reviewed: 0, verified: 0, disputed: 0 }; for (const k of keys) c[reviewOf(k, ...layers).status]++; return c; }
