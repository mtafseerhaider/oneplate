/* ---------- Quran course progress: one document quran/progress {done:{idx:date}, flag:{idx:true}} ---------- */
function qState(i){const p=S.qprog||{};if((p.flag||{})[i])return "revisit";if((p.done||{})[i])return "read";return ""}
function qSet(idxs,state){S.qprog=S.qprog||{};S.qprog.done=Object.assign({},S.qprog.done||{});S.qprog.flag=Object.assign({},S.qprog.flag||{});const t=todayStr();idxs.forEach(i=>{i=String(i);delete S.qprog.flag[i];if(state==="read"){S.qprog.done[i]=S.qprog.done[i]||t}else if(state==="revisit"){S.qprog.done[i]=S.qprog.done[i]||t;S.qprog.flag[i]=true}else{delete S.qprog.done[i]}if(Number(i)===qIndex(logDate())){const d=day(t);d.quran=state==="read";persistDay(t)}});persistQprog()}
function qCount(){let n=0;for(let i=0;i<QPLAN.length;i++)if(qState(i))n++;return n}
function qGrid(ro){const cur=qIndex(logDate());return `<div class="qgrid">${QPLAN.map((e,i)=>{const st=qState(i);return `<button class="qc ${st} ${i===cur?"cur":""}" ${ro?"disabled":""} data-a="qcell" data-i="${i}" title="${esc(qRef(e))} · ${esc(e.n)}" aria-label="Reading ${i+1}, ${st||"not read"}">${i+1}</button>`}).join("")}</div>
  <div class="row" style="gap:10px;font-size:12px;color:var(--muted)"><span><i class="qk read"></i> read</span><span><i class="qk revisit"></i> revisit</span><span><i class="qk cur"></i> today</span><span><i class="qk"></i> not yet</span></div>`}
function qStateButtons(i,ro){if(ro)return "";const st=qState(i);return `<div class="seg qstate"><button class="${st==="read"?"on":""}" data-a="qmark" data-i="${i}" data-s="read">${ic("check")} ${tr("Read it")}</button><button class="${st==="revisit"?"on":""}" data-a="qmark" data-i="${i}" data-s="revisit">${ic("flame")} ${tr("Read, revisit later")}</button><button class="${st===""?"on":""}" data-a="qmark" data-i="${i}" data-s="">${tr("Not yet")}</button></div>`}
function qBulk(ro){if(ro)return "";const n=QPLAN.length;return `<details class="flat" style="box-shadow:none" data-qbulk ${S._qbulk?"open":""}><summary style="font-size:13px;padding:9px 0"><span>Bulk update</span>${ic("chev","chev")}</summary><div class="body">
  <div class="form"><label class="f" style="flex:0 1 90px">From<input type="number" id="qb_from" min="1" max="${n}" value="1"></label><label class="f" style="flex:0 1 90px">To<input type="number" id="qb_to" min="1" max="${n}" value="${qIndex(logDate())+1}"></label><button class="btn" type="button" data-a="qbulk" data-s="read">Mark as read</button><button class="btn" type="button" data-a="qbulk" data-s="revisit">Mark to revisit</button><button class="btn ghost" type="button" data-a="qbulk" data-s="">Clear range</button></div>
  <div class="row"><button class="btn" type="button" data-a="qbulkto">${ic("check")} Everything up to today as read</button><button class="btn ghost" type="button" data-a="qclear">Clear all progress</button></div>
  <p class="small muted">Use this after reading ahead or catching up. Nothing here changes the daily rotation; the course still shows today's reading by date.</p></div></details>`}

function quranIndex(){const cur=qIndex(),st=core.courseStats(QPLAN),cnt=qCount();const sur=S._qsurah||QPLAN[cur].s;const rows=QPLAN.map((e,i)=>({e,i})).filter(x=>x.e.s===sur);const su=SURAH_INDEX[sur-1];
  return `<details><summary><span>The ${QPLAN.length}-day course · the whole Quran</span>${ic("chev","chev")}</summary><div class="body"><p class="small muted">One reading a day from your start date (${esc(qStart())}, change it in Settings): ${st.verses.toLocaleString()} verses in ${st.readings} readings, in the Quran's own order, never crossing a surah. ${st.curated} passages are close readings with their own notes from al-Mizan; the rest carry the surah's summary and al-Mizan's statement of its purpose. The course repeats; the second round is where understanding deepens.</p>
  <div class="row between"><label class="f" style="flex:1">Surah<select id="qsurah">${SURAH_INDEX.map(x=>`<option value="${x.n}" ${x.n===sur?"selected":""}>${x.n}. ${esc(x.a)} · ${x.v} verses</option>`).join("")}</select></label><span class="pill soft">${rows.filter(x=>qState(x.i)).length} of ${rows.length} read</span></div>
  <p class="small">${esc(su.s)}</p>
  <div class="scroll"><table class="tbl"><tbody>${rows.map(({e,i})=>`<tr class="${i===cur?"today":""}"><td class="kcal">${qState(i)==="read"?"✓":qState(i)==="revisit"?"↻":""} ${i+1}</td><td><b>${esc(qRef(e))}</b> · ${esc(e.cur?e.n:e.portion)}${e.cur?' <span class="pill soft" style="font-size:10px;padding:1px 7px">close reading</span>':""}<br><span class="small muted">English al-Mizan vol. ${(mizanVol(e.s,e.f)||{}).vol||"?"}${(S.qnotes||{})[e.key]&&S.qnotes[e.key].page?" · p. "+esc(S.qnotes[e.key].page):""}</span></td></tr>`).join("")}</tbody></table></div></div></details>`}

function dayOfYear(d){d=d||new Date(logDate()+"T12:00:00");const s=new Date(d.getFullYear(),0,1);return Math.floor((d-s)/864e5)}
function pick(arr,off,back){const i=dayOfYear()-(back||0)+(off||0);return arr[((i%arr.length)+arr.length)%arr.length]}
function weekTheme(){return THEMES[Math.floor(dayOfYear()/7)%THEMES.length]}
function learnMember(){const ids=members().map(m=>m.id);if(!S._lm||!ids.includes(S._lm))S._lm=isOwner?"tafseer":(readOnly?"uzma":"uzma");return S._lm}
function canWriteFor(id){if(readOnly)return false;if(isOwner)return true;return id!=="tafseer"}

function lcard(icon,title,body,extra){return `<section class="card"><div class="row between"><p class="eyebrow">${ic(icon)} ${title}</p>${extra||""}</div>${body}</section>`}
function vLearn(){
  const t=logDate(),d=day(t),mId=learnMember(),m=member(mId),kid=m.role==="child",ro=!canWriteFor(mId);
  const V=pick(VERSES),W=pick(WORDS),T=pick(TEACHINGS),ST=pick(STORIES),ID=pick(IDEAS),B=pick(BOOKS),SU=pick(SURAHS),Q=pick(QUESTIONS),DU=kid?pick(DUAS.slice(0,10)):pick(DUAS),P=pick(POEMS);
  const done=!!((d.learn||{})[mId]),circle=!!d.circle,theme=weekTheme();
  const jr=((d.journal||{})[mId])||{};
  const rv=[1,7,30].map(b=>({b,v:pick(VERSES,0,b),w:pick(WORDS,0,b)}));
  return `
  <div class="hdr"><div><p class="eyebrow">${theme} week · ${hijriLabel(hijriOf(t))} · day ${dayOfYear()+1}</p><h1>${tr("Learn")}</h1></div><div class="row" style="gap:8px">${readOnly?"":logPicker(t)}<span class="pill soft">${ic("book")} ${esc(theme)} ${I("theme")}</span></div></div>
  ${logBar(t)}
  <div class="seg">${members().map(x=>`<button class="${x.id===mId?"on":""}" data-a="lm" data-v="${x.id}">${esc(x.name)}</button>`).join("")}</div>
  <p class="small muted">${kid?`${esc(m.name)}'s layer: every item explained for a child, to read together. Tap a name above to switch.`:`${esc(m.name)}'s daily set. Two layers for every item: the children's version is under their names.`} ${I("twolayer")}</p>
  ${kid?"":quranCard(d,ro)}
  ${lcard("book",tr("Verse of the day")+" "+I("verse"),`<p class="small muted">Quran ${esc(V.r)} · ${esc(V.c)}</p><h3>${esc(V.m)}</h3><p class="small">${esc(kid?V.k:V.a)}</p><p class="small"><b>Do:</b> ${esc(V.do)}</p>`)}
  ${lcard("bolt",tr("Word of the day")+" "+I("word"),`<div class="row between"><h3>${esc(W.t)} <span class="muted" dir="rtl">${esc(W.ar)}</span></h3><span class="kcal">root ${esc(W.rt)}</span></div><p class="small">${esc(kid?W.k:W.m)}</p><p class="small muted">${esc(W.u)}</p>`)}
  ${lcard("moon","Teaching · the Prophet and the Ahl al-Bayt "+I("teaching"),`<p class="small muted">${esc(T.w)}</p><h3 style="font-weight:500">"${esc(T.q)}"</h3><p class="small">${esc(kid?T.k:T.a)}</p><p class="small muted">${esc(T.src)} · ${esc(T.v)}</p><div class="row">${reviewBadge(contentKey("teaching",T))}</div>${reviewPanel(contentKey("teaching",T),T.q)}`)}
  ${lcard("home",tr("Story of the day")+" "+I("story"),`<h3>${esc(ST.t)}</h3><p class="small muted">Quran ${esc(ST.r)}</p><p class="small">${esc(kid?ST.k:ST.s)}</p><p class="small"><b>Moral:</b> ${esc(ST.m)}</p><p class="small"><b>Together:</b> ${esc(ST.f)}</p><div class="row">${reviewBadge(contentKey("story",ST))}</div>${reviewPanel(contentKey("story",ST),ST.t)}`)}
  ${kid?"":lcard("book","Surah of the day "+I("surah"),`<h3>${SU.n}. ${esc(SU.a)} <span class="muted" style="font-weight:400">· ${esc(SU.t)}</span></h3><p class="small muted">${SU.v} verses · ${esc(SU.p)}</p><p class="small">${esc(SU.s)}</p><p class="small"><b>Lesson:</b> ${esc(SU.l)}</p><p class="small muted"><b>For the children:</b> ${esc(SU.k)}</p><div class="note" style="border-left-color:var(--green)"><b>Al-Mizan on its purpose</b><br>${esc(SURAH_INDEX[SU.n-1].mz)}</div><div class="row">${reviewBadge("surah-"+SU.n)}</div>${reviewPanel("surah-"+SU.n,SU.a)}`)}
  ${lcard("sun",tr("Idea of the day")+" "+I("idea"),`<h3>${esc(ID.t)}</h3><p class="small muted">${esc(ID.w)}</p><p class="small">${esc(kid?ID.k:ID.i)}</p><p class="small"><b>Apply:</b> ${esc(ID.d)}</p>`)}
  ${kid?"":lcard("book","Book of the day "+I("bookday"),`<h3>${esc(B.t)}</h3><p class="small muted">${esc(B.w)} · ${esc(B.y)}</p><p class="small"><b>Why it matters:</b> ${esc(B.why)}</p><p class="small"><b>Core idea:</b> ${esc(B.core)}</p><p class="small"><b>Takeaway:</b> ${esc(B.take)}</p><p class="small muted"><b>Next step:</b> ${esc(B.next)}</p>`)}
  ${lcard("egg",tr("Dua of the day")+" "+I("dua"),`<h3 style="font-weight:500">${esc(DU.t)}</h3><p class="small">${esc(DU.m)}</p><p class="small muted">${esc(DU.r)} · ${esc(DU.w)}</p>`)}
  ${lcard("flame",tr("Poem of the day")+" "+I("poem"),`<p style="white-space:pre-line;font-family:var(--display);font-size:16px;line-height:1.4">${esc(P.l)}</p><p class="small muted">${esc(P.w)} · ${esc(P.s)}</p>${kid?`<p class="small">${esc(P.k)}</p>`:""}`)}
  ${lcard("clock",tr("Question of the day")+" "+I("question"),`<h3 style="font-weight:500">${esc(kid?pick(KID_Q):Q)}</h3>${kid?"":`<p class="small muted">From the Quran program's Track 8: reflection should lead to action.</p>`}`,
    ro?(done?`<span class="pill green">${ic("check")} done</span>`:""):`<button class="btn ${done?"":"primary"}" data-a="learndone" data-m="${mId}">${done?ic("check")+" Done today":"Mark today's learning done"}</button>`)}
  ${kid?"":`<section class="card"><p class="eyebrow">${ic("book")} Reflection journal · ${esc(m.name)} ${I("journal")}</p>
    ${ro?(Object.keys(jr).length?`<div class="hands">${["learned","surprised","question","action"].map(k=>jr[k]?`<span>${k}</span><div class="small">${esc(jr[k])}</div>`:"").join("")}</div>`:`<p class="small muted">No entry today.</p>`):`<div class="form" style="flex-direction:column;align-items:stretch">
      <label class="f">What I learned<input type="text" data-j="learned" data-m="${mId}" value="${esc(jr.learned||"")}" maxlength="200"></label>
      <label class="f">What surprised me<input type="text" data-j="surprised" data-m="${mId}" value="${esc(jr.surprised||"")}" maxlength="200"></label>
      <label class="f">A question I have<input type="text" data-j="question" data-m="${mId}" value="${esc(jr.question||"")}" maxlength="200"></label>
      <label class="f">Next action<input type="text" data-j="action" data-m="${mId}" value="${esc(jr.action||"")}" maxlength="200"></label>
    </div><p class="small muted">Saves when you leave a field. The Bayan template: learned, surprised, questions, applications, next actions.</p>`}
  </section>`}
  <section class="card accent">
    <div class="row between"><p class="eyebrow">${ic("family")} ${tr("Family circle tonight · 5 minutes")} ${I("circle")}</p>${circle?`<span class="pill green">${ic("check")} done</span>`:""}</div>
    <ol class="small"><li><b>Verse:</b> ${esc(V.k)}</li><li><b>Story:</b> ${esc(ST.t)}. ${esc(ST.m)}</li><li><b>Ask Abbas and Eliyya:</b> ${esc(pick(KID_Q))}</li><li><b>Dua together:</b> ${esc(pick(DUAS.slice(0,10)).t)}</li></ol>
    ${readOnly?"":`<button class="btn ${circle?"":"primary"} wide" data-a="circle">${circle?tr("Cancel"):tr("We did the family circle")}</button>`}
  </section>
  ${quranIndex()}
  ${reviewSummary()}
  <details><summary><span>Review: 1, 7 and 30 days ago ${I("spaced")}</span>${ic("chev","chev")}</summary><div class="body">
    ${rv.map(r=>`<div class="hands"><span>${r.b} day${r.b>1?"s":""}</span><div class="small"><b>${esc(r.w.t)}</b>: ${esc(r.w.m)}<br><span class="muted">Quran ${esc(r.v.r)}: ${esc(r.v.m)}</span></div></div>`).join("")}
    <p class="small muted">Spaced review intervals from the Quran program's retention track: 1, 7, 30, 90 days, 1 year.</p>
  </div></details>
  <details><summary><span>Surah index</span>${ic("chev","chev")}</summary><div class="body"><div class="scroll"><table class="tbl"><tbody>${SURAHS.map(s=>`<tr><td class="kcal">${s.n}</td><td><b>${esc(s.a)}</b> · ${esc(s.t)}<br><span class="small muted">${esc(s.s)}</span></td></tr>`).join("")}</tbody></table></div></div></details>
  <details><summary><span>All stories</span>${ic("chev","chev")}</summary><div class="body">${STORIES.map(s=>`<p class="small"><b>${esc(s.t)}</b> (${esc(s.r)}): ${esc(s.m)}</p>`).join("")}</div></details>
  <details><summary><span>All teachings</span>${ic("chev","chev")}</summary><div class="body">${TEACHINGS.map(x=>`<p class="small"><b>${esc(x.w)}:</b> "${esc(x.q)}" <span class="muted">${esc(x.src)} · ${esc(x.v)}</span></p>`).join("")}<p class="small muted">Verification labels follow the Bayan dua program: "graded" quotes a named grading; "received" means the attribution as found in the named work, not yet checked against the printed edition. Nothing here is a ruling.</p></div></details>
  ${vReference()}`;
}
function wellbeingCard(d,ro){
  const V=pick(VERSES);const body=doneCount(d)>=4,mind=!!((d.learn||{}).tafseer),heart=!!(d.mood&&d.grat),soul=!!(d.soul||d.quran||qState(qIndex())==="read"),fam=!!d.circle;
  const dim=(ok,label,icon)=>`<span class="pill ${ok?"green":"grey"}">${ic(icon)} ${label}</span>`;
  const MOODS=["Low","Meh","OK","Good","Great"];
  return `<section class="card">
    <div class="row between"><p class="eyebrow">${ic("sun")} ${tr("Whole self today")} ${I("wholeself")}</p><span class="kcal">${[body,mind,heart,soul,fam].filter(Boolean).length}/5</span></div>
    <div class="row" style="gap:6px">${dim(body,tr("Body"),"bike")}${dim(mind,tr("Mind"),"book")}${dim(heart,tr("Heart"),"flame")}${dim(soul,tr("Soul"),"moon")}${dim(fam,tr("Family"),"family")}</div>
    <div class="crow"><span class="lead" style="color:var(--red)">${ic("flame")}</span><div class="t"><b>${tr("Mood")} ${I("mood")}</b><div class="seg" style="margin-top:4px">${MOODS.map((x,i)=>`<button class="${d.mood===i+1?"on":""}" ${ro?"disabled":""} data-a="mood" data-v="${i+1}">${tr(x)}</button>`).join("")}</div></div></div>
    <div class="crow"><span class="lead">${ic("bed")}</span><div class="t"><b>${tr("Sleep last night")}</b><small>Target 7.5–8 h, lights out 10:45</small></div>${ro?`<b class="kcal">${d.sleep?d.sleep+" h":"—"}</b>`:`<input type="number" id="sleepH" step="0.5" min="0" max="14" value="${d.sleep||""}" placeholder="h" style="width:72px">`}</div>
    <div class="crow"><span class="lead" style="color:var(--green)">${ic("check")}</span><div class="t"><b>${tr("Three things I am grateful for")}</b>${ro?`<small>${esc(d.grat||"—")}</small>`:`<input type="text" id="gratIn" value="${esc(d.grat||"")}" placeholder="family, health, today's bread…" maxlength="200" style="margin-top:4px">`}</div></div>
    <div class="crow sw-row ${soul?"done":""}" role="switch" aria-checked="${soul}" ${ro?"":`tabindex="0" data-a="soul"`}><span class="lead" style="color:var(--accent-text)">${ic("moon")}</span><div class="t"><b>${tr("Verse of the day read")}</b><small>Quran ${esc(V.r)}: ${esc(V.m.length>70?V.m.slice(0,70)+"…":V.m)}</small></div><span class="sw"><i></i></span></div>
    <div class="row"><button class="btn ghost" data-a="tab" data-v="learn">${ic("book")} ${tr("Open today's learning")}</button></div>
  </section>`;
}

