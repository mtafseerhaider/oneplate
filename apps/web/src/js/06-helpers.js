/* ---------- helpers ---------- */
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function day(d){ if(!S.days[d])S.days[d]={date:d,water:0,palms:0}; return S.days[d]; }
function logDate(){const v=S._ld;return (v&&v<=todayStr())?v:todayStr()}
function logBar(t){if(t===todayStr())return "";const dt=new Date(t+"T12:00:00");return `<div class="note" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><span>${ic("clock")} Logging for <b>${dt.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}</b>. Everything you enter below goes to that day.</span><button class="btn" data-a="backtoday">${tr("Back to today")}</button></div>`}
function logPicker(t){return `<label class="f" style="flex:0 0 auto;min-width:0"><span style="font-size:11px">${tr("Logging for")}</span><input type="date" id="logDate" value="${t}" max="${todayStr()}" style="width:150px;padding:6px 10px"></label>`}
function weekNo(){const a=new Date(S.settings.startDate+"T00:00:00"),b=new Date(todayStr()+"T00:00:00");return Math.max(1,Math.floor((b-a)/864e5/7)+1)}
function phase(w){return w<=3?CYCLE[0]:w<=7?CYCLE[1]:w<=12?CYCLE[2]:CYCLE[3]}
function weighList(){return Object.values(S.weighins).filter(w=>!w.m||w.m==="tafseer").sort((a,b)=>a.date<b.date?-1:1)}
function currentWeight(){const l=weighList();return l.length?Number(l[l.length-1].weight):Number(S.settings.startWeight)}
function lostKg(){return Number(S.settings.startWeight)-currentWeight()}
function strengthOn(){return lostKg()>=(S.settings.unlockKg||5)}
function planFor(wd){return (strengthOn()?PLAN1:PLAN0)[wd]}
function fmtDate(s){const d=new Date(s+"T00:00:00");return d.toLocaleDateString(undefined,{day:"numeric",month:"short"})}
function hhmm(ms){const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4),s=Math.floor(ms%6e4/1e3);return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
function toast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("show");clearTimeout(t._x);t._x=setTimeout(()=>t.classList.remove("show"),1800)}
function nowHint(){
  const h=new Date().getHours()+new Date().getMinutes()/60;
  if(ramadanActive()){const ft=fastingTimes(todayStr());if(ft){const fa=ft.fajr.getHours()+ft.fajr.getMinutes()/60,mg=ft.maghrib.getHours()+ft.maghrib.getMinutes()/60;
    if(h<fa-1)return["Suhoor","Slow carbs (daliya, whole-wheat roti), protein (eggs, yogurt, daal), 2–3 glasses of water spread out. Go easy on salt."];
    if(h<fa)return["Last sips","Imsak at "+fmtClock(ft.imsak)+". Fast begins at Fajr "+fmtClock(ft.fajr)+"."];
    if(h<mg-0.5)return["Fasting","Iftar at "+fmtClock(ft.maghrib)+". Keep the day calm; walk in the shade, no heavy training."];
    if(h<mg)return["Almost iftar","Set out 1–3 dates and water. Normal dinner portion tonight, nothing to make up for."];
    if(h<mg+0.5)return["Iftar","Dates and water, then pray. Main plate in 20–30 minutes."];
    if(h<mg+2)return["OnePlate iftar dinner","Soup or salad first, then the normal plate. 20 minutes. 400 ml water over the next hour."];
    if(h<23)return["After Taraweeh","Fruit, yogurt or milk if hungry. Easy 30-min ride or a walk if you like. 400 ml water, then 250 ml before sleep."];
    return["Sleep","Suhoor alarm set for Fajr − 60 min."]}}
  if(h<6.75)return["Sleep","Lights out was 10:45 PM. Water with a pinch of salt when you wake."];
  if(h<7.5)return["Wake & walk","500 ml water with a pinch of salt, then a 15–20 min walk."];
  if(h<8)return["Coffee & go","Black coffee #1. Water bottle packed. Leave at 8:00."];
  if(h<9)return["Commute","Water on the bike. Nothing else needed."];
  if(h<12)return["Deep work, fasted","Coffee or green tea at 9:30. 500 ml water and a 5-min walk at 10:30."];
  if(h<13)return["Lunch-hour walk","15 min outside while others eat, then black tea. Hunger waves pass in 20 min."];
  if(h<14)return["Last caffeine by 2 PM","After this, herbal tea and water only, for sleep."];
  if(h<17.5)return["Afternoon","Herbal tea at 3:30 and a 5-min walk. 500 ml water at 4:30."];
  if(h<18)return["Last hour at work","Sparkling or mineral water. The starter is waiting at home."];
  if(h<19)return["Commute home","Water only. Break the fast when you walk in."];
  if(h<19.5)return["Break the fast","Protein starter now: yogurt + 2 eggs, or whey. Log the fast as ended."];
  if(h<20)return["Train","Cycle or walk from 7:30. Dinner at 8:00."];
  if(h<21)return["OnePlate dinner","2 palms · 2 fists · 1 cupped hand or 1 roti · 1 thumb · 1 bowl yogurt. Protein first, 20 minutes minimum."];
  if(h<21.5)return["Post-dinner walk","10–15 minutes. Kitchen closes at 9:30."];
  if(h<22.75)return["Fast started?","Last bite was 9:30. Screens dim at 10:00, calves stretched, lights out 10:45."];
  return["Lights out","Sleep is 80 % of recovery. 10:45 PM."];
}

