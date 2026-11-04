/** Daily habit scoring, streaks and the five-dimension whole-self score. */
export interface DayRecord { date: string; water?: number; palms?: number; starter?: boolean; train?: boolean; walk?: boolean; steps?: boolean; closed?: boolean; mood?: number; sleep?: number; grat?: string; soul?: boolean; quran?: boolean; circle?: boolean; learn?: Record<string, boolean>; journal?: Record<string, Record<string, string>>; meal?: string; fastH?: number }
export const HABIT_KEYS = ["starter", "train", "walk", "steps", "closed"] as const;
export function doneCount(d: DayRecord): number { let n = 0; for (const k of HABIT_KEYS) if (d[k]) n++; if ((d.water ?? 0) >= 4) n++; if ((d.palms ?? 0) >= 4) n++; return n; }
export function streak(days: Record<string, DayRecord>, todayStr: string): number {
  const t = new Date(todayStr + "T12:00:00"); const key = (x: Date) => x.toISOString().slice(0, 10); let n = 0;
  if (!days[key(t)]?.closed) t.setDate(t.getDate() - 1);
  for (let i = 0; i < 400; i++) { if (days[key(t)]?.closed) { n++; t.setDate(t.getDate() - 1); } else break; }
  return n;
}
export function wholeSelf(d: DayRecord, ownerId: string, quranReadToday: boolean) {
  const body = doneCount(d) >= 4, mind = !!d.learn?.[ownerId], heart = !!(d.mood && d.grat), soul = !!(d.soul || d.quran || quranReadToday), family = !!d.circle;
  return { body, mind, heart, soul, family, score: [body, mind, heart, soul, family].filter(Boolean).length };
}
