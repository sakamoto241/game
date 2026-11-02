export type AreaId = 'forest' | 'clearing';
export interface Point {x: number; y: number}
export interface Rect {x: number; y: number; w: number; h: number}
export type ItemId = 'leaf';
export interface Flags {
  metRabbit: boolean; arrivedClearing: boolean; metAcorn: boolean;
  bookmark: boolean; signReads: number; chairRead: boolean;
}
export interface DialogueCursor {id: string; index: number}
export interface SaveState {
  version: 1; chapter: 1; area: AreaId; position: Point; inventory: ItemId[];
  flags: Flags; seen: string[]; activeDialogue: DialogueCursor | null;
}
export interface Settings {
  music: boolean; volume: number; textSpeed: 'slow' | 'normal' | 'instant';
  reduceMotion: boolean;
}
export interface DialogueLine {speaker: 'you'|'rabbit'|'acorn'|'book'; text: string; expression?: string}
export interface DialogueChoice {label: string; next: string}
export interface Dialogue {
  id: string; lines: DialogueLine[]; choices?: DialogueChoice[];
  complete?: 'rabbit' | 'acorn' | 'bookmark';
}
export interface Hotspot {
  id: string; label: string; position: Point; approach: Point;
  kind: 'npc' | 'object' | 'exit'; frame?: string;
}
export interface Area {
  id: AreaId; name: string; subtitle: string; texture: string;
  spawn: Point; walkPolygon: Point[]; obstacles: Rect[]; hotspots: Hotspot[];
}
