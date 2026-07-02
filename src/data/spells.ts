/**
 * 呪文定義。誰がいつ覚えるかは classes.ts 側（職業ごとの習得表）で管理する。
 */
export type SpellId = "mera" | "gira" | "merami" | "hoimi" | "behoimi" | "sukara";

export type SpellKind = "attack" | "heal" | "buffDef";

export interface SpellDef {
  id: SpellId;
  name: string;
  desc: string;
  mp: number;
  kind: SpellKind;
  /** attack/heal: 基本量。buffDef: 防御倍率の加算値 (0.5 = +50%) */
  power: number;
  /** 乱数幅（0..variance を加算） */
  variance: number;
}

export const SPELLS: Record<SpellId, SpellDef> = {
  mera: {
    id: "mera",
    name: "メラ",
    desc: "ちいさな ひのたまで こうげき",
    mp: 3,
    kind: "attack",
    power: 10,
    variance: 5,
  },
  gira: {
    id: "gira",
    name: "ギラ",
    desc: "しゃくねつの ほのおで こうげき",
    mp: 4,
    kind: "attack",
    power: 17,
    variance: 6,
  },
  merami: {
    id: "merami",
    name: "メラミ",
    desc: "おおきな ひのたまで こうげき",
    mp: 6,
    kind: "attack",
    power: 30,
    variance: 8,
  },
  hoimi: {
    id: "hoimi",
    name: "ホイミ",
    desc: "HPを 30ほど かいふくする",
    mp: 3,
    kind: "heal",
    power: 28,
    variance: 8,
  },
  behoimi: {
    id: "behoimi",
    name: "ベホイミ",
    desc: "HPを 60ほど かいふくする",
    mp: 5,
    kind: "heal",
    power: 55,
    variance: 12,
  },
  sukara: {
    id: "sukara",
    name: "スカラ",
    desc: "みかたひとりの しゅびを あげる",
    mp: 2,
    kind: "buffDef",
    power: 0.5,
    variance: 0,
  },
};
