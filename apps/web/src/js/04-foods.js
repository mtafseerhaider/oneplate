/* ---------- food database: values per hand portion / unit ---------- */



const STARTERS=[
{n:"Bowl of yogurt + 2 boiled eggs",kcal:280,p:20},
{n:"1 scoop whey in water + 10 almonds",kcal:190,p:28},
{n:"1 palm cold grilled chicken + 1 fist salad",kcal:220,p:30},
{n:"Bowl of yogurt + 1 palm paneer",kcal:400,p:26},
{n:"Bowl of chana chaat with lemon (lower protein)",kcal:220,p:12}
];

const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
/* Phase 0 (strength locked): fasting + walking + 4 × 30 min cycling = 120 min/week */

/* Full plan once strength unlocks at −5 kg */

const STRENGTH=[
["Box / goblet squat","3 × 8–12","Both feet even; sit back to the chair edge"],
["Dumbbell Romanian deadlift","3 × 8–12","Soft knees, hinge at hips"],
["Push-ups (incline → floor)","3 × 8–12",""],
["One-arm row / band row","3 × 10–12 each",""],
["Calf raises (both legs)","3 × 12–15","Single-leg on both legs after 4 weeks"],
["Glute bridge → split squat","3 × 10–12","Both legs, only if pain-free"],
["Plank","3 × 20–45 s",""]
];

const CHECKS=[
{id:"starter",t:"Protein starter when you get home",s:"≈7:00 PM. Yogurt + 2 eggs, or whey. Ends the fast with protein.",g:"starter"},
{id:"train",t:"Today's session done",s:"",g:"cycle"},
{id:"walk",t:"10-min walk after dinner",s:"Start within 30 minutes of the last bite.",g:"walk"},
{id:"steps",t:"8,000 steps",s:"Or your current phase target.",g:"steps"},
{id:"closed",t:"Kitchen closed by 9:30 PM",s:"Then start the fast.",g:"closed"}
];

