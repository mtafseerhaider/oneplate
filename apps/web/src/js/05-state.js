/* ---------- state ---------- */
const LS="oneplate.v1";
let S={settings:{startWeight:84,targetWeight:70,startDate:todayStr(),fastHours:21,unlockKg:5,city:"karachi",hijriOffset:0,ramadan:"auto",tradition:"sunni"},fast:{startedAt:null,lastHours:null,lastEndedAt:null},days:{},weighins:{},meals:{},family:{},qnotes:{},qprog:{done:{},flag:{}}};
let db=null,syncState="wait",readOnly=false,isOwner=true,tab=(location.hash||"#today").slice(1);
if(tab==="guide")tab="learn";if(!["today","plate","family","train","progress","learn"].includes(tab))tab="today";
function todayStr(d){d=d||new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function loadLocal(){try{const j=JSON.parse(localStorage.getItem(LS)||"null");if(j){S.settings=Object.assign(S.settings,j.settings||{});S.fast=Object.assign(S.fast,j.fast||{});S.days=j.days||{};S.weighins=j.weighins||{};S.meals=j.meals||{};S.family=j.family||{};S.qnotes=j.qnotes||{};S.qprog=j.qprog||{done:{},flag:{}}}}catch(e){}}
function saveLocal(){if(readOnly)return;try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}}
const queues={};
function dbWrite(path,data){ if(!db||readOnly)return; const run=()=>db.doc(path).set(data).catch(e=>{console.warn("db set",path,e);if(e&&e.code==="invalid_argument"){readOnly=true;setChip();render();toast("View only")}else if(e&&e.code==="conflict"){toast("Changed on another device · refreshed");render()}else toast("Could not sync")}); queues[path]=(queues[path]||Promise.resolve()).then(run); }
function dbDelete(path){ if(!db||readOnly)return; const run=()=>db.doc(path).delete().catch(e=>console.warn("db delete",path,e)); queues[path]=(queues[path]||Promise.resolve()).then(run); }
function persistSettings(){saveLocal();dbWrite("settings/main",S.settings)}
function persistFast(){saveLocal();dbWrite("fast/current",S.fast)}
function persistDay(d){saveLocal();dbWrite("days/"+d,S.days[d])}
function persistWeigh(d){saveLocal();dbWrite("weighins/"+d,S.weighins[d])}
function removeWeigh(d){delete S.weighins[d];saveLocal();dbDelete("weighins/"+d)}
function persistMeal(id){saveLocal();dbWrite("meals/"+id,S.meals[id])}
function persistFamily(id){saveLocal();dbWrite("family/"+id,S.family[id])}
function persistQnote(i){saveLocal();dbWrite("qnotes/"+i,S.qnotes[i])}
function persistQprog(){saveLocal();dbWrite("quran/progress",S.qprog)}
function removeMeal(id){delete S.meals[id];saveLocal();dbDelete("meals/"+id)}
function setChip(){const c=document.getElementById("syncChip");const fam=!readOnly&&!isOwner;const k=readOnly?"viewonly":fam?"familyeditor":syncState==="db"?"sync":syncState==="local"?"local":null;c.className="chip "+(readOnly?"view":fam?"view":syncState==="db"?"":syncState==="local"?"local":"wait");c.innerHTML=tr(readOnly?"View only":fam?"Family editor":syncState==="db"?"Synced":syncState==="local"?"This device only":"Loading")+(k?" "+I(k):"");const lb=document.getElementById("langBtn");if(lb)lb.textContent=LANG==="ur"?"EN":"اردو"}

async function connect(){
  try{ db=await window.claude.use("db"); }catch(e){ db=null; }
  if(!db){ syncState="local"; setChip(); render(); return; }
  try{ const u=await window.claude.use("user"); if(u){ const w=await u.can("data.write"); const o=await u.isOwner(); isOwner=!!o||w===null; if(w===false){ readOnly=true; } setChip(); render(); } }catch(e){}
  let got=0; const timer=setTimeout(()=>{ if(syncState==="wait"){syncState="local";setChip()} },10000);
  const ready=()=>{ got++; if(got>=8){ clearTimeout(timer); syncState="db"; setChip(); } render(); };
  const err=e=>{ console.warn("db",e); clearTimeout(timer); syncState="local"; setChip(); render(); };
  db.doc("settings/main").onSnapshot(s=>{ if(s.exists)S.settings=Object.assign({},S.settings,s.data()); else if(got<8&&!readOnly)dbWrite("settings/main",S.settings); saveLocal(); ready(); },err);
  db.doc("fast/current").onSnapshot(s=>{ if(s.exists)S.fast=Object.assign({},S.fast,s.data()); saveLocal(); ready(); },err);
  db.collection("days").orderBy("date","desc").limit(120).onSnapshot(q=>{ if(!q.metadata.fromCache||q.size){const o={};q.docs.forEach(d=>{o[d.id]=d.data()});S.days=o;saveLocal()} ready(); },err);
  db.doc("quran/progress").onSnapshot(sn=>{ if(sn.exists)S.qprog=Object.assign({done:{},flag:{}},sn.data()); saveLocal(); ready(); },err);
  db.collection("qnotes").limit(200).onSnapshot(q=>{ if(!q.metadata.fromCache||q.size){const o={};q.docs.forEach(d=>{o[d.id]=d.data()});S.qnotes=o;saveLocal()} ready(); },err);
  db.collection("family").limit(20).onSnapshot(q=>{ if(!q.metadata.fromCache||q.size){const o={};q.docs.forEach(d=>{o[d.id]=d.data()});S.family=o;saveLocal()} ready(); },err);
  db.collection("meals").limit(200).onSnapshot(q=>{ if(!q.metadata.fromCache||q.size){const o={};q.docs.forEach(d=>{o[d.id]=d.data()});S.meals=o;saveLocal()} ready(); },err);
  db.collection("weighins").orderBy("date","asc").limit(400).onSnapshot(q=>{ if(!q.metadata.fromCache||q.size){const o={};q.docs.forEach(d=>{o[d.id]=d.data()});S.weighins=o;saveLocal()} ready(); },err);
}

