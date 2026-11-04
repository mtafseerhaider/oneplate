/* ---------- Scholar review workflow: badges, the reviewer's panel and the summary. Two layers: REVIEWS_SHIPPED from the content package, S.reviews from this installation (the API's content_reviews table locally, the reviews/all document in the artifact). ---------- */
function reviewOf(key){return core.reviewOf(key,REVIEWS_SHIPPED,S.reviews)}
function contentKey(kind,item){return core.contentKey(kind,item)}
function reviewBadge(key){const r=reviewOf(key),g=REVIEW_GATES[r.status];const who=r.by?` · ${esc(r.by)}${r.date?" · "+esc(r.date):""}`:"";
  return `<span class="pill ${g.tone}" title="${esc(g.means)}">${r.status==="verified"?ic("check"):r.status==="disputed"?ic("flame"):""} ${tr(g.label)}${who}</span> ${I("review")}${canReview?`<button class="btn ghost sm" type="button" data-a="rvopen" data-k="${key}">${S._rv===key?tr("Close"):tr("Review")}</button>`:""}`}
function reviewPanel(key,title){if(!canReview||S._rv!==key)return "";const r=reviewOf(key);
  return `<div class="card flat rvform" data-rv="${key}"><p class="eyebrow">${ic("book")} Review · ${esc(title||key)}</p>
  <div class="form" style="flex-direction:column;align-items:stretch">
    <label class="f">Status<select id="rv_status">${Object.keys(REVIEW_GATES).map(k=>`<option value="${k}" ${r.status===k?"selected":""}>${REVIEW_GATES[k].label} · ${REVIEW_GATES[k].means.split(".")[0]}</option>`).join("")}</select></label>
    <label class="f">Reviewer<input type="text" id="rv_by" value="${esc(r.by||"")}" placeholder="name, as it will show on the badge" maxlength="80"></label>
    <label class="f">Source checked<input type="text" id="rv_src" value="${esc(r.source||"")}" placeholder="edition, volume, page (required for Verified)" maxlength="200"></label>
    <label class="f">Note<input type="text" id="rv_note" value="${esc(r.note||"")}" placeholder="what was checked, or what is wrong" maxlength="1000"></label>
  </div>
  <div class="row"><button class="btn primary" type="button" data-a="rvsave" data-k="${key}">${ic("check")} Save review</button><button class="btn ghost" type="button" data-a="rvopen" data-k="${key}">${tr("Cancel")}</button></div>
  <p class="small muted">Gates follow the Bayan Library: draft → reviewed (a named reader checked it against the source) → verified (checked against the printed edition, with volume and page). Disputed keeps the note visible with your objection. ${typeof window.oneplate==="object"?"Saved to the shared review table; every household sees it.":"Saved with this household's data."}</p></div>`}
function allContentKeys(){const k=QPLAN.map(e=>e.key);SURAH_INDEX.forEach(s=>k.push("surah-"+s.n));[["teaching",TEACHINGS],["story",STORIES],["book",BOOKS],["verse",VERSES],["word",WORDS],["idea",IDEAS],["dua",DUAS],["poem",POEMS]].forEach(([kind,list])=>list.forEach(t=>k.push(contentKey(kind,t))));return k}
function reviewSummary(){const keys=allContentKeys(),c=core.reviewCounts(keys,REVIEWS_SHIPPED,S.reviews),n=keys.length;const recent=Object.keys(S.reviews).map(k=>Object.assign({k},S.reviews[k])).sort((a,b)=>(b.date||"")<(a.date||"")?-1:1).slice(0,8);
  return `<details ${(S._rq||S._rvx)?"open":""}><summary><span>Scholar review · ${c.verified+c.reviewed} of ${n} checked ${I("review")}</span>${ic("chev","chev")}</summary><div class="body">
  <div class="row" style="gap:6px;flex-wrap:wrap">${Object.keys(REVIEW_GATES).map(k=>`<span class="pill ${REVIEW_GATES[k].tone}">${REVIEW_GATES[k].label} ${c[k]}</span>`).join("")}</div>
  <div class="goalbar"><div class="bar"><i style="width:${((c.verified+c.reviewed)/n*100).toFixed(1)}%"></i></div><div class="lbls"><span>${c.verified} verified · ${c.reviewed} reviewed</span><span>${c.draft} drafts</span></div></div>
  <p class="small">${Object.keys(REVIEW_GATES).map(k=>`<b>${REVIEW_GATES[k].label}.</b> ${esc(REVIEW_GATES[k].means)}`).join(" ")}</p>
  <p class="small muted">Counted: ${QPLAN.length} course readings, ${SURAH_INDEX.length} surah notes, and every teaching, story, book, verse, word, idea, dua and poem with its long-form companion. ${canReview?"You can review: open any item's Review button on this tab.":typeof window.oneplate==="object"?"Reviewing is for the accounts named in ADMIN_EMAILS.":"The owner records reviews here."}</p>
  ${reviewQueue()}
  ${recent.length?`<p class="eyebrow">Latest reviews</p><div class="hands">${recent.map(r=>`<span class="${REVIEW_GATES[r.status]?REVIEW_GATES[r.status].tone:""}">${esc(r.status)}</span><div class="small"><b>${esc(r.k)}</b> · ${esc(r.by||"")}${r.date?" · "+esc(r.date):""}${r.source?"<br><span class='muted'>"+esc(r.source)+"</span>":""}${r.note?"<br>"+esc(r.note):""}</div>`).join("")}</div>`:""}
  </div></details>`}
/* The reviewer's queue: every item of one kind in one status, in course order, with the volume reference and the panel inline, so a reviewer can work through the drafts without hunting for the day each one appears. */
function reviewItems(kind){
  if(kind==="close")return QPLAN.map((e,i)=>e.cur?{key:e.key,title:e.n,sub:`Reading ${i+1} · ${qRef(e)} · English al-Mizan vol. ${(mizanVol(e.s,e.f)||{}).vol||"?"}`}:null).filter(Boolean);
  if(kind==="reading")return QPLAN.map((e,i)=>e.cur?null:{key:e.key,title:e.n,sub:`Reading ${i+1} · ${qRef(e)} · English al-Mizan vol. ${(mizanVol(e.s,e.f)||{}).vol||"?"}`}).filter(Boolean);
  if(kind==="surah")return SURAH_INDEX.map(x=>({key:"surah-"+x.n,title:`${x.n}. ${x.a} · ${x.t}`,sub:`${x.v} verses · ${x.p} · English al-Mizan vol. ${(mizanVol(x.n,1)||{}).vol||"?"}`}));
  if(kind==="teaching")return TEACHINGS.map(t=>({key:contentKey("teaching",t),title:t.q,sub:`${t.w} · ${t.src} · ${t.v}`}));
  if(kind==="story")return STORIES.map(t=>({key:contentKey("story",t),title:t.t,sub:`Quran ${t.r}`}));
  const list=(KIND_LISTS[kind]||(()=>[]))();return list.map(x=>({key:contentKey(kind,x),title:itemTitle(kind,x),sub:kind==="book"?x.w+" · "+x.y:kind==="verse"?x.c:kind==="word"?x.m:kind==="idea"?x.w:kind==="dua"?x.r:x.s||""}));
}
const RQ_KINDS={close:"Close readings",reading:"Other readings",surah:"Surah notes",teaching:"Teachings",story:"Stories",book:"Books",verse:"Verses",word:"Words",idea:"Ideas",dua:"Duas",poem:"Poems"};
function reviewQueue(){if(!canReview)return "";const q=S._rq||{st:"draft",kind:"close"};const all=reviewItems(q.kind),items=all.filter(x=>reviewOf(x.key).status===q.st),show=items.slice(0,40);
  return `<p class="eyebrow">Review queue</p><div class="form"><label class="f" style="flex:1">Kind<select id="rq_kind">${Object.keys(RQ_KINDS).map(k=>`<option value="${k}" ${q.kind===k?"selected":""}>${RQ_KINDS[k]}</option>`).join("")}</select></label><label class="f" style="flex:1">Status<select id="rq_st">${Object.keys(REVIEW_GATES).map(k=>`<option value="${k}" ${q.st===k?"selected":""}>${REVIEW_GATES[k].label}</option>`).join("")}</select></label></div>
  <p class="small muted">${items.length} of ${all.length} ${RQ_KINDS[q.kind].toLowerCase()} are ${q.st}${items.length>40?"; the first 40 are listed":""}.</p>
  <div class="rq">${show.map(x=>`<div class="rqrow"><div class="t"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></div><button class="btn ghost sm" type="button" data-a="rvopen" data-k="${x.key}">${S._rv===x.key?tr("Close"):tr("Review")}</button>${S._rv===x.key?reviewPanel(x.key,x.title):""}</div>`).join("")}</div>
  <div class="row"><button class="btn ghost sm" type="button" data-a="rvexport">${S._rvx?"Hide":"Export / import reviews"}</button></div>
  ${S._rvx?`<p class="small muted">Reviews as JSON. Copy this into the other build's import box to carry reviews between the artifact and the local app; importing merges by key.</p><textarea id="rv_json" rows="6" style="width:100%;font:12px var(--mono)">${esc(JSON.stringify(S.reviews,null,1))}</textarea><div class="row"><button class="btn primary sm" type="button" data-a="rvimport">${ic("check")} Import what is in the box</button></div>`:""}`}
function importReviews(text){let j;try{j=JSON.parse(text)}catch(e){throw new Error("Not valid JSON")}if(!j||typeof j!=="object"||Array.isArray(j))throw new Error("Expected an object keyed by content key");
  const entries=Object.entries(j).filter(([k,v])=>/^[a-z]+-[a-z0-9-]{1,60}$/.test(k)&&v&&core.isReviewStatus(v.status)&&(v.status==="draft"||v.by));if(!entries.length)throw new Error("Nothing importable in the box");
  return entries.reduce((pr,[k,v])=>pr.then(()=>persistReview(k,{status:v.status,by:v.by,source:v.source,note:v.note,date:v.date||todayStr()})),Promise.resolve()).then(()=>entries.length)}

applyTheme();if(window.matchMedia)try{window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>applyTheme())}catch(e){}
