/** What a household is here for. A family picks one or more goals when it joins; the app shows the tabs, habits, cards and reminders that serve them. */
export type Goal = "fatloss" | "fasting" | "ramadan" | "thuluth" | "learning" | "tarbiyah";
export type Tab = "today" | "plate" | "tarbiyah" | "family" | "train" | "progress" | "learn";
export type Habit = "water" | "palms" | "starter" | "train" | "walk" | "steps" | "closed";
export type Lead = "fast" | "ramadan" | "plate" | "learn" | "tarbiyah";
export type ReminderKind = "fastEnd" | "starter" | "weighin" | "circle" | "quran";
export interface GoalDef { id: Goal; title: string; blurb: string; tabs: Tab[]; habits: Habit[]; fast: boolean; weights: boolean; lead: Lead; reminders: ReminderKind[]; starterLabel?: string }
export const TAB_ORDER: Tab[] = ["today", "plate", "tarbiyah", "family", "train", "progress", "learn"];
export const GOALS: GoalDef[] = [
  { id: "fatloss", title: "Lose fat, keep muscle", blurb: "The original OnePlate: one plate a day inside a daily fast, hand portions, walks and cycling, strength once the first kilos are gone, weigh-ins and a projection to your target.", tabs: ["today", "plate", "family", "train", "progress", "learn"], habits: ["water", "palms", "starter", "train", "walk", "steps", "closed"], fast: true, weights: true, lead: "fast", reminders: ["fastEnd", "starter", "weighin", "circle", "quran"] },
  { id: "fasting", title: "Intermittent fasting", blurb: "A daily eating window kept well: the fast timer, a clean break of the fast, water, the walk, the kitchen closed on time. No weights unless you want them.", tabs: ["today", "plate", "family", "progress", "learn"], habits: ["water", "starter", "walk", "closed"], fast: true, weights: false, lead: "fast", reminders: ["fastEnd", "starter", "circle", "quran"], starterLabel: "Break the fast well" },
  { id: "ramadan", title: "Ramadan and Sunnah fasts", blurb: "Suhoor and iftar times for your city, the Ramadan card, Monday, Thursday and the white days through the year, and the plate that makes a fast easy to keep.", tabs: ["today", "plate", "family", "progress", "learn"], habits: ["water", "walk", "closed"], fast: true, weights: false, lead: "ramadan", reminders: ["fastEnd", "circle", "quran"] },
  { id: "thuluth", title: "Eat by the rule of thirds", blurb: "The Qanun al-Thuluth as a way of life: a third food, a third water, a third breath; one plate, protein first, the mindful twenty-minute dinner, the walk after. No fasting, no scales.", tabs: ["today", "plate", "family", "progress", "learn"], habits: ["water", "palms", "walk", "closed"], fast: false, weights: false, lead: "plate", reminders: ["circle", "quran"] },
  { id: "learning", title: "Daily learning", blurb: "The library: a verse, a word, a teaching, a story, a surah, an idea, a book, a dua, a poem and a question every day for every member, the whole Quran in a year with al-Mizan, and the family circle at night.", tabs: ["today", "family", "progress", "learn"], habits: [], fast: false, weights: false, lead: "learn", reminders: ["circle", "quran"] },
  { id: "tarbiyah", title: "Raising the children", blurb: "The sixteen-lecture tarbiyah course, one a week, with a practice, a line, a question for the couple and an activity for each child every day, every narration graded.", tabs: ["today", "tarbiyah", "family", "progress", "learn"], habits: [], fast: false, weights: false, lead: "tarbiyah", reminders: ["circle", "quran"] },
];
export const GOAL_IDS: Goal[] = GOALS.map(g => g.id);
export function isGoal(x: any): x is Goal { return GOAL_IDS.includes(x); }
export interface GoalConfig { goals: Goal[]; tabs: Tab[]; habits: Habit[]; fast: boolean; weights: boolean; lead: Lead; reminders: ReminderKind[]; starterLabel: string; title: string }
/** The union of the chosen goals, led by the first one chosen. An empty choice behaves like the original plan with everything on. */
export function goalConfig(goals: (string | undefined)[] | undefined): GoalConfig {
  const chosen = (goals ?? []).filter(isGoal); const defs = chosen.length ? chosen.map(id => GOALS.find(g => g.id === id)!) : GOALS.filter(g => ["fatloss", "learning", "tarbiyah"].includes(g.id));
  const union = <T>(pick: (g: GoalDef) => T[], order?: T[]): T[] => { const s = new Set<T>(); for (const g of defs) for (const x of pick(g)) s.add(x); const a = [...s]; return order ? order.filter(x => s.has(x)) : a; };
  const habitOrder: Habit[] = ["water", "palms", "starter", "train", "walk", "steps", "closed"]; const reminderOrder: ReminderKind[] = ["fastEnd", "starter", "weighin", "circle", "quran"];
  return { goals: chosen.length ? chosen : defs.map(g => g.id), tabs: union(g => g.tabs, TAB_ORDER), habits: union(g => g.habits, habitOrder), fast: defs.some(g => g.fast), weights: defs.some(g => g.weights), lead: defs[0]!.lead, reminders: union(g => g.reminders, reminderOrder), starterLabel: defs.find(g => g.habits.includes("starter"))?.starterLabel ?? "Protein starter at home", title: defs.length === 1 ? defs[0]!.title : defs.map(g => g.title.split(",")[0]).join(" · ") };
}
/** How many of the day's configured habits are done, and how many there are. */
export function habitsDone(d: any, habits: Habit[]): { done: number; total: number } {
  let done = 0; for (const h of habits) { if (h === "water") { if ((d?.water ?? 0) >= 4) done++; } else if (h === "palms") { if ((d?.palms ?? 0) >= 4) done++; } else if (d?.[h]) done++; }
  return { done, total: habits.length };
}
