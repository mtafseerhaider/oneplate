/* ---------- interface language (per device): English or Urdu. Content libraries stay in English; see docs/IMPLEMENTATION-PLAN.md phase 4. ---------- */

let LANG="en";try{LANG=localStorage.getItem("oneplate.lang")||"en"}catch(e){}
function tr(s){return LANG==="ur"&&UR[s]?UR[s]:s}
function applyLang(){document.documentElement.lang=LANG;document.documentElement.dir=LANG==="ur"?"rtl":"ltr";document.documentElement.classList.toggle("ur",LANG==="ur")}

/* ---------- appearance: auto (follow the device), light or dark; per device ---------- */
let THEME="auto";try{THEME=localStorage.getItem("oneplate.theme")||"auto"}catch(e){}
const THEMES_UI=[["auto","Auto"],["light","Light"],["dark","Dark"]];
function applyTheme(){if(!["auto","light","dark"].includes(THEME))THEME="auto";const h=document.documentElement;if(THEME==="auto")h.removeAttribute("data-theme");else h.setAttribute("data-theme",THEME);
  const dark=THEME==="dark"||(THEME==="auto"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);let m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content=dark?"#0F1412":"#F4F5F1";
  const b=document.getElementById("themeBtn");if(b){const l=tr(THEME==="auto"?"Auto":THEME==="light"?"Light":"Dark");b.innerHTML=(typeof ic==="function"?ic(THEME==="dark"?"moon":THEME==="light"?"sun":"clock"):"")+`<span class="tl">${l}</span>`;b.setAttribute("aria-label",tr("Appearance")+": "+l);b.title=tr("Appearance")+": "+l}}
function setTheme(t){THEME=t;try{localStorage.setItem("oneplate.theme",t)}catch(e){}applyTheme()}
