/* ---------- family (children are never restricted). The roster comes from the family documents; the original four are the fallback for a household created before settings carried ownerMember. ---------- */
const FAMILY_BASE=[
{id:"tafseer",name:"Tafseer",rel:"me",role:"adult",sex:"male",goal:"fat_loss",dob:"1988-02-05"},
{id:"uzma",name:"Uzma",rel:"wife",role:"adult",sex:"female",goal:"maintain",status:"none",dob:"1993-02-03"},
{id:"abbas",name:"Abbas",rel:"son",role:"child",sex:"male",goal:"growth",dob:"2019-02-09"},
{id:"eliyya",name:"Eliyya",rel:"daughter",role:"child",sex:"female",goal:"growth",dob:"2022-09-18"}
];
function ownerId(){const s=S.settings||{};if(s.ownerMember)return s.ownerMember;if(typeof window.oneplate==="object"&&window.oneplate.ownerMemberId&&window.oneplate.ownerMemberId())return window.oneplate.ownerMemberId();const f=Object.values(S.family||{}).find(m=>m&&m.rel==="me");return f?f.id:"tafseer"}
function legacyFamily(){return !(S.settings||{}).ownerMember&&!(typeof window.oneplate==="object"&&window.oneplate.ownerMemberId&&window.oneplate.ownerMemberId()&&window.oneplate.ownerMemberId()!=="tafseer")}
function members(){const fam=S.family||{};let list=Object.values(fam).filter(m=>m&&m.id&&!m.deleted).map(m=>Object.assign({},m));
  if(legacyFamily()){list=FAMILY_BASE.map(b=>Object.assign({},b,fam[b.id]||{},{id:b.id})).concat(list.filter(m=>!FAMILY_BASE.some(b=>b.id===m.id)))}
  list.forEach(m=>{m.role=m.role||(/son|daughter|child/i.test(m.rel||"")?"child":"adult");m.goal=m.goal||(m.role==="child"?"growth":"maintain");m.sex=m.sex||"male"});
  return core.sortMembers(list,ownerId())}
function famRoster(){return core.roster(members(),ownerId())}
function spouse(){return famRoster().spouse}
function childrenOf(){return famRoster().children}
function childNames(){return core.listNames(childrenOf().map(c=>c.name),tr("the children"))}
/* Content was written for one family; every family reads its own names. */
function pz(t){return core.personalize(String(t==null?"":t),famRoster())}
function escC(t){return esc(pz(t))}
function member(id){return members().find(m=>m.id===id)}
function stageOf(m){return core.stageOf(m)}
function portionFactor(m){return core.portionFactor(m)}
function memberPortions(meal,m){return core.memberPortions(meal,m)}
function cookQuantities(meal){return core.cookQuantities(meal,members())}
const STAGE_LABEL={infant:"Infant",toddler:"Toddler",child:"Child",teen:"Teen",adult:"Adult"};
function ageLabel(m){const a=ageOf(m.dob);if(!a)return "age not set";return a.years<2?a.months+" months":a.years+" years"}
/* Portion factors against the adult plate (Thuluth 14 §6): toddler ⅓, child ½ as a START, teen the full plate, always rounded UP to a quarter. Children may always have seconds. */
function memberWeighs(id){return Object.values(S.weighins).filter(w=>(w.m||ownerId())===id).sort((a,b)=>a.date<b.date?-1:1)}
function initials(n){return (n||"?").trim().slice(0,1).toUpperCase()}
function childGuide(m){const s=stageOf(m),a=ageOf(m.dob);const yrs=a?a.years:null;
  const plate=s==="toddler"?"Small quarters: a little protein, a little rice or roti, a little vegetable, some fruit or yogurt. Tiny portions, offered often. Milk after the meal, not before.":"Quarters, not thirds: protein, grain, vegetables, and fruit or dairy, in roughly equal parts. The first serving is a start; seconds whenever still hungry. No calorie talk, ever.";
  const fast=s==="infant"||s==="toddler"||(yrs!==null&&yrs<7)?"No fasting at all under 7. Join the family at suhoor if awake, open iftar with a date, help set the table.":s==="child"?"Practice fasts only, chosen by you: until Dhuhr or until Asr, at most 3 a week, suhoor always, never on a very hot day. Stop at once for dizziness, headache, unusual tiredness, no urine for 6 hours, vomiting: give water and food.":"From puberty fasting is an obligation in Islamic law; the app supports full fasts with the same stop signs, and suhoor and iftar portions are never reduced. If puberty is uncertain, that is a question for a scholar, not this app.";
  const water=s==="toddler"?"Water in a cup at the table; no milk or juice in the hour before meals.":"Half a glass on waking, water at the table, nothing sweet in the hour before meals. Chai is not for children.";
  return {plate,fast,water}}
const CHILD_TIPS=["One small taste of a new food every day for two weeks. A pea-sized piece counts.","It can take ten or more tries before a child accepts a food. Each time it is on the plate is progress.","Skip 'one more bite' and 'finish your plate'. Pressure makes children eat less of that food.","You decide what, when and where; the child decides whether and how much.","Put one food they already eat on every plate next to the new one.","Eat together, screens away, about 20 minutes, Bismillah first."];
const RELS=[["me","Me"],["wife","Wife"],["husband","Husband"],["son","Son"],["daughter","Daughter"],["mother","Mother"],["father","Father"],["sister","Sister"],["brother","Brother"],["other","Other adult"]];
function relRole(rel){return /son|daughter/.test(rel)?"child":"adult"}
function addMemberForm(){return `<form class="form fam-add" autocomplete="off" style="flex-direction:column;align-items:stretch">
  <p class="eyebrow">${ic("family")} ${tr("Add a family member")}</p>
  <div class="form"><label class="f" style="flex:2">${tr("Name")}<input type="text" data-k="name" maxlength="30" required></label><label class="f">${tr("Relation")}<select data-k="rel">${RELS.filter(r=>r[0]!=="me").map(r=>`<option value="${r[0]}">${r[1]}</option>`).join("")}</select></label></div>
  <div class="form"><label class="f">${tr("Date of birth")}<input type="date" data-k="dob" max="${todayStr()}"></label><label class="f">${tr("Sex")}<select data-k="sex"><option value="male">Male</option><option value="female">Female</option></select></label></div>
  <div class="row"><button class="btn primary" type="submit">${tr("Add")}</button><button class="btn ghost" type="button" data-a="fam_add_cancel">${tr("Cancel")}</button></div>
  <p class="small muted">${tr("Sons and daughters are children: never restricted, portions by age. Adults get their own weigh-ins and, if invited, their own sign-in.")}</p></form>`}
function memberEditor(m){const ad=m.role==="adult";return `<form class="form fam-form" data-m="${m.id}" autocomplete="off">
  <label class="f">Name<input type="text" data-k="name" value="${esc(m.name)}" maxlength="30"></label>
  ${m.id===ownerId()?"":`<label class="f">Relation<select data-k="rel">${RELS.filter(r=>r[0]!=="me").map(r=>`<option value="${r[0]}" ${m.rel===r[0]?"selected":""}>${r[1]}</option>`).join("")}</select></label>`}
  <label class="f">Date of birth<input type="date" data-k="dob" value="${esc(m.dob||"")}"></label>
  <label class="f">Sex<select data-k="sex"><option value="male" ${m.sex==="male"?"selected":""}>Male</option><option value="female" ${m.sex==="female"?"selected":""}>Female</option></select></label>
  ${ad?`<label class="f">Goal<select data-k="goal"><option value="fat_loss" ${m.goal==="fat_loss"?"selected":""}>Fat loss</option><option value="maintain" ${m.goal==="maintain"?"selected":""}>Maintain / healthy eating</option></select></label>`:""}
  ${ad&&m.sex==="female"?`<label class="f">Status<select data-k="status"><option value="none" ${(m.status||"none")==="none"?"selected":""}>None</option><option value="pregnant" ${m.status==="pregnant"?"selected":""}>Pregnant</option><option value="breastfeeding" ${m.status==="breastfeeding"?"selected":""}>Breastfeeding</option></select></label>`:""}
  ${ad&&m.id!==ownerId()?`<label class="f">Start weight kg<input type="number" data-k="startWeight" step="0.1" value="${m.startWeight||""}" placeholder="optional"></label><label class="f">Target kg<input type="number" data-k="targetWeight" step="0.1" value="${m.targetWeight||""}" placeholder="optional"></label>`:""}
  <button class="btn primary" type="submit">Save</button>${m.id===ownerId()||!isOwner?"":`<button class="btn ghost" type="button" style="color:var(--red)" data-a="fam_remove" data-m="${m.id}">${tr("Remove")}</button>`}</form>`}
function growthForm(m){return `<form class="form grow-form" data-m="${m.id}" autocomplete="off">
  <label class="f">Date<input type="date" data-k="date" value="${logDate()}" max="${todayStr()}" required></label>
  <label class="f">Weight kg<input type="number" data-k="weight" step="0.1" min="2" max="200" inputmode="decimal" required></label>
  ${m.role==="child"?`<label class="f">Height cm<input type="number" data-k="height" step="0.5" min="40" max="220" inputmode="decimal" placeholder="optional"></label>`:`<label class="f">Waist cm<input type="number" data-k="waist" step="0.5" min="40" max="200" inputmode="decimal" placeholder="optional"></label>`}
  <button class="btn" type="submit">Log</button></form>`}
function miniChart(ws,key){if(ws.length<2)return "";const W=320,H=90,L=30,R=8,T=8,B=18;const vals=ws.map(w=>Number(w[key])).filter(v=>v>0);if(vals.length<2)return "";const pts=ws.filter(w=>Number(w[key])>0);const t0=new Date(pts[0].date).getTime(),t1=new Date(pts[pts.length-1].date).getTime()||t0+1;const mn=Math.min.apply(null,vals)-1,mx=Math.max.apply(null,vals)+1;const X=t=>L+(t-t0)/Math.max(1,t1-t0)*(W-L-R),Y=v=>T+(mx-v)/(mx-mn)*(H-T-B);const path=pts.map((p,i)=>(i?"L":"M")+X(new Date(p.date).getTime()).toFixed(1)+" "+Y(Number(p[key])).toFixed(1)).join(" ");return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${key} over time"><line class="grid" x1="${L}" x2="${W-R}" y1="${Y(mn+1).toFixed(1)}" y2="${Y(mn+1).toFixed(1)}"/><line class="grid" x1="${L}" x2="${W-R}" y1="${Y(mx-1).toFixed(1)}" y2="${Y(mx-1).toFixed(1)}"/><text x="${L-5}" y="${(Y(mx-1)+3).toFixed(1)}" text-anchor="end">${(mx-1).toFixed(0)}</text><text x="${L-5}" y="${(Y(mn+1)+3).toFixed(1)}" text-anchor="end">${(mn+1).toFixed(0)}</text><path class="act" d="${path}"/>${pts.map(p=>`<circle class="pt" cx="${X(new Date(p.date).getTime()).toFixed(1)}" cy="${Y(Number(p[key])).toFixed(1)}" r="3"/>`).join("")}<text x="${L}" y="${H-4}">${fmtDate(pts[0].date)}</text><text x="${W-R}" y="${H-4}" text-anchor="end">${fmtDate(pts[pts.length-1].date)}</text></svg>`}
function vFamily(){
  const ms=members(),ro=readOnly,tonight=tonightMeal(),ed=S._fedit;
  const missing=ms.filter(m=>m.role==="child"&&!m.dob).map(m=>m.name);
  return `
  <div class="hdr"><div><p class="eyebrow">${ms.length} ${tr("members")} · ${tr("one pot")}, ${ms.length} ${tr("plates")}</p><h1>${tr("Family")}</h1></div>${ro||!isOwner?"":`<button class="btn sm" data-a="fam_add">${ic("family")} ${tr("Add")}</button>`}</div>
  ${S._famAdd&&isOwner&&!ro?`<section class="card">${addMemberForm()}</section>`:""}
  ${missing.length&&!ro?`<div class="note">Set a date of birth for ${esc(missing.join(" and "))} so portions, fasting guidance and growth logs fit their age. Tap a card, then Edit.</div>`:""}
  <section class="card">
    <p class="eyebrow">${ic("plate")} ${tr("Family rules")} ${I("familyrules")}</p>
    <ul class="small"><li><b>Children are never restricted.</b> No calories, no diet talk, no fasting under 7. Their first serving is a start; seconds whenever they are hungry.</li><li><b>One pot.</b> Everyone eats the same OnePlate dinner; only the portion changes.</li><li><b>Together, screens away, about 20 minutes.</b> Bismillah first. Nobody criticises the food.</li><li><b>Water before, sips during.</b> Chai for adults an hour after. Milk for children after the meal, not before.</li></ul>
  </section>
  ${tonight?`<section class="card accent">
    <p class="eyebrow">${ic("home")} ${tr("Tonight for everyone")} · ${esc(tonight.n)} ${I("cookfor")}</p>
    <p class="small"><b>${tr("Cook:")}</b> ${esc(cookQuantities(tonight).join(" · "))}</p>
    <div class="hands">${ms.map(m=>`<span>${esc(m.name)}</span><div>${memberPortions(tonight,m).length?esc(memberPortions(tonight,m).join(" · "))+(m.role==="child"?" <span class='muted'>+ seconds if hungry</span>":""):"<span class='muted'>milk-based; ask the paediatrician</span>"}</div>`).join("")}</div>
  </section>`:""}
  ${ms.map(m=>{const st=stageOf(m),ws=memberWeighs(m.id),last=ws[ws.length-1],ad=m.role==="adult",g=ad?null:childGuide(m);const editing=ed===m.id;
    return `<details ${(S._fo||{})[m.id]?"open":""} data-fid="${m.id}"><summary><span style="display:flex;align-items:center;gap:10px"><span class="avatar ${m.sex}">${initials(m.name)}</span><span>${esc(m.name)}<br><span class="kcal">${esc(m.rel)} · ${STAGE_LABEL[st]} · ${ageLabel(m)}</span></span></span>${ic("chev","chev")}</summary><div class="body">
    ${editing?memberEditor(m):`
    <div class="row" style="gap:6px">${ad?`<span class="pill ${m.goal==="fat_loss"?"soft":"green"}">${m.goal==="fat_loss"?"Fat loss":"Maintain"}</span>`:`<span class="pill green">Growing · never restricted</span>`}${m.status&&m.status!=="none"?`<span class="pill blue">${m.status}</span>`:""}${last?`<span class="pill grey">${Number(last.weight).toFixed(1)} kg · ${fmtDate(last.date)}</span>`:""}${(m.id==="tafseer"?ro||!isOwner:ro)?"":`<button class="btn ghost" type="button" data-a="fedit" data-id="${m.id}">Edit</button>`}</div>
    ${m.id===ownerId()?`<p class="small muted">${isOwner?"Your own plan lives on the Today, Train and Progress tabs.":esc(m.name)+"'s plan lives on the Today, Train and Progress tabs."}</p>`:""}
    ${ad&&m.id!==ownerId()?`<p class="small">${m.status==="pregnant"?"Pregnancy: no calorie deficit, no fasting plan without the clinician's say. Protein-rich suhoor if fasting, an extra 300 ml water a day, dates in the last weeks. Warning signs (reduced movements, dizziness, headache, bleeding, dark urine): break the fast and call the clinician.":m.status==="breastfeeding"?"Breastfeeding: no calorie deficit; an extra 700 ml water a day. If fasting, watch the baby's wet nappies (6+ a day); fewer means break the fast and see the clinician.":m.goal==="fat_loss"?"Same OnePlate dinner, same rules: 2 palms protein, 2 fists veg, 1 cupped hand or 1 roti, 1 thumb fat, 1 bowl yogurt. A fasting window is her choice, 14:10 or 16:8 at most, never more than 24 hours. Weekly weigh-in below.":"Same OnePlate dinner with one extra cupped hand of rice or roti. No fasting needed. Weigh-in below if she wants to track."}</p>
      ${miniChart(ws,"weight")}
      ${ro?"":growthForm(m)}
      ${ws.length?`<div class="log">${ws.slice().reverse().slice(0,6).map(r=>`<div class="r"><span>${fmtDate(r.date)}</span><span>${Number(r.weight).toFixed(1)} kg</span><span class="muted">${r.waist?Number(r.waist).toFixed(1)+" cm":""}</span>${ro?"<span></span>":`<button data-a="delw" data-d="${r.m?r.m+"-"+r.date:r.date}" aria-label="delete">✕</button>`}</div>`).join("")}</div>`:""}`:""}
    ${!ad?`
      <div class="hands"><span>Plate</span><div class="small">${esc(g.plate)}</div><span>Water</span><div class="small">${esc(g.fast?g.water:"")}</div><span>Fasting</span><div class="small">${esc(g.fast)}</div></div>
      <p class="eyebrow">Growth log ${I("growth")}</p>
      ${miniChart(ws,"weight")}${miniChart(ws,"height")}
      ${ro?"":growthForm(m)}
      ${ws.length?`<div class="log">${ws.slice().reverse().slice(0,6).map(r=>`<div class="r"><span>${fmtDate(r.date)}</span><span>${Number(r.weight).toFixed(1)} kg</span><span class="muted">${r.height?Number(r.height).toFixed(1)+" cm":""}</span>${ro?"<span></span>":`<button data-a="delw" data-d="${r.m+"-"+r.date}" aria-label="delete">✕</button>`}</div>`).join("")}</div>`:`<p class="small muted">No entries yet. Monthly is plenty. The app shows the trend only; percentiles and growth charts are for the paediatrician.</p>`}
      <p class="eyebrow">Tips</p><ul class="small">${CHILD_TIPS.slice(0,3).map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:""}
    `}
    </div></details>`}).join("")}
  <p class="small muted">Child guidance follows the Qānūn al-Thuluth rules: growth first, no restriction, practice fasts only from 7 and only by the parents' choice. It is education, not medical advice.</p>`;
}

