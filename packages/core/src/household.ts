/** A household's roster and the personalisation of content written for one family (Tafseer, Uzma, Abbas and Eliyya) so every family reads its own names and ages. */
import { ageOf, type Member } from "./family.js";

export interface Roster { owner: Member | null; spouse: Member | null; adults: Member[]; children: Member[] }
/** Owner first, other adults, then children eldest first. */
export function roster(members: Member[], ownerId: string, today = new Date()): Roster {
  const owner = members.find(m => m.id === ownerId) ?? members.find(m => m.rel === "me") ?? null;
  const adults = members.filter(m => m.role === "adult" && m !== owner);
  const spouse = adults.find(m => /wife|husband|spouse/i.test(m.rel)) ?? adults[0] ?? null;
  const children = members.filter(m => m.role === "child").slice().sort((a, b) => (a.dob || "9999") < (b.dob || "9999") ? -1 : 1);
  void today; return { owner, spouse, adults, children };
}
export function sortMembers(members: Member[], ownerId: string): Member[] { const r = roster(members, ownerId); return [r.owner, ...r.adults.filter(m => m !== r.spouse && m !== r.owner), ...(r.spouse ? [r.spouse] : []), ...r.children].filter((m): m is Member => !!m).filter((m, i, a) => a.indexOf(m) === i).concat(members.filter(m => m !== r.owner && !r.adults.includes(m) && !r.children.includes(m))); }
export function memberAge(m: Member | null, today = new Date()): number | null { if (!m?.dob) return null; const a = ageOf(m.dob, today); return a ? a.years : null; }
/** A stable id for a new member from the name: letters and digits only, with a suffix if taken. */
export function memberIdFor(name: string, taken: string[]): string { const base = (name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "").slice(0, 16) || "member"); let id = base, n = 2; while (taken.includes(id) || id === "owner") id = base + n++; return id; }
export function listNames(names: string[], fallback: string): string { if (!names.length) return fallback; if (names.length === 1) return names[0]!; return names.slice(0, -1).join(", ") + " and " + names[names.length - 1]; }
const WORDS: Record<number, string> = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen" };
/** Replaces the original family's names and ages with this household's. "Abbas" is the eldest child, "Eliyya" the second; a missing person becomes a plain phrase.
 *  Ibn 'Abbas, the Abbasids and the name inside a quoted narration are left alone. Written for English content; Urdu strings pass through untouched. */
export function personalize(text: string, r: Roster, today = new Date()): string {
  if (!text || !/Tafseer|Uzma|Abbas|Eliyya/.test(text)) return text;
  const own = r.owner?.name || "you", sp = r.spouse?.name || "your spouse"; const c1 = r.children[0] ?? null, c2 = r.children[1] ?? null;
  const n1 = c1?.name || "your child", n2 = c2?.name || (c1 ? "your younger child" : "your child"); const a1 = memberAge(c1, today), a2 = memberAge(c2, today);
  const kids = listNames(r.children.map(c => c.name), "the children");
  let s = text;
  s = s.replace(/\bAbbas and Eliyya\b|\bAbbas or Eliyya\b/g, kids).replace(/\bEliyya and Abbas\b/g, kids);
  s = s.replace(/\bAbbas\s*\((\d{1,2})\)/g, () => `${n1}${a1 != null ? ` (${a1})` : ""}`).replace(/\bEliyya\s*\((\d{1,2})\)/g, () => `${n2}${a2 != null ? ` (${a2})` : ""}`);
  s = s.replace(/\bAbbas,\s*age\s*\d{1,2}\b/g, () => `${n1}${a1 != null ? `, age ${a1}` : ""}`).replace(/\bEliyya,\s*age\s*\d{1,2}\b/g, () => `${n2}${a2 != null ? `, age ${a2}` : ""}`);
  s = s.replace(/\bAbbas at (?:seven|7)\b/g, () => `${n1}${a1 != null ? ` at ${a1}` : ""}`).replace(/\bEliyya at (?:four|4)\b/g, () => `${n2}${a2 != null ? ` at ${a2}` : ""}`);
  if (a1 != null) s = s.replace(/\b(?:[Aa]|[Tt]he) (?:seven|7)-year-old\b/g, (m) => m.replace(/(?:seven|7)/, WORDS[a1] ?? String(a1)));
  if (a2 != null) s = s.replace(/\b(?:[Aa]|[Tt]he) (?:four|4)-year-old\b/g, (m) => m.replace(/(?:four|4)/, WORDS[a2] ?? String(a2)));
  s = s.replace(/(?<!Ibn )(?<!Ibn ')(?<!')\bAbbas(?!id)\b/g, n1).replace(/\bEliyya\b/g, n2).replace(/\bUzma\b/g, sp).replace(/\bTafseer\b/g, own);
  return s;
}
/** Which of the two activity sets, written for a seven-year-old and a four-year-old, fits a child: the closer in age. */
export function activitySetFor(m: Member | null, today = new Date()): "abbas" | "eliyya" { const a = memberAge(m, today); if (a == null) return "abbas"; return Math.abs(a - 7) <= Math.abs(a - 4) ? "abbas" : "eliyya"; }
