import type { ItemId } from "./items";

/**
 * 敵定義。ステータスは [基本値, 階層ごとの増分] で表し、
 * 出現階層 floors の範囲でスケールする。
 * 新しい敵はここに追加して floors を設定するだけで出現する。
 */
export type StatScale = readonly [base: number, perFloor: number];

export interface EnemyDef {
  id: string;
  name: string;
  /** AssetManager のスプライトID（battle.〜） */
  sprite: string;
  floors: readonly [min: number, max: number];
  hp: StatScale;
  atk: StatScale;
  def: StatScale;
  exp: StatScale;
  gold: StatScale;
  drop?: { item: ItemId; chance: number; count: number };
  boss?: boolean;
  /** ランダム出現の重み（省略時 1） */
  weight?: number;
  /** 夜間の重み（省略時は weight と同じ）。ゴーストは夜に増える */
  nightWeight?: number;
  /** ランダム出現しない（ミミックなどイベント専用） */
  special?: boolean;
  /** 攻撃時に状態異常を与える */
  inflict?: { status: "poison" | "sleep"; chance: number };
  /** 物理攻撃の回避率(0..1)。命中判定で使う（ファントムバット） */
  evasion?: number;
  /** 与ダメージのうち自身のHPへ吸収する割合(0..1)（ブラッド・アコライト） */
  lifesteal?: number;
  /** Nターン経過で確定逃走（欲深きさまよい人）。倒せば大量報酬 */
  fleeAfter?: number;
  /** Nターン経過で自爆。パーティ全体に atk*mult のダメージ後に自滅（ボムスカル） */
  selfDestruct?: { after: number; mult: number };
  /**
   * 中ボス。逃走不可・専用報酬あり・撃破しても bossDefeated は立てない
   * （＝ゲームクリアの最終ボスとは区別する）。
   */
  midboss?: boolean;
  /** 専用の強力な攻撃（全体攻撃・専用SE付き）。確率で発動 */
  specialMove?: {
    name: string;
    /** 通常攻撃力に対する倍率 */
    mult: number;
    /** 発動確率 */
    chance: number;
    /** 鳴らす SE の id */
    se: string;
    /** パーティ全員が対象なら true */
    all?: boolean;
  };
  /** 撃破時の追加報酬（中ボス用） */
  bonusReward?: { gold: number; items: { id: ItemId; count: number }[] };
}

export const ENEMIES: EnemyDef[] = [
  {
    id: "rat",
    name: "おおねずみ",
    sprite: "battle.rat",
    floors: [1, 2],
    hp: [5, 2],
    atk: [4, 2],
    def: [0, 1],
    exp: [1, 1],
    gold: [3, 1],
    weight: 1.2,
  },
  {
    id: "slime",
    name: "スライム",
    sprite: "battle.slime",
    floors: [1, 3],
    hp: [7, 3],
    atk: [5, 2],
    def: [1, 1],
    exp: [2, 1],
    gold: [4, 2],
  },
  {
    id: "bat",
    name: "おおコウモリ",
    sprite: "battle.bat",
    floors: [2, 4],
    hp: [11, 3],
    atk: [8, 2],
    def: [2, 1],
    exp: [4, 1],
    gold: [7, 2],
    inflict: { status: "poison", chance: 0.18 },
  },
  {
    id: "skeleton",
    name: "がいこつへい",
    sprite: "battle.skeleton",
    floors: [3, 5],
    hp: [18, 4],
    atk: [11, 2],
    def: [4, 1],
    exp: [8, 2],
    gold: [12, 3],
    drop: { item: "kouseki", chance: 0.35, count: 1 },
  },
  {
    id: "ghost",
    name: "さまようれい",
    sprite: "battle.ghost",
    floors: [2, 5],
    hp: [9, 3],
    atk: [9, 2],
    def: [3, 1],
    exp: [5, 2],
    gold: [8, 2],
    weight: 0.6,
    nightWeight: 2.2,
    inflict: { status: "sleep", chance: 0.22 },
  },
  {
    id: "mimic",
    name: "ミミック",
    sprite: "battle.mimic",
    floors: [3, 5],
    hp: [28, 5],
    atk: [14, 2],
    def: [6, 1],
    exp: [16, 3],
    gold: [60, 15],
    drop: { item: "houseki", chance: 0.5, count: 1 },
    special: true,
  },
  {
    id: "yomimaru",
    name: "墓守りの黄泉丸",
    sprite: "battle.yomimaru",
    floors: [5, 5],
    hp: [140, 0],
    atk: [22, 0],
    def: [9, 0],
    exp: [60, 0],
    gold: [180, 0],
    midboss: true,
    special: true, // ランダム出現はしない（5F固定エンカウント）
    specialMove: {
      name: "しびれ ぶきの まいり",
      mult: 1.6,
      chance: 0.33,
      se: "bossSpecial",
      all: true,
    },
    drop: { item: "houseki", chance: 1, count: 1 },
    bonusReward: {
      gold: 120,
      items: [
        { id: "kouseki", count: 3 },
        { id: "houseki", count: 1 },
      ],
    },
  },
  // ========================= 深層(6F〜10F)の通常敵 =========================
  {
    id: "phantomBat",
    name: "ファントムバット",
    sprite: "battle.phantomBat",
    floors: [6, 9],
    hp: [16, 4],
    atk: [15, 2],
    def: [3, 1],
    exp: [9, 2],
    gold: [11, 2],
    evasion: 0.45, // 高回避: 物理がよく外れる（魔法で対処）
    weight: 1.1,
    nightWeight: 1.6,
  },
  {
    id: "heavyArmor",
    name: "彷徨う重甲冑",
    sprite: "battle.heavyArmor",
    floors: [6, 10],
    hp: [44, 6],
    atk: [14, 2],
    def: [20, 3], // 物理が通りにくい鉄壁（ルカニ/魔法が有効）
    exp: [13, 3],
    gold: [16, 3],
    weight: 0.9,
  },
  {
    id: "ghoul",
    name: "コラプト・グール",
    sprite: "battle.ghoul",
    floors: [6, 10],
    hp: [28, 4],
    atk: [16, 2],
    def: [6, 1],
    exp: [11, 2],
    gold: [12, 2],
    inflict: { status: "poison", chance: 0.4 }, // 毒付与
    weight: 1,
  },
  {
    id: "wanderer",
    name: "欲深きさまよい人",
    sprite: "battle.wanderer",
    floors: [6, 10],
    hp: [30, 5],
    atk: [10, 1],
    def: [8, 2],
    exp: [45, 12],
    gold: [140, 35], // 倒せば大量報酬。ただし3ターンで逃げる
    fleeAfter: 3,
    drop: { item: "houseki", chance: 0.6, count: 1 },
    weight: 0.5,
  },
  {
    id: "acolyte",
    name: "ブラッド・アコライト",
    sprite: "battle.acolyte",
    floors: [7, 10],
    hp: [34, 5],
    atk: [17, 2],
    def: [7, 1],
    exp: [13, 3],
    gold: [15, 3],
    lifesteal: 0.5, // 与ダメの半分を吸収して回復
    weight: 0.85,
  },
  {
    id: "bombSkull",
    name: "嘆きのボムスカル",
    sprite: "battle.bombSkull",
    floors: [7, 10],
    hp: [20, 3],
    atk: [11, 1],
    def: [4, 1],
    exp: [16, 3],
    gold: [10, 2],
    selfDestruct: { after: 3, mult: 2.2 }, // 3ターン後に全体大ダメージ自爆
    weight: 0.7,
  },
  // ============================ 10F 固定ボス ============================
  {
    id: "gashadokuro",
    name: "深淵の処刑人・ガシャドクロ",
    sprite: "battle.gashadokuro",
    floors: [10, 10],
    hp: [440, 0],
    atk: [32, 0],
    def: [15, 0],
    exp: [400, 0],
    gold: [800, 0],
    boss: true,
    inflict: { status: "poison", chance: 0.3 },
    specialMove: {
      name: "断末魔の大鎌",
      mult: 1.9,
      chance: 0.34,
      se: "bossSpecial",
      all: true,
    },
    drop: { item: "houseki", chance: 1, count: 3 },
  },
];

/** 戦闘に登場する敵の実体（階層スケール適用済み） */
export interface EnemyInstance {
  def: EnemyDef;
  hp: number;
  maxHp: number;
  atk: number;
  defense: number;
  exp: number;
  gold: number;
}

export function scaleStat(scale: StatScale, floor: number): number {
  return scale[0] + scale[1] * floor;
}

export function spawnEnemy(def: EnemyDef, floor: number): EnemyInstance {
  const maxHp = scaleStat(def.hp, floor);
  return {
    def,
    hp: maxHp,
    maxHp,
    atk: scaleStat(def.atk, floor),
    defense: scaleStat(def.def, floor),
    exp: scaleStat(def.exp, floor),
    gold: scaleStat(def.gold, floor),
  };
}

/** その階に出現しうる雑魚敵（ボス・イベント専用を除く） */
export function enemiesForFloor(floor: number): EnemyDef[] {
  return ENEMIES.filter(
    (e) => !e.boss && !e.special && floor >= e.floors[0] && floor <= e.floors[1],
  );
}

/** 重み付きランダム抽選（夜はゴーストなどの nightWeight が効く） */
export function pickEnemy(
  defs: EnemyDef[],
  night: boolean,
  roll: number,
): EnemyDef | undefined {
  const weights = defs.map((e) => (night ? (e.nightWeight ?? e.weight ?? 1) : (e.weight ?? 1)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return undefined;
  let r = roll * total;
  for (let i = 0; i < defs.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return defs[i];
  }
  return defs[defs.length - 1];
}

export function bossDef(): EnemyDef {
  const boss = ENEMIES.find((e) => e.boss);
  if (!boss) throw new Error("ボスが定義されていません");
  return boss;
}

export function midbossDef(): EnemyDef {
  const mb = ENEMIES.find((e) => e.midboss);
  if (!mb) throw new Error("中ボスが定義されていません");
  return mb;
}

export function enemyById(id: string): EnemyDef | undefined {
  return ENEMIES.find((e) => e.id === id);
}
