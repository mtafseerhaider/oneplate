/* ---------- meal maths ---------- */
function allMeals(){const o=S.meals||{};const list=BASE_MEALS.map(b=>{const v=o[b.id];if(v&&v.deleted)return null;return Object.assign({},b,v||{},{base:true})}).filter(Boolean);Object.values(o).forEach(v=>{if(v&&v.id&&/^c_/.test(v.id)&&!v.deleted)list.push(Object.assign({},v,{base:false}))});return list}
function tonightMeal(){const l=allMeals();if(!l.length)return null;const d=S.days[logDate()];if(d&&d.meal){const m=l.find(x=>x.id===d.meal);if(m)return m}const dt=new Date(logDate()+"T12:00:00");return l[(dt.getDate()+dt.getMonth())%l.length]}
function foodOptions(sel){const cats=[["protein","Protein"],["veg","Vegetables"],["carb","Carbs"],["fat","Fats"],["plus","Daal, dairy & extras"]];return cats.map(c=>`<optgroup label="${c[1]}">${Object.keys(FOODS).filter(k=>FOODS[k].cat===c[0]).map(k=>`<option value="${k}" ${k===sel?"selected":""}>${esc(FOODS[k].n)} · ${esc(FOODS[k].ur||"")} · per ${esc((UNITS[FOODS[k].u]||[""])[0]||"item")}</option>`).join("")}</optgroup>`).join("")}
function mealTotals(d){const t=mealCalc(d);const line=handLine(d);return `${mbar(t)}<p class="small"><b>By hand:</b> ${line?esc(line):"<span class='muted'>add foods to see the portions</span>"}</p>`}
function mealEditor(d){return `
  <section class="card" id="meditor">
    <div class="row between"><p class="eyebrow">${ic("plate")} ${d.id?"Edit meal":"New meal"}</p>${d.base?`<span class="pill grey">built-in</span>`:`<span class="pill soft">custom</span>`}</div>
    <div class="form">
      <label class="f" style="flex:2 1 180px">Name<input type="text" id="me_n" value="${esc(d.n||"")}" placeholder="e.g. Chicken Karahi Plate" maxlength="60"></label>
      <label class="f">Type<select id="me_tag">${["chicken","beef","fish","meatless","other"].map(t=>`<option value="${t}" ${d.tag===t?"selected":""}>${t}</option>`).join("")}</select></label>
    </div>
    <div class="erows">
      ${d.items.map((it,i)=>`<div class="erow">${it.x?`<div class="t" style="flex:1"><b>${esc(it.x.n)}</b><small>${tr("from a scan")} · ${esc(UNITS[it.x.u][1])} · ${it.x.kcal} kcal each</small></div>`:`<select data-me="food" data-i="${i}" aria-label="food">${foodOptions(it.f)}</select>`}<input type="number" data-me="qty" data-i="${i}" value="${it.q}" min="0" max="12" step="0.5" inputmode="decimal" aria-label="how many"><button class="btn ghost" type="button" data-a="me_del" data-i="${i}" aria-label="remove">✕</button></div>`).join("")}
    </div>
    <button class="btn" type="button" data-a="me_add">+ Add a food</button>
    <div id="mtot">${mealTotals(d)}</div>
    <label class="f">Why it works (optional)<input type="text" id="me_note" value="${esc(d.note||"")}" maxlength="200"></label>
    <div class="row">
      <button class="btn primary" type="button" data-a="me_save">Save meal</button>
      <button class="btn" type="button" data-a="me_cancel">Cancel</button>
      ${d.base&&S.meals[d.id]?`<button class="btn ghost" type="button" data-a="me_reset">Reset to default</button>`:""}
      ${d.id?`<button class="btn ghost" type="button" data-a="me_delete" style="color:var(--red)">${d.base?"Hide":"Delete"}</button>`:""}
    </div>
    <p class="small muted">Values are per hand portion, from the plan's food table. Change a food or quantity and the calories, protein, carbs, fat and the by-hand line update instantly.</p>
  </section>`}

function vToday(){
  const t=logDate(),isToday=t===todayStr(),d=day(t),wd=new Date(t+"T12:00:00").getDay(),plan=planFor(wd),w=weekNo(),hint=nowHint(),ro=readOnly;
  const G=gc(),H=G.habits,on=!!S.fast.startedAt,goal=S.settings.fastHours||21,hd=core.habitsDone(d,H),dn=hd.done,st=streak();
  const h=new Date().getHours()+new Date().getMinutes()/60;
  const roMe=readOnly||!isOwner;
  const tonight=tonightMeal();
  const hj=hijriOf(t),sf=sunnahFast(t),ram=ramadanActive(),ft=ram?fastingTimes(t):null;
  let kv="";
  if(on){const s=new Date(S.fast.startedAt),e=new Date(s.getTime()+goal*36e5);kv=`<div class="kv"><span>Started</span><b>${s.toLocaleDateString(undefined,{weekday:"short"})} ${fmtClock(s)}</b><span>Goal at</span><b>${e.toLocaleDateString(undefined,{weekday:"short"})} ${fmtClock(e)}</b></div>`}
  else kv=`<div class="kv"><span>Goal</span><b id="kvGoal">${ram&&ft?((ft.maghrib-ft.fajr)/36e5).toFixed(1):goal} h</b><span>Last fast</span><b>${S.fast.lastHours?S.fast.lastHours.toFixed(1)+" h":"—"}</b></div>`;
  const T=G.tabs;
  const C={};
  C.fast=G.fast?`  <section class="card">
    <div class="row between"><p class="eyebrow">${ic("clock")} ${tr("Fast")} ${I("fast")}</p><span class="status ${on?"on":""}"><i></i>${tr(on?"Fasting":"Eating window")}</span></div>
    <div class="hero">
      <div class="ring"><svg viewBox="0 0 120 120"><defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent-2)"/><stop offset="1" style="stop-color:var(--accent)"/></linearGradient></defs><circle class="track" cx="60" cy="60" r="52"/><circle class="bar" id="ringBar" cx="60" cy="60" r="52" stroke-dasharray="326.7" stroke-dashoffset="326.7"/></svg>
        <div class="lbl">${on?`<b id="ringTime"></b><span id="ringSub"></span>`:`${ic("moon")}<span id="ringSub">not fasting</span><b id="ringTime" hidden></b>`}</div></div>
      <div class="side">
        ${kv}
        ${roMe?"":on?`<button class="btn primary wide" data-a="endfast">${ic("egg")} ${tr("End fast, eat")}</button><div class="row" style="justify-content:center;gap:0"><button class="btn ghost" data-a="cancelfast">${tr("Cancel")}</button><button class="btn ghost" data-a="ftimes">${tr("Set times")}</button></div>`:`<button class="btn primary wide" data-a="startfast">${ic("moon")} ${tr("Start fast now")}</button><div class="row" style="justify-content:center;gap:0"><button class="btn ghost" data-a="startfast930">From 9:30 PM</button><button class="btn ghost" data-a="ftimes">Set times</button></div>`}
      </div>
    </div>
    ${S._ft&&!roMe?`<form class="form" id="fform" autocomplete="off" style="border-top:1px solid var(--line);padding-top:12px">
      <label class="f">Fast started<input type="datetime-local" id="f_start" value="${dtl(S.fast.startedAt||(()=>{const x=new Date();x.setHours(21,30,0,0);if(x>new Date())x.setDate(x.getDate()-1);return x})())}" required></label>
      <label class="f">Fast ended (leave empty if still fasting)<input type="datetime-local" id="f_end" value=""></label>
      <button class="btn primary" type="submit">Save times</button><button class="btn" type="button" data-a="ftcancel">Cancel</button>
      <p class="small muted" style="flex-basis:100%">Enter both times to log a finished fast. Enter only the start to correct the running one.</p>
    </form>`:""}
  </section>`:"";
  C.ramadan=G.fast?`  ${ram&&ft?`<section class="card" style="border-color:var(--green)">
    <div class="row between"><p class="eyebrow">${ic("moon")} Ramadan · ${esc(ft.city)} ${I("ramadan")}</p><span class="pill green">${hj.day} Ramadan</span></div>
    <div class="bento">
      <div class="tile"><b>${fmtClock(ft.fajr)}</b><span>suhoor ends (Fajr) ${I("suhoor")}</span></div>
      <div class="tile"><b>${fmtClock(ft.maghrib)}</b><span>iftar (Maghrib) ${I("iftar")}</span></div>
    </div>
    <p class="small" id="rCount"></p>
    ${roMe?"":on?"":`<button class="btn wide" data-a="rfajr">${ic("moon")} I'm fasting since Fajr</button>`}
    <p class="small muted">Imsak ${fmtClock(ft.imsak)} (Fajr − 10 min, a reminder only). Karachi calculation method, Fajr 18°. Local moon sighting may shift the date: adjust the Hijri offset in Settings. The app suggests times; it never rules.</p>
  </section>`:""}`:"";
  C.now=`  ${isToday?`<section class="card accent">
    <p class="eyebrow">${ic(hintIcon(h))} ${tr("Right now")}</p>
    <h2>${esc(hint[0])}</h2><p class="small">${esc(hint[1])}</p>
  </section>`:""}`;
  C.session=T.includes("train")?`  <section class="card">
    <div class="row between"><p class="eyebrow">${ic(KIND_ICON[plan.k]||"bike")} ${tr("Today's session")} ${I(plan.k==="strength"?"strength":plan.k==="cycle"?"cycle":"recovery")}</p><span class="pill ${plan.k==="rest"?"green":plan.k==="cycle"?"blue":"amber"}">${esc(plan.t)}</span></div>
    <p class="small">${esc(plan.d)}</p>
  </section>`:"";
  C.habits=H.length?`  <section class="card">
    <div class="row between"><p class="eyebrow">${tr("Check-ins")} · ${dn} / ${hd.total} ${I("backdate")}</p>${roMe?"":`<div class="row" style="gap:8px">${logPicker(t)}<button class="btn ghost" data-a="habits_all">${ic("check")} ${tr("All done")}</button></div>`}</div>
    <div class="checks">
      ${H.includes("water")?`<div class="crow"><span class="lead" style="color:var(--blue)">${ic("drop")}</span><div class="t"><b>${tr("Water")} ${I("water")}</b><small>700 ml bottles · ${((d.water||0)*0.7).toFixed(1)} L today · aim 4–5</small>${dots("water",d.water||0,6,roMe,"")}</div></div>`:""}
      ${H.includes("palms")?`<div class="crow"><span class="lead" style="color:var(--accent-text)">${ic("egg")}</span><div class="t"><b>${tr("Protein palms")} ${I("palms")}</b><small>4 minimum · 5 on training days</small>${dots("palms",d.palms||0,6,roMe,"palms")}</div></div>`:""}
      ${H.includes("starter")?swRow("starter",tr(G.starterLabel),G.starterLabel==="Break the fast well"?"Water, dates or fruit, then protein; the plate twenty minutes later":"≈7:00 PM · yogurt + 2 eggs, or whey",d.starter,roMe,"home","starter"):""}
      ${H.includes("train")?swRow("train",plan.t+" done",plan.k==="rest"?"Recovery day: a long walk counts":"",d.train,roMe,KIND_ICON[plan.k]||"bike","cycle"):""}
      ${H.includes("walk")?swRow("walk",tr("Walk after dinner"),"10–15 min within 30 min of the last bite",d.walk,roMe,"walk","walk"):""}
      ${H.includes("steps")?swRow("steps",tr("8,000 steps"),"Or your current phase target",d.steps,roMe,"foot","steps"):""}
      ${d.health?`<p class="small muted" style="margin:6px 0 0">${ic("trend")} From Apple Health${d.health.steps!==undefined?" · "+Number(d.health.steps).toLocaleString()+" steps":""}${d.health.sleepMin?" · "+(d.health.sleepMin/60).toFixed(1)+" h sleep":""}${d.health.cycleMin?" · "+d.health.cycleMin+" min cycling":""}${d.health.activeKcal?" · "+d.health.activeKcal+" kcal active":""}${d.health.at?" · "+esc(String(d.health.at).slice(11,16)):""}</p>`:""}
      ${H.includes("closed")?swRow("closed",tr("Kitchen closed by 9:30 PM"),G.fast?"Then start the fast":"Nothing after it but water",d.closed,roMe,"moon","closed"):""}
    </div>
  </section>`:"";
  C.quran=T.includes("learn")?quranCard(d,roMe,true):"";
  C.wellbeing=wellbeingCard(d,roMe);
  C.dinner=T.includes("plate")?`  <section class="card">
    <div class="row between"><p class="eyebrow">${ic("clock")} ${tr("Mindful dinner · 20 minutes")} ${I("thuluth")}</p>${S._meal?`<span class="pill green" id="mealT">00:00</span>`:""}</div>
    <p class="small" id="mealMsg">${S._meal?"":"Water 20–30 min before. Bismillah. Protein first, roti or rice last, spoon down between bites. Stop at about 80 % full."}</p>
    ${roMe?"":S._meal?`<button class="btn" data-a="mealstop">${tr("Finished eating")}</button>`:`<button class="btn wide" data-a="mealstart">${ic("plate")} ${tr("Start the 20-minute meal timer")}</button>`}
  </section>`:"";
  C.tonight=T.includes("plate")?`  ${tonight?`<section class="card link" role="link" tabindex="0" data-a="tab" data-v="plate">
    <div class="row between"><p class="eyebrow">${ic("plate")} ${tr("Tonight's plate")}${(d.meal&&d.meal===tonight.id)?" · chosen":" · suggested"}</p>${ic("chev","")}</div>
    <h3>${esc(tonight.n)}</h3>
    <p class="small muted">${esc(handLine(tonight))} · ${mealCalc(tonight).kcal} kcal</p>
    <p class="small muted"><b>Cook for the family:</b> ${esc(cookQuantities(tonight).join(" · "))}</p>  </section>`:""}`:"";
  C.tarbiyah=T.includes("tarbiyah")?tbTodayCard(t,roMe):"";
  const cardsOrder={fast:["fast","ramadan","now","session","habits","quran","wellbeing","dinner","tonight","tarbiyah"],ramadan:["ramadan","fast","now","habits","quran","wellbeing","dinner","tonight","tarbiyah"],plate:["now","tonight","dinner","habits","quran","wellbeing","tarbiyah","fast","ramadan"],learn:["now","quran","wellbeing","tarbiyah","habits","fast","ramadan","session","dinner","tonight"],tarbiyah:["now","tarbiyah","quran","wellbeing","habits","fast","ramadan","session","dinner","tonight"]}[G.lead];
  return `
  <div class="hdr"><div><p class="eyebrow">${DAYS[wd]} · ${new Date(t+"T12:00:00").toLocaleDateString(undefined,{day:"numeric",month:"long"})} · ${hijriLabel(hj)} ${I("hijri")}</p><h1>${isToday?tr(greeting()):tr("Catching up")}${whoAmI()?`, ${esc(whoAmI())}`:""}</h1>${whoAmI()?`<p class="small muted" style="margin:2px 0 0">${tr("Signed in as")} ${esc(whoAmI())}${typeof window.oneplate==="object"?" · "+esc(tr(window.oneplate.level()==="owner"?"owner":window.oneplate.level()==="contributor"?"family editor":"viewer")):isOwner?" · "+tr("owner"):readOnly?"":" · "+tr("family editor")}</p>`:""}</div>
   <div class="row" style="gap:6px">${sf?`<span class="pill green">${ic("moon")} ${esc(sf.t)} ${I("sunnahfast")}</span>`:""}<span class="pill soft">Week ${w} · ${phase(w).n} ${I("phase")}</span></div></div>
  ${ro?`<div class="note">You are viewing ${esc((member(ownerId())||{}).name||"this family")}'s OnePlate. Everything here is live. Tap any <b>i</b> for a plain explanation.</div>`:!isOwner?`<div class="note">This is ${esc((member(ownerId())||{}).name||"the owner")}'s day. You can log for the family on the <b>Family</b> tab${T.includes("learn")?", your own journal on the <b>Learn</b> tab":""}${T.includes("plate")?", and edit meals on the <b>Plate</b> tab":""}.</div>`:""}
  ${logBar(t)}
  ${goalsSet()||ro?"":goalSetupCard()}
  <section class="card strip">
    <div class="mini"><svg viewBox="0 0 48 48"><circle class="t" cx="24" cy="24" r="20"/><circle class="b" cx="24" cy="24" r="20" stroke-dasharray="125.7" stroke-dashoffset="${(125.7*(1-(hd.total?dn/hd.total:0))).toFixed(1)}"/></svg><b>${hd.total?`${dn}/${hd.total}`:ic("sun")}</b></div>
    <div class="txt"><b>${hd.total&&dn===hd.total?"Perfect day":dn>=hd.total/2&&dn>0?"Good day so far":"Today's habits"}</b><small>${hd.total?`${dn} of ${hd.total} done · ${H.map(h=>({water:"water",palms:"protein",starter:"starter",train:"session",walk:"walk",steps:"steps",closed:"kitchen closed"})[h]).join(", ")}`:esc(G.title)}</small></div>
    <div class="streak">${ic("flame")}${st}<small style="font-weight:500">day${st===1?"":"s"}</small> ${I("streak")}</div>
  </section>
  ${cardsOrder.map(k=>C[k]||"").join("")}`;
}
function arc(cx,cy,r,a0,a1){const p=a=>[cx+r*Math.cos(a*Math.PI/180),cy+r*Math.sin(a*Math.PI/180)];const [x0,y0]=p(a0),[x1,y1]=p(a1);return `M${cx} ${cy}L${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${a1-a0>180?1:0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z`}
function plateSvg(){return `<svg viewBox="0 0 160 160" role="img" aria-label="Plate: half vegetables, a quarter protein, a quarter carbs, a thumb of fat">
  <circle cx="80" cy="80" r="76" fill="var(--panel2)" stroke="var(--line)" stroke-width="2"/>
  <path d="${arc(80,80,62,90,270)}" fill="var(--green-soft)" stroke="var(--panel)" stroke-width="2"/>
  <path d="${arc(80,80,62,270,360)}" fill="var(--soft)" stroke="var(--panel)" stroke-width="2"/>
  <path d="${arc(80,80,62,0,90)}" fill="var(--amber-soft)" stroke="var(--panel)" stroke-width="2"/>
  <circle cx="80" cy="80" r="8" fill="var(--panel)" stroke="var(--muted)" stroke-width="1.5"/>
  <text x="46" y="84" text-anchor="middle" font-family="Outfit,sans-serif" font-size="11" font-weight="600" fill="var(--green)">2 fists</text>
  <text x="108" y="56" text-anchor="middle" font-family="Outfit,sans-serif" font-size="11" font-weight="600" fill="var(--accent-text)">2 palms</text>
  <text x="108" y="112" text-anchor="middle" font-family="Outfit,sans-serif" font-size="11" font-weight="600" fill="var(--amber)">1 hand</text>
</svg>`}
function mbar(m){const p=m.p*4,c=m.c*4,f=m.f*9,t=p+c+f;return `<div class="mbar"><i class="p" style="width:${(p/t*100).toFixed(0)}%"></i><i class="c" style="width:${(c/t*100).toFixed(0)}%"></i><i class="f" style="width:${(f/t*100).toFixed(0)}%"></i></div><div class="mkey"><span><b>${m.kcal}</b> kcal ${I("kcal")}</span><span><i style="background:var(--accent)"></i>P <b>${m.p}g</b></span><span><i style="background:var(--amber)"></i>C <b>${m.c}g</b></span><span><i style="background:var(--muted)"></i>F <b>${m.f}g</b> ${I("macros")}</span></div>`}
function vPlate(){
  const filt=S._mf||"all",ro=readOnly;
  const tonight=tonightMeal();
  const meals=allMeals();
  const list=meals.filter(m=>filt==="all"||m.tag===filt);
  const ed=S._medit;
  return `
  <div class="hdr"><div><p class="eyebrow">${tr("Build by hand, no scales")}</p><h1>${tr("The Plate")}</h1></div></div>
  ${scanCard()}
  <section class="card">
    <div class="platewrap">${plateSvg()}
      <div class="legend">
        <div class="lg"><i style="background:var(--accent)"></i><div class="lt"><b>2 palms <em>protein</em> ${I("palm")}</b><span>chicken · beef · fish · eggs · paneer</span></div></div>
        <div class="lg"><i style="background:var(--green)"></i><div class="lt"><b>2 fists <em>vegetables</em> ${I("fist")}</b><span>salad · sabzi · kachumber</span></div></div>
        <div class="lg"><i style="background:var(--amber)"></i><div class="lt"><b>1 cupped hand <em>carbs</em> ${I("cupped")}</b><span>rice, or 1 roti. Never both.</span></div></div>
        <div class="lg"><i style="background:var(--muted)"></i><div class="lt"><b>1 thumb <em>fat</em> ${I("thumb")}</b><span>measured oil · ghee · cream</span></div></div>
      </div></div>
    <p class="small muted">Plus 1 bowl of yogurt ${I("bowl")}. About 800–950 kcal and 60–75 g protein. On a night with no starter, add 1 palm and 1 bowl.</p>
  </section>
  ${tonight?`<section class="card accent">
    <p class="eyebrow">${ic("plate")} ${((S.days[logDate()]||{}).meal===tonight.id)?"Tonight's plate · chosen":"Tonight's suggestion"}</p>
    <h2>${esc(tonight.n)}</h2>
    ${mbar(mealCalc(tonight))}
    <p class="small">${esc(handLine(tonight))}</p>
  </section>`:""}
  <section class="card">
    <p class="eyebrow">${ic("home")} Course 1 · starter at home, ≈7:00 PM ${I("starter")}</p>
    <div class="list">${STARTERS.map(s=>`<div class="item"><div class="t"><b>${esc(s.n)}</b></div><span class="kcal">${s.kcal} kcal · P ${s.p}</span></div>`).join("")}</div>
    <p class="small muted">Dinner at 8:00 PM. Kitchen closed 9:30 PM.</p>
  </section>
  <div class="hdr"><h2>${meals.length} ${tr("dinners")}</h2>${ro?`<span class="small muted">${list.length} shown</span>`:`<button class="btn" type="button" data-a="me_new">+ ${tr("New meal")}</button>`}</div>
  ${ed&&!ed.id?mealEditor(ed):""}
  <div class="seg">${["all","chicken","beef","fish","meatless","other"].map(k=>`<button class="${filt===k?"on":""}" data-a="mf" data-v="${k}">${k}</button>`).join("")}</div>
  ${list.map(m=>{if(ed&&ed.id===m.id)return mealEditor(ed);const t=mealCalc(m),g=hands(m);return `<details ${S._mopen===m.id?"open":""} data-mid="${m.id}"><summary><span>${esc(m.n)}${m.base?"":` <span class="pill soft" style="font-size:10px;padding:1px 7px">custom</span>`}${m.base&&S.meals[m.id]?` <span class="pill grey" style="font-size:10px;padding:1px 7px">edited</span>`:""}<br><span class="kcal">${t.kcal} kcal · ${t.p} g protein</span></span>${ic("chev","chev")}</summary><div class="body">
    ${mbar(t)}
    <div class="hands"><span>Protein</span><div>${esc(g.protein.join(" · ")||"—")}</div><span>Veg</span><div>${esc(g.veg.join(" · ")||"—")}</div><span>Carbs</span><div>${esc(g.carb.join(" · ")||"—")}</div><span>Fat</span><div>${esc(g.fat.join(" · ")||"—")}</div><span>Plus</span><div>${esc(g.plus.join(" · ")||"—")}</div></div>
    <p class="small muted" dir="rtl" style="text-align:right">${esc(normItems(m.items).map(it=>qtyStr(it.q)+" "+(foodOf(it).ur||foodOf(it).n)).join(" · "))}</p>
    <details class="flat" style="box-shadow:none"><summary style="font-size:13px;padding:9px 0"><span>Family portions · cook: ${esc(cookQuantities(m).join(" · "))}</span>${ic("chev","chev")}</summary><div class="body"><div class="hands">${members().map(mm=>`<span>${esc(mm.name)}</span><div class="small">${memberPortions(m,mm).length?esc(memberPortions(m,mm).join(" · "))+(mm.role==="child"?" + seconds if hungry":""):"milk-based"}</div>`).join("")}</div></div></details>
    ${m.note?`<p class="small muted">${esc(m.note)}</p>`:""}
    ${ro?"":`<div class="row"><button class="btn ${(S.days[logDate()]||{}).meal===m.id?"primary":""}" type="button" data-a="tonight" data-id="${m.id}">${(S.days[logDate()]||{}).meal===m.id?ic("check")+" "+tr("Tonight's plate"):tr("Set as tonight's plate")}</button><button class="btn ghost" type="button" data-a="me_edit" data-id="${m.id}">${tr("Edit meal")}</button></div>`}
    </div></details>`}).join("")}
  ${list.length?"":`<p class="small muted">No meals of this type yet.</p>`}
  <div class="note">Three cooking rules: measure oil with a tablespoon, roti without ghee, salad on the plate first.</div>`;
}
function vTrain(){
  const w=weekNo(),ph=phase(w),wd=new Date().getDay(),on=strengthOn();
  const steps=w<=2?"6,000":w<=6?"7,500":"8,000+";
  const need=S.settings.unlockKg||5,lost=Math.max(0,lostKg()),pct=Math.min(100,lost/need*100);
  const unlockAt=planReady()?(Number(S.settings.startWeight)-need).toFixed(1):"—";
  const today=planFor(wd);
  return `
  <div class="hdr"><div><p class="eyebrow">Week ${w} · ${esc(ph.n)} phase ${I("phase")}</p><h1>${tr("Training")}</h1></div></div>
  <section class="card">
    <div class="week">${[1,2,3,4,5,6,0].map(i=>{const p=planFor(i);return `<div class="wday ${p.k} ${i===wd?"today":""}"><span class="ib">${ic(KIND_ICON[p.k]||"bike")}</span>${DAYS[i].slice(0,3)}</div>`}).join("")}</div>
    <div class="row between"><p class="eyebrow">${ic(KIND_ICON[today.k]||"bike")} Today</p><span class="pill ${today.k==="rest"?"green":today.k==="cycle"?"blue":"amber"}">${esc(today.t)}</span></div>
    <p class="small">${esc(today.d)}</p>
  </section>
  <section class="card">
    <div class="bento">
      <div class="tile"><b>${steps}</b><span>${ic("foot")} steps / day ${I("steps")}</span></div>
      <div class="tile"><b>120 min</b><span>${ic("bike")} cycling / week ${I("cycle")}</span></div>
      <div class="tile"><b>${on?"3 / wk":"Locked"}</b><span>${ic(on?"dumbbell":"lock")} strength ${I("strength")}</span></div>
      <div class="tile"><b>10 min</b><span>${ic("walk")} walk after dinner ${I("walk")}</span></div>
    </div>
  </section>
  <section class="card ${on?"":"locked"}">
    <div class="row between"><p class="eyebrow">${ic(on?"unlock":"lock")} Strength training ${I("unlock")}</p><span class="pill ${on?"green":"grey"}">${on?"Unlocked":"Locked"}</span></div>
    ${on?`<p class="small">You are ${lost.toFixed(1)} kg down. Three sessions a week, Mon / Wed / Sat. Start creatine now.</p>`:
    `<p class="small">Unlocks at <b>${unlockAt} kg</b>, after the first ${need} kg from fasting, walking and cycling. No equipment needed until then.</p>
     <div class="bar"><i style="width:${pct.toFixed(0)}%"></i></div>
     <div class="row between small muted"><span>${lost.toFixed(1)} of ${need} kg</span><span>${Math.max(0,need-lost).toFixed(1)} kg to go</span></div>`}
  </section>
  <section class="card">
    <p class="eyebrow">${tr("This week")}</p>
    <div class="scroll"><table class="tbl"><tbody>
    ${[1,2,3,4,5,6,0].map(i=>{const p=planFor(i);return `<tr class="${i===wd?"today":""}"><td style="width:44px"><b>${DAYS[i].slice(0,3)}</b></td><td><b>${esc(p.t)}</b><br><span class="muted small">${esc(p.d)}</span></td></tr>`}).join("")}
    </tbody></table></div>
  </section>
  <details open><summary><span>Cycling phases ${I("rpe")}</span>${ic("chev","chev")}</summary><div class="body">
    <div class="scroll"><table class="tbl"><thead><tr><th>Weeks</th><th>Phase</th><th>Rides</th><th>Each ride</th></tr></thead><tbody>
    ${CYCLE.map(c=>`<tr class="${c===ph?"today":""}"><td class="kcal">${c.w}</td><td><b>${c.n}</b><br><span class="small muted">${c.t}/wk</span></td><td class="small">${c.s}</td><td class="small">${esc(c.d)}</td></tr>`).join("")}
    </tbody></table></div>
    <p class="small muted">RPE 3–4: full sentences. 5–6: short sentences. 7–8: a few words. Saddle high enough that the knee stays slightly bent at the bottom. If the left shin or knee is sore the next day, repeat the previous week.</p>
  </div></details>
  <details><summary><span>Walking plan ${I("steps")}</span>${ic("chev","chev")}</summary><div class="body">
    <ul class="small"><li><b>Weeks 1–2:</b> 6,000 steps. 15-min morning walk, two 5-min office walks, 10-min post-dinner walk.</li><li><b>Weeks 3–6:</b> 7,500. Add the 15-min lunch-hour walk.</li><li><b>Week 7+:</b> 8,000–10,000. Add a 45–60-min Sunday walk.</li></ul>
    <p class="small muted">Add ~500 steps/day per week. If the left leg aches, hold the level for a week instead of regressing.</p>
  </div></details>
  <details><summary><span>Strength plan ${on?"":"(preview)"} ${I("strength")}</span>${ic("chev","chev")}</summary><div class="body">
    <p class="small muted">${on?"Add one rep per set each session until you hit 12, then add 1–2.5 kg and go back to 8.":"This is what starts after the first 5 kg. Equipment later: a pair of adjustable dumbbells, a mat, a sturdy chair, a resistance band."}</p>
    <div class="scroll"><table class="tbl"><thead><tr><th>Exercise</th><th>Sets × reps</th><th>Leg note</th></tr></thead><tbody>
    ${STRENGTH.map(r=>`<tr><td>${esc(r[0])}</td><td class="kcal">${esc(r[1])}</td><td class="small muted">${esc(r[2])}</td></tr>`).join("")}
    </tbody></table></div>
    <p class="small muted">Session B for variety: overhead press 3×8–12 · step-ups (low step, both legs) 3×8 · band pull-aparts 3×15 · side plank 3×20–30 s · dead bug 3×10. One deload week every 6–8 weeks ${I("deload")}.</p>
  </div></details>
  <details><summary><span>Leg rules ${I("nail")}</span>${ic("chev","chev")}</summary><div class="body">
    <ul class="small"><li>Walking, cycling and, later, progressive strength work are good for the healed tibia.</li><li>No running, jumping or plyometrics until an orthopaedic surgeon clears them.</li><li>Stop signs: pain at the front of the knee (nail entry), pain at screw sites, swelling past the next morning, a limp, pain that worsens over a week.</li></ul>
  </div></details>`;
}
function vProgress(){
  const st=S.settings,ws=weighList(),ro=readOnly||!isOwner;
  const last=ws[ws.length-1],first=ws[0],prev=ws[ws.length-2];
  const cur=currentWeight();
  if(!gc().weights)return `<div class="hdr"><div><p class="eyebrow">${esc(gc().title)}</p><h1>${tr("Progress")}</h1></div></div>${habitSummaryCard()}${accountCard()}${ro?"":settingsSection(st)}`;
  if(!planReady())return `<div class="hdr"><div><p class="eyebrow">${tr("Progress")}</p><h1>${tr("Progress")}</h1></div></div>${planSetupCard(ro)}${accountCard()}${ro?"":settingsSection(st)}`;
  const lost=(st.startWeight-cur),togo=cur-st.targetWeight,total=Math.max(0.1,st.startWeight-st.targetWeight),pct=Math.max(0,Math.min(100,lost/total*100));
  let rate=null,eta="—";
  if(ws.length>=2){const days=(new Date(last.date)-new Date(first.date))/864e5;if(days>=6){rate=(first.weight-last.weight)/(days/7);if(rate>0.05){const wk=togo/rate;const d=new Date(last.date+"T00:00:00");d.setDate(d.getDate()+Math.round(wk*7));eta=d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}else eta="stalled"}}
  const delta=prev?Number(last.weight)-Number(prev.weight):null;
  const w=weekNo();
  const sw=Number(st.startWeight),tw=Number(st.targetWeight),endWk=Math.max(8,Math.ceil((sw-tw)/0.5)+2),kg=(wk)=>`${Math.max(tw,sw-0.75*wk).toFixed(1)}–${Math.max(tw,sw-0.5*wk).toFixed(1)} kg`;
  const cps=[[4,"4 weeks",kg(4),"−2 to −4 cm waist"],[8,"8 weeks",kg(8),"−4 to −7 cm"],[12,"12 weeks",kg(12),"−6 to −10 cm"],[endWk,`${endWk-2}–${endWk+2} weeks`,`${tw} kg`,"≈ −1 cm per kg"]].filter((c,i,a)=>i===a.length-1||c[0]<endWk);
  return `
  <div class="hdr"><div><p class="eyebrow">Week ${w} · ${ws.length} weigh-in${ws.length===1?"":"s"}</p><h1>${tr("Progress")}</h1></div>${rate!=null?`<span class="pill ${rate>=0.4?"green":rate>0.05?"amber":"red"}">${ic("trend")} ${rate.toFixed(2)} kg / week ${I("rate")}</span>`:""}</div>
  <section class="card">
    <div class="bignum"><b>${cur.toFixed(1)}</b><span>${tr("kg now")}</span>${delta!=null?`<span class="pill ${delta<=0?"green":"red"}">${delta<=0?"▼":"▲"} ${Math.abs(delta).toFixed(1)} since last</span>`:""}</div>
    <div class="goalbar"><div class="bar"><i style="width:${pct.toFixed(0)}%"></i></div><div class="lbls"><span>${st.startWeight} kg start</span><span>${lost>=0?"−":"+"}${Math.abs(lost).toFixed(1)} kg · ${pct.toFixed(0)}%</span><span>${st.targetWeight} kg goal</span></div></div>
    <div class="bento">
      <div class="tile"><b>${Math.max(0,togo).toFixed(1)}</b><span>${tr("kg to go")}</span></div>
      <div class="tile"><b style="font-size:17px">${eta}</b><span>projected ${st.targetWeight} kg ${I("projected")}</span></div>
    </div>
    ${chart(ws)}
  </section>
  <section class="card">
    <p class="eyebrow">${ic("scale")} ${ro?"Weigh-ins":"Log weigh-in"} ${I("waist")}</p>
    ${ro?"":`<p class="small muted">Monday mornings, after the toilet, before water. Same scale, same floor.</p><form class="form" id="wform" autocomplete="off">
      <label class="f">Date<input type="date" id="wdate" value="${logDate()}" max="${todayStr()}" required></label>
      <label class="f">Weight kg<input type="number" id="wkg" step="0.1" min="40" max="200" inputmode="decimal" placeholder="${cur.toFixed(1)}" required></label>
      <label class="f">Waist cm<input type="number" id="wcm" step="0.5" min="50" max="200" inputmode="decimal" placeholder="optional"></label>
      <button class="btn primary" type="submit">Save</button>
    </form>`}
    ${ws.length?`<div class="log">${ws.slice().reverse().slice(0,12).map((r,i,arr)=>{const n=arr[i+1];const dd=n?Number(r.weight)-Number(n.weight):null;return `<div class="r"><span>${fmtDate(r.date)}</span><span>${Number(r.weight).toFixed(1)} kg</span><span class="${dd!=null&&dd<0?"d":"muted"}">${dd!=null?(dd<=0?"−":"+")+Math.abs(dd).toFixed(1):""}${r.waist?" · "+Number(r.waist).toFixed(1)+" cm":""}</span>${ro?"<span></span>":`<button data-a="delw" data-d="${r.date}" aria-label="delete">✕</button>`}</div>`}).join("")}</div>`:`<p class="small muted">No weigh-ins yet. The first entry sets the baseline and starts the chart.</p>`}
  </section>
  <section class="card">
    <p class="eyebrow">Checkpoints</p>
    <div class="timeline">${cps.map((c,i)=>`<div class="tl ${w>=c[0]?"hit":""}"><div class="n"><i></i>${i<cps.length-1?"<s></s>":""}</div><div class="c"><b>${c[1]}</b><span>${c[2]} · ${c[3]}</span></div></div>`).join("")}</div>
    <p class="small muted">Weeks 1–2 show 1.5–3 kg of mostly water. Take a maintenance week every 8–10 weeks ${I("maintenance")}.</p>
  </section>
  <details><summary><span>Plateau checklist ${I("plateau")}</span>${ic("chev","chev")}</summary><div class="body"><ul class="small">
    <li>Audit the 7 days: cheat meals (1), kitchen past 9:30, chai with milk during the fast, cold drinks, naan, second cupped hand.</li>
    <li>Re-measure oil with a tablespoon for a week.</li>
    <li>Nuts, dates, dried fruit: one small handful a day.</li>
    <li>Weekend creep: Sunday must be the light plate.</li>
    <li>Under 7,000 steps? Add a 15-min walk.</li>
    <li>Drop the carb portion on rest days (Boti Salad Bowl).</li>
    <li>Sleep under 7 h? Fix that before cutting food.</li>
    <li>Below 76 kg maintenance is ≈150 kcal lower: add 2,000 steps or keep the smaller rest-day plate.</li>
    <li>Still stuck after 6 weeks: TSH, HbA1c, vitamin D, medication review.</li></ul></div></details>
  ${accountCard()}
  ${ro?"":settingsSection(st)}`;
}
function habitSummaryCard(){const G=gc(),H=G.habits,st=streak(),days=[];for(let i=6;i>=0;i--){const dt=new Date();dt.setDate(dt.getDate()-i);const k=dt.toISOString().slice(0,10);days.push([k,S.days[k]||{}])}
  const perfect=H.length?days.filter(([,d])=>core.habitsDone(d,H).done===H.length).length:0,fasts=days.filter(([,d])=>d.fastHours>0).length,circles=days.filter(([,d])=>d.circle).length,quran=days.filter(([,d])=>d.quran||d.learn).length;
  const tiles=[[String(st),tr("day streak")],...(H.length?[[`${perfect}/7`,tr("perfect days this week")]]:[]),...(G.fast?[[`${fasts}/7`,tr("fasts logged")]]:[]),...(G.tabs.includes("learn")?[[`${quran}/7`,tr("learning days")]]:[]),[`${circles}/7`,tr("family circles")]];
  const tb=G.tabs.includes("tarbiyah")&&typeof tbDoneCount==="function"?tbParents().map(p=>`${esc(p.name)} ${tbDoneCount(p.id)}/${TARBIYAH.length}`).join(" · "):"";
  return `<section class="card"><p class="eyebrow">${ic("trend")} ${tr("This week")} ${I("streak")}</p><div class="bento">${tiles.map(([b,l])=>`<div class="tile"><b>${b}</b><span>${l}</span></div>`).join("")}</div>${tb?`<p class="small muted" style="margin-top:8px">${tr("Tarbiyah lectures done")}: ${tb}</p>`:""}<p class="small muted">${tr("No scales here: this family's goal is")} ${esc(G.title)}. ${tr("Streaks count a day as kept when every configured habit is done, or, with no habits, when something was logged.")}</p></section>`}
function chart(ws){
  const st=S.settings,W=360,H=190,L=34,R=10,T=12,B=26;
  const start=new Date(st.startDate+"T00:00:00");
  const planWeeks=Math.max(8,Math.ceil((st.startWeight-st.targetWeight)/0.5)+2);
  let endMs=start.getTime()+planWeeks*7*864e5;
  if(ws.length){endMs=Math.max(endMs,new Date(ws[ws.length-1].date+"T00:00:00").getTime()+14*864e5)}
  const span=endMs-start.getTime();
  const ys=[st.startWeight,st.targetWeight].concat(ws.map(w=>Number(w.weight)));
  const ymin=Math.floor(Math.min.apply(null,ys))-1,ymax=Math.ceil(Math.max.apply(null,ys))+1;
  const X=ms=>L+(ms-start.getTime())/span*(W-L-R),Y=v=>T+(ymax-v)/(ymax-ymin)*(H-T-B);
  let g="";for(let v=ymin;v<=ymax;v+=(ymax-ymin>12?4:2)){g+=`<line class="grid" x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text x="${L-6}" y="${(Y(v)+3).toFixed(1)}" text-anchor="end">${v}</text>`}
  const months=[];let m=new Date(start.getFullYear(),start.getMonth()+1,1);while(m.getTime()<endMs){months.push(m);m=new Date(m.getFullYear(),m.getMonth()+1,1)}
  const xl=months.map(d=>`<text x="${X(d.getTime()).toFixed(1)}" y="${H-8}" text-anchor="middle">${d.toLocaleDateString(undefined,{month:"short"})}</text>`).join("");
  const expEnd=start.getTime()+((st.startWeight-st.targetWeight)/0.5)*7*864e5;
  const exp=`<line class="exp" x1="${X(start.getTime()).toFixed(1)}" y1="${Y(st.startWeight).toFixed(1)}" x2="${X(Math.min(expEnd,endMs)).toFixed(1)}" y2="${Y(Math.max(st.targetWeight,st.startWeight-0.5*(Math.min(expEnd,endMs)-start.getTime())/864e5/7)).toFixed(1)}"/>`;
  const tgt=`<line class="tgt" x1="${L}" x2="${W-R}" y1="${Y(st.targetWeight).toFixed(1)}" y2="${Y(st.targetWeight).toFixed(1)}"/>`;
  const pts=ws.map(w=>[X(new Date(w.date+"T00:00:00").getTime()),Y(Number(w.weight))]);
  let act="";if(pts.length){const path=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");const lp=pts[pts.length-1];act=`<path fill="url(#areaGrad)" d="${path} L${lp[0].toFixed(1)} ${(H-B).toFixed(1)} L${pts[0][0].toFixed(1)} ${(H-B).toFixed(1)} Z"/><path class="act" d="${path}"/>`+pts.slice(0,-1).map(p=>`<circle class="pt" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3"/>`).join("")+`<circle class="ptl" cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="4.5"/>`}
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight over time against the expected 0.5 kg per week line"><defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.3"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>${g}${xl}${tgt}${exp}${act}</svg><div class="mkey"><span><i style="background:var(--accent)"></i>your weigh-ins</span><span><i style="background:var(--muted)"></i>plan, 0.5 kg/week</span><span><i style="background:var(--green)"></i>target</span></div>`;
}
function glossaryList(q){q=(q||"").trim().toLowerCase();const keys=Object.keys(G).filter(k=>!["sync","local","viewonly"].includes(k));const hits=q?keys.filter(k=>(G[k][0]+" "+G[k][1]).toLowerCase().includes(q)):keys.slice(0,6);return hits.length?hits.map(k=>`<button data-a="info" data-k="${k}"><b>${esc(G[k][0])}</b><span>${esc(G[k][1])}</span></button>`).join(""):`<p class="small muted">No term matches "${esc(q)}".</p>`}
function vReference(){
  const f=S._ff||"all";
  const items=FAST.filter(i=>f==="all"||i.g===f);
  return `
  <div class="hdr" style="margin-top:8px"><h2>${tr("Reference")}</h2></div>
  <div class="search">${ic("search")}<input type="search" id="gq" placeholder="Search any term: palm, RPE, plateau, creatine…" value="${esc(S._gq||"")}" autocomplete="off"></div>
  <div class="glist" id="gres">${glossaryList(S._gq)}</div>
  <section class="card">
    <p class="eyebrow">${ic("bolt")} The only 5 rules</p>
    <div class="rules">
      <div><p><b>One plate, built by hand, once a day.</b> 2 palms protein · 2 fists veg · 1 cupped hand rice or 1 roti · 1 thumb fat · 1 bowl yogurt. Protein first.</p></div>
      <div><p><b>During the fast, drink only what has nothing in it.</b> Water, black coffee, plain tea.</p></div>
      <div><p><b>Four palms of protein every day.</b> One in the starter when you reach home, three at dinner.</p></div>
      <div><p><b>Move every day.</b> 8,000 steps with a walk after dinner, four 30-minute rides a week. Strength joins after the first 5 kg.</p></div>
      <div><p><b>One cheat meal, Saturday 7 PM, and the kitchen closes at 9:30 PM.</b> Not a cheat day. Not a second dinner.</p></div>
    </div>
  </section>
  <div class="hdr"><h2>Fasting traffic light</h2></div>
  <p class="small muted">Three ways to define a fast: strict ${I("strict")}, fat-loss ${I("fatloss")}, autophagy ${I("autophagy")}. Fat-loss is the one that matters here.</p>
  <div class="seg">${[["all","All"],["green","Green"],["amber","Yellow"],["red","Red"]].map(k=>`<button class="${f===k[0]?"on":""}" data-a="ff" data-v="${k[0]}">${k[1]}</button>`).join("")}</div>
  <div class="list">${items.map(i=>`<div class="item ${i.g}"><div class="t"><b>${esc(i.n)}</b><small>Strict: ${esc(i.s)} · Fat-loss: ${esc(i.f)} · Autophagy: ${esc(i.a)}</small><small>${esc(i.note)}</small></div><span class="kcal">${esc(i.k)} kcal</span></div>`).join("")}</div>
  <p class="small muted">Green: use freely. Yellow: small calories; fine for fat loss, better in the window. Red: sugar, insulin, hunger an hour later.</p>
  <details><summary><span>Sunnah of eating · guidance, not rulings ${I("thuluth")}</span>${ic("chev","chev")}</summary><div class="body">
    <div class="note">"It is sufficient for the son of Adam to eat a few morsels to keep his back straight. If he must, then one third for his food, one third for his drink and one third for his breath." Jami' al-Tirmidhi 2380; Sunan Ibn Majah 3349 (graded sahih by al-Albani).</div>
    <ul class="small">
      <li><b>Rule of thirds on the plate:</b> half vegetables, a quarter protein, a quarter grain. Water 20–30 min before, sips during, freely 30–60 min after. About 20 minutes per meal; stop at 70–80 % full. Self-check: "Could I eat more if I had to?" (Tirmidhi 2380)</li>
      <li><b>Bismillah, right hand, from what is in front of you.</b> (Sahih al-Bukhari 5376; Sahih Muslim 2022)</li>
      <li><b>Drink sitting, in three breaths, not in one go.</b> (Sahih Muslim 2028)</li>
      <li><b>Food for two is enough for three.</b> Share the plate; serve less, add if needed. (Sahih al-Bukhari 5392)</li>
      <li><b>Never criticise food.</b> Eat it or leave it quietly. (Sahih al-Bukhari 5409; Sahih Muslim 2064)</li>
      <li><b>Praise Allah after eating.</b> Gratitude is part of the meal. (Sahih Muslim 2734)</li>
      <li><b>Suhoor has blessing in it.</b> Never skip it in Ramadan; take it close to Fajr. (Sahih al-Bukhari 1923; Sahih Muslim 1095)</li>
      <li><b>Break the fast with dates and water</b>, then pray, then eat. (Sunan Abi Dawud 2356; Jami' al-Tirmidhi 696)</li>
      <li><b>Chai an hour after the meal, not with it</b>: tea tannins reduce iron absorption. (Nutrition evidence, not a narration.)</li>
    </ul>
    <p class="small muted">References as collected in the Qānūn al-Thuluth project; hadith gradings there are pending scholar review except where stated. Narrations are presented as the Prophetic tradition of eating, not as medicine. For rulings on fasting or food, ask a qualified scholar.</p>
  </div></details>
  <details><summary><span>Ramadan plan ${I("ramadan")}</span>${ic("chev","chev")}</summary><div class="body">
    <p class="small">The app switches to Ramadan mode by the Hijri date (or force it in Settings). Goal in Ramadan: hold your weight, keep protein, keep walking. Fat loss resumes after Eid.</p>
    <div class="scroll"><table class="tbl"><tbody>
      ${[["Fajr − 60","Suhoor alarm"],["Suhoor","Slow carbs (daliya, whole-wheat roti, barley talbina) + protein (eggs, yogurt, daal) + fluid-rich foods. 2–3 glasses spread out. Low salt, nothing fried."],["Imsak","Last sips, 10 min before Fajr"],["Day","Water none; walk in the shade; no hard training"],["Maghrib","1–3 dates + 250 ml water, then pray"],["+20–30 min","OnePlate iftar: soup or salad first, normal dinner portion, 20 minutes. One small fried item a week at most."],["+1 h","400 ml water, two glasses spaced"],["After Taraweeh","Fruit, yogurt or milk if hungry. 400 ml water. Easy 30-min ride or walk if energy allows."],["Before sleep","250 ml water. Lights out early; suhoor comes fast."]].map(r=>`<tr><td class="kcal" style="white-space:nowrap">${r[0]}</td><td class="small">${esc(r[1])}</td></tr>`).join("")}
    </tbody></table></div>
    <p class="small"><b>Weekly themes:</b> week 1 rhythm (suhoor daily, dates and water, pray); week 2 the Thuluth iftar (soup first, normal portion, wait 20 min); week 3 hydration (spread water, fewer salty and fried foods); week 4 lighter meals for the last ten nights, plan Eid without overeating.</p>
    <p class="small muted">Stop signs while fasting: dizziness, fainting, very dark urine or no urine for 6+ hours, vomiting, confusion. Break the fast, drink, eat, and see a doctor. Fasting with diabetes medication, pregnancy or any daily medicine needs a clinician's say first.</p>
  </div></details>
  <details><summary><span>Cheat meal rules ${I("cheat")}</span>${ic("chev","chev")}</summary><div class="body">
    <p class="small">Saturday 7 PM, in place of dinner, finished by 8:30. One meal, not a day.</p>
    <ul class="small"><li><b>Biryani:</b> 2 heaped cupped hands rice max, all the chicken you want, salad and raita first.</li><li><b>Pizza:</b> 3 thin slices (2 thick) with a salad. No garlic bread, no stuffed crust.</li><li><b>Burger:</b> single patty. If fries, one fist, shared.</li><li><b>BBQ:</b> unlimited tikka and kebab, one naan.</li><li><b>Nihari:</b> one bowl, pour off the oil, half to one naan.</li></ul>
    <p class="small muted">Protein first, salad before the main, one plate no refill, water or diet drink, 20 minutes minimum, 15-min walk after. Expect +1–2 kg Sunday from salt; gone by Tuesday.</p>
  </div></details>
  <details><summary><span>Eating out ranking</span>${ic("chev","chev")}</summary><div class="body">
    <ol class="small"><li>Chicken tikka</li><li>Seekh kebab</li><li>Grilled fish</li><li>Daal (less tarka)</li><li>Chicken karahi (leave the oil pool)</li><li>Haleem (skip poured oil, ½ naan)</li><li>Pulao (1 cupped hand)</li><li>Biryani</li><li>Nihari</li><li>Burger</li><li>Pizza</li><li>Fried chicken</li></ol>
    <p class="small muted">Decide before you arrive. Roti instead of naan. Share rice dishes and take extra chicken. Weddings count as that week's cheat meal.</p>
  </div></details>
  <details><summary><span>Supplements</span>${ic("chev","chev")}</summary><div class="body"><ul class="small">
    <li><b>Whey</b> ${I("whey")}: yes. 1 scoop as the starter or with dinner.</li><li><b>Creatine monohydrate</b> ${I("creatine")}: yes, 3–5 g daily once strength unlocks. Expect 1–2 kg water in week 1.</li><li><b>Vitamin D3</b> ${I("vitd")}: yes, 1,000–2,000 IU with dinner; test if you can.</li><li><b>Magnesium:</b> optional, 200–400 mg glycinate at night for cramps or sleep.</li><li><b>Omega-3:</b> optional, 1–2 g EPA+DHA if you don't eat oily fish twice a week.</li><li><b>Electrolytes</b> ${I("electrolytes")}: no product needed; ¼ tsp salt in 1 L water.</li></ul>
    <p class="small muted">Skip fat burners, keto pills, ACV gummies, green-tea extract, detox teas, BCAAs.</p></div></details>
  <details><summary><span>Warning signs</span>${ic("chev","chev")}</summary><div class="body"><ul class="small">
    <li><b>Fatigue over a week:</b> add a cupped hand of carbs for a week; check sleep; consider an earlier starter.</li><li><b>Dizziness standing:</b> salt in water morning and afternoon; persistent → doctor.</li><li><b>Performance down 2 weeks:</b> carbs on all training days, deload week.</li><li><b>Soreness past 48 h:</b> confirm 4–5 palms protein; repeat last week's training.</li><li><b>Sleep disrupted:</b> earlier dinner, no caffeine after 2 PM, yogurt at 9 PM is fine.</li><li><b>Strength dropping, arms thinner:</b> 5 palms, maintenance week.</li><li><b>Persistent left-leg pain, swelling, night pain:</b> stop impact and heavy leg loading; orthopaedic review and X-ray.</li><li><b>Numbness, tingling, left-leg weakness:</b> medical review promptly.</li></ul>
    <p class="small muted">The fix is almost never a longer fast or a smaller plate. It is more protein, more sleep, a maintenance week, or a doctor.</p></div></details>
  <details><summary><span>Daily routine</span>${ic("chev","chev")}</summary><div class="body"><div class="scroll"><table class="tbl"><tbody>
    ${[["6:45","Wake. 500 ml water + pinch of salt."],["7:00","15–20-min walk."],["7:25","Black coffee #1."],["8:00","Leave."],["9:30","Coffee #2 or green tea."],["10:30","Water. 5-min walk."],["12:30","Lunch-hour walk 15 min, then black tea."],["14:00","Last caffeine."],["15:30","Herbal tea. 5-min walk."],["16:30","Water."],["18:00","Leave work. Water on the bike."],["19:00","Home. Protein starter. Fast ends."],["19:30","Cycle 30 min or walk."],["20:00","OnePlate dinner, protein first, 20 min."],["20:45","10–15-min walk."],["21:30","Kitchen closed. Fast starts."],["22:00","Screens dim. Calf stretch."],["22:45","Lights out."]].map(r=>`<tr><td class="kcal">${r[0]}</td><td class="small">${esc(r[1])}</td></tr>`).join("")}
  </tbody></table></div></div></details>
  <details><summary><span>When to see a doctor first</span>${ic("chev","chev")}</summary><div class="body"><ul class="small"><li>Diabetes, blood pressure, heart, kidney, liver or gout history, or any daily medication.</li><li>Baseline bloods: CBC, fasting glucose/HbA1c, lipids, vitamin D, B12, TSH, liver and kidney, uric acid. Repeat vitamin D and lipids at 12 weeks.</li><li>Orthopaedic review before any running, jumping or sport on the nailed leg ${I("nail")}.</li></ul><p class="small muted">OnePlate is educational and does not replace individual medical advice.</p></div></details>`;
}


/* ---------- Notifications and Apple Health, on the self-hosted build ---------- */
const PUSH_KINDS=[["fastEnd","Fast complete",true],["starter","Protein starter · 7 pm",true],["weighin","Weigh-in Friday morning",true],["circle","Family circle · 8:30 pm",false],["quran","Quran reading · 9:30 pm",false]];
function notifCard(){const ps=S._push;if(!window.oneplate.pushSupported||!window.oneplate.pushSupported())return `<p class="eyebrow" style="margin-top:10px">Notifications ${I("push")}</p><p class="small muted">This browser cannot show app notifications. On iPhone, install OnePlate to the Home Screen first (Share → Add to Home Screen) and open it from there.</p>`;
  if(!ps)return `<p class="eyebrow" style="margin-top:10px">Notifications ${I("push")}</p><div class="row"><button class="btn sm" data-a="push_status">Check this device</button></div>`;
  const prefs=ps.prefs||{};
  return `<p class="eyebrow" style="margin-top:10px">Notifications ${I("push")}</p>
  ${ps.device?`<p class="small">On for this device. ${ps.permission==="granted"?"":"Permission: "+esc(ps.permission)}</p>`:`<p class="small muted">${ps.permission==="denied"?"Notifications are blocked for this site in the browser settings.":"Off on this device."}</p>`}
  <div class="form" style="flex-direction:column;align-items:stretch;gap:4px">${PUSH_KINDS.filter(k=>gc().reminders.includes(k[0])).filter(k=>isOwner||!k[2]).map(([k,l])=>`<label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" data-pk="${k}" ${prefs[k]===false?"":"checked"} style="width:auto"> ${l}</label>`).join("")}</div>
  <div class="row"><button class="btn ${ps.device?"":"primary"} sm" data-a="push_on">${ic("check")} ${ps.device?"Save choices":"Turn on for this device"}</button>${ps.device?`<button class="btn ghost sm" data-a="push_test">Send a test</button><button class="btn ghost sm" data-a="push_off">Turn off</button>`:""}</div>
  <p class="small muted">Times follow the household's time zone (${esc((S.settings||{}).city||"karachi")}). Each reminder is sent once and only when the thing is not already done.</p>`}
function healthCard(){const t=S._ingest;const mine=members().filter(m=>m.role!=="child"&&(isOwner||m.id!==ownerId()));
  return `<p class="eyebrow" style="margin-top:10px">Apple Health ${I("health")}</p>
  <p class="small muted">A web app cannot read Health itself. An iPhone Shortcut can, and can send the numbers here every night: weight, steps, sleep, cycling minutes and active energy then fill Today and Progress by themselves. Each person gets their own address; keep it private.</p>
  <div class="row">${mine.map(m=>`<button class="btn sm" data-a="ingest_new" data-m="${m.id}">${ic("trend")} Address for ${esc(m.name)}</button>`).join("")}<button class="btn ghost sm" data-a="ingest_list">Existing</button></div>
  ${S._ingestNew?`<div class="note"><b>${esc(S._ingestNew.name)}'s Health address</b><input type="text" id="ingestUrl" readonly value="${esc(S._ingestNew.url)}" style="margin-top:6px;font-family:var(--mono);font-size:12px"><div class="row" style="margin-top:6px"><button class="btn sm" data-a="ingest_copy">Copy</button></div></div>`:""}
  ${(t||[]).length?`<div class="hands" style="margin-top:6px">${t.map(x=>`<span>${esc((member(x.member_id)||{}).name||x.member_id)}</span><div class="small">${x.disabled?"revoked":`used ${x.uses}×${x.last_used_at?" · last "+esc(String(x.last_used_at).slice(0,16).replace("T"," ")):" · never yet"} <button class="btn sm ghost" style="color:var(--red)" data-a="ingest_revoke" data-id="${esc(x.id)}">Revoke</button>`}</div>`).join("")}</div>`:""}
  <details class="flat" style="box-shadow:none"><summary style="font-size:13px;padding:9px 0"><span>Build the Shortcut on the iPhone · 5 minutes</span>${ic("chev","chev")}</summary><div class="body"><ol class="small">
    <li>Open <b>Shortcuts</b>, tap <b>+</b>, name it <b>OnePlate Health</b>.</li>
    <li>Add <b>Find Health Samples</b>: Type <b>Weight</b>, Sort by Start Date, Latest First, Limit 1. Then add <b>Get Details of Health Sample</b> → <b>Value</b>. Rename this result <b>Weight</b> (tap the variable, Rename).</li>
    <li>Add <b>Find Health Samples</b>: Type <b>Steps</b>, filter Start Date <b>is today</b>. Add <b>Calculate Statistics</b> → <b>Sum</b>. Rename it <b>Steps</b>.</li>
    <li>Add <b>Find Health Samples</b>: Type <b>Sleep Analysis</b>, filter Value <b>is Asleep</b> and End Date <b>is today</b>. Add <b>Get Details of Health Sample</b> → <b>Duration</b>, then <b>Calculate Statistics</b> → <b>Sum</b>. Rename it <b>SleepMin</b> (the duration is in minutes).</li>
    <li>Add <b>Find Workouts</b>: Type <b>Cycling</b>, Start Date <b>is today</b>. Add <b>Get Details of Workout</b> → <b>Duration</b>, then <b>Calculate Statistics</b> → <b>Sum</b>. Rename it <b>CycleMin</b>.</li>
    <li>Add <b>Find Health Samples</b>: Type <b>Active Energy</b>, Start Date <b>is today</b>. Add <b>Calculate Statistics</b> → <b>Sum</b>. Rename it <b>ActiveKcal</b>.</li>
    <li>Add <b>Get Contents of URL</b>. URL: the address above. Method <b>POST</b>, Request Body <b>JSON</b>, and add fields <b>weight</b>, <b>steps</b>, <b>sleepMin</b>, <b>cycleMin</b>, <b>activeKcal</b>, each set to the matching variable. Numbers arrive as "72.4 kg" or "9,120"; the server reads them either way.</li>
    <li>Run it once. The address answers with what it stored. Then <b>Automation</b> tab → <b>+</b> → <b>Time of Day</b>, 10:30 pm, Daily, <b>Run Immediately</b>, and turn off <b>Ask Before Running</b>. If iOS still asks the first night, tap Always Allow.</li></ol>
    <p class="small muted">Reverse direction, optional: a second Shortcut with <b>Get Contents of URL</b> (the address plus <b>/latest</b>), <b>Get Dictionary Value</b> → weight, then <b>Log Health Sample</b> → Weight, so OnePlate's weigh-ins appear in Health. Android has no equivalent for a web app; log by hand there.</p></div></details>`}

function settingsSection(st){return `<details><summary><span>Settings</span>${ic("chev","chev")}</summary><div class="body">
    <form class="form" id="sform" autocomplete="off">
      <div style="flex-basis:100%"><p class="small" style="margin:0 0 4px"><b>${tr("Goals")}</b> ${I("goals")}</p>${goalPicker(gc().goals)}</div>
      ${gc().weights?`<label class="f">Start weight<input type="number" id="s_sw" step="0.1" value="${st.startWeight??""}"></label>
      <label class="f">Target<input type="number" id="s_tw" step="0.1" value="${st.targetWeight??""}"></label>`:""}
      <label class="f">Start date<input type="date" id="s_sd" value="${st.startDate}"></label>
      ${gc().fast?`<label class="f">Fast goal (h)<input type="number" id="s_fh" min="14" max="24" value="${st.fastHours}"></label>`:""}
      ${gc().tabs.includes("train")?`<label class="f">Unlock strength after (kg)<input type="number" id="s_uk" min="1" max="20" step="0.5" value="${st.unlockKg||5}"></label>`:""}
      ${gc().tabs.includes("learn")?`<label class="f">Quran course start date<input type="date" id="s_qs" value="${st.quranStart||st.startDate}"></label>`:""}
      ${gc().tabs.includes("tarbiyah")?`<label class="f">Tarbiyah course start date<input type="date" id="s_tbs" value="${st.tarbiyahStart||st.startDate}"></label>`:""}
      <label class="f">${tr("Appearance")} ${I("appearance")}<select id="s_theme">${THEMES_UI.map(([v,l])=>`<option value="${v}" ${THEME===v?"selected":""}>${tr(l)}${v==="auto"?" · "+tr("follows the device"):""}</option>`).join("")}</select></label>
      ${gc().fast?`<label class="f">City (fasting times)<select id="s_city">${Object.keys(CITIES).map(k=>`<option value="${k}" ${st.city===k?"selected":""}>${CITIES[k][0]}</option>`).join("")}</select></label>
      <label class="f">Ramadan mode<select id="s_ram">${[["auto","Auto (by Hijri date)"],["on","On"],["off","Off"]].map(o=>`<option value="${o[0]}" ${(st.ramadan||"auto")===o[0]?"selected":""}>${o[1]}</option>`).join("")}</select></label>
      <label class="f">Hijri offset (moon sighting)<select id="s_hoff">${[-2,-1,0,1,2].map(v=>`<option value="${v}" ${Number(st.hijriOffset||0)===v?"selected":""}>${v>0?"+"+v:v} day${Math.abs(v)===1?"":"s"}</option>`).join("")}</select></label>
      <label class="f">Sunnah fast days<select id="s_trad">${[["sunni","Sunni (Mon/Thu, Ayyam al-Bid, Arafah, Ashura)"],["shia","Shia (Ayyam al-Bid, Arafah)"]].map(o=>`<option value="${o[0]}" ${(st.tradition||"sunni")===o[0]?"selected":""}>${o[1]}</option>`).join("")}</select></label>`:""}
      <button class="btn" type="submit">Save settings</button>
    </form>
  </div></details>`}
function goalPicker(sel){return `<div class="form" style="flex-direction:column;align-items:stretch;gap:6px">${core.GOALS.map(g=>`<label class="f" style="flex-direction:row;align-items:flex-start;gap:10px"><input type="checkbox" data-goal="${g.id}" ${sel.includes(g.id)?"checked":""} style="width:auto;margin-top:3px"><span><b>${esc(tr(g.title))}</b><br><span class="small muted">${esc(g.blurb)}</span></span></label>`).join("")}</div>`}
function goalSetupCard(){return `<section class="card accent" id="goalsetup"><p class="eyebrow">${ic("sun")} ${tr("What is this family here for?")} ${I("goals")}</p>
  <p class="small">${tr("Pick one or more. The app shows only the tabs, habits and reminders that serve them; the first one you pick leads the day. You can change this any time in Settings.")}</p>
  <form id="goalform" autocomplete="off">${goalPicker([])}<div class="row" style="margin-top:8px"><button class="btn primary" type="submit">${ic("check")} ${tr("Set the goal")}</button><button class="btn ghost" type="button" data-a="goals_all">${tr("Keep everything")}</button></div></form></section>`}
function planSetupCard(ro){const o=member(ownerId())||{};return `<section class="card accent"><p class="eyebrow">${ic("trend")} ${tr("Set up the plan")} ${I("plansetup")}</p>
  <h2>${esc(o.name||tr("Your"))}${o.name?"'s":""} ${tr("plan")}</h2>
  <p class="small">${tr("OnePlate needs two numbers to run the plan: the weight you start from and the weight you are aiming for. Everything else, the fast length, the training unlock, the checkpoints and the projection, is built from them. Children are never part of this; their tab is on Family.")}</p>
  ${ro?`<p class="small muted">${tr("Only the owner can set these.")}</p>`:`<form class="form" id="setupform" autocomplete="off">
    <label class="f">${tr("Start weight (kg)")}<input type="number" id="su_sw" step="0.1" min="30" max="300" inputmode="decimal" required></label>
    <label class="f">${tr("Target weight (kg)")}<input type="number" id="su_tw" step="0.1" min="30" max="300" inputmode="decimal" required></label>
    <label class="f">${tr("Fast goal (h)")}<input type="number" id="su_fh" min="12" max="24" value="${(S.settings||{}).fastHours||16}"></label>
    <button class="btn primary" type="submit">${ic("check")} ${tr("Start the plan")}</button></form>
  <p class="small muted">${tr("A sensible first target is 5 to 10 percent of your start weight; you can change both later in Settings below.")}</p>`}</section>`}

function accountCard(){return (typeof window.oneplate==="object"&&!readOnly)?`<section class="card"><p class="eyebrow">${ic("family")} Account · this household ${I("account")}</p>
    <div class="row">${isOwner?`${members().filter(m=>m.role!=="child"&&m.id!==ownerId()).map(m=>`<button class="btn" data-a="acc_invite" data-m="${m.id}">Invite ${esc(m.name)}</button>`).join("")}<button class="btn" data-a="acc_invite_view">Invite a viewer</button><button class="btn" data-a="acc_export">Export all data</button>`:""}<button class="btn ghost" data-a="acc_signout">Sign out</button>${window.oneplate.isAdmin&&window.oneplate.isAdmin()?`<a class="btn ghost" href="./admin.html">${ic("family")} Admin</a>`:""}${isOwner?`<button class="btn ghost" style="color:var(--red)" data-a="acc_delete">Delete household</button>`:""}</div>
    ${S._inviteCode?`<div class="note">Invite code <b style="font-family:var(--mono);font-size:16px">${esc(S._inviteCode)}</b> · valid 7 days. They create their account at <b>${esc(location.origin)}/account.html?invite=${esc(S._inviteCode)}</b> and it signs them into this household.</div>`:""}
    <div class="row"><button class="btn" data-a="acc_passkey">${ic("check")} Add a passkey to this device</button>${window.oneplate.canInstall&&window.oneplate.canInstall()?`<button class="btn" data-a="acc_install">${ic("plate")} Install as an app</button>`:""}</div>
    <p class="small muted">Live updates: ${window.oneplate.live()?"connected":"polling"}. A passkey lets you sign in with Face ID or fingerprint instead of a password.</p>
    ${isOwner?`<p class="eyebrow" style="margin-top:10px">Family links ${I("familylink")}</p>
    <p class="small muted">A private link per adult. Opening it asks for that person's date of birth (from the Family tab), signs the device in, and offers Face ID or fingerprint so it opens by itself after that.</p>
    <div class="row">${members().filter(m=>m.role!=="child").map(m=>`<button class="btn" data-a="acc_link" data-m="${m.id}">${ic("family")} Link for ${esc(m.name)}</button>`).join("")}</div>
    ${S._link?`<div class="note"><b>${esc(S._link.name)}'s link</b> · open it on their phone or computer:<br><input type="text" id="linkUrl" readonly value="${esc(S._link.url)}" style="margin-top:6px;font-family:var(--mono);font-size:12px"><div class="row" style="margin-top:6px"><button class="btn sm" data-a="acc_link_copy">Copy link</button>${navigator.share?`<button class="btn sm ghost" data-a="acc_link_share">Share…</button>`:""}</div><p class="small muted" style="margin:6px 0 0">Anyone with the link still needs the date of birth. Revoke it below if it leaks.</p></div>`:""}
    ${(S._links||[]).length?`<div class="hands" style="margin-top:6px">${S._links.map(l=>`<span>${esc((member(l.member_id)||{}).name||l.member_id)}</span><div class="small">${l.disabled?"revoked":`${l.level} · used ${l.uses}×${l.last_used_at?" · last "+esc(String(l.last_used_at).slice(0,10)):""} <button class="btn sm ghost" style="color:var(--red)" data-a="acc_link_revoke" data-id="${esc(l.id)}">Revoke</button>`}</div>`).join("")}</div>`:`<p class="small muted"><button class="btn sm ghost" data-a="acc_links">Show existing links</button></p>`}`:""}
    ${notifCard()}
    ${healthCard()}
    <details class="flat" style="box-shadow:none"><summary style="font-size:13px;padding:9px 0"><span>Install on a phone or computer</span>${ic("chev","chev")}</summary><div class="body"><ul class="small"><li><b>Android (Chrome):</b> menu ⋮ → Install app, or the Install button above.</li><li><b>iPhone and iPad (Safari):</b> Share → Add to Home Screen.</li><li><b>macOS (Safari 17+):</b> File → Add to Dock. <b>Chrome / Edge:</b> address-bar install icon.</li><li><b>Windows:</b> Chrome or Edge address-bar install icon.</li></ul><p class="small muted">The installed app opens full screen, works offline for the shell, and keeps you signed in.</p></div></details></section>`:""}
