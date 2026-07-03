import type { SpellId } from "./spells";

/**
 * 職業定義。ステータス基礎値・成長・習得呪文・パッシブをデータ駆動で管理。
 * 新職業（レンジャー・賢者・商人など）はここに追加するだけ。
 */
export type ClassId = "hero" | "warrior" | "mage" | "priest" | "thief";

export interface StatBlock {
  hp: number;
  mp: number;
  atk: number;
  def: number;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  /** プレースホルダーの衣装色（本スプライト導入後も UI アクセントに使う） */
  color: string;
  base: StatBlock;
  growth: StatBlock;
  /** 習得呪文（レベル到達で覚える） */
  spells: { spell: SpellId; level: number }[];
  passive?: {
    /** にげるが必ず成功する */
    fleeAlways?: boolean;
    /** 敵ドロップ率の倍率 */
    dropRate?: number;
  };
}

export const CLASSES: Record<ClassId, ClassDef> = {
  hero: {
    id: "hero",
    name: "ゆうしゃ",
    color: "#4a7dd4",
    base: { hp: 26, mp: 6, atk: 8, def: 4 },
    growth: { hp: 5, mp: 2, atk: 2, def: 1 },
    spells: [
      { spell: "mera", level: 1 },
      { spell: "hoimi", level: 3 },
    ],
  },
  warrior: {
    id: "warrior",
    name: "せんし",
    color: "#c8542e",
    base: { hp: 34, mp: 0, atk: 10, def: 6 },
    growth: { hp: 7, mp: 0, atk: 3, def: 2 },
    spells: [],
  },
  mage: {
    id: "mage",
    name: "まほうつかい",
    color: "#8a4ad4",
    base: { hp: 18, mp: 12, atk: 5, def: 2 },
    growth: { hp: 3, mp: 4, atk: 1, def: 1 },
    spells: [
      { spell: "mera", level: 1 },
      { spell: "gira", level: 4 },
      { spell: "rukani", level: 6 },
      { spell: "merami", level: 8 },
    ],
  },
  priest: {
    id: "priest",
    name: "そうりょ",
    color: "#3aa06a",
    base: { hp: 22, mp: 10, atk: 6, def: 3 },
    growth: { hp: 4, mp: 3, atk: 1, def: 1 },
    spells: [
      { spell: "hoimi", level: 1 },
      { spell: "sukara", level: 3 },
      { spell: "kiari", level: 5 },
      { spell: "behoimi", level: 7 },
    ],
  },
  thief: {
    id: "thief",
    name: "とうぞく",
    color: "#c8a832",
    base: { hp: 24, mp: 4, atk: 8, def: 3 },
    growth: { hp: 5, mp: 1, atk: 2, def: 1 },
    spells: [],
    passive: { fleeAlways: true, dropRate: 1.5 },
  },
};
