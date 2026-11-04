/** Hijri calendar, Sunnah fast days and prayer times. Ported from the Qanun al-Thuluth project. The app suggests; it never rules. */
export const HIJRI_MONTHS = ["Muharram","Safar","Rabi al-Awwal","Rabi al-Thani","Jumada al-Ula","Jumada al-Akhirah","Rajab","Sha'ban","Ramadan","Shawwal","Dhu al-Qa'dah","Dhu al-Hijjah"] as const;
export interface HijriDate { year: number; month: number; day: number; cal: "umalqura"|"tabular" }
const ISLAMIC_EPOCH = 1948439.5;
const islamicToJd = (y: number, m: number, d: number) => d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + ISLAMIC_EPOCH - 1;
export function tabularHijri(dt: Date): HijriDate {
  const jd = Math.floor(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()) / 864e5 + 2440587.5) + 0.5;
  const year = Math.floor((30 * (jd - ISLAMIC_EPOCH) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((jd - (29 + islamicToJd(year, 1, 1))) / 29.5) + 1);
  return { year, month, day: jd - islamicToJd(year, month, 1) + 1, cal: "tabular" };
}
let umf: Intl.DateTimeFormat | null | undefined;
export function hijriOf(dateStr: string, offsetDays = 0): HijriDate {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d, 12) - offsetDays * 864e5);
  if (umf === undefined) { try { const f = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" }); umf = f.resolvedOptions().calendar === "islamic-umalqura" ? f : null; } catch { umf = null; } }
  if (umf) { try { const p = umf.formatToParts(dt); const n = (t: string) => Number((p.find(x => x.type === t)?.value ?? "").replace(/\D/g, "")); const r = { year: n("year"), month: n("month"), day: n("day"), cal: "umalqura" as const }; if (r.year && r.month && r.day) return r; } catch { /* fall through */ } }
  return tabularHijri(dt);
}
export const hijriLabel = (h: HijriDate) => `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year}`;
export type Tradition = "sunni"|"shia";
export function sunnahFast(dateStr: string, tradition: Tradition = "sunni", offsetDays = 0): { k: string; t: string } | null {
  const { month, day } = hijriOf(dateStr, offsetDays);
  if (month === 9) return null; if (month === 10 && day === 1) return null; if (month === 12 && day === 10) return null;
  if (tradition !== "shia" && month === 12 && day >= 11 && day <= 13) return null;
  if (month === 12 && day === 9) return { k: "arafah", t: "Day of Arafah" };
  if (tradition !== "shia" && month === 1 && (day === 10 || day === 9)) return { k: "ashura", t: day === 10 ? "Ashura (10 Muharram)" : "9 Muharram, with Ashura" };
  if (day >= 13 && day <= 15) return { k: "bid", t: `Ayyam al-Bid (${day}th)` };
  const wd = new Date(dateStr + "T12:00:00").getDay();
  if (tradition !== "shia" && (wd === 1 || wd === 4)) return { k: "monthu", t: wd === 1 ? "Monday Sunnah fast" : "Thursday Sunnah fast" };
  return null;
}
const DEG = Math.PI / 180, sn = (d: number) => Math.sin(d * DEG), cs = (d: number) => Math.cos(d * DEG);
const fixAngle = (a: number) => { const r = a % 360; return r < 0 ? r + 360 : r; };
export function julianDay(y: number, m: number, d: number): number { if (m <= 2) { y -= 1; m += 12; } const a = Math.floor(y / 100), b = 2 - a + Math.floor(a / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5; }
export function solarPosition(jd: number): { declination: number; eot: number } {
  const t = (jd - 2451545) / 36525; const l0 = fixAngle(280.46646 + t * (36000.76983 + 0.0003032 * t)); const m = fixAngle(357.52911 + t * (35999.05029 - 0.0001537 * t));
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t); const c = sn(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) + sn(2 * m) * (0.019993 - 0.000101 * t) + sn(3 * m) * 0.000289;
  const omega = 125.04 - 1934.136 * t; const lambda = l0 + c - 0.00569 - 0.00478 * sn(omega);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60; const eps = eps0 + 0.00256 * cs(omega);
  const declination = Math.asin(sn(eps) * sn(lambda)) / DEG; const y = Math.tan(eps / 2 * DEG) ** 2, l0r = l0 * DEG, mr = m * DEG;
  const eot = y * Math.sin(2 * l0r) - 2 * e * Math.sin(mr) + 4 * e * y * Math.sin(mr) * Math.cos(2 * l0r) - 0.5 * y * y * Math.sin(4 * l0r) - 1.25 * e * e * Math.sin(2 * mr);
  return { declination, eot: (4 * eot) / DEG };
}
function hourAngle(alt: number, lat: number, decl: number): number { const x = (sn(alt) - sn(lat) * sn(decl)) / (cs(lat) * cs(decl)); return x < -1 || x > 1 ? NaN : Math.acos(x) / DEG; }
export interface PrayerTimes { fajr: Date; sunrise: Date; dhuhr: Date; maghrib: Date; isha: Date }
/** University of Islamic Sciences Karachi method: Fajr 18°, Isha 18°, Maghrib at sunset. UTC instants rounded to the minute. */
export function prayerTimes(dateStr: string, lat: number, lon: number): PrayerTimes | null {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number]; const jd0 = julianDay(y, m, d);
  const noonAt = (h: number) => 12 - lon / 15 - solarPosition(jd0 + h / 24).eot / 60; let noon = 12 - lon / 15; for (let i = 0; i < 3; i++) noon = noonAt(noon);
  const atAlt = (alt: number, side: 1 | -1) => { let t = noon + side * 6; for (let i = 0; i < 4; i++) { const { declination } = solarPosition(jd0 + t / 24); const h = hourAngle(alt, lat, declination); if (isNaN(h)) return NaN; t = noonAt(t) + side * h / 15; } return t; };
  const sunrise = atAlt(-0.8333, -1), sunset = atAlt(-0.8333, 1); if (isNaN(sunrise) || isNaN(sunset)) return null; const night = 24 - (sunset - sunrise);
  let fajr = atAlt(-18, -1); const safeF = sunrise - night / 2; if (isNaN(fajr) || safeF > fajr) fajr = safeF;
  let isha = atAlt(-18, 1); const safeI = sunset + night / 2; if (isNaN(isha) || safeI < isha) isha = safeI;
  const base = Date.UTC(y, m - 1, d); const at = (h: number) => new Date(base + Math.round(h * 60) * 6e4);
  return { fajr: at(fajr), sunrise: at(sunrise), dhuhr: at(noon + 1 / 60), maghrib: at(sunset), isha: at(isha) };
}
export const CITIES: Record<string, [string, number, number]> = { karachi: ["Karachi", 24.8607, 67.0011], lahore: ["Lahore", 31.5204, 74.3587], islamabad: ["Islamabad", 33.6844, 73.0479], rawalpindi: ["Rawalpindi", 33.5651, 73.0169], faisalabad: ["Faisalabad", 31.4504, 73.135], multan: ["Multan", 30.1575, 71.5249], peshawar: ["Peshawar", 34.0151, 71.5249], quetta: ["Quetta", 30.1798, 66.975], hyderabad: ["Hyderabad", 25.396, 68.3578], gujranwala: ["Gujranwala", 32.1877, 74.1945], sialkot: ["Sialkot", 32.4945, 74.5229] };
export function fastingTimes(dateStr: string, cityKey: string) { const c = CITIES[cityKey] ?? CITIES.karachi!; const t = prayerTimes(dateStr, c[1], c[2]); if (!t) return null; return { city: c[0], fajr: t.fajr, imsak: new Date(t.fajr.getTime() - 10 * 6e4), maghrib: t.maghrib, isha: t.isha }; }
export const isRamadan = (dateStr: string, offsetDays = 0) => hijriOf(dateStr, offsetDays).month === 9;
