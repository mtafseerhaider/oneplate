/* ---------- meal editor & fast-time handlers ---------- */
function dtl(d){d=new Date(d);const z=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate())+"T"+z(d.getHours())+":"+z(d.getMinutes())}
function draftFrom(m){return {id:m.id||null,base:!!m.base,n:m.n||"",tag:m.tag||"chicken",note:m.note||"",items:normItems(m.items).map(it=>({f:it.f,q:it.q}))}}
function refreshTotals(){const el=document.getElementById("mtot");if(el&&S._medit)el.innerHTML=mealTotals(S._medit)}
function mealAction(a,b){
  const d=S._medit;
  if(a==="me_new"){S._medit={id:null,base:false,n:"",tag:"chicken",note:"",items:[{f:"chk_tikka",q:2},{f:"salad",q:2},{f:"roti",q:1},{f:"yogurt",q:1}]};render();const n=document.getElementById("me_n");if(n)n.focus();return true}
  if(a==="me_edit"){const m=allMeals().find(x=>x.id===b.dataset.id);if(m){S._medit=draftFrom(m);S._mopen=m.id;render()}return true}
  if(!d)return false;
  if(a==="me_cancel"){S._medit=null;render();return true}
  if(a==="me_add"){d.items.push({f:"salad",q:1});render();return true}
  if(a==="me_del"){d.items.splice(Number(b.dataset.i),1);render();return true}
  if(a==="me_save"){const n=(document.getElementById("me_n")||{}).value||d.n;d.n=n.trim();d.items=d.items.filter(it=>(FOODS[it.f]||it.x)&&it.q>0);if(!d.n){toast("Give the meal a name");return true}if(!d.items.length){toast("Add at least one food");return true}const id=d.id||("c_"+Date.now().toString(36));const rec={id,n:d.n,tag:d.tag,note:d.note||"",items:d.items.map(it=>({f:it.f,q:it.q}))};S.meals[id]=rec;persistMeal(id);S._medit=null;S._mopen=id;toast("Meal saved · "+mealCalc(rec).kcal+" kcal");render();return true}
  if(a==="me_reset"){removeMeal(d.id);S._medit=null;toast("Reset to default");render();return true}
  if(a==="me_delete"){if(d.base){S.meals[d.id]={id:d.id,deleted:true};persistMeal(d.id);toast("Hidden")}else{removeMeal(d.id);toast("Deleted")}S._medit=null;render();return true}
  return false;
}
document.addEventListener("change",e=>{
  const t=e.target,d=S._medit;
  if(t.id==="scanFile"){const f=t.files&&t.files[0];if(f)runScan(f,t.dataset.mode||"plate");return}
  if(t.id==="logDate"){const v=t.value;S._ld=(v&&v<todayStr())?v:null;render();return}
  if(t.id==="sleepH"&&isOwner&&!readOnly){const ld=logDate(),dd=day(ld);const v=parseFloat(t.value);if(v>=0&&v<=14)dd.sleep=v;else delete dd.sleep;persistDay(ld);toast("Sleep saved · "+fmtDate(ld));return}
  if(t.id==="gratIn"&&isOwner&&!readOnly){const ld=logDate(),dd=day(ld);dd.grat=t.value.trim();persistDay(ld);if(dd.grat)toast("Alhamdulillah");render();return}
  if(t.dataset&&t.dataset.qn){if(readOnly)return;const k=String(t.dataset.k);S.qnotes[k]=Object.assign({i:k},S.qnotes[k]||{});S.qnotes[k][t.dataset.qn]=t.value.trim();persistQnote(k);toast("Reference saved");return}
  if(t.id==="qsurah"){S._qsurah=Number(t.value);render();return}
  if(t.dataset&&t.dataset.tbnote){const m=t.dataset.m;if(!canWriteFor(m))return;const p=tbProg();p.notes[t.dataset.tbnote]=Object.assign({},p.notes[t.dataset.tbnote]||{});p.notes[t.dataset.tbnote][m]=t.value.trim();persistTbprog();toast("Notes saved");return}
  if(t.id==="rq_kind"||t.id==="rq_st"){S._rq=Object.assign({st:"draft",kind:"close"},S._rq||{});S._rq[t.id==="rq_kind"?"kind":"st"]=t.value;S._rv=null;render();return}
  if(t.dataset&&t.dataset.j){const m=t.dataset.m;if(!canWriteFor(m))return;const ld=logDate(),dd=day(ld);dd.journal=Object.assign({},dd.journal||{});dd.journal[m]=Object.assign({},dd.journal[m]||{});dd.journal[m][t.dataset.j]=t.value.trim();persistDay(ld);toast("Journal saved · "+fmtDate(ld));return}
  if(t.id==="me_tag"&&d){d.tag=t.value;return}
  if(t.dataset&&t.dataset.me&&d){const i=Number(t.dataset.i);if(!d.items[i])return;if(t.dataset.me==="food")d.items[i].f=t.value;else d.items[i].q=Math.max(0,Math.min(12,parseFloat(t.value)||0));refreshTotals()}
});
document.addEventListener("input",e=>{
  const t=e.target,d=S._medit;
  if(t.id==="me_n"&&d)d.n=t.value;
  if(t.id==="me_note"&&d)d.note=t.value;
  if(t.dataset&&t.dataset.me==="qty"&&d){const i=Number(t.dataset.i);if(d.items[i]){d.items[i].q=Math.max(0,Math.min(12,parseFloat(t.value)||0));refreshTotals()}}
});

const VIEWS={today:vToday,plate:vPlate,tarbiyah:vTarbiyah,family:vFamily,train:vTrain,progress:vProgress,learn:vLearn};
const TAB_ICON={today:"clock",plate:"plate",tarbiyah:"sprout",family:"family",train:"bike",progress:"trend",learn:"book"};
function render(){
  const v=document.getElementById("view");
  const scroll=v.parentElement.scrollTop;
  v.innerHTML=VIEWS[tab]();
  v.parentElement.scrollTop=scroll;
  document.getElementById("tabs").innerHTML=["today","plate","tarbiyah","family","train","progress","learn"].map(k=>`<button class="${k===tab?"on":""}" data-a="tab" data-v="${k}" aria-label="${k}" aria-current="${k===tab?"page":"false"}"><span class="ib">${ic(TAB_ICON[k])}</span>${tr(k[0].toUpperCase()+k.slice(1))}</button>`).join("");
  tick();
}
function tick(){
  const mt=document.getElementById("mealT");if(mt&&S._meal){const ms=Date.now()-S._meal;mt.textContent=hhmm(ms).slice(3);const mm=document.getElementById("mealMsg");if(mm){mm.textContent=ms<5*6e4?"Bismillah. Protein first. Spoon down between bites.":ms<15*6e4?"Halfway. Small sips of water only. Keep chewing slowly.":ms<20*6e4?"Fullness check: could you eat more if you had to? If yes, you have had enough. Wait 15 minutes before any seconds.":"20 minutes done. Alhamdulillah. Walk in 30 minutes; chai at least an hour after eating."}}
  const rc=document.getElementById("rCount");if(rc){const ft=fastingTimes(todayStr());if(ft){const now=Date.now();if(now<ft.fajr){rc.textContent="Suhoor ends in "+hhmm(ft.fajr-now).slice(0,5)+" h"}else if(now<ft.maghrib){rc.textContent="Iftar in "+hhmm(ft.maghrib-now).slice(0,5)+" h"}else{const ft2=fastingTimes(todayStr(new Date(now+864e5)));rc.textContent="Fast over for today. Next suhoor ends "+(ft2?fmtClock(ft2.fajr):"")}}}
  const bar=document.getElementById("ringBar");if(!bar)return;
  const t=document.getElementById("ringTime"),s=document.getElementById("ringSub");
  if(!S.fast.startedAt){bar.style.strokeDashoffset=326.7;return}
  let goal=(S.settings.fastHours||21)*36e5;if(ramadanActive()){const ft=fastingTimes(todayStr());if(ft)goal=ft.maghrib-ft.fajr}
  const ms=Date.now()-new Date(S.fast.startedAt).getTime(),frac=Math.min(1,ms/goal);
  bar.style.strokeDashoffset=(326.7*(1-frac)).toFixed(1);
  t.textContent=hhmm(Math.max(0,ms));
  s.textContent=ms>=goal?"goal reached":(hhmm(goal-ms).slice(0,5)+" to go");
  const gl=document.getElementById("kvGoal");if(gl)gl.textContent=(goal/36e5).toFixed(1)+" h";
}
setInterval(tick,1000);
function openInfo(k){const g=G[k];if(!g)return;document.getElementById("sheetTitle").textContent=g[0];document.getElementById("sheetBody").textContent=g[1];document.getElementById("sheet").classList.add("show");document.getElementById("scrim").classList.add("show");document.getElementById("sheetClose").focus()}
function closeInfo(){document.getElementById("sheet").classList.remove("show");document.getElementById("scrim").classList.remove("show")}
document.getElementById("scrim").addEventListener("click",closeInfo);
document.getElementById("sheetClose").addEventListener("click",closeInfo);
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeInfo();return}if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches("[data-a]:not(button):not(input)")){e.preventDefault();e.target.click()}});
document.addEventListener("toggle",e=>{const dt=e.target;if(dt.tagName==="DETAILS"&&dt.hasAttribute("data-qbulk")){S._qbulk=dt.open}if(dt.tagName==="DETAILS"&&dt.dataset.fid){S._fo=S._fo||{};S._fo[dt.dataset.fid]=dt.open}if(dt.tagName==="DETAILS"&&dt.dataset.mid){S._mopen=dt.open?dt.dataset.mid:(S._mopen===dt.dataset.mid?null:S._mopen)}},true);
document.addEventListener("input",e=>{if(e.target.id==="gq"){S._gq=e.target.value;document.getElementById("gres").innerHTML=glossaryList(S._gq)}});
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-a]");if(!b)return;
  const a=b.dataset.a,t=logDate();
  if(a==="info"){e.preventDefault();e.stopPropagation();openInfo(b.dataset.k);return}
  if(a==="theme"){setTheme(THEME==="auto"?"light":THEME==="light"?"dark":"auto");toast(tr("Appearance")+": "+tr(THEME==="auto"?"Auto":THEME==="light"?"Light":"Dark"));return}
  if(a==="lang"){LANG=LANG==="ur"?"en":"ur";try{localStorage.setItem("oneplate.lang",LANG)}catch(x){}applyLang();setChip();render();return}
  if(a==="tab"){tab=b.dataset.v;history.replaceState(null,"","#"+tab);render();document.querySelector("main").scrollTop=0;return}
  if(a==="mf"){S._mf=b.dataset.v;render();return}
  if(a==="ff"){S._ff=b.dataset.v;render();return}
  if(a==="lm"){S._lm=b.dataset.v;render();return}
  if(readOnly){toast("View only");return}
  if(a==="tonight"){const d=day(t);d.meal=d.meal===b.dataset.id?null:b.dataset.id;if(!d.meal)delete d.meal;persistDay(t);toast(d.meal?"Tonight: "+(allMeals().find(x=>x.id===d.meal)||{}).n:"Back to the suggestion");render();return}
  if(!isOwner&&["startfast","startfast930","cancelfast","endfast","dot","tog","mealstart","mealstop","ftimes","ftcancel","rfajr","mood","soul","qmark","qcell","qbulk","qbulkto","qclear","habits_all"].includes(a)){toast("Only Tafseer can change this");return}
  if(a==="ftimes"){S._ft=!S._ft;render();return}
  if(a==="rfajr"){const ft=fastingTimes(t);if(ft){S.fast={startedAt:ft.fajr.toISOString(),lastHours:S.fast.lastHours||null,lastEndedAt:S.fast.lastEndedAt||null};persistFast();toast("Fasting since Fajr "+fmtClock(ft.fajr));render()}return}
  if(a==="mealstart"){S._meal=Date.now();render();return}
  if(a==="mealstop"){const m=Math.round((Date.now()-S._meal)/6e4);S._meal=null;toast(m>=15?"Meal took "+m+" min. Well paced.":"Meal took "+m+" min. Try to slow down tomorrow.");render();return}
  if(a==="ftcancel"){S._ft=false;render();return}
  if(/^me_/.test(a)){mealAction(a,b);return}
  if(a==="startfast"){S.fast={startedAt:new Date().toISOString(),lastHours:S.fast.lastHours||null,lastEndedAt:S.fast.lastEndedAt||null};persistFast();toast("Fast started");render();return}
  if(a==="startfast930"){const d=new Date();d.setHours(21,30,0,0);if(d>new Date())d.setDate(d.getDate()-1);S.fast={startedAt:d.toISOString(),lastHours:S.fast.lastHours||null,lastEndedAt:S.fast.lastEndedAt||null};persistFast();toast("Fast started from 9:30 PM");render();return}
  if(a==="cancelfast"){S.fast={startedAt:null,lastHours:S.fast.lastHours||null,lastEndedAt:S.fast.lastEndedAt||null};persistFast();render();return}
  if(a==="endfast"){const h=(Date.now()-new Date(S.fast.startedAt).getTime())/36e5;S.fast={startedAt:null,lastHours:Math.round(h*10)/10,lastEndedAt:new Date().toISOString()};persistFast();const d=day(t);d.fastH=Math.round(h*10)/10;persistDay(t);toast("Fast ended: "+h.toFixed(1)+" h");render();return}
  if(a==="dot"){const dd=b.dataset.d||t,d=day(dd),f=b.dataset.f,v=Number(b.dataset.v);d[f]=(d[f]||0)===v?v-1:v;persistDay(dd);render();return}
  if(a==="tog"){const dd=b.dataset.d||t,d=day(dd);d[b.dataset.k]=!d[b.dataset.k];persistDay(dd);render();return}
  if(a==="mood"){const d=day(t);d.mood=Number(b.dataset.v);persistDay(t);render();return}
  if(a==="tb_open"){S._tl=Number(b.dataset.n);S._ts=b.dataset.s||(S._tl===Number(S._tlLast)?S._ts:"summary");S._tlLast=S._tl;S._tbErr=null;S._tbErr2=null;tab="tarbiyah";render();document.querySelector(".main")&&document.querySelector(".main").scrollTo(0,0);return}
  if(a==="tb_back"){S._tl=null;render();return}
  if(a==="tb_sec"){S._ts=b.dataset.s;render();return}
  if(a==="tb_mark"){const m=b.dataset.m;if(!canWriteFor(m)){toast("Only "+((member(m)||{}).name||m)+" or the owner can mark this");return}tbSet(Number(b.dataset.n),m,b.dataset.k);render();return}
  if(a==="tb_done"){const m=b.dataset.m;if(!canWriteFor(m)){toast("Only the owner can do that");return}const d=day(t);d.tarbiyah=Object.assign({},d.tarbiyah||{});d.tarbiyah[m]=!d.tarbiyah[m];persistDay(t);render();return}
  if(a==="tb_full"){S._tbFull=b.dataset.f;tbFetchText(b.dataset.f).then(txt=>{document.getElementById("sheetTitle").textContent="Series corrections";document.getElementById("sheetBody").innerHTML='<div class="md full">'+md2html(txt)+'</div>';document.getElementById("sheet").classList.add("show");document.getElementById("scrim").classList.add("show")}).catch(e=>toast(e.message));return}
  if(a==="tb_copy"||a==="tb_share"){const L=TARBIYAH.find(l=>l.n===Number(b.dataset.n));if(!L)return;const text=tbShareText(L);if(a==="tb_share"&&navigator.share){navigator.share({title:"Tarbiyah · "+L.title,text}).catch(()=>{});return}copyText(text).then(ok=>{if(ok)toast(tr("Copied"))});return}
  if(a==="scan_pick"){if(SCAN.ok===false){toast(SCAN.why||"Scanning is not set up");return}const inp=document.getElementById("scanFile");if(!inp)return;inp.dataset.mode=b.dataset.mode;inp.value="";inp.click();return}
  if(a==="scan_reset"){S._scan=null;render();return}
  if(a==="scan_qty"||a==="scan_del"){const pl=scanPlates()[Number(b.dataset.pi)];if(!pl)return;const i=Number(b.dataset.i);if(a==="scan_del")pl.items.splice(i,1);else{pl.items[i].q=Math.max(0.25,Math.min(12,Math.round((pl.items[i].q+Number(b.dataset.d))*4)/4))}rescan(pl);render();return}
  if(a==="scan_save"){const pl=scanPlates()[Number(b.dataset.pi)];if(!pl||!pl.items.length){toast("Nothing to save");return}const id=saveScanPlate(pl,b.dataset.tonight==="1");toast(b.dataset.tonight==="1"?"Tonight's plate set":"Saved to meals");S._scan=null;S._mopen=id;render();return}
  if(a==="copytext"||a==="share"){const kind=b.dataset.kind,x=findItem(kind,decodeURIComponent(b.dataset.key)),kid=b.dataset.kid==="1";if(!x){toast("Not found");return}const text=shareTextFor(kind,x,kid);
    if(a==="share"&&navigator.share){navigator.share({title:"OnePlate · "+itemTitle(kind,x).slice(0,80),text}).catch(e=>{if(e&&e.name!=="AbortError")copyText(text).then(ok=>toast(ok?"Copied instead":""))});return}
    copyText(text).then(ok=>{if(ok)toast(tr("Copied"))});return}
  if(a==="rvexport"){S._rvx=!S._rvx;render();return}
  if(a==="rvimport"){if(!canReview)return;try{importReviews(document.getElementById("rv_json").value).then(n=>{toast(n+" reviews imported");render()}).catch(e=>toast(e.message))}catch(e){toast(e.message)}return}
  if(a==="rvopen"){if(!canReview){toast("Reviewing is for the content reviewers");return}S._rv=S._rv===b.dataset.k?null:b.dataset.k;render();return}
  if(a==="rvsave"){if(!canReview)return;const k=b.dataset.k,body={status:document.getElementById("rv_status").value,by:document.getElementById("rv_by").value.trim(),source:document.getElementById("rv_src").value.trim()||undefined,note:document.getElementById("rv_note").value.trim()||undefined,date:todayStr()};
    if(body.status!=="draft"&&!body.by){toast("Add the reviewer's name");return}if(body.status==="verified"&&!body.source){toast("Verified needs the edition, volume and page");return}
    persistReview(k,body).then(()=>{S._rv=null;toast(body.status==="draft"?"Back to draft":REVIEW_GATES[body.status].label+" · "+k);render()}).catch(e=>toast(e.message||"Could not save the review"));return}
  if(a==="qmark"){qSet([Number(b.dataset.i)],b.dataset.s);toast(b.dataset.s==="read"?"Alhamdulillah":b.dataset.s==="revisit"?"Flagged to revisit":"Cleared");render();return}
  if(a==="qcell"){const i=Number(b.dataset.i),st=qState(i);qSet([i],st===""?"read":st==="read"?"revisit":"");render();return}
  if(a==="qbulk"){const f=Math.max(1,parseInt(document.getElementById("qb_from").value,10)||1),to=Math.min(QPLAN.length,parseInt(document.getElementById("qb_to").value,10)||1);if(to<f){toast("'To' must be after 'From'");return}const idxs=[];for(let i=f-1;i<to;i++)idxs.push(i);qSet(idxs,b.dataset.s);toast((to-f+1)+" readings "+(b.dataset.s||"cleared"));render();return}
  if(a==="qbulkto"){const idxs=[];for(let i=0;i<=qIndex();i++)idxs.push(i);qSet(idxs,"read");toast((qIndex()+1)+" readings marked read");render();return}
  if(a==="qclear"){if(S._qconfirm){S.qprog={done:{},flag:{},v:3};Object.keys(S.days).forEach(k=>{if(S.days[k].quran){S.days[k].quran=false;persistDay(k)}});persistQprog();S._qconfirm=false;toast("Progress cleared");render()}else{S._qconfirm=true;toast("Tap again to confirm clearing all progress");setTimeout(()=>{S._qconfirm=false},4000)}return}
  if(a==="habits_all"){const dd=b.dataset.d||t,d=day(dd);["starter","train","walk","steps","closed"].forEach(k=>d[k]=true);if((d.water||0)<4)d.water=4;if((d.palms||0)<4)d.palms=4;persistDay(dd);toast("All habits done · "+fmtDate(dd));render();return}
  if(a==="backtoday"){S._ld=null;render();return}
  if(a==="acc_invite"||a==="acc_invite_view"){window.oneplate.invite(a==="acc_invite"?"contributor":"viewer",a==="acc_invite"?"uzma":null).then(r=>{S._inviteCode=r.code;render()}).catch(e=>toast(e.message));return}
  if(a==="acc_export"){window.oneplate.exportHousehold().then(d=>{const blob=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});const u=URL.createObjectURL(blob);const x=document.createElement("a");x.href=u;x.download="oneplate-export-"+todayStr()+".json";document.body.appendChild(x);x.click();x.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);toast("Exported "+d.documents.length+" records")}).catch(e=>toast(e.message));return}
  if(a==="acc_link"){const m=member(b.dataset.m);window.oneplate.createMemberLink(b.dataset.m).then(r=>{S._link={name:m?m.name:b.dataset.m,url:r.url};return window.oneplate.memberLinks()}).then(l=>{S._links=l;render()}).catch(e=>toast(e.message||"Could not create the link"));return}
  if(a==="acc_links"){window.oneplate.memberLinks().then(l=>{S._links=l.length?l:[{id:"",member_id:"",disabled:true}];if(!l.length)toast("No links yet");render()}).catch(e=>toast(e.message));return}
  if(a==="acc_link_copy"){const i=document.getElementById("linkUrl");i.select();(navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.reject()).then(()=>toast("Link copied"),()=>{document.execCommand("copy");toast("Link selected · copy it")});return}
  if(a==="acc_link_share"){navigator.share({title:"OnePlate",text:"Open our family's OnePlate",url:S._link.url}).catch(()=>{});return}
  if(a==="acc_link_revoke"){window.oneplate.revokeMemberLink(b.dataset.id).then(()=>window.oneplate.memberLinks()).then(l=>{S._links=l;S._link=null;toast("Link revoked");render()}).catch(e=>toast(e.message));return}
  if(a==="acc_install"){window.oneplate.install().then(ok=>toast(ok?"Installed":"Not installed")).catch(()=>{});render();return}
  if(a==="push_status"){window.oneplate.pushStatus().then(ps=>{S._push=ps;render()}).catch(e=>toast(e.message));return}
  if(a==="push_on"){const prefs={};document.querySelectorAll("[data-pk]").forEach(c=>{prefs[c.dataset.pk]=c.checked});window.oneplate.pushSubscribe(prefs).then(()=>window.oneplate.pushStatus()).then(ps=>{S._push=ps;toast("Notifications on");render()}).catch(e=>toast(e.message||"Could not turn on"));return}
  if(a==="push_off"){window.oneplate.pushUnsubscribe().then(()=>window.oneplate.pushStatus()).then(ps=>{S._push=ps;toast("Notifications off");render()}).catch(e=>toast(e.message));return}
  if(a==="push_test"){window.oneplate.pushTest().then(r=>toast(r.sent?"Test sent":"Nothing sent · check the browser's notification setting")).catch(e=>toast(e.message));return}
  if(a==="ingest_new"){const m=member(b.dataset.m);window.oneplate.createIngestToken(b.dataset.m).then(r=>{S._ingestNew={name:m?m.name:b.dataset.m,url:r.url};return window.oneplate.ingestTokens()}).then(t=>{S._ingest=t;render()}).catch(e=>toast(e.message||"Could not create"));return}
  if(a==="ingest_list"){window.oneplate.ingestTokens().then(t=>{S._ingest=t;if(!t.length)toast("No Health addresses yet");render()}).catch(e=>toast(e.message));return}
  if(a==="ingest_copy"){const i=document.getElementById("ingestUrl");i.select();(navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.reject()).then(()=>toast("Address copied"),()=>{document.execCommand("copy");toast("Address selected · copy it")});return}
  if(a==="ingest_revoke"){window.oneplate.revokeIngestToken(b.dataset.id).then(()=>window.oneplate.ingestTokens()).then(t=>{S._ingest=t;S._ingestNew=null;toast("Revoked");render()}).catch(e=>toast(e.message));return}
  if(a==="acc_signout"){window.oneplate.signOut();return}
  if(a==="acc_passkey"){window.oneplate.addPasskey().then(()=>toast("Passkey added")).catch(e=>toast(e.message||"Passkey not added"));return}
  if(a==="acc_delete"){if(S._delconfirm){window.oneplate.deleteHousehold().then(()=>{localStorage.removeItem(LS);location.href="./account.html"}).catch(e=>toast(e.message))}else{S._delconfirm=true;toast("Tap again within 5 s to delete everything");setTimeout(()=>{S._delconfirm=false},5000)}return}
  if(a==="soul"){const d=day(t);d.soul=!d.soul;persistDay(t);render();return}
  if(a==="delw"){removeWeigh(b.dataset.d);toast("Removed");render();return}
  if(a==="fedit"){S._fedit=b.dataset.id;S._fo=S._fo||{};S._fo[b.dataset.id]=true;render();return}
  if(a==="learndone"){const m=b.dataset.m;if(!canWriteFor(m)){toast("Only the owner can do that");return}const d=day(t);d.learn=Object.assign({},d.learn||{});d.learn[m]=true;persistDay(t);toast("Learning done · "+m);render();return}
  if(a==="circle"){const d=day(t);d.circle=!d.circle;persistDay(t);toast(d.circle?"Family circle done":"Undone");render();return}
});
document.addEventListener("submit",e=>{
  if(readOnly){e.preventDefault();return}
  if(!isOwner&&(e.target.id==="wform"||e.target.id==="sform"||e.target.id==="fform"||(e.target.dataset&&e.target.dataset.m==="tafseer"))){e.preventDefault();toast("Only Tafseer can change this");return}
  if(e.target.classList&&e.target.classList.contains("fam-form")){e.preventDefault();const id=e.target.dataset.m;const rec=Object.assign({},S.family[id]||{},{id});e.target.querySelectorAll("[data-k]").forEach(el=>{const k=el.dataset.k;let v=el.value;if(k==="startWeight"||k==="targetWeight"){v=parseFloat(v);if(!(v>0)){delete rec[k];return}}if(k==="name"&&!v.trim())return;rec[k]=v});S.family[id]=rec;persistFamily(id);S._fedit=null;S._fo=S._fo||{};S._fo[id]=true;toast("Saved");render();return}
  if(e.target.classList&&e.target.classList.contains("grow-form")){e.preventDefault();const id=e.target.dataset.m;const g=k=>{const el=e.target.querySelector(`[data-k="${k}"]`);return el?el.value:""};const date=g("date"),kg=parseFloat(g("weight")),h=parseFloat(g("height")),wc=parseFloat(g("waist"));if(!date||!(kg>0))return;const key=id==="tafseer"?date:id+"-"+date;const r={date,weight:Math.round(kg*10)/10};if(id!=="tafseer")r.m=id;if(h>0)r.height=Math.round(h*2)/2;if(wc>0)r.waist=Math.round(wc*2)/2;S.weighins[key]=r;persistWeigh(key);S._fo=S._fo||{};S._fo[id]=true;toast("Logged "+kg.toFixed(1)+" kg");render();return}
  if(e.target.id==="fform"){e.preventDefault();const sv=document.getElementById("f_start").value,ev=document.getElementById("f_end").value;if(!sv)return;const st=new Date(sv);if(isNaN(st))return;if(ev){const en=new Date(ev);if(isNaN(en)||en<=st){toast("End must be after start");return}const h=(en-st)/36e5;if(h>72){toast("That is longer than 72 h; check the dates");return}S.fast={startedAt:null,lastHours:Math.round(h*10)/10,lastEndedAt:en.toISOString()};persistFast();const k=todayStr(en),dd=day(k);dd.fastH=Math.round(h*10)/10;persistDay(k);toast("Logged "+h.toFixed(1)+" h fast")}else{if(st>new Date()){toast("Start is in the future");return}S.fast={startedAt:st.toISOString(),lastHours:S.fast.lastHours||null,lastEndedAt:S.fast.lastEndedAt||null};persistFast();toast("Start time set")}S._ft=false;render();return}
  if(e.target.id==="wform"){e.preventDefault();const d=document.getElementById("wdate").value,kg=parseFloat(document.getElementById("wkg").value),cm=parseFloat(document.getElementById("wcm").value);if(!d||!(kg>0))return;const r={date:d,weight:Math.round(kg*10)/10};if(cm>0)r.waist=Math.round(cm*2)/2;S.weighins[d]=r;persistWeigh(d);toast("Saved "+kg.toFixed(1)+" kg"+(strengthOn()?" · strength unlocked!":""));render()}
  if(e.target.id==="sform"){e.preventDefault();const sw=parseFloat(document.getElementById("s_sw").value),tw=parseFloat(document.getElementById("s_tw").value),sd=document.getElementById("s_sd").value,fh=parseInt(document.getElementById("s_fh").value,10),uk=parseFloat(document.getElementById("s_uk").value);if(sw>0)S.settings.startWeight=sw;if(tw>0)S.settings.targetWeight=tw;if(sd)S.settings.startDate=sd;if(fh>=14&&fh<=24)S.settings.fastHours=fh;if(uk>0)S.settings.unlockKg=uk;const cty=document.getElementById("s_city"),ram=document.getElementById("s_ram"),hoff=document.getElementById("s_hoff"),trad=document.getElementById("s_trad");const tbs=document.getElementById("s_tbs");if(tbs&&tbs.value)S.settings.tarbiyahStart=tbs.value;const th=document.getElementById("s_theme");if(th&&th.value!==THEME)setTheme(th.value);const qs=document.getElementById("s_qs");if(qs&&qs.value)S.settings.quranStart=qs.value;if(cty&&CITIES[cty.value])S.settings.city=cty.value;if(ram)S.settings.ramadan=ram.value;if(hoff)S.settings.hijriOffset=Number(hoff.value);if(trad)S.settings.tradition=trad.value;persistSettings();toast("Settings saved");render()}
});
window.addEventListener("hashchange",()=>{let h=location.hash.slice(1);if(h==="guide")h="learn";if(VIEWS[h]&&h!==tab){tab=h;render()}});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)render()});

applyLang();loadLocal();render();setChip();
if(window.claude&&window.claude.use){connect()}else{syncState="local";setChip()}
