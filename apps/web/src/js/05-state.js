/* ---------- state ---------- */
const LS="oneplate.v1";
let S={settings:{startWeight:84,targetWeight:70,startDate:todayStr(),fastHours:21,unlockKg:5,city:"karachi",hijriOffset:0,ramadan:"auto",tradition:"sunni"},fast:{startedAt:null,lastHours:null,lastEndedAt:null},days:{},weighins:{},meals:{},family:{},qnotes:{},qprog:{done:{},flag:{}},reviews:{}};
let canReview=false;
let db=null,syncState="wait",readOnly=false,isOwner=true,tab=(location.hash||"#today").slice(1);
if(tab==="guide")tab="learn";if(!["today","plate","family","train","progress","learn"].includes(tab))tab="today";
function todayStr(d){d=d||new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function loadLocal(){try{const j=JSON.parse(localStorage.getItem(LS)||"null");if(j){S.settings=Object.assign(S.settings,j.settings||{});S.fast=Object.assign(S.fast,j.fast||{});S.days=j.days||{};S.weighins=j.weighins||{};S.meals=j.meals||{};S.family=j.family||{};S.qnotes=j.qnotes||{};S.qprog=j.qprog||{done:{},flag:{}};S.reviews=j.reviews||{};migrateCourse(false)}}catch(e){}}
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
function persistQnote(k){saveLocal();dbWrite("qnotes/"+k,S.qnotes[k])}
/* Progress is keyed by passage. v1 was keyed by index into the 67 curated readings, v2 by index into the first 365-reading course; both move to keys once (with the frozen key lists) and the owner writes the result back. Page notes keyed by old index move the same way. */
function migrateCourse(write){
  let changed=false;
  const v=Number((S.qprog||{}).v||1);
  if(v<3){S.qprog=core.progressByKey(v<2?QPLAN_V1_KEYS:COURSE_V2_KEYS,S.qprog||{});changed=true}
  for(const k of Object.keys(S.qnotes||{})){if(!/^\d+$/.test(k))continue;const nk=QPLAN_V1_KEYS[Number(k)];const n=S.qnotes[k];delete S.qnotes[k];if(nk&&(n.page||n.note)){S.qnotes[nk]=Object.assign({},n,{i:nk});if(write&&isOwner&&!readOnly)dbWrite("qnotes/"+nk,S.qnotes[nk])}if(write&&isOwner&&!readOnly)dbDelete("qnotes/"+k);changed=true}
  if(changed&&write&&isOwner&&!readOnly){persistQprog()}
  return changed;
}
function persistReview(key,body){
  if(body&&body.status!=="draft")S.reviews[key]=body;else delete S.reviews[key];
  saveLocal();
  if(typeof window.oneplate==="object")return window.oneplate.setReview(key,body||{status:"draft"});
  dbWrite("reviews/all",S.reviews);return Promise.resolve();
}
function persistQprog(){saveLocal();dbWrite("quran/progress",S.qprog)}
function removeMeal(id){delete S.meals[id];saveLocal();dbDelete("meals/"+id)}
function setChip(){const c=document.getElementById("syncChip");const fam=!readOnly&&!isOwner;const k=readOnly?"viewonly":fam?"familyeditor":syncState==="db"?"sync":syncState==="local"?"local":null;c.className="chip "+(readOnly?"view":fam?"view":syncState==="db"?"":syncState==="local"?"local":"wait");c.innerHTML=tr(readOnly?"View only":fam?"Family editor":syncState==="db"?"Synced":syncState==="local"?"This device only":"Loading")+(k?" "+I(k):"");const lb=document.getElementById("langBtn");if(lb)lb.textContent=LANG==="ur"?"EN":"اردو"}

async function connect(){
  try{ db=await window.claude.use("db"); }catch(e){ db=null; }
  if(!db){ syncState="local"; canReview=isOwner&&!readOnly; setChip(); render(); return; }
  try{ const u=await window.claude.use("user"); if(u){ const w=await u.can("data.write"); const o=await u.isOwner(); isOwner=!!o||w===null; if(w===false){ readOnly=true; } setChip(); render(); } }catch(e){}
  let got=0; const timer=setTimeout(()=>{ if(syncState==="wait"){syncState="local";setChip()} },10000);
  const ready=()=>{ got++; if(got>=8){ clearTimeout(timer); syncState="db"; setChip(); } render(); };
  const err=e=>{ console.warn("db",e); clearTimeout(timer); syncState="local"; setChip(); render(); };
  db.doc("settings/main").onSnapshot(s=>{ if(s.exists)S.settings=Object.assign({},S.settings,s.data()); else if(got<8&&!readOnly)dbWrite("settings/main",S.settings); saveLocal(); ready(); },err);
  db.doc("fast/current").onSnapshot(s=>{ if(s.exists)S.fast=Object.assign({},S.fast,s.data()); saveLocal(); ready(); },err);
  db.collection("days").orderBy("date","desc").limit(120).onSnapshot(q=>{ if(!q.metadata.fromCache||q.size){const o={};q.docs.forEach(d=>{o[d.id]=d.data()});S.days=o;saveLocal()} ready(); },err);
  let qp=false,qn=false; const maybeMigrate=()=>{ if(qp&&qn)migrateCourse(true); };
  db.doc("quran/progress").onSnapshot(sn=>{ if(sn.exists)S.qprog=Object.assign({done:{},flag:{}},sn.data()); qp=true; maybeMigrate(); saveLocal(); ready(); },err);
  db.collection("qnotes").limit(400).onSnapshot(q=>{ if(!q.metadata.fromCache||q.size){const o={};q.docs.forEach(d=>{o[d.id]=d.data()});S.qnotes=o;saveLocal()} qn=true; maybeMigrate(); ready(); },err);
  if(typeof window.oneplate==="object"){ window.oneplate.reviews().then(r=>{ S.reviews=r.reviews||{}; canReview=!!r.canReview; saveLocal(); render(); }).catch(e=>console.warn("reviews",e)); }
  else { canReview=isOwner&&!readOnly; db.doc("reviews/all").onSnapshot(sn=>{ if(sn.exists)S.reviews=sn.data()||{}; saveLocal(); render(); },e=>console.warn("reviews",e)); }
  db.collection("family").limit(20).onSnapshot(q=>{ if(!q.metadata.fromCache||q.size){const o={};q.docs.forEach(d=>{o[d.id]=d.data()});S.family=o;saveLocal()} ready(); },err);
  db.collection("meals").limit(200).onSnapshot(q=>{ if(!q.metadata.fromCache||q.size){const o={};q.docs.forEach(d=>{o[d.id]=d.data()});S.meals=o;saveLocal()} ready(); },err);
  db.collection("weighins").orderBy("date","asc").limit(400).onSnapshot(q=>{ if(!q.metadata.fromCache||q.size){const o={};q.docs.forEach(d=>{o[d.id]=d.data()});S.weighins=o;saveLocal()} ready(); },err);
}

