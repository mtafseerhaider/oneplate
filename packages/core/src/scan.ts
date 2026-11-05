/** Plate and kitchen scans: the instruction Claude is given, and the normaliser that turns its JSON into OnePlate meal items.
 *  Shared by the self-hosted API (Anthropic SDK) and the artifact (the viewer's own Claude through the sample capability). */
import { FOODS, UNITS, mealCalc, normItems, foodOf, type Unit, type FoodCategory, type MealItem, type Macros } from "./foods.js";

export type ScanMode = "plate" | "pantry";
export interface ScanItem { food: string | null; name: string; qty: number; unit: string; kcal?: number; p?: number; c?: number; f?: number; cat?: string; confidence?: number }
export interface ScanRaw { name?: string; items?: ScanItem[]; verdict?: string; suggestions?: string[]; thirds?: string; proteinFirst?: boolean; ingredients?: string[]; plates?: { name: string; items: ScanItem[]; why?: string; missing?: string[] }[]; budgetNote?: string; notFood?: boolean }
export interface ScanPlate { name: string; items: MealItem[]; macros: Macros; shares: Record<FoodCategory, number>; thirds: "ok" | "heavy-carb" | "low-veg" | "low-protein" | "empty"; why?: string; missing: string[] }
export interface ScanResult { mode: ScanMode; notFood: boolean; plate?: ScanPlate; verdict: string; suggestions: string[]; proteinFirst: boolean; ingredients: string[]; plates: ScanPlate[]; budgetNote: string; unknown: string[] }

const UNIT_LIST = Object.keys(UNITS) as Unit[];
const CATS: FoodCategory[] = ["protein", "veg", "carb", "fat", "plus"];

/** The catalog as Claude sees it: id, name, unit, per-unit macros. Stable text, so a provider that caches prefixes can. */
export function scanCatalog(): string {
  return Object.entries(FOODS).map(([id, f]) => `${id} | ${f.n} | per ${f.u} | ${f.kcal} kcal, P${f.p} C${f.c} F${f.f} | ${f.cat}`).join("\n");
}
export const SCAN_IDEOLOGY = `OnePlate is a Pakistani family's home-cooking plan: one plate, no refill; protein first; the plate divided by the hand: about 2 palms of protein, 2 fists of vegetables or salad, 1 cupped hand of rice OR 1 roti (never both), 1 thumb of oil or ghee; daal, raita and yogurt count as "plus"; the Prophet's rule of thirds (a third food, a third water, a third empty). Adults on the plan eat this; children are never restricted and get the same food in child portions. Cooking is Pakistani home cooking: karahi, haandi, daal, sabzi, roti, rice, salad, raita.`;

/** The instruction for a plate photo: identify what is on the plate in hand portions, matched to the catalog where possible. */
export function scanPrompt(mode: ScanMode, who = "an adult on the plan"): string {
  const common = `${SCAN_IDEOLOGY}

FOOD CATALOG (use these ids when a food matches; "per <unit>" is the hand portion the plan counts in):
${scanCatalog()}

Units you may use: ${UNIT_LIST.join(", ")}. A palm = a palm-sized, finger-thick piece of cooked meat (~85–100 g). A fist = a fist of vegetables or salad. A cupped hand = one cupped hand of cooked rice (~75 g). A thumb = a thumb-sized amount of oil, ghee, cream or chutney. A bowl = a small katori (~150 ml). Estimate quantities in quarter units (0.25, 0.5, 0.75, 1, 1.5, 2 ...) from what is visible; when unsure, estimate slightly high rather than low.`;
  if (mode === "pantry") return `${common}

TASK: The photo shows food available at home (a fridge, a shelf, a counter, raw ingredients or leftovers), photographed by ${who}. First list the ingredients you can see. Then propose up to three plates that can be cooked tonight from what is visible, each true to the plan above (protein first, vegetables, one carb, measured fat), favouring what is already there over shopping; name at most two cheap missing items per plate if something essential is absent. Reply with ONLY this JSON:
{"ingredients":["..."],"plates":[{"name":"short plate name","why":"one sentence on why it fits the plan and the budget","missing":["..."],"items":[{"food":"catalog id or null","name":"what it is","qty":1,"unit":"palm","kcal":0,"p":0,"c":0,"f":0,"cat":"protein|veg|carb|fat|plus"}]}],"budgetNote":"one sentence on using what is at home","notFood":false}
Give kcal, p, c and f per ONE unit for every item (copy them from the catalog when food is a catalog id). If the photo shows no food, reply {"notFood":true,"ingredients":[],"plates":[],"budgetNote":""}.`;
  return `${common}

TASK: The photo shows a plate or a meal photographed by ${who}. Identify each food on it and estimate its quantity in the plan's hand portions. Match to a catalog id when the food is the same or close (a chicken curry is chk_curry; dahi is yogurt; a chapati is roti); otherwise set food to null and give your own per-unit estimate with the most natural unit. Then judge the plate against the plan: is protein present and enough, are there vegetables, is there one carb or two, how much fat. Be concrete and kind; Uzma cooks from what is at home. Reply with ONLY this JSON:
{"name":"short name for this plate","items":[{"food":"catalog id or null","name":"what it is","qty":1,"unit":"palm","kcal":0,"p":0,"c":0,"f":0,"cat":"protein|veg|carb|fat|plus","confidence":0.9}],"verdict":"two sentences on how this plate fits the plan","suggestions":["up to three short, specific changes using food likely at home"],"proteinFirst":true,"notFood":false}
Give kcal, p, c and f per ONE unit for every item (copy them from the catalog when food is a catalog id). Do not include water. If the photo shows no food, reply {"notFood":true,"items":[],"verdict":"","suggestions":[]}.`;
}

const num = (v: any, d = 0) => { const n = Number(v); return isFinite(n) ? n : d; };
const roundQ = (q: number) => Math.max(0.25, Math.round(q * 4) / 4);
function toItem(raw: ScanItem, unknown: string[]): MealItem | null {
  if (!raw || typeof raw !== "object") return null; const q = roundQ(num(raw.qty, 1));
  const id = raw.food && FOODS[raw.food] ? raw.food : null;
  if (id) return { f: id, q };
  const name = String(raw.name || "").trim().slice(0, 60); if (!name) return null;
  const unit = (UNIT_LIST.includes(raw.unit as Unit) ? raw.unit : "piece") as Unit; const cat = (CATS.includes(raw.cat as FoodCategory) ? raw.cat : "plus") as FoodCategory;
  const kcal = Math.max(0, Math.round(num(raw.kcal))); const p = Math.max(0, Math.round(num(raw.p))), c = Math.max(0, Math.round(num(raw.c))), f = Math.max(0, Math.round(num(raw.f)));
  if (!kcal && !p && !c && !f) { unknown.push(name); return null; }
  unknown.push(name);
  return { f: "x_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30), q, x: { n: name, u: unit, cat, kcal, p, c, f } };
}
/** Share of calories by category, and the plan's one-word judgement of the plate's shape. */
export function plateShape(items: MealItem[]): { shares: Record<FoodCategory, number>; thirds: ScanPlate["thirds"] } {
  const shares: Record<FoodCategory, number> = { protein: 0, veg: 0, carb: 0, fat: 0, plus: 0 }; let total = 0;
  const counts: Record<FoodCategory, number> = { protein: 0, veg: 0, carb: 0, fat: 0, plus: 0 };
  const CARB_UNITS = ["hand", "roti", "naan", "slice"];
  for (const it of normItems(items)) { const fd = foodOf(it); const k = fd.kcal * it.q; shares[fd.cat] += k; total += k; if (fd.cat !== "carb" || CARB_UNITS.includes(fd.u)) counts[fd.cat] += it.q; }
  if (!total) return { shares, thirds: "empty" };
  for (const c of CATS) shares[c] = Math.round(shares[c] / total * 100) / 100;
  const thirds: ScanPlate["thirds"] = counts.carb > 1.25 || shares.carb > 0.5 ? "heavy-carb" : counts.protein + counts.plus * 0.5 < 1 ? "low-protein" : counts.veg < 1 ? "low-veg" : "ok";
  return { shares, thirds };
}
function toPlate(name: string, rawItems: ScanItem[] | undefined, unknown: string[], why?: string, missing?: string[]): ScanPlate {
  const items = (Array.isArray(rawItems) ? rawItems : []).map(r => toItem(r, unknown)).filter((x): x is MealItem => !!x);
  const { shares, thirds } = plateShape(items);
  return { name: String(name || "Scanned plate").slice(0, 60), items, macros: mealCalc({ items }), shares, thirds, why: why ? String(why).slice(0, 240) : undefined, missing: (Array.isArray(missing) ? missing : []).map(String).slice(0, 4) };
}
/** Turns the model's JSON into a result the app can render and save. Tolerant of missing fields; never throws on shape. */
export function normalizeScan(mode: ScanMode, raw: any): ScanResult {
  const r: ScanRaw = raw && typeof raw === "object" ? raw : {}; const unknown: string[] = [];
  const base: ScanResult = { mode, notFood: !!r.notFood, verdict: String(r.verdict || "").slice(0, 600), suggestions: (Array.isArray(r.suggestions) ? r.suggestions : []).map(String).slice(0, 4), proteinFirst: r.proteinFirst !== false, ingredients: (Array.isArray(r.ingredients) ? r.ingredients : []).map(String).slice(0, 40), plates: [], budgetNote: String(r.budgetNote || "").slice(0, 300), unknown };
  if (mode === "pantry") { base.plates = (Array.isArray(r.plates) ? r.plates : []).slice(0, 3).map(p => toPlate(p?.name, p?.items, unknown, p?.why, p?.missing)); if (!base.plates.length && !base.ingredients.length) base.notFood = true; return base; }
  base.plate = toPlate(r.name || "Scanned plate", r.items, unknown); if (!base.plate.items.length) base.notFood = base.notFood || !r.items; return base;
}
export const THIRDS_LABEL: Record<ScanPlate["thirds"], string> = { ok: "In the plan's shape", "heavy-carb": "Carb-heavy: one roti or one hand of rice, not both", "low-protein": "Protein is short: add a palm", "low-veg": "No vegetables: add a fist of salad or sabzi", empty: "Nothing recognised" };
