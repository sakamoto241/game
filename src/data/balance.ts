import type { Rng } from "../core/Rng";

/**
 * ゲームバランスの一元管理。
 * 「テンポと気持ち良さ」の調整はほぼこのファイルだけで完結させる。
 * （職業ごとの基礎値・成長は classes.ts、装備は equipment.ts）
 */

// --- 成長 ---
/** レベル level から次のレベルまでに必要な経験値 */
export function expToNext(level: number): number {
  return Math.round(6 * Math.pow(level, 1.75));
}

// --- パーティ ---
export const PARTY_MAX = 3;
/** 生存人数で経験値を分配（端数切り上げ・最低1） */
export function expShare(exp: number, aliveCount: number): number {
  return Math.max(1, Math.ceil(exp / Math.max(1, aliveCount)));
}
/** パーティ人数による敵HP倍率 */
export function enemyHpMult(partyAlive: number): number {
  return 1 + 0.4 * Math.max(0, partyAlive - 1);
}
/** ボスの1ラウンドあたりの行動回数 */
export function bossActions(partyAlive: number): number {
  return partyAlive >= 2 ? 2 : 1;
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

/** 逃走成功率（ボスは常に失敗、とうぞくは必ず成功） */
export const FLEE_CHANCE = 0.65;

/** ぼうぎょ中の被ダメージ倍率 */
export const GUARD_MULT = 0.5;

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
/** 装備買い替え時の下取り率 */
export const TRADE_IN_RATE = 0.5;

// --- 鍛冶 ---
/** 次の強化値 nextPlus (1..3) にするためのコスト */
export function smithyCost(nextPlus: number): { kouseki: number; gold: number } {
  return { kouseki: 1 + 2 * nextPlus, gold: 120 * nextPlus };
}

// --- 教会 ---
export const REVIVE_PRICE_PER_LEVEL = 15;

// --- 時間 ---
/** 1歩で進む時間（分） */
export const MIN_PER_STEP = 2;
/** 1戦闘で進む時間（分） */
export const MIN_PER_BATTLE = 10;
/** 宿屋で起きる時刻 */
export const INN_WAKE_HOUR = 6;

export type DayPhase = "morning" | "day" | "evening" | "night";

export function dayPhase(minutes: number): DayPhase {
  const h = Math.floor(minutes / 60) % 24;
  if (h >= 5 && h < 10) return "morning";
  if (h >= 10 && h < 17) return "day";
  if (h >= 17 && h < 19) return "evening";
  return "night";
}

export const PHASE_LABELS: Record<DayPhase, string> = {
  morning: "あさ",
  day: "ひる",
  evening: "ゆうがた",
  night: "よる",
};

/** 昼夜の画面ティント（ワールドレイヤーに重ねる色） */
export const PHASE_TINTS: Record<DayPhase, string | null> = {
  morning: "rgba(255, 200, 120, 0.10)",
  day: null,
  evening: "rgba(255, 110, 40, 0.20)",
  night: "rgba(16, 24, 72, 0.48)",
};
