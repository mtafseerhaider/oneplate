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
