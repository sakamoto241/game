import type { Game } from "../core/Game";
import { Rng, hashString } from "../core/Rng";
import {
  PLAYER_BASE,
  PLAYER_GROWTH,
  expToNext,
  deathGoldLoss,
  START_GOLD,
} from "../data/balance";
import { ITEMS, type ItemId } from "../data/items";
import { SPELLS, SPELL_IDS, type SpellDef } from "../data/spells";
import { WEAPONS, type WeaponId } from "../data/weapons";

export type Inventory = Partial<Record<ItemId, number>>;

/** 1回の潜行（ラン）の間だけ生きる状態。セーブには含まれない */
export interface RunState {
  seed: number;
  battleRng: Rng;
  lootRng: Rng;
}

export interface LevelUpInfo {
  level: number;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  learned: SpellDef[];
}

/** セーブに書き込む形。最大値はレベルから再計算するので保存しない */
interface PersistShape {
  level: number;
  exp: number;
  hp: number;
  mp: number;
  gold: number;
  weaponId: WeaponId;
  inventory: Inventory;
  town: { weaponShop: boolean };
  runCount: number;
  bossDefeated: boolean;
}

const AUTOSAVE_SLOT = 0;

/**
 * ゲームの永続状態（プレイヤー成長・所持品・街の発展）。
 * シーン間はこのオブジェクトをコンストラクタで受け渡す（グローバル禁止）。
 */
export class GameState {
  level = 1;
  exp = 0;
  hp = PLAYER_BASE.hp;
  mp = PLAYER_BASE.mp;
  gold = START_GOLD;
  weaponId: WeaponId = "none";
  inventory: Inventory = { yakusou: 2, tsubasa: 1 };
  town = { weaponShop: false };
  runCount = 0;
  bossDefeated = false;

  /** 潜行中のみ非 null */
  run: RunState | null = null;

  // --- 導出ステータス（レベルから再計算。セーブデータの数値ドリフトを防ぐ） ---
  get maxHp(): number {
    return PLAYER_BASE.hp + PLAYER_GROWTH.hp * (this.level - 1);
  }
  get maxMp(): number {
    return PLAYER_BASE.mp + PLAYER_GROWTH.mp * (this.level - 1);
  }
  get baseAtk(): number {
    return PLAYER_BASE.atk + PLAYER_GROWTH.atk * (this.level - 1);
  }
  get atk(): number {
    return this.baseAtk + WEAPONS[this.weaponId].atk;
  }
  get def(): number {
    return PLAYER_BASE.def + PLAYER_GROWTH.def * (this.level - 1);
  }
  get expToNextLevel(): number {
    return expToNext(this.level);
  }

  /** 習得済み呪文 */
  spells(): SpellDef[] {
    return SPELL_IDS.map((id) => SPELLS[id]).filter(
      (s) => s.learnLevel <= this.level,
    );
  }

  // --- インベントリ ---
  itemCount(id: ItemId): number {
    return this.inventory[id] ?? 0;
  }

  addItem(id: ItemId, n = 1): void {
    this.inventory[id] = this.itemCount(id) + n;
  }

  removeItem(id: ItemId, n = 1): void {
    const left = this.itemCount(id) - n;
    if (left > 0) this.inventory[id] = left;
    else delete this.inventory[id];
  }

  heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  // --- 成長 ---
  /** 経験値を得て、上がったレベルの情報を返す */
  gainExp(amount: number): LevelUpInfo[] {
    this.exp += amount;
    const ups: LevelUpInfo[] = [];
    while (this.exp >= expToNext(this.level)) {
      this.exp -= expToNext(this.level);
      this.level++;
      const learned = SPELL_IDS.map((id) => SPELLS[id]).filter(
        (s) => s.learnLevel === this.level,
      );
      ups.push({
        level: this.level,
        hp: PLAYER_GROWTH.hp,
        mp: PLAYER_GROWTH.mp,
        atk: PLAYER_GROWTH.atk,
        def: PLAYER_GROWTH.def,
        learned,
      });
      // レベルアップ分は現在値にも上乗せ（DQ流の気持ち良さ）
      this.hp = Math.min(this.maxHp, this.hp + PLAYER_GROWTH.hp);
      this.mp = Math.min(this.maxMp, this.mp + PLAYER_GROWTH.mp);
    }
    return ups;
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

  /** 死亡ペナルティを適用し、失った内容を返す */
  applyDeath(): { goldLost: number; oreLost: number } {
    const goldLost = deathGoldLoss(this.gold);
    this.gold -= goldLost;
    const oreLost = this.itemCount("kouseki");
    if (oreLost > 0) this.removeItem("kouseki", oreLost);
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.endRun();
    return { goldLost, oreLost };
  }

  // --- セーブ ---
  save(game: Game): void {
    const data: PersistShape = {
      level: this.level,
      exp: this.exp,
      hp: this.hp,
      mp: this.mp,
      gold: this.gold,
      weaponId: this.weaponId,
      inventory: this.inventory,
      town: this.town,
      runCount: this.runCount,
      bossDefeated: this.bossDefeated,
    };
    game.saves.save(AUTOSAVE_SLOT, data as unknown as Record<string, unknown>);
  }

  static hasSave(game: Game): boolean {
    return game.saves.has(AUTOSAVE_SLOT);
  }

  static load(game: Game): GameState | null {
    const raw = game.saves.load(AUTOSAVE_SLOT);
    if (!raw) return null;
    const d = raw as unknown as Partial<PersistShape>;
    const state = new GameState();
    state.level = clampInt(d.level, 1, 99, 1);
    state.exp = clampInt(d.exp, 0, 1e9, 0);
    state.gold = clampInt(d.gold, 0, 1e9, START_GOLD);
    state.weaponId = d.weaponId && d.weaponId in WEAPONS ? d.weaponId : "none";
    state.inventory = sanitizeInventory(d.inventory);
    state.town = { weaponShop: d.town?.weaponShop === true };
    state.runCount = clampInt(d.runCount, 0, 1e9, 0);
    state.bossDefeated = d.bossDefeated === true;
    // hp/mp は最大値決定後にクランプ
    state.hp = clampInt(d.hp, 1, state.maxHp, state.maxHp);
    state.mp = clampInt(d.mp, 0, state.maxMp, state.maxMp);
    return state;
  }

  static fresh(): GameState {
    return new GameState();
  }
}

function clampInt(
  v: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
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
