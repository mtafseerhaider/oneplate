/** One policy module used by every route. Mirrors the artifact's levels: owner, contributor, viewer. */
export type Level = "owner"|"contributor"|"viewer";
export interface Actor { userId: string; level: Level; memberId: string | null }
const OWNER_ONLY_COLLECTIONS = new Set(["settings", "fast", "quran", "qnotes"]);
export function canRead(actor: Actor): boolean { return !!actor; }
/** Contributors may write meals, family profiles and weigh-ins for non-owner members, days only for their own member fields; owners write everything. */
export function canWrite(actor: Actor, collection: string, docId: string, body: any, existing: any): boolean {
  if (actor.level === "owner") return true;
  if (actor.level === "viewer") return false;
  if (OWNER_ONLY_COLLECTIONS.has(collection)) return false;
  if (collection === "meals" || collection === "tarbiyah") return true;
  if (collection === "family") return docId !== "tafseer" && docId !== "owner";
  if (collection === "weighins") { const m = body?.m ?? existing?.m; return !!m && m !== "tafseer"; }
  if (collection === "days") { if (!existing) return true; const changed = Object.keys(body).filter(k => JSON.stringify(body[k]) !== JSON.stringify(existing[k])); return changed.every(k => ["journal", "learn", "circle", "meal", "date", "tarbiyah"].includes(k)); }
  return false;
}
/** Children are never restricted: reject weight targets on child members at the boundary too. */
export function validateFamilyDoc(body: any): string | null { if (body?.role === "child" && (body.targetWeight != null || body.startWeight != null || body.goal === "fat_loss")) return "children are never restricted"; return null; }
