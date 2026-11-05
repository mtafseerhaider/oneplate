/** Family members and portions. Children are never restricted: no calorie or target fields exist for a child. */
import { FOODS, foodOf, type Food, normItems, portion, type Meal } from "./foods.js";
export type Stage = "infant"|"toddler"|"child"|"teen"|"adult";
export interface AdultMember { id: string; name: string; rel: string; role: "adult"; sex: "male"|"female"; dob?: string; goal: "fat_loss"|"maintain"; status?: "none"|"pregnant"|"breastfeeding"; startWeight?: number; targetWeight?: number }
export interface ChildMember { id: string; name: string; rel: string; role: "child"; sex: "male"|"female"; dob?: string; goal: "growth" }
export type Member = AdultMember | ChildMember;

export function ageOf(dob: string | undefined, today = new Date()): { years: number; months: number } | null {
  if (!dob) return null; const b = new Date(dob + "T00:00:00"); if (isNaN(b.getTime()) || b > today) return null;
  let months = (today.getFullYear() - b.getFullYear()) * 12 + (today.getMonth() - b.getMonth()); if (today.getDate() < b.getDate()) months--;
  return { years: Math.floor(months / 12), months };
}
export function stageOf(m: Member, today = new Date()): Stage {
  if (m.role === "adult") return "adult"; const a = ageOf(m.dob, today); if (!a) return "child";
  if (a.months < 12) return "infant"; if (a.years < 3) return "toddler"; if (a.years < 13) return "child"; if (a.years < 18) return "teen"; return "adult";
}
/** Factor against the adult plate (Thuluth 14 §6): toddler ⅓, child ½ as a START, teen full, infant none. */
export function portionFactor(m: Member, today = new Date()): number {
  const s = stageOf(m, today); return s === "adult" || s === "teen" ? 1 : s === "child" ? 0.5 : s === "toddler" ? 0.34 : 0;
}
export const roundUpQ = (q: number) => Math.ceil(q * 4 - 1e-9) / 4;
export function memberPortions(meal: Pick<Meal,"items">, m: Member, today = new Date()): string[] {
  const f = portionFactor(m, today); if (!f) return []; return normItems(meal.items).map(it => portion(roundUpQ(it.q * f), foodOf(it)));
}
export function cookQuantities(meal: Pick<Meal,"items">, members: Member[], today = new Date()): string[] {
  const tot: Record<string, number> = {}, foods: Record<string, Food> = {}; for (const it of normItems(meal.items)) { tot[it.f] = 0; foods[it.f] = foodOf(it); }
  for (const m of members) { const f = portionFactor(m, today); if (!f) continue; for (const it of normItems(meal.items)) tot[it.f]! += roundUpQ(it.q * f); }
  return Object.keys(tot).map(k => portion(Math.ceil(tot[k]! * 2) / 2, foods[k]!));
}
/** Invariant used by the API: a child member may not carry weight-loss fields. */
export function assertChildUnrestricted(m: Member): void {
  if (m.role === "child" && ("targetWeight" in m || "startWeight" in m || (m as any).goal === "fat_loss")) throw new Error("children are never restricted");
}
