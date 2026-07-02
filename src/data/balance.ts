import type { Rng } from "../core/Rng";

/**
 * ゲームバランスの一元管理。
 * 「テンポと気持ち良さ」の調整はほぼこのファイルだけで完結させる。
 */

// --- プレイヤー成長 ---
export const PLAYER_BASE = { hp: 26, mp: 6, atk: 8, def: 4 };
export const PLAYER_GROWTH = { hp: 5, mp: 2, atk: 2, def: 1 };

/** レベル level から次のレベルまでに必要な経験値 */
export function expToNext(level: number): number {
  return Math.round(6 * Math.pow(level, 1.75));
}

// --- 戦闘 ---
/** 物理ダメージ。最低1保証 */
export function physDamage(atk: number, def: number, rng: Rng): number {
  const raw = atk - def * 0.7 + rng.float(-2, 2);
  return Math.max(1, Math.round(raw));
}

/** 会心の一撃 (1/16) */
export const CRIT_CHANCE = 1 / 16;
export const CRIT_MULT = 1.8;

/** 逃走成功率（ボスは常に失敗） */
export const FLEE_CHANCE = 0.65;

// --- ダンジョン ---
export const DUNGEON_MAX_FLOOR = 5;
/** 1歩ごとのエンカウント率 */
export const ENCOUNTER_RATE = 0.08;
/** 戦闘直後・階層開始直後の安全歩数 */
export const GRACE_AFTER_BATTLE = 4;
export const GRACE_FLOOR_START = 6;

// --- 経済 ---
export const START_GOLD = 80;
export const INN_PRICE = 10;
/** 死亡ペナルティ: 所持金半減 + こうせき全ロスト */
export function deathGoldLoss(gold: number): number {
  return Math.floor(gold / 2);
}

// --- 建築 ---
export const WEAPON_SHOP_COST = { kouseki: 6, gold: 120 };
