/* ---------- Scan a plate or the kitchen. Self-hosted: the API calls Claude with the server's key. Artifact: the viewer's own Claude through the sample capability. Same prompt and normaliser from core. ---------- */
let SCAN={ok:null,why:""};
async function scanProbe(){if(SCAN.ok!==null)return SCAN.ok;
  try{ if(typeof window.oneplate==="object"){const st=await window.oneplate.scanStatus();SCAN={ok:!!st.available,why:st.available?"":"The server has no Anthropic API key yet (ANTHROPIC_API_KEY)."};}
    else if(window.claude&&window.claude.use){const smp=await window.claude.use("sample");if(!smp){SCAN={ok:false,why:"Scanning needs the claude.ai viewer."}}else{const lim=await smp.limits().catch(()=>null);SCAN={ok:!!(lim&&lim.images),why:lim&&lim.images?"":"This view cannot send photos to Claude.",sample:smp,lim}}}
    else SCAN={ok:false,why:"Open OnePlate from its link to scan."};
  }catch(e){SCAN={ok:false,why:e.message||"Scanning unavailable"}}
  render();return SCAN.ok}
function scanCard(){const sc=S._scan||{};if(readOnly)return "";if(SCAN.ok===null)scanProbe();
  const head=`<div class="row between"><p class="eyebrow">${ic("camera")} ${tr("Scan a plate")} ${I("scan")}</p>${SCAN.ok===false?`<span class="pill grey">${tr("not set up")}</span>`:""}</div>`;
  if(sc.busy)return `<section class="card accent">${head}<p class="small"><span class="spin"></span> ${sc.mode==="pantry"?tr("Looking at what is at home…"):tr("Reading the plate…")} <span class="muted">${tr("usually 10–40 seconds")}</span></p><p class="small muted">${tr("Thinking")}…</p></section>`;
  if(sc.error)return `<section class="card">${head}<p class="small" style="color:var(--red)">${esc(sc.error)}</p><div class="row"><button class="btn" data-a="scan_reset">${tr("Try again")}</button></div></section>`;
  if(sc.result)return `<section class="card accent">${head}${scanResult(sc.result)}</section>`;
  return `<section class="card">${head}
  <p class="small muted">${tr("Photograph tonight's plate and the app reads it in hand portions, judges it against the plan and saves it. Or photograph the fridge or the shelf, and it proposes plates from what is already at home.")}</p>
  ${SCAN.ok===false?`<p class="small muted">${esc(SCAN.why)}</p>`:""}
  <div class="row"><button class="btn primary" data-a="scan_pick" data-mode="plate" ${SCAN.ok===false?"disabled":""}>${ic("camera")} ${tr("Scan the plate")}</button><button class="btn" data-a="scan_pick" data-mode="pantry" ${SCAN.ok===false?"disabled":""}>${ic("home")} ${tr("Scan the kitchen")}</button></div>
  <input type="file" id="scanFile" accept="image/*" capture="environment" hidden>
  ${sc.last?`<p class="small muted">${tr("Last scan")}: ${esc(sc.last)}</p>`:""}</section>`}
function thirdsBar(sh){const cats=[["protein","var(--accent)"],["veg","var(--green)"],["carb","var(--amber)"],["plus","var(--blue)"],["fat","var(--muted)"]];return `<div class="bar thirds" aria-label="share of calories">${cats.map(([c,col])=>`<i style="width:${Math.round((sh[c]||0)*100)}%;background:${col}" title="${c} ${Math.round((sh[c]||0)*100)}%"></i>`).join("")}</div><div class="lbls"><span>${cats.filter(([c])=>sh[c]>0.04).map(([c])=>`${c} ${Math.round(sh[c]*100)}%`).join(" · ")}</span></div>`}
function scanPlateBlock(pl,pi){const tone=pl.thirds==="ok"?"green":pl.thirds==="empty"?"grey":"amber";
  return `<div class="scanplate" data-pi="${pi}">
    <div class="row between"><h3>${esc(pl.name)}</h3><span class="pill ${tone}">${esc(tr(THIRDS_LABEL[pl.thirds]))}</span></div>
    ${pl.why?`<p class="small muted">${esc(pl.why)}</p>`:""}
    <div class="erows">${pl.items.map((it,i)=>{const fd=foodOf(it);return `<div class="erow scanrow"><div class="t"><b>${esc(fd.n)}</b>${it.x?` <span class="pill grey" style="font-size:10px;padding:1px 6px">${tr("estimated")}</span>`:""}<small>${esc(portion(it.q,fd))} · ${Math.round(fd.kcal*it.q)} kcal</small></div><div class="seg"><button data-a="scan_qty" data-pi="${pi}" data-i="${i}" data-d="-0.25" aria-label="less">−</button><button data-a="scan_qty" data-pi="${pi}" data-i="${i}" data-d="0.25" aria-label="more">+</button><button data-a="scan_del" data-pi="${pi}" data-i="${i}" aria-label="remove">✕</button></div></div>`}).join("")}</div>
    ${mbar(pl.macros)}${thirdsBar(pl.shares)}
    ${pl.missing&&pl.missing.length?`<p class="small"><b>${tr("To buy")}:</b> ${esc(pl.missing.join(", "))}</p>`:""}
    <div class="row"><button class="btn primary" data-a="scan_save" data-pi="${pi}" data-tonight="1">${ic("check")} ${tr("Set as tonight's plate")}</button><button class="btn" data-a="scan_save" data-pi="${pi}">${tr("Save to my meals")}</button></div></div>`}
function scanResult(r){if(r.notFood)return `<p class="small">${tr("No food recognised in that photo.")}</p><div class="row"><button class="btn" data-a="scan_reset">${tr("Scan again")}</button></div>`;
  if(r.mode==="pantry")return `<p class="small"><b>${tr("At home")}:</b> ${esc(r.ingredients.join(", "))||"—"}</p>${r.budgetNote?`<p class="small muted">${esc(r.budgetNote)}</p>`:""}${r.plates.map((pl,i)=>scanPlateBlock(pl,i)).join("")}<div class="row"><button class="btn ghost" data-a="scan_reset">${tr("Scan again")}</button></div>`;
  return `${scanPlateBlock(r.plate,0)}<div class="note" style="border-left-color:var(--green)"><b>${tr("Against the plan")}</b><br>${esc(r.verdict)}${r.proteinFirst===false?`<br><span class="muted">${tr("Eat the protein first.")}</span>`:""}</div>${r.suggestions.length?`<ul class="small">${r.suggestions.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}${r.unknown.length?`<p class="small muted">${tr("Estimated, not in the catalog")}: ${esc(r.unknown.join(", "))}. ${tr("Adjust the amounts with + and − if the photo misled it.")}</p>`:""}<div class="row"><button class="btn ghost" data-a="scan_reset">${tr("Scan again")}</button></div>`}
function scanPlates(){const r=(S._scan||{}).result;if(!r)return [];return r.mode==="pantry"?r.plates:[r.plate]}
function rescan(pl){const sh=plateShape(pl.items);pl.shares=sh.shares;pl.thirds=sh.thirds;pl.macros=mealCalc({items:pl.items})}
/** Shrinks a photo for upload: longest side 1280 px, JPEG 0.82. Returns {dataUrl, blob}. */
function shrinkImage(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{const max=1280,sc=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);const dataUrl=c.toDataURL("image/jpeg",0.82);c.toBlob(b=>res({dataUrl,blob:b}),"image/jpeg",0.82)};img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("Could not read that photo"))};img.src=url})}
async function runScan(file,mode){S._scan={busy:true,mode};render();
  try{const {dataUrl,blob}=await shrinkImage(file);const who=whoAmI()||"an adult on the plan";let result;
    if(typeof window.oneplate==="object"){result=await window.oneplate.scan(dataUrl,mode,who)}
    else{const raw=await SCAN.sample.json(scanPrompt(mode,who),{images:[blob],modelTier:"default"});result=normalizeScan(mode,raw)}
    S._scan={result,mode,last:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};render()}
  catch(e){const code=e&&e.code;S._scan={error:code==="not_granted"?tr("You did not allow the photo to be sent to Claude."):code==="images_unavailable"?tr("This view cannot send photos."):code==="rate_limited"?tr("Too many scans; wait a minute."):(e&&e.message)||tr("Scan failed"),mode};render()}}
function saveScanPlate(pl,tonight){const id="c_scan_"+Date.now().toString(36);const prot=pl.items.find(it=>foodOf(it).cat==="protein");const n=(foodOf(prot||pl.items[0]||{f:"salad",q:1}).n||"").toLowerCase();const tag=/chicken|chk|malai/.test(n)?"chicken":/beef|keema|kebab|mutton|nihari/.test(n)?"beef":/fish/.test(n)?"fish":prot?"other":"meatless";
  S.meals[id]={id,n:pl.name,tag,items:pl.items.map(it=>it.x?{f:it.f,q:it.q,x:it.x}:{f:it.f,q:it.q}),note:"From a scan · "+new Date().toLocaleDateString(),scanned:true};persistMeal(id);
  if(tonight){const t=logDate(),d=day(t);d.meal=id;persistDay(t)}return id}
