/** Scholar review gates, after the Bayan Library's dua program: every note starts as a draft and moves up only when a named person checks it.
 *  REVIEWS ships the status of items that have been through a gate; anything absent is a draft. The local API and the artifact store add per-installation reviews on top. */
export type ReviewStatus = "draft" | "reviewed" | "verified" | "disputed";
export interface Review { status: ReviewStatus; by?: string; date?: string; source?: string; note?: string }
export const REVIEW_GATES: Record<ReviewStatus, { label: string; short: string; tone: "grey" | "blue" | "green" | "red"; means: string }> = {
  draft:    { label: "Draft",    short: "draft",    tone: "grey",  means: "Written for this app and not yet checked by a named reader against the source. Read it as a study aid, not as a citation." },
  reviewed: { label: "Reviewed", short: "reviewed", tone: "blue",  means: "A named reader compared the note with the source text and found it faithful. The name and date are recorded." },
  verified: { label: "Verified", short: "verified", tone: "green", means: "Checked against the printed edition, with the volume and page recorded, so anyone can open the book to the same place." },
  disputed: { label: "Disputed", short: "disputed", tone: "red",   means: "A reviewer found a problem. The note stays visible with the reviewer's objection until it is corrected or withdrawn." },
};
export const REVIEWS: Record<string, Review> = {};
