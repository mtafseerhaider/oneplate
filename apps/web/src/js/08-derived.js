/* ---------- derived ---------- */
function streak(){return core.streak(S.days,todayStr())}
function greeting(){const h=new Date().getHours();return h<12?"Good morning":h<17?"Good afternoon":"Good evening"}
/* Who is signed in: the household member on the self-hosted build; the owner or the family editor on the artifact; nobody known for a viewer. */
function whoAmI(){if(typeof window.oneplate==="object"){const id=window.oneplate.memberId&&window.oneplate.memberId();const m=id&&member(id);return m?m.name:(window.oneplate.displayName&&window.oneplate.displayName())||""}if(readOnly)return "";return (member(isOwner?ownerId():((spouse()||{}).id))||{}).name||""}
function hintIcon(h){return h<6.75?"bed":h<8?"sun":h<9?"bike":h<14?"coffee":h<18?"clock":h<19?"home":h<19.5?"egg":h<20?"bike":h<21.5?"plate":h<22.75?"walk":"moon"}
function dots(f,v,n,ro,cls,dd){return `<div class="dots ${cls||""} ${ro?"ro":""}">${Array.from({length:n},(_,i)=>i+1).map(i=>`<button class="dot ${i<=v?"on":""}" ${ro?"disabled":""} data-a="dot" data-f="${f}" data-v="${i}" ${dd?`data-d="${dd}"`:""} aria-label="${i}" aria-pressed="${i<=v}">${i}</button>`).join("")}</div>`}
function swRow(id,label,sub,done,ro,leadIcon,g,dd){return `<div class="crow sw-row ${done?"done":""}" role="switch" aria-checked="${done?"true":"false"}" ${ro?"":`tabindex="0" data-a="tog"`} data-k="${id}" ${dd?`data-d="${dd}"`:""}><span class="lead">${ic(leadIcon)}</span><div class="t"><b>${esc(label)} ${g?I(g):""}</b>${sub?`<small>${esc(sub)}</small>`:""}</div><span class="sw"><i></i></span></div>`}
function fmtClock(d){return d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}

