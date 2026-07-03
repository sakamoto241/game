import type { Game } from "../core/Game";
import { Rng, hashString } from "../core/Rng";
import {
  deathGoldLoss,
  START_GOLD,
  PARTY_MAX,
  dayPhase,
  PHASE_LABELS,
  DAYS_PER_SEASON,
  SEASON_ORDER,
  SEASON_LABELS,
  WEATHER_LABELS,
  type DayPhase,
  type Season,
  type Weather,
} from "../data/balance";
import { ACHIEVEMENTS, type AchievementDef } from "../data/achievements";
import type { FacilityId } from "../data/facilities";
import { ITEMS, type ItemId } from "../data/items";
import type { ActiveQuest } from "../data/quests";
import { ROUTES, type RouteId } from "../data/routes";
import { PartyMember, type SerializedMember } from "./PartyMember";

export type Inventory = Partial<Record<ItemId, number>>;

/** 1回の潜行（ラン）の間だけ生きる状態。セーブには含まれない */
export interface RunState {
  seed: number;
  battleRng: Rng;
  lootRng: Rng;
}

export interface GameStats {
  battlesWon: number;
  deaths: number;
  /** 敵ID → 累計討伐数（図鑑・実績・依頼の共通ソース） */
  kills: Record<string, number>;
  deepestFloor: number;
  questsCompleted: number;
}

/** セーブ形式 v2。v1 (Phase 1) からは load 時にマイグレーションする */
interface PersistShapeV2 {
  party: SerializedMember[];
  bench: SerializedMember[];
  gold: number;
  inventory: Inventory;
  built: Partial<Record<FacilityId, boolean>>;
  runCount: number;
  bossDefeated: boolean;
  day: number;
  minutes: number;
  // --- Phase 4 追加（旧セーブでは省略され、デフォルトで補完される） ---
  stats?: GameStats;
  seenEnemies?: string[];
  itemDex?: string[];
  achievements?: string[];
  quests?: ActiveQuest[];
  route?: RouteId | null;
}

/** Phase 1 のセーブ形式（マイグレーション用） */
interface PersistShapeV1 {
  level?: number;
  exp?: number;
  hp?: number;
  mp?: number;
  gold?: number;
  weaponId?: string;
  inventory?: Inventory;
  town?: { weaponShop?: boolean };
  runCount?: number;
  bossDefeated?: boolean;
}

const AUTOSAVE_SLOT = 0;

/**
 * ゲームの永続状態（パーティ・所持品・街の発展・ゲーム内時間）。
 * シーン間はこのオブジェクトをコンストラクタで受け渡す（グローバル禁止）。
 */
export class GameState {
  /** 戦闘・移動に参加中のメンバー（先頭は必ず勇者） */
  party: PartyMember[] = [PartyMember.createHero()];
  /** 勧誘済みだが待機中のメンバー（酒場で入れ替え） */
  bench: PartyMember[] = [];

  gold = START_GOLD;
  inventory: Inventory = { yakusou: 2, tsubasa: 1 };
  built: Partial<Record<FacilityId, boolean>> = {};
  runCount = 0;
  bossDefeated = false;

  stats: GameStats = {
    battlesWon: 0,
    deaths: 0,
    kills: {},
    deepestFloor: 0,
    questsCompleted: 0,
  };
  /** 見かけた敵（図鑑のシルエット解放） */
  seenEnemies: string[] = [];
  /** 一度でも入手したアイテム（アイテム図鑑） */
  itemDex: string[] = [];
  achievements: string[] = [];
  quests: ActiveQuest[] = [];
  route: RouteId | null = null;
  /** どくの歩数カウンタ（4歩ごとにダメージ） */
  private poisonSteps = 0;

  /** ゲーム内時間 */
  day = 1;
  minutes = 8 * 60; // 8:00 スタート

  /** 潜行中のみ非 null */
  run: RunState | null = null;

  get hero(): PartyMember {
    return this.party[0]!;
  }

  aliveMembers(): PartyMember[] {
    return this.party.filter((m) => m.alive);
  }

  koMembers(): PartyMember[] {
    return [...this.party, ...this.bench].filter((m) => !m.alive);
  }

  /** 勧誘済みメンバーのID一覧（パーティ+待機） */
  recruitedIds(): Set<string> {
    return new Set([...this.party, ...this.bench].map((m) => m.id));
  }

  canRecruit(): boolean {
    return this.party.length < PARTY_MAX;
  }

  // --- 時間 ---
  advanceTime(min: number): void {
    this.minutes += min;
    while (this.minutes >= 24 * 60) {
      this.minutes -= 24 * 60;
      this.day++;
    }
  }

  get hour(): number {
    return Math.floor(this.minutes / 60);
  }

  phase(): DayPhase {
    return dayPhase(this.minutes);
  }

  /** 季節は日付から自動で巡る */
  get season(): Season {
    const idx = Math.floor((this.day - 1) / DAYS_PER_SEASON) % SEASON_ORDER.length;
    return SEASON_ORDER[idx]!;
  }

  /**
   * 天候は日付から決定論的に決まる（セーブ不要・同じ日は必ず同じ天気）。
   * 冬は雪、それ以外の季節は雨。ときどき霧。
   */
  get weather(): Weather {
    const roll = hashString(`weather:${this.day}`) % 100;
    if (this.season === "winter") {
      if (roll < 35) return "snow";
    } else if (roll < 25) {
      return "rain";
    }
    if (roll >= 88) return "fog";
    return "sunny";
  }

  timeLabel(): string {
    const h = String(this.hour).padStart(2, "0");
    const m = String(this.minutes % 60).padStart(2, "0");
    return `${this.day}にちめ ${h}:${m} ${PHASE_LABELS[this.phase()]}`;
  }

  seasonWeatherLabel(): string {
    return `${SEASON_LABELS[this.season]}・${WEATHER_LABELS[this.weather]}`;
  }

  /** 宿屋で寝る: 翌朝 wakeHour 時になる */
  sleepUntilMorning(wakeHour: number): void {
    this.day++;
    this.minutes = wakeHour * 60;
  }

  /** 街の表示名（発展ルートで変わる） */
  townTitle(): string {
    return this.route ? ROUTES[this.route].townTitle : "アルバの村";
  }

  // --- 図鑑・統計 ---
  markSeen(enemyId: string): void {
    if (!this.seenEnemies.includes(enemyId)) this.seenEnemies.push(enemyId);
  }

  recordKill(enemyId: string): void {
    this.stats.kills[enemyId] = (this.stats.kills[enemyId] ?? 0) + 1;
    this.markSeen(enemyId);
  }

  /** 新しく解除された実績を返す（街に入ったときに呼ぶ） */
  checkAchievements(): AchievementDef[] {
    const unlocked: AchievementDef[] = [];
    for (const a of ACHIEVEMENTS) {
      if (this.achievements.includes(a.id)) continue;
      if (a.condition(this)) {
        this.achievements.push(a.id);
        unlocked.push(a);
      }
    }
    return unlocked;
  }

  // --- どく ---
  /** 1歩ごとに呼ぶ。4歩ごとに毒メンバーがダメージを受け、その名前を返す */
  applyPoisonStep(): string[] {
    const poisoned = this.party.filter((m) => m.alive && m.poisoned);
    if (poisoned.length === 0) return [];
    this.poisonSteps++;
    if (this.poisonSteps % 4 !== 0) return [];
    const hurt: string[] = [];
    for (const m of poisoned) {
      if (m.hp > 1) {
        m.hp = Math.max(1, m.hp - 2); // 歩行中の毒では倒れない（DQ流）
        hurt.push(m.name);
      }
    }
    return hurt;
  }

  // --- インベントリ ---
  itemCount(id: ItemId): number {
    return this.inventory[id] ?? 0;
  }

  addItem(id: ItemId, n = 1): void {
    this.inventory[id] = this.itemCount(id) + n;
    if (!this.itemDex.includes(id)) this.itemDex.push(id);
  }

  removeItem(id: ItemId, n = 1): void {
    const left = this.itemCount(id) - n;
    if (left > 0) this.inventory[id] = left;
    else delete this.inventory[id];
  }

  // --- ラン管理 ---
  startRun(game: Game): void {
    this.runCount++;
    const seed = game.rootRng.fork(`run:${this.runCount}:${Date.now()}`).next();
    const seedInt = Math.floor(seed * 0xffffffff) >>> 0;
    this.run = {
      seed: seedInt,
      battleRng: new Rng((seedInt ^ hashString("battle")) >>> 0),
      lootRng: new Rng((seedInt ^ hashString("loot")) >>> 0),
    };
  }

  endRun(): void {
    this.run = null;
  }

  /** 全滅ペナルティを適用し、失った内容を返す。全員全回復して宿屋へ */
  applyDeath(): { goldLost: number; oreLost: number } {
    this.stats.deaths++;
    const goldLost = deathGoldLoss(this.gold);
    this.gold -= goldLost;
    const oreLost = this.itemCount("kouseki");
    if (oreLost > 0) this.removeItem("kouseki", oreLost);
    for (const m of [...this.party, ...this.bench]) m.fullRestore();
    this.endRun();
    return { goldLost, oreLost };
  }

  // --- セーブ ---
  save(game: Game): void {
    const data: PersistShapeV2 = {
      party: this.party.map((m) => m.serialize()),
      bench: this.bench.map((m) => m.serialize()),
      gold: this.gold,
      inventory: this.inventory,
      built: this.built,
      runCount: this.runCount,
      bossDefeated: this.bossDefeated,
      day: this.day,
      minutes: this.minutes,
      stats: this.stats,
      seenEnemies: this.seenEnemies,
      itemDex: this.itemDex,
      achievements: this.achievements,
      quests: this.quests,
      route: this.route,
    };
    game.saves.save(AUTOSAVE_SLOT, data as unknown as Record<string, unknown>);
  }

  static hasSave(game: Game): boolean {
    return game.saves.has(AUTOSAVE_SLOT);
  }

  static load(game: Game): GameState | null {
    const raw = game.saves.load(AUTOSAVE_SLOT);
    if (!raw) return null;
    // v1 (Phase 1) 形式は party を持たない
    if (!("party" in raw)) {
      return GameState.migrateV1(raw as PersistShapeV1);
    }
    return GameState.fromV2(raw as unknown as Partial<PersistShapeV2>);
  }

  private static fromV2(d: Partial<PersistShapeV2>): GameState {
    const state = new GameState();
    const party = (Array.isArray(d.party) ? d.party : [])
      .map((m) => PartyMember.deserialize(m))
      .filter((m): m is PartyMember => m !== null);
    if (party.length > 0) state.party = party;
    state.bench = (Array.isArray(d.bench) ? d.bench : [])
      .map((m) => PartyMember.deserialize(m))
      .filter((m): m is PartyMember => m !== null);
    state.gold = clampInt(d.gold, 0, 1e9, START_GOLD);
    state.inventory = sanitizeInventory(d.inventory);
    state.built = sanitizeBuilt(d.built);
    state.runCount = clampInt(d.runCount, 0, 1e9, 0);
    state.bossDefeated = d.bossDefeated === true;
    state.day = clampInt(d.day, 1, 1e6, 1);
    state.minutes = clampInt(d.minutes, 0, 24 * 60 - 1, 8 * 60);
    // --- Phase 4 追加フィールド（旧セーブはデフォルトのまま） ---
    if (d.stats && typeof d.stats === "object") {
      state.stats = {
        battlesWon: clampInt(d.stats.battlesWon, 0, 1e9, 0),
        deaths: clampInt(d.stats.deaths, 0, 1e9, 0),
        kills: sanitizeCounts(d.stats.kills),
        deepestFloor: clampInt(d.stats.deepestFloor, 0, 999, 0),
        questsCompleted: clampInt(d.stats.questsCompleted, 0, 1e9, 0),
      };
    }
    state.seenEnemies = stringArray(d.seenEnemies);
    state.itemDex = stringArray(d.itemDex);
    state.achievements = stringArray(d.achievements);
    state.quests = Array.isArray(d.quests)
      ? d.quests.filter(
          (q): q is ActiveQuest =>
            typeof q === "object" && q !== null && typeof q.id === "string",
        )
      : [];
    state.route = d.route && d.route in ROUTES ? d.route : null;
    return state;
  }

  /** Phase 1 セーブ → Phase 2 形式への変換 */
  private static migrateV1(d: PersistShapeV1): GameState {
    const state = new GameState();
    const hero = PartyMember.createHero();
    hero.level = clampInt(d.level, 1, 99, 1);
    hero.exp = clampInt(d.exp, 0, 1e9, 0);
    // 旧 weaponId → 装備インスタンス
    if (d.weaponId === "club" || d.weaponId === "copper" || d.weaponId === "steel") {
      hero.equip.weapon = { id: d.weaponId, plus: 0 };
    }
    hero.hp = clampInt(d.hp, 1, hero.maxHp, hero.maxHp);
    hero.mp = clampInt(d.mp, 0, hero.maxMp, hero.maxMp);
    state.party = [hero];
    state.gold = clampInt(d.gold, 0, 1e9, START_GOLD);
    state.inventory = sanitizeInventory(d.inventory);
    if (d.town?.weaponShop === true) state.built.weaponShop = true;
    state.runCount = clampInt(d.runCount, 0, 1e9, 0);
    state.bossDefeated = d.bossDefeated === true;
    return state;
  }

  static fresh(): GameState {
    return new GameState();
  }
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function sanitizeInventory(inv: unknown): Inventory {
  const result: Inventory = {};
  if (typeof inv !== "object" || inv === null) return result;
  for (const [key, value] of Object.entries(inv)) {
    if (key in ITEMS && typeof value === "number" && value > 0) {
      result[key as ItemId] = Math.min(99, Math.round(value));
    }
  }
  return result;
}

function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
}

function sanitizeCounts(v: unknown): Record<string, number> {
  const result: Record<string, number> = {};
  if (typeof v !== "object" || v === null) return result;
  for (const [key, value] of Object.entries(v)) {
    if (typeof value === "number" && value > 0) result[key] = Math.round(value);
  }
  return result;
}

function sanitizeBuilt(built: unknown): Partial<Record<FacilityId, boolean>> {
  const result: Partial<Record<FacilityId, boolean>> = {};
  if (typeof built !== "object" || built === null) return result;
  for (const [key, value] of Object.entries(built)) {
    if (value === true) result[key as FacilityId] = true;
  }
  return result;
}
