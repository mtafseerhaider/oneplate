/** Food database and meal maths. Values are per hand portion or unit. Children's rules: see family.ts. */
export type Unit = "palm"|"fist"|"hand"|"thumb"|"bowl"|"roti"|"naan"|"egg"|"piece"|"scoop"|"handful"|"slice"|"glass"|"item";
export type FoodCategory = "protein"|"veg"|"carb"|"fat"|"plus";
export interface Food { n: string; ur?: string; short: string; u: Unit; cat: FoodCategory; kcal: number; p: number; c: number; f: number }
export interface MealItem { f: string; q: number }
export interface Meal { id: string; n: string; tag: string; items: MealItem[] | [string, number][]; note?: string; base?: boolean; deleted?: boolean }
export interface Macros { kcal: number; p: number; c: number; f: number }

export const UNITS: Record<Unit,[string,string]> = {palm:["palm","palms"],fist:["fist","fists"],hand:["cupped hand","cupped hands"],thumb:["thumb","thumbs"],bowl:["bowl","bowls"],roti:["roti","rotis"],naan:["naan","naans"],egg:["egg","eggs"],piece:["piece","pieces"],scoop:["scoop","scoops"],handful:["handful","handfuls"],slice:["slice","slices"],glass:["glass","glasses"],item:["",""]};

export const FOODS: Record<string,Food> = {
chk_breast:{ur:"مرغی کا سینہ",n:"Chicken breast, grilled",short:"grilled chicken breast",u:"palm",cat:"protein",kcal:165,p:31,c:0,f:3.5},
chk_thigh:{ur:"مرغی کی ران",n:"Chicken leg / thigh, cooked",short:"chicken (leg or thigh)",u:"palm",cat:"protein",kcal:210,p:26,c:0,f:12},
chk_karahi:{ur:"چکن کڑاہی",n:"Chicken karahi",short:"chicken karahi",u:"palm",cat:"protein",kcal:250,p:26,c:5,f:14},
chk_curry:{ur:"چکن شوربہ / ہانڈی",n:"Chicken shorba / haandi",short:"chicken curry",u:"palm",cat:"protein",kcal:230,p:25,c:5,f:12},
chk_tikka:{ur:"چکن تکہ / بوٹی",n:"Chicken tikka / boti",short:"chicken tikka",u:"palm",cat:"protein",kcal:190,p:30,c:2,f:7},
malai_boti:{ur:"ملائی بوٹی",n:"Malai boti",short:"malai boti",u:"palm",cat:"protein",kcal:260,p:26,c:3,f:16},
beef_lean:{ur:"گائے کا گوشت (بوٹی)",n:"Beef, lean grilled (boti / pasanda)",short:"grilled lean beef",u:"palm",cat:"protein",kcal:220,p:30,c:0,f:11},
keema:{ur:"قیمہ",n:"Beef keema",short:"keema",u:"palm",cat:"protein",kcal:250,p:22,c:4,f:16},
seekh:{ur:"سیخ کباب",n:"Seekh kebab (beef)",short:"seekh kebab",u:"piece",cat:"protein",kcal:140,p:11,c:2,f:9.5},
chapli:{ur:"چپلی کباب",n:"Chapli kebab",short:"chapli kebab",u:"piece",cat:"protein",kcal:230,p:14,c:6,f:17},
shami:{ur:"شامی کباب",n:"Shami kebab",short:"shami kebab",u:"piece",cat:"protein",kcal:130,p:9,c:8,f:7},
mutton:{ur:"بکرے کا گوشت",n:"Mutton / palak gosht",short:"mutton",u:"palm",cat:"protein",kcal:260,p:25,c:0,f:17},
fish_grill:{ur:"گرل مچھلی",n:"Fish, grilled",short:"grilled fish",u:"palm",cat:"protein",kcal:160,p:27,c:0,f:5},
fish_curry:{ur:"مچھلی کا سالن",n:"Fish curry / masala",short:"fish curry",u:"palm",cat:"protein",kcal:220,p:25,c:4,f:11},
egg:{ur:"انڈا",n:"Egg (boiled or fried in shared oil)",short:"",u:"egg",cat:"protein",kcal:75,p:6,c:0.5,f:5},
paneer:{ur:"پنیر",n:"Paneer",short:"paneer",u:"palm",cat:"protein",kcal:265,p:18,c:3,f:20},
whey:{ur:"وہے پروٹین",n:"Whey protein in water",short:"whey",u:"scoop",cat:"protein",kcal:120,p:25,c:3,f:1.5},
daal:{ur:"دال",n:"Daal (masoor / mash / chana)",short:"daal",u:"bowl",cat:"plus",kcal:200,p:12,c:28,f:5},
chana:{ur:"چنے",n:"Chana (chickpeas)",short:"chana",u:"bowl",cat:"plus",kcal:220,p:12,c:35,f:4},
haleem:{ur:"حلیم",n:"Haleem",short:"haleem",u:"bowl",cat:"plus",kcal:320,p:18,c:30,f:14},
nihari:{ur:"نہاری",n:"Nihari",short:"nihari",u:"bowl",cat:"protein",kcal:450,p:30,c:8,f:33},
yogurt:{ur:"دہی",n:"Yogurt, plain (dahi)",short:"yogurt",u:"bowl",cat:"plus",kcal:130,p:8,c:9,f:7},
raita:{ur:"رائتہ",n:"Raita",short:"raita",u:"bowl",cat:"plus",kcal:110,p:6,c:8,f:5},
milk:{ur:"دودھ",n:"Milk",short:"milk",u:"glass",cat:"plus",kcal:125,p:7,c:10,f:7},
salad:{ur:"سلاد / کچومر",n:"Salad / kachumber",short:"salad",u:"fist",cat:"veg",kcal:25,p:1,c:5,f:0},
sabzi:{ur:"سبزی",n:"Cooked sabzi (bhindi, gobi, mixed), measured oil",short:"sabzi",u:"fist",cat:"veg",kcal:90,p:2.5,c:9,f:5},
palak:{ur:"پالک",n:"Spinach / palak, cooked",short:"palak",u:"fist",cat:"veg",kcal:60,p:3,c:5,f:3},
roti:{ur:"روٹی",n:"Roti, medium, no ghee",short:"",u:"roti",cat:"carb",kcal:120,p:4,c:25,f:1.5},
naan:{ur:"نان",n:"Naan",short:"",u:"naan",cat:"carb",kcal:300,p:9,c:55,f:5},
rice:{ur:"سادہ چاول",n:"Rice, plain boiled",short:"rice",u:"hand",cat:"carb",kcal:170,p:3.5,c:37,f:0.5},
pulao:{ur:"پلاؤ",n:"Pulao rice",short:"pulao rice",u:"hand",cat:"carb",kcal:200,p:4,c:34,f:6},
biryani:{ur:"بریانی",n:"Biryani rice",short:"biryani rice",u:"hand",cat:"carb",kcal:230,p:5,c:35,f:8},
potato:{ur:"ابلا آلو",n:"Potato, boiled",short:"boiled potato",u:"hand",cat:"carb",kcal:120,p:2.5,c:27,f:0},
fries:{ur:"فرائز",n:"French fries",short:"fries",u:"fist",cat:"carb",kcal:150,p:2,c:19,f:7},
pizza:{ur:"پیزا",n:"Pizza slice",short:"pizza",u:"slice",cat:"carb",kcal:280,p:12,c:34,f:11},
burger:{ur:"برگر",n:"Burger, single patty",short:"burger",u:"item",cat:"protein",kcal:520,p:26,c:42,f:27},
oil:{ur:"تیل / گھی",n:"Oil / ghee / butter",short:"oil",u:"thumb",cat:"fat",kcal:120,p:0,c:0,f:14},
olive:{ur:"زیتون کا تیل",n:"Olive oil + lemon dressing",short:"olive oil",u:"thumb",cat:"fat",kcal:120,p:0,c:0,f:14},
cream:{ur:"کریم",n:"Cream",short:"cream",u:"thumb",cat:"fat",kcal:50,p:0.5,c:1,f:5},
chutney:{ur:"پودینے کی چٹنی",n:"Mint chutney",short:"mint chutney",u:"thumb",cat:"fat",kcal:20,p:0.5,c:3,f:0.5},
almonds:{ur:"بادام",n:"Almonds (10)",short:"almonds",u:"handful",cat:"fat",kcal:70,p:2.5,c:2.5,f:6},
fruit:{ur:"پھل",n:"Fruit (banana, apple, orange)",short:"fruit",u:"piece",cat:"plus",kcal:90,p:1,c:23,f:0},
dates:{ur:"کھجور",n:"Dates (3)",short:"dates",u:"handful",cat:"plus",kcal:70,p:0.5,c:18,f:0},
colddrink:{ur:"کولڈ ڈرنک",n:"Cold drink, 250 ml",short:"cold drink",u:"glass",cat:"plus",kcal:105,p:0,c:26,f:0}
};

export const BASE_MEALS: Meal[] = [
{id:"karahi",n:"Chicken Karahi Plate",tag:"chicken",items:[["chk_karahi",2],["salad",2],["roti",1],["yogurt",1]],note:"Chicken and yogurt give the protein; tomato and salad add volume at low calories; one roti keeps the deficit intact. The oil is already inside the karahi, so cook it with a measured tablespoon."},
{id:"tikka",n:"Chicken Tikka Plate",tag:"chicken",items:[["chk_tikka",2],["salad",2],["rice",1],["chutney",1],["raita",1]],note:"Grilling needs almost no oil, so protein is high and fat is low; raita adds calcium."},
{id:"bbq",n:"Chicken BBQ Mix",tag:"chicken",items:[["chk_tikka",1],["malai_boti",1],["salad",2],["roti",1],["yogurt",1]],note:"High protein and very filling; the cream in the malai boti pushes fat up, so skip the naan. A Saturday-friendly plate."},
{id:"seekh",n:"Seekh Kebab & Daal Plate",tag:"beef",items:[["seekh",3],["daal",1],["salad",2],["roti",1],["raita",1]],note:"Beef brings iron, zinc and creatine; daal adds fibre for long fullness. Cheap and family-friendly."},
{id:"fish",n:"Grilled Fish Plate",tag:"fish",items:[["fish_grill",2],["sabzi",2],["rice",1],["yogurt",1]],note:"The leanest protein on the list; omega-3 supports recovery; low fat leaves room for a full carb portion on training days."},
{id:"fishcurry",n:"Fish Curry Plate",tag:"fish",items:[["fish_curry",2],["sabzi",2],["roti",1],["yogurt",1]],note:"Same lean protein in a family-style format; the tomato base adds volume without calories."},
{id:"keema",n:"Keema Anday Plate",tag:"beef",items:[["keema",2],["egg",2],["salad",1],["roti",1],["yogurt",1]],note:"Eggs add leucine-rich protein cheaply; keema reheats well for a busy week. Ask for lean mince."},
{id:"beef",n:"Beef Boti / Pasanda Plate",tag:"beef",items:[["beef_lean",2],["salad",2],["rice",1],["yogurt",1]],note:"Very high satiety per calorie; red meat once or twice a week supports iron and creatine stores."},
{id:"shorba",n:"Chicken Shorba / Haandi Plate",tag:"chicken",items:[["chk_curry",2],["salad",1],["rice",1],["yogurt",1]],note:"The everyday home dish, made plan-friendly by draining the oil layer and holding rice to one cupped hand."},
{id:"omelette",n:"Omelette & Chana Plate",tag:"meatless",items:[["egg",3],["oil",1],["chana",1],["salad",1],["roti",1],["yogurt",1]],note:"Cheapest and fastest. Protein is lower, so use a whey starter on this night."},
{id:"daalboti",n:"Daal & Chicken Boti Plate",tag:"chicken",items:[["daal",1],["chk_tikka",1],["salad",2],["roti",1],["yogurt",1]],note:"The lightest plate; daal fibre gives long satiety. Good for rest days or the night after a cheat meal."},
{id:"paneer",n:"Paneer & Chana Plate",tag:"meatless",items:[["paneer",1],["chana",1],["salad",2],["roti",1],["yogurt",1]],note:"Calcium-rich for the tibia; pair with an egg or whey starter for protein."},
{id:"botisalad",n:"Tikka Boti Salad Bowl",tag:"chicken",items:[["chk_tikka",2],["salad",3],["olive",1],["yogurt",1]],note:"Highest protein, lowest calories. Use on rest days or to speed up a slow week without hunger."},
{id:"palak",n:"Palak Gosht Plate",tag:"beef",items:[["mutton",2],["palak",2],["salad",1],["roti",1],["yogurt",1]],note:"Spinach adds volume, iron and magnesium. Mutton is fattier, so keep it to once a week and drain the surface oil."},
{id:"pulao",n:"Controlled Chicken Pulao",tag:"chicken",items:[["chk_thigh",2],["salad",2],["pulao",1],["raita",1]],note:"Family cooks pulao anyway; take more chicken and one cupped hand of rice instead of a mound."},
{id:"biryani",n:"Controlled Chicken Biryani",tag:"chicken",items:[["chk_thigh",2],["salad",2],["biryani",1],["raita",1]],note:"No food is banned. Protein first, salad second, rice last; stop at one cupped hand."},
{id:"steak",n:"Chicken Steak, Daal & Raita",tag:"chicken",items:[["chk_breast",2],["daal",0.5],["raita",1]],note:"Grilled breast is the leanest protein on the list; a small bowl of daal brings fibre and slow carbs in place of roti; raita adds calcium. Add 2 fists of salad if there is any on the table."}
];

export function normItems(items: Meal["items"] | undefined): MealItem[] {
  return (items ?? []).map((it: any) => Array.isArray(it) ? { f: it[0], q: Number(it[1]) } : { f: it.f, q: Number(it.q) }).filter(it => FOODS[it.f] && it.q > 0);
}
export function mealCalc(m: Pick<Meal,"items">): Macros {
  let k = 0, p = 0, c = 0, f = 0;
  for (const it of normItems(m.items)) { const fd = FOODS[it.f]!; k += fd.kcal * it.q; p += fd.p * it.q; c += fd.c * it.q; f += fd.f * it.q; }
  return { kcal: Math.round(k / 5) * 5, p: Math.round(p), c: Math.round(c), f: Math.round(f) };
}
export function qtyStr(q: number): string {
  const w = Math.floor(q), r = q - w; const fr = r >= .74 ? "¾" : r >= .49 ? "½" : r >= .24 ? "¼" : "";
  return ((w ? String(w) : "") + (fr ? (w ? " " : "") + fr : "")) || String(q);
}
export function portion(q: number, fd: Food): string {
  const u = UNITS[fd.u]; return (qtyStr(q) + " " + (q <= 1 ? u[0] : u[1]) + " " + (fd.short || "")).replace(/\s+/g, " ").trim();
}
export function hands(m: Pick<Meal,"items">): Record<FoodCategory,string[]> {
  const g: Record<FoodCategory,string[]> = { protein: [], veg: [], carb: [], fat: [], plus: [] };
  for (const it of normItems(m.items)) { const fd = FOODS[it.f]!; g[fd.cat].push(portion(it.q, fd)); }
  return g;
}
export function handLine(m: Pick<Meal,"items">): string { const g = hands(m); return [...g.protein, ...g.veg, ...g.carb, ...g.fat, ...g.plus].join(" · "); }
/** Built-in meals with household overrides applied (an override with deleted:true hides a built-in; ids starting with c_ are custom). */
export function resolveMeals(overrides: Record<string, Partial<Meal> & { id?: string; deleted?: boolean }>): Meal[] {
  const list: Meal[] = [];
  for (const b of BASE_MEALS) { const v = overrides[b.id]; if (v?.deleted) continue; list.push({ ...b, ...(v ?? {}), id: b.id, base: true }); }
  for (const v of Object.values(overrides)) if (v?.id && /^c_/.test(v.id) && !v.deleted) list.push({ ...(v as Meal), base: false });
  return list;
}
