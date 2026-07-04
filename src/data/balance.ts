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
export const DUNGEON_MAX_FLOOR = 10;
/** 中ボスが固定エンカウントする階 */
export const MIDBOSS_FLOOR = 5;

/** ワープ地点（チェックポイント）の間隔。1F と この倍数の階へ飛べる */
export const CHECKPOINT_INTERVAL = 5;

/**
 * 最深到達階 maxFloor から、突入時に選べるチェックポイント一覧を返す。
 * 常に 1F を含み、5F/10F/... のうち到達済みのものを昇順で返す。
 */
export function availableCheckpoints(maxFloor: number): number[] {
  const points = [1];
  for (let f = CHECKPOINT_INTERVAL; f <= maxFloor; f += CHECKPOINT_INTERVAL) {
    points.push(f);
  }
  return points;
}
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
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Weather = "sunny" | "rain" | "snow" | "fog";

// --- 季節 ---
/** 1季節の日数 */
export const DAYS_PER_SEASON = 8;
export const SEASON_ORDER: Season[] = ["spring", "summer", "autumn", "winter"];
export const SEASON_LABELS: Record<Season, string> = {
  spring: "はる",
  summer: "なつ",
  autumn: "あき",
  winter: "ふゆ",
};
/** 季節の画面ティント（昼夜ティントと重ねる） */
export const SEASON_TINTS: Record<Season, string | null> = {
  spring: null,
  summer: "rgba(255, 230, 120, 0.07)",
  autumn: "rgba(226, 140, 50, 0.13)",
  winter: "rgba(214, 230, 255, 0.22)",
};

// --- 天候 ---
export const WEATHER_LABELS: Record<Weather, string> = {
  sunny: "はれ",
  rain: "あめ",
  snow: "ゆき",
  fog: "きり",
};

// --- 夜の危険 ---
/** 夜間のエンカウント率倍率（地上の時刻がダンジョンにも影響する） */
export const NIGHT_ENCOUNTER_MULT = 1.35;

// --- 釣り ---
export const ROD_PRICE = 80;
/** 待ち時間（秒） */
export const FISHING_WAIT = { min: 1.0, max: 2.8 };
/** アタリから逃げられるまでの猶予（秒） */
export const FISHING_BITE_WINDOW = 0.65;

// --- 採掘 ---
export const PICKAXE_PRICE = 150;
/** 1つの鉱脈から得られるこうせき数 */
export const MINE_ORE = { min: 1, max: 2 };
/** ほうせきが混じる確率 */
export const MINE_GEM_CHANCE = 0.1;

// --- ミミック ---
/** B3F以降で宝箱がミミックである確率 */
export const MIMIC_CHANCE = 0.12;
export const MIMIC_MIN_FLOOR = 3;

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
