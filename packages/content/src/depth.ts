/** Long-form companions to every Learn item, looked up by the item's natural key. */
import type { Depth } from "./depth-types.js";
import { DEPTH_STORIES } from "./depth-stories.js";
import { DEPTH_BOOKS } from "./depth-books.js";
import { DEPTH_TEACHINGS } from "./depth-teachings.js";
import { DEPTH_VERSES } from "./depth-verses.js";
import { DEPTH_WORDS } from "./depth-words.js";
import { DEPTH_IDEAS } from "./depth-ideas.js";
import { DEPTH_DUAS, DEPTH_POEMS } from "./depth-duas-poems.js";
export type { Depth, DepthSection } from "./depth-types.js";
export const DEPTH: Record<string, Record<string, Depth>> = { story: DEPTH_STORIES, book: DEPTH_BOOKS, teaching: DEPTH_TEACHINGS, verse: DEPTH_VERSES, word: DEPTH_WORDS, idea: DEPTH_IDEAS, dua: DEPTH_DUAS, poem: DEPTH_POEMS };
/** The natural key of an item for its kind: stories, books, words and ideas by title, teachings by source, verses by reference, duas by transliteration, poems by poet and source. */
export function depthKey(kind: string, item: any): string {
  switch (kind) {
    case "story": case "book": case "word": case "idea": return String(item.t);
    case "teaching": return String(item.src);
    case "verse": return String(item.r);
    case "dua": return String(item.t);
    case "poem": return `${item.w}|${item.s}`;
    default: return "";
  }
}
export function depthOf(kind: string, item: any): Depth | undefined { return DEPTH[kind]?.[depthKey(kind, item)]; }
