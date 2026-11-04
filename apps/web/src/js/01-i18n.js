/* ---------- interface language (per device): English or Urdu. Content libraries stay in English; see docs/IMPLEMENTATION-PLAN.md phase 4. ---------- */

let LANG="en";try{LANG=localStorage.getItem("oneplate.lang")||"en"}catch(e){}
function tr(s){return LANG==="ur"&&UR[s]?UR[s]:s}
function applyLang(){document.documentElement.lang=LANG;document.documentElement.dir=LANG==="ur"?"rtl":"ltr";document.documentElement.classList.toggle("ur",LANG==="ur")}
