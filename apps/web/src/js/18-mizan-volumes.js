function mizanVol(s,v){return core.mizanVol(MIZAN_EN,s,v)}
function qIndex(dateStr){return core.qIndex(qStart(),dateStr||todayStr(),QPLAN.length)}
function qRound(dateStr){return core.qRound(qStart(),dateStr||todayStr(),QPLAN.length)}
/* ---------- English al-Mizan volume map. 40 volumes: 1–13 WOFIS (tr. Sayyid Saeed Akhtar Rizvi), 14–40 Tawheed Institute Australia. Ranges as [startSurah,startVerse,endSurah,endVerse]; c = 'confirmed' from a publisher or bookseller listing, 'inferred' from the neighbouring volumes. Arabic volume ≈ ceil(English/2), as the WOFIS publisher's notes state for the volumes they cover. ---------- */

function rangeStr(r){return r[0]+":"+r[1]+" – "+r[2]+":"+r[3]}
function mizanRefBlock(e,i,ro){const m=mizanVol(e.s,e.f);if(!m)return "";const n=(S.qnotes||{})[e.key]||{};const inferred=m.conf!=="confirmed";
  return `<div class="hands" style="font-size:13px"><span>English</span><div>Al-Mizan vol. <b>${m.vol}</b> of 40 (${esc(m.pub)}), covering ${esc(rangeStr(m.range))}${inferred?` <span class="pill amber" style="font-size:10px;padding:1px 7px">${esc(m.conf)}</span>`:""}. <a href="${m.url}" target="_blank" rel="noopener">${m.vol<=13?"Read online":"Publisher's list"}</a></div>
  <span>Arabic</span><div>vol. ${m.ar} of 20 (approximate, half of each Arabic volume per English volume)</div>
  <span>My copy</span><div>${ro?(n.page?`p. ${esc(n.page)}${n.note?" · "+esc(n.note):""}`:"<span class='muted'>no page recorded</span>"):`<div class="form"><label class="f" style="flex:0 1 120px">Page<input type="text" data-qn="page" data-k="${e.key}" value="${esc(n.page||"")}" placeholder="e.g. 212" maxlength="20"></label><label class="f">Note<input type="text" data-qn="note" data-k="${e.key}" value="${esc(n.note||"")}" placeholder="edition, chapter, remark" maxlength="120"></label></div>`}</div></div>`}

function qStart(){return (S.settings||{}).quranStart||S.settings.startDate||todayStr()}
function qDone(){return Object.values(S.days).filter(d=>d.quran).length}
function qRef(e){return e.s+":"+(e.f===e.t?e.f:e.f+"–"+e.t)}
function qLink(e){return "https://quran.com/"+e.s+"/"+(e.f===e.t?e.f:e.f+"-"+e.t)}
function quranCard(d,ro,compact){
  const i=qIndex(logDate()),e=QPLAN[i],st=qState(i),done=st==="read",idx=i+1,su=SURAH_INDEX[e.s-1],cnt=qCount(),pct=(cnt/QPLAN.length*100).toFixed(0);
  const sub=`Surah ${e.s} · ${esc(su.a)} (${esc(su.t)}) · ${esc(e.portion)} · ${esc(su.p)}`;
  if(compact)return `<section class="card ${done?"":"accent"}">
    <div class="row between"><p class="eyebrow">${ic("book")} Today's Quran reading · ${idx} of ${QPLAN.length} ${I("quranplan")}</p>${st==="read"?`<span class="pill green">${ic("check")} read</span>`:st==="revisit"?`<span class="pill amber">${ic("flame")} revisit</span>`:""}</div>
    <h3>${esc(e.n)}</h3><p class="small muted">${sub}</p>
    <div class="goalbar"><div class="bar"><i style="width:${pct}%"></i></div><div class="lbls"><span>${cnt} of ${QPLAN.length} readings</span><span>${pct}%</span></div></div>
    ${qStateButtons(i,ro)}
    <div class="row"><a class="btn" href="${qLink(e)}" target="_blank" rel="noopener">Read the verses</a><button class="btn ghost" data-a="tab" data-v="learn">Summary and al-Mizan</button></div>
  </section>`;
  return `<section class="card ${done?"":"accent"}">
    <div class="row between"><p class="eyebrow">${ic("book")} Today's Quran reading · ${idx} of ${QPLAN.length} · round ${qRound()} ${I("quranplan")}</p><span class="pill ${st==="read"?"green":st==="revisit"?"amber":"grey"}">${st==="read"?ic("check")+" read":st==="revisit"?ic("flame")+" revisit":cnt+" of "+QPLAN.length}</span></div>
    <h2>${esc(e.n)}</h2>
    <p class="small muted">${sub}</p>
    <div class="row"><a class="btn primary" href="${qLink(e)}" target="_blank" rel="noopener">${ic("book")} Read ${esc(qRef(e))} on Quran.com</a>${reviewBadge(e.key)}</div>
    ${e.cur?`<p class="small"><b>Summary.</b> ${esc(e.sum)}</p>
    <div class="note" style="border-left-color:var(--green)"><b>From al-Mizan ${I("mizan")}</b><br>${esc(e.mz)}</div>`:`<p class="small"><b>The surah.</b> ${esc(e.sum)}</p>
    <div class="note" style="border-left-color:var(--green)"><b>Al-Mizan on the surah's purpose ${I("mizan")}</b><br>${esc(e.mz)}<br><span class="muted">Read today's ${esc(e.portion)} with this purpose in mind; the volume below has Tabataba'i's verse-by-verse discussion.</span></div>`}
    ${reviewPanel(e.key,e.n)}
    <details class="flat" style="box-shadow:none"><summary style="font-size:13px;padding:9px 0"><span>Where to find it in al-Mizan ${I("mizanvol")}</span>${ic("chev","chev")}</summary><div class="body">${mizanRefBlock(e,i,ro)}</div></details>
    <p class="small"><b>${e.cur?"Tadabbur.":"Lesson."}</b> ${esc(e.q)}</p>
    <p class="small muted"><b>For Abbas and Eliyya.</b> ${esc(e.k)}</p>
    <p class="eyebrow">Record progress ${I("qprogress")}</p>
    ${qStateButtons(i,ro)}
    <div class="goalbar"><div class="bar"><i style="width:${pct}%"></i></div><div class="lbls"><span>${cnt} of ${QPLAN.length} readings</span><span>${Object.keys((S.qprog||{}).flag||{}).length} to revisit</span><span>${pct}%</span></div></div>
    ${qGrid(ro)}
    ${qBulk(ro)}
  </section>`;
}
