/** Curated content. Source of truth since phase 2. */
export interface FastItem {n:string;k:string;g:"green"|"amber"|"red";s:string;f:string;a:string;note:string}
export const FAST: FastItem[] = [
{n:"Water / mineral / sparkling",k:"0",g:"green",s:"No",f:"No",a:"No",note:"2.5–3.5 L a day. Carbonation adds 20–30 min of fullness."},
{n:"Black coffee / Americano",k:"2–5",g:"green",s:"No",f:"No",a:"No",note:"Suppresses appetite 1–3 h. Max 3 cups, none after 2 PM."},
{n:"Green tea",k:"0–2",g:"green",s:"No",f:"No",a:"No",note:"Small thermogenic effect. Skip extract pills."},
{n:"Black tea (plain)",k:"2",g:"green",s:"No",f:"No",a:"No",note:"Lemon or a pinch of cinnamon is fine."},
{n:"Herbal tea / qehwa (no sugar)",k:"0–2",g:"green",s:"No",f:"No",a:"No",note:"Warm volume beats a hunger wave. Avoid 'detox' teas."},
{n:"Lemon squeeze in water",k:"1–3",g:"green",s:"No",f:"No",a:"No",note:"No detox effect; rinse teeth."},
{n:"Pinch of cinnamon",k:"2–3",g:"green",s:"No",f:"No",a:"No",note:"Prefer Ceylon cinnamon."},
{n:"Sugar-free electrolytes / pinch of salt",k:"0–10",g:"green",s:"Purists: yes",f:"No",a:"No",note:"¼ tsp salt in 1 L water does the job for a long daily fast."},
{n:"Apple cider vinegar (1 tbsp diluted)",k:"3",g:"green",s:"No",f:"No",a:"No",note:"Only helps glucose when taken with a meal. Optional."},
{n:"Ispaghol (1 tsp in water)",k:"15–20",g:"amber",s:"Technically",f:"No",a:"No",note:"Fibre, mostly non-absorbed. Helps regularity on one meal a day. Best with dinner."},
{n:"Splash of milk in tea (1 tsp)",k:"≈10",g:"amber",s:"Yes",f:"No",a:"Marginal",note:"Irrelevant for fat loss. Full doodh patti is red."},
{n:"Bone broth (1 cup)",k:"30–50",g:"amber",s:"Yes",f:"Marginal",a:"Yes",note:"Unnecessary. Fine as a fast-breaker."},
{n:"Chia seeds (1 tbsp)",k:"60",g:"amber",s:"Yes",f:"Marginal",a:"Yes",note:"Put them in the dinner yogurt instead."},
{n:"MCT oil (1 tbsp)",k:"115–130",g:"amber",s:"Yes",f:"Yes",a:"Probably not",note:"120 kcal of fat you then won't burn from your body. Skip."},
{n:"Honey / honey water",k:"64+",g:"red",s:"Yes",f:"Yes",a:"Yes",note:"A sugar drink, however natural."},
{n:"Milk tea with sugar (doodh patti)",k:"80–150",g:"red",s:"Yes",f:"Yes",a:"Yes",note:"Two cups erase half your deficit. Window only."},
{n:"Coffee with milk / latte",k:"120–200",g:"red",s:"Yes",f:"Yes",a:"Yes",note:"Window only."},
{n:"Coffee creamer",k:"20–35/tbsp",g:"red",s:"Yes",f:"Yes",a:"Yes",note:"Sugar plus hydrogenated oil."},
{n:"Fruit juice (250 ml)",k:"110–120",g:"red",s:"Yes",f:"Yes",a:"Yes",note:"25–28 g sugar, little fibre. Eat the fruit at dinner."},
{n:"Coconut water (250 ml)",k:"45–60",g:"red",s:"Yes",f:"Yes",a:"Yes",note:"Fine as a post-exercise fast-breaker."},
{n:"Sugar in tea or coffee (1 tsp)",k:"16",g:"red",s:"Yes",f:"Yes",a:"Yes",note:"Trains the sweet habit."}
];
