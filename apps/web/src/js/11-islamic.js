/* ---------- Hijri calendar, Sunnah fast days, prayer times (ported from the Qanun al-Thuluth project) ---------- */
const HIJRI_MONTHS=["Muharram","Safar","Rabi al-Awwal","Rabi al-Thani","Jumada al-Ula","Jumada al-Akhirah","Rajab","Sha'ban","Ramadan","Shawwal","Dhu al-Qa'dah","Dhu al-Hijjah"];
const ISLAMIC_EPOCH=1948439.5;
function islamicToJd(y,m,d){return d+Math.ceil(29.5*(m-1))+(y-1)*354+Math.floor((3+11*y)/30)+ISLAMIC_EPOCH-1}
function tabularHijri(dt){const jd=Math.floor(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth(),dt.getUTCDate())/864e5+2440587.5)+0.5;const year=Math.floor((30*(jd-ISLAMIC_EPOCH)+10646)/10631);const month=Math.min(12,Math.ceil((jd-(29+islamicToJd(year,1,1)))/29.5)+1);const day=jd-islamicToJd(year,month,1)+1;return {year,month,day,cal:"tabular"}}
let _umf;
function hijriOf(dateStr){const off=Number((S.settings||{}).hijriOffset||0);const [y,m,d]=dateStr.split("-").map(Number);const dt=new Date(Date.UTC(y,m-1,d,12)-off*864e5);
  if(_umf===undefined){try{const f=new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn",{timeZone:"UTC",year:"numeric",month:"numeric",day:"numeric"});_umf=f.resolvedOptions().calendar==="islamic-umalqura"?f:null}catch(e){_umf=null}}
  if(_umf){try{const p=_umf.formatToParts(dt);const n=t=>Number(((p.find(x=>x.type===t)||{}).value||"").replace(/\D/g,""));const r={year:n("year"),month:n("month"),day:n("day"),cal:"umalqura"};if(r.year&&r.month&&r.day)return r}catch(e){}}
  return tabularHijri(dt)}
function hijriLabel(h){return h.day+" "+HIJRI_MONTHS[h.month-1]+" "+h.year}
/* Sunnah fast days: Monday/Thursday, Ayyam al-Bid (13–15, not Ramadan), Arafah (9 Dhu al-Hijjah), Ashura (10 Muharram + 9th). Never suggested: Ramadan, 1 Shawwal, 10–13 Dhu al-Hijjah. The app suggests; it never rules. */
function sunnahFast(dateStr){const h=hijriOf(dateStr),t=(S.settings||{}).tradition||"sunni";const {month,day}=h;
  if(month===9)return null;if(month===10&&day===1)return null;if(month===12&&day===10)return null;if(t!=="shia"&&month===12&&day>=11&&day<=13)return null;
  if(month===12&&day===9)return {k:"arafah",t:"Day of Arafah"};
  if(t!=="shia"&&month===1&&(day===10||day===9))return {k:"ashura",t:day===10?"Ashura (10 Muharram)":"9 Muharram, with Ashura"};
  if(day>=13&&day<=15)return {k:"bid",t:"Ayyam al-Bid ("+day+"th)"};
  const wd=new Date(dateStr+"T12:00:00").getDay();
  if(t!=="shia"&&(wd===1||wd===4))return {k:"monthu",t:wd===1?"Monday Sunnah fast":"Thursday Sunnah fast"};
  return null}
/* Solar position (Meeus) and prayer times, University of Islamic Sciences Karachi method: Fajr 18°, Isha 18°, Maghrib at sunset. */
const DEG=Math.PI/180,sn=d=>Math.sin(d*DEG),cs=d=>Math.cos(d*DEG);
function fixAngle(a){const r=a%360;return r<0?r+360:r}
function julianDay(y,m,d){if(m<=2){y-=1;m+=12}const a=Math.floor(y/100),b=2-a+Math.floor(a/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+b-1524.5}
function solarPosition(jd){const t=(jd-2451545)/36525;const l0=fixAngle(280.46646+t*(36000.76983+0.0003032*t));const m=fixAngle(357.52911+t*(35999.05029-0.0001537*t));const e=0.016708634-t*(0.000042037+0.0000001267*t);const c=sn(m)*(1.914602-t*(0.004817+0.000014*t))+sn(2*m)*(0.019993-0.000101*t)+sn(3*m)*0.000289;const omega=125.04-1934.136*t;const lambda=l0+c-0.00569-0.00478*sn(omega);const eps0=23+(26+(21.448-t*(46.815+t*(0.00059-t*0.001813)))/60)/60;const eps=eps0+0.00256*cs(omega);const declination=Math.asin(sn(eps)*sn(lambda))/DEG;const y=Math.tan(eps/2*DEG)**2,l0r=l0*DEG,mr=m*DEG;const eot=y*Math.sin(2*l0r)-2*e*Math.sin(mr)+4*e*y*Math.sin(mr)*Math.cos(2*l0r)-0.5*y*y*Math.sin(4*l0r)-1.25*e*e*Math.sin(2*mr);return {declination,eot:(4*eot)/DEG}}
function hourAngle(alt,lat,decl){const x=(sn(alt)-sn(lat)*sn(decl))/(cs(lat)*cs(decl));if(x<-1||x>1)return NaN;return Math.acos(x)/DEG}
function prayerTimes(dateStr,lat,lon){const [y,m,d]=dateStr.split("-").map(Number);const jd0=julianDay(y,m,d);const noonAt=h=>12-lon/15-solarPosition(jd0+h/24).eot/60;let noon=12-lon/15;for(let i=0;i<3;i++)noon=noonAt(noon);
  const atAlt=(alt,side)=>{let t=noon+side*6;for(let i=0;i<4;i++){const {declination}=solarPosition(jd0+t/24);const h=hourAngle(alt,lat,declination);if(isNaN(h))return NaN;t=noonAt(t)+side*h/15}return t};
  const sunrise=atAlt(-0.8333,-1),sunset=atAlt(-0.8333,1);if(isNaN(sunrise)||isNaN(sunset))return null;const night=24-(sunset-sunrise);
  let fajr=atAlt(-18,-1);const safeF=sunrise-night/2;if(isNaN(fajr)||safeF>fajr)fajr=safeF;
  let isha=atAlt(-18,1);const safeI=sunset+night/2;if(isNaN(isha)||safeI<isha)isha=safeI;
  const base=Date.UTC(y,m-1,d);const at=h=>new Date(base+Math.round(h*60)*6e4);
  return {fajr:at(fajr),sunrise:at(sunrise),dhuhr:at(noon+1/60),maghrib:at(sunset),isha:at(isha)}}
const CITIES={karachi:["Karachi",24.8607,67.0011],lahore:["Lahore",31.5204,74.3587],islamabad:["Islamabad",33.6844,73.0479],rawalpindi:["Rawalpindi",33.5651,73.0169],faisalabad:["Faisalabad",31.4504,73.135],multan:["Multan",30.1575,71.5249],peshawar:["Peshawar",34.0151,71.5249],quetta:["Quetta",30.1798,66.975],hyderabad:["Hyderabad",25.396,68.3578],gujranwala:["Gujranwala",32.1877,74.1945],sialkot:["Sialkot",32.4945,74.5229]};
function fastingTimes(dateStr){const c=CITIES[(S.settings||{}).city]||CITIES.karachi;const t=prayerTimes(dateStr,c[1],c[2]);if(!t)return null;return {city:c[0],fajr:t.fajr,imsak:new Date(t.fajr.getTime()-10*6e4),maghrib:t.maghrib,isha:t.isha}}
function ramadanActive(){const mode=(S.settings||{}).ramadan||"auto";if(mode==="on")return true;if(mode==="off")return false;return hijriOf(todayStr()).month===9}

