/** Long-form companion to a Learn item: sections of paragraphs or lists, and a longer version for the children. */
export interface DepthSection { h: string; p?: string[]; l?: string[] }
export interface Depth { sections: DepthSection[]; kids?: string[] }
