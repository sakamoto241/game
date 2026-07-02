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
}

export const ENEMIES: EnemyDef[] = [
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
    id: "nushi",
    name: "どうくつのぬし",
    sprite: "battle.nushi",
    floors: [5, 5],
    hp: [110, 0],
    atk: [24, 0],
    def: [11, 0],
    exp: [80, 0],
    gold: [200, 0],
    drop: { item: "kouseki", chance: 1, count: 5 },
    boss: true,
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

/** その階に出現しうる雑魚敵（ボス除く） */
export function enemiesForFloor(floor: number): EnemyDef[] {
  return ENEMIES.filter(
    (e) => !e.boss && floor >= e.floors[0] && floor <= e.floors[1],
  );
}

export function bossDef(): EnemyDef {
  const boss = ENEMIES.find((e) => e.boss);
  if (!boss) throw new Error("ボスが定義されていません");
  return boss;
}
