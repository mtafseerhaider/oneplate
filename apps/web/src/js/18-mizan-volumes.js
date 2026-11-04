/* ---------- English al-Mizan volume map. 40 volumes: 1–13 WOFIS (tr. Sayyid Saeed Akhtar Rizvi), 14–40 Tawheed Institute Australia. Ranges as [startSurah,startVerse,endSurah,endVerse]; c = 'confirmed' from a publisher or bookseller listing, 'inferred' from the neighbouring volumes. Arabic volume ≈ ceil(English/2), as the WOFIS publisher's notes state for the volumes they cover. ---------- */
const MIZAN_EN=[
[1,[1,1,2,93],"confirmed"],[2,[2,94,2,182],"confirmed"],[3,[2,183,2,223],"confirmed"],[4,[2,224,2,286],"confirmed"],[5,[3,1,3,41],"confirmed"],[6,[3,42,3,120],"confirmed"],
[7,[3,121,3,200],"inferred"],[8,[4,1,4,76],"inferred"],[9,[4,77,5,3],"confirmed"],[10,[5,4,5,54],"inferred"],[11,[5,55,5,105],"inferred"],[12,[5,106,5,120],"confirmed"],
[13,[6,1,6,83],"confirmed"],[14,[6,84,6,165],"confirmed"],[15,[7,1,7,100],"confirmed"],[16,[7,101,7,206],"confirmed"],[17,[8,1,8,75],"confirmed"],[18,[9,1,9,129],"confirmed"],
[19,[10,1,11,24],"confirmed"],[20,[11,25,11,99],"confirmed"],[21,[11,100,12,57],"confirmed"],[22,[12,58,13,43],"confirmed"],[23,[14,1,15,99],"confirmed"],[24,[16,1,16,128],"confirmed"],
[25,[17,1,17,111],"confirmed"],[26,[18,1,18,110],"confirmed"],[27,[19,1,20,135],"confirmed"],[28,[21,1,22,78],"confirmed"],[29,[23,1,25,77],"confirmed"],[30,[26,1,27,93],"confirmed"],
[31,[28,1,30,60],"confirmed (one listing says 28–29 only)"],[32,[31,1,34,54],"confirmed (one listing says 32–34)"],[33,[35,1,38,88],"confirmed"],[34,[39,1,41,54],"confirmed"],[35,[42,1,46,35],"confirmed"],
[36,[47,1,51,60],"confirmed"],[37,[52,1,57,29],"confirmed"],[38,[58,1,69,52],"confirmed"],[39,[70,1,77,50],"confirmed"],[40,[78,1,114,6],"confirmed"]];
function mizanVol(s,v){const key=s*1000+v;for(const [n,r,c] of MIZAN_EN){const a=r[0]*1000+r[1],b=r[2]*1000+r[3];if(key>=a&&key<=b)return {vol:n,range:r,conf:c,ar:Math.ceil(n/2),pub:n<=13?"WOFIS, tr. S. S. A. Rizvi":"Tawheed Institute Australia",url:n<=13?"https://al-islam.org/al-mizan-exegesis-quran-volume-"+n+"-sayyid-muhammad-husayn-tabatabai":"https://www.shiabooks.com.au/collections/quran/al-mizan"}}return null}
function rangeStr(r){return r[0]+":"+r[1]+" – "+r[2]+":"+r[3]}
function mizanRefBlock(e,i,ro){const m=mizanVol(e.s,e.f);if(!m)return "";const n=(S.qnotes||{})[String(i)]||{};const inferred=m.conf!=="confirmed";
  return `<div class="hands" style="font-size:13px"><span>English</span><div>Al-Mizan vol. <b>${m.vol}</b> of 40 (${esc(m.pub)}), covering ${esc(rangeStr(m.range))}${inferred?` <span class="pill amber" style="font-size:10px;padding:1px 7px">${esc(m.conf)}</span>`:""}. <a href="${m.url}" target="_blank" rel="noopener">${m.vol<=13?"Read online":"Publisher's list"}</a></div>
  <span>Arabic</span><div>vol. ${m.ar} of 20 (approximate, half of each Arabic volume per English volume)</div>
  <span>My copy</span><div>${ro?(n.page?`p. ${esc(n.page)}${n.note?" · "+esc(n.note):""}`:"<span class='muted'>no page recorded</span>"):`<div class="form"><label class="f" style="flex:0 1 120px">Page<input type="text" data-qn="page" data-i="${i}" value="${esc(n.page||"")}" placeholder="e.g. 212" maxlength="20"></label><label class="f">Note<input type="text" data-qn="note" data-i="${i}" value="${esc(n.note||"")}" placeholder="edition, chapter, remark" maxlength="120"></label></div>`}</div></div>`}

function qStart(){return (S.settings||{}).quranStart||S.settings.startDate||todayStr()}
function qIndex(dateStr){const a=new Date(qStart()+"T00:00:00"),b=new Date((dateStr||todayStr())+"T00:00:00");const n=Math.floor((b-a)/864e5);return ((n%QPLAN.length)+QPLAN.length)%QPLAN.length}
function qRound(dateStr){const a=new Date(qStart()+"T00:00:00"),b=new Date((dateStr||todayStr())+"T00:00:00");return Math.floor(Math.max(0,Math.floor((b-a)/864e5))/QPLAN.length)+1}
function qDone(){return Object.values(S.days).filter(d=>d.quran).length}
function qRef(e){return e.s+":"+(e.f===e.t?e.f:e.f+"–"+e.t)}
function qLink(e){return "https://quran.com/"+e.s+"/"+(e.f===e.t?e.f:e.f+"-"+e.t)}
function quranCard(d,ro,compact){
  const e=QPLAN[qIndex(logDate())],st=qState(qIndex(logDate())),done=st==="read",idx=qIndex(logDate())+1,su=SURAHS.find(x=>x.n===e.s),cnt=qCount();
  if(compact)return `<section class="card ${done?"":"accent"}">
    <div class="row between"><p class="eyebrow">${ic("book")} Today's Quran reading · ${idx} of ${QPLAN.length} ${I("quranplan")}</p>${st==="read"?`<span class="pill green">${ic("check")} read</span>`:st==="revisit"?`<span class="pill amber">${ic("flame")} revisit</span>`:""}</div>
    <h3>${esc(e.n)}</h3><p class="small muted">Surah ${e.s}${su?" "+esc(su.a):""}, verses ${esc(qRef(e).split(":")[1])}</p>
    <div class="goalbar"><div class="bar"><i style="width:${(cnt/QPLAN.length*100).toFixed(0)}%"></i></div><div class="lbls"><span>${cnt} of ${QPLAN.length} readings</span><span>${(cnt/QPLAN.length*100).toFixed(0)}%</span></div></div>
    ${qStateButtons(qIndex(logDate()),ro)}
    <div class="row"><a class="btn" href="${qLink(e)}" target="_blank" rel="noopener">Read the verses</a><button class="btn ghost" data-a="tab" data-v="learn">Summary and al-Mizan</button></div>
  </section>`;
  return `<section class="card ${done?"":"accent"}">
    <div class="row between"><p class="eyebrow">${ic("book")} Today's Quran reading · ${idx} of ${QPLAN.length} · round ${qRound()} ${I("quranplan")}</p><span class="pill ${st==="read"?"green":st==="revisit"?"amber":"grey"}">${st==="read"?ic("check")+" read":st==="revisit"?ic("flame")+" revisit":cnt+" of "+QPLAN.length}</span></div>
    <h2>${esc(e.n)}</h2>
    <p class="small muted">Surah ${e.s}${su?" · "+esc(su.a)+" ("+esc(su.t)+")":""} · verses ${esc(qRef(e).split(":")[1])}${su?" · "+esc(su.p):""}</p>
    <div class="row"><a class="btn primary" href="${qLink(e)}" target="_blank" rel="noopener">${ic("book")} Read ${esc(qRef(e))} on Quran.com</a></div>
    <p class="small"><b>Summary.</b> ${esc(e.sum)}</p>
    <div class="note" style="border-left-color:var(--green)"><b>From al-Mizan ${I("mizan")}</b><br>${esc(e.mz)}</div>
    <details class="flat" style="box-shadow:none"><summary style="font-size:13px;padding:9px 0"><span>Where to find it in al-Mizan ${I("mizanvol")}</span>${ic("chev","chev")}</summary><div class="body">${mizanRefBlock(e,qIndex(logDate()),ro)}</div></details>
    <p class="small"><b>Tadabbur.</b> ${esc(e.q)}</p>
    <p class="small muted"><b>For Abbas and Eliyya.</b> ${esc(e.k)}</p>
    <p class="eyebrow">Record progress ${I("qprogress")}</p>
    ${qStateButtons(qIndex(logDate()),ro)}
    <div class="goalbar"><div class="bar"><i style="width:${(cnt/QPLAN.length*100).toFixed(0)}%"></i></div><div class="lbls"><span>${cnt} of ${QPLAN.length} readings</span><span>${Object.keys((S.qprog||{}).flag||{}).length} to revisit</span><span>${(cnt/QPLAN.length*100).toFixed(0)}%</span></div></div>
    ${qGrid(ro)}
    ${qBulk(ro)}
  </section>`;
}
