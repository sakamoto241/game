/** 呪文定義。習得はレベル依存（データ駆動） */
export type SpellId = "mera" | "hoimi";

export interface SpellDef {
  id: SpellId;
  name: string;
  desc: string;
  mp: number;
  kind: "attack" | "heal";
  /** 基本威力（attack は防御無視ダメージ、heal は回復量） */
  power: number;
  /** 乱数幅（±ではなく 0..variance を加算） */
  variance: number;
  learnLevel: number;
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
    learnLevel: 1,
  },
  hoimi: {
    id: "hoimi",
    name: "ホイミ",
    desc: "HPを 30ほど かいふくする",
    mp: 3,
    kind: "heal",
    power: 28,
    variance: 8,
    learnLevel: 3,
  },
};

export const SPELL_IDS = Object.keys(SPELLS) as SpellId[];
