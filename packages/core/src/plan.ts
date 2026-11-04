/** Training plan, phases and maintenance estimates. */
export interface CyclePhase { w: string; n: string; s: string; d: string; t: string }
export const CYCLE: CyclePhase[] = [
  { w: "1–3", n: "Beginner", s: "4 / week", d: "30 min steady at RPE 3–4", t: "120 min" },
  { w: "4–7", n: "Intermediate", s: "4 / week", d: "30 min at RPE 4–5; from wk 5 one ride includes 3 × 3 min at RPE 6", t: "120 min" },
  { w: "8–12", n: "Intervals", s: "4 / week", d: "3 steady 30-min rides + 1 interval ride (8 × 1 min hard / 2 min easy)", t: "120–130 min" },
  { w: "13+", n: "Maintenance", s: "4 / week", d: "30–40 min rides; one interval ride a week", t: "120–160 min" }
];
export const phaseFor = (week: number): CyclePhase => week <= 3 ? CYCLE[0]! : week <= 7 ? CYCLE[1]! : week <= 12 ? CYCLE[2]! : CYCLE[3]!;
export function weekNo(startDate: string, today: string): number { const a = new Date(startDate + "T00:00:00").getTime(), b = new Date(today + "T00:00:00").getTime(); return Math.max(1, Math.floor((b - a) / 864e5 / 7) + 1); }
export interface Session { t: string; d: string; k: "cycle"|"strength"|"easy"|"rest" }
/** Phase 0 (strength locked): fasting + walking + 4 × 30 min cycling. */
export const PLAN_LOCKED: Record<number, Session> = { 1: { t: "Cycle 30 min", d: "Steady ride at RPE 3–5, 7:30 PM after the starter.", k: "cycle" }, 2: { t: "Cycle 30 min", d: "Steady ride. From week 5 include 3 × 3 min at RPE 6.", k: "cycle" }, 3: { t: "Walk day", d: "30–40 min brisk walk in the evening, plus calf and hip stretching.", k: "easy" }, 4: { t: "Cycle 30 min", d: "Steady in weeks 1–7. From week 8: intervals.", k: "cycle" }, 5: { t: "Active recovery", d: "20–30 min easy walk or 15-min easy spin.", k: "easy" }, 6: { t: "Cycle 30 min + cheat meal", d: "Ride in the afternoon. Cheat meal 7 PM, 15-min walk after.", k: "cycle" }, 0: { t: "Recovery day", d: "45–60 min walk with family. No training. Light plate tonight.", k: "rest" } };
export const PLAN_FULL: Record<number, Session> = { 1: { t: "Strength A", d: "Box squat · RDL · push-ups · rows · calf raises · glute bridge · plank. 3 × 8–12.", k: "strength" }, 2: { t: "Cycle 30 min", d: "Steady ride at RPE 4–5.", k: "cycle" }, 3: { t: "Strength B", d: "Overhead press · step-ups · band pull-aparts · side plank · dead bug. 3 × 8–12.", k: "strength" }, 4: { t: "Cycle 30 min", d: "Steady, or intervals from week 8.", k: "cycle" }, 5: { t: "Cycle 30 min, easy", d: "Easy spin at RPE 3–4 plus stretching.", k: "easy" }, 6: { t: "Strength + cycle 30 + cheat meal", d: "Strength session, then an easy 30-min ride. Cheat meal 7 PM.", k: "strength" }, 0: { t: "Recovery day", d: "45–60 min walk with family. No training.", k: "rest" } };
export const strengthUnlocked = (startWeight: number, currentWeight: number, unlockKg = 5) => startWeight - currentWeight >= unlockKg;
export const sessionFor = (weekday: number, unlocked: boolean): Session => (unlocked ? PLAN_FULL : PLAN_LOCKED)[weekday]!;
/** Mifflin-St Jeor basal rate and sedentary / active maintenance (kcal/day). Adults only. */
export function maintenance(weightKg: number, heightCm: number, ageYears: number, sex: "male"|"female") {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + (sex === "male" ? 5 : -161);
  return { bmr: Math.round(bmr), sedentary: Math.round(bmr * 1.22), active: Math.round(bmr * 1.35) };
}
/** Weeks to target at a weekly rate, with the standard 7,700 kcal per kg of fat. */
export const weeksToTarget = (currentKg: number, targetKg: number, kgPerWeek: number) => kgPerWeek > 0 ? Math.ceil((currentKg - targetKg) / kgPerWeek) : Infinity;
