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
function allContentKeys(){const k=QPLAN.map(e=>e.key);SURAH_INDEX.forEach(s=>k.push("surah-"+s.n));TEACHINGS.forEach(t=>k.push(contentKey("teaching",t)));STORIES.forEach(t=>k.push(contentKey("story",t)));return k}
function reviewSummary(){const keys=allContentKeys(),c=core.reviewCounts(keys,REVIEWS_SHIPPED,S.reviews),n=keys.length;const recent=Object.keys(S.reviews).map(k=>Object.assign({k},S.reviews[k])).sort((a,b)=>(b.date||"")<(a.date||"")?-1:1).slice(0,8);
  return `<details><summary><span>Scholar review · ${c.verified+c.reviewed} of ${n} checked ${I("review")}</span>${ic("chev","chev")}</summary><div class="body">
  <div class="row" style="gap:6px;flex-wrap:wrap">${Object.keys(REVIEW_GATES).map(k=>`<span class="pill ${REVIEW_GATES[k].tone}">${REVIEW_GATES[k].label} ${c[k]}</span>`).join("")}</div>
  <div class="goalbar"><div class="bar"><i style="width:${((c.verified+c.reviewed)/n*100).toFixed(1)}%"></i></div><div class="lbls"><span>${c.verified} verified · ${c.reviewed} reviewed</span><span>${c.draft} drafts</span></div></div>
  <p class="small">${Object.keys(REVIEW_GATES).map(k=>`<b>${REVIEW_GATES[k].label}.</b> ${esc(REVIEW_GATES[k].means)}`).join(" ")}</p>
  <p class="small muted">Counted: ${QPLAN.length} course readings, ${SURAH_INDEX.length} surah notes, ${TEACHINGS.length} teachings and ${STORIES.length} stories. ${canReview?"You can review: open any item's Review button on this tab.":typeof window.oneplate==="object"?"Reviewing is for the accounts named in ADMIN_EMAILS.":"The owner records reviews here."}</p>
  ${recent.length?`<div class="hands">${recent.map(r=>`<span class="${REVIEW_GATES[r.status]?REVIEW_GATES[r.status].tone:""}">${esc(r.status)}</span><div class="small"><b>${esc(r.k)}</b> · ${esc(r.by||"")}${r.date?" · "+esc(r.date):""}${r.source?"<br><span class='muted'>"+esc(r.source)+"</span>":""}${r.note?"<br>"+esc(r.note):""}</div>`).join("")}</div>`:""}
  </div></details>`}
