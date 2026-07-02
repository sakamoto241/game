import { CLASSES, type ClassId, type ClassDef } from "../data/classes";
import type { CompanionDef } from "../data/companions";
import {
  EQUIPMENT,
  equipAtk,
  equipDefense,
  type EquipId,
  type EquipInstance,
  type EquipSlot,
} from "../data/equipment";
import { expToNext } from "../data/balance";
import { SPELLS, type SpellDef } from "../data/spells";

export interface LevelUpInfo {
  name: string;
  level: number;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  learned: SpellDef[];
}

export type Equipped = Record<EquipSlot, EquipInstance | null>;

/** セーブに書き込む形。最大値はレベルから再計算するので保存しない */
export interface SerializedMember {
  id: string;
  name: string;
  classId: ClassId;
  level: number;
  exp: number;
  hp: number;
  mp: number;
  equip: Equipped;
}

/**
 * パーティメンバー（勇者を含む）。
 * ステータスは 職業の基礎値 + 成長 x (レベル-1) + 装備 から導出する。
 * hp が 0 のメンバーは「戦闘不能」— 移動には同行するが戦闘に参加できない。
 * 教会で蘇生する。
 */
export class PartyMember {
  level: number;
  exp = 0;
  hp: number;
  mp: number;
  equip: Equipped = { weapon: null, shield: null, armor: null };

  constructor(
    readonly id: string,
    readonly name: string,
    readonly classId: ClassId,
    level = 1,
  ) {
    this.level = Math.max(1, level);
    this.hp = this.maxHp;
    this.mp = this.maxMp;
  }

  get cls(): ClassDef {
    return CLASSES[this.classId];
  }

  get maxHp(): number {
    return this.cls.base.hp + this.cls.growth.hp * (this.level - 1);
  }
  get maxMp(): number {
    return this.cls.base.mp + this.cls.growth.mp * (this.level - 1);
  }
  get baseAtk(): number {
    return this.cls.base.atk + this.cls.growth.atk * (this.level - 1);
  }
  get baseDef(): number {
    return this.cls.base.def + this.cls.growth.def * (this.level - 1);
  }
  get atk(): number {
    return this.baseAtk + equipAtk(this.equip.weapon);
  }
  get def(): number {
    return (
      this.baseDef + equipDefense(this.equip.shield) + equipDefense(this.equip.armor)
    );
  }
  get alive(): boolean {
    return this.hp > 0;
  }
  get expToNextLevel(): number {
    return expToNext(this.level);
  }

  /** 習得済み呪文 */
  spells(): SpellDef[] {
    return this.cls.spells
      .filter((s) => s.level <= this.level)
      .map((s) => SPELLS[s.spell]);
  }

  heal(amount: number): number {
    if (!this.alive) return 0; // 戦闘不能はやくそうでは治らない（教会へ）
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  fullRestore(): void {
    this.hp = this.maxHp;
    this.mp = this.maxMp;
  }

  revive(): void {
    this.hp = this.maxHp;
  }

  damage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  /** 経験値を得て、上がったレベルの情報を返す */
  gainExp(amount: number): LevelUpInfo[] {
    this.exp += amount;
    const ups: LevelUpInfo[] = [];
    while (this.exp >= expToNext(this.level)) {
      this.exp -= expToNext(this.level);
      this.level++;
      const learned = this.cls.spells
        .filter((s) => s.level === this.level)
        .map((s) => SPELLS[s.spell]);
      ups.push({
        name: this.name,
        level: this.level,
        hp: this.cls.growth.hp,
        mp: this.cls.growth.mp,
        atk: this.cls.growth.atk,
        def: this.cls.growth.def,
        learned,
      });
      // レベルアップ分は現在値にも上乗せ
      this.hp = Math.min(this.maxHp, this.hp + this.cls.growth.hp);
      this.mp = Math.min(this.maxMp, this.mp + this.cls.growth.mp);
    }
    return ups;
  }

  serialize(): SerializedMember {
    return {
      id: this.id,
      name: this.name,
      classId: this.classId,
      level: this.level,
      exp: this.exp,
      hp: this.hp,
      mp: this.mp,
      equip: this.equip,
    };
  }

  static deserialize(d: Partial<SerializedMember>): PartyMember | null {
    if (typeof d.id !== "string" || typeof d.name !== "string") return null;
    const classId = d.classId && d.classId in CLASSES ? d.classId : "hero";
    const m = new PartyMember(d.id, d.name, classId, num(d.level, 1));
    m.exp = Math.max(0, num(d.exp, 0));
    m.equip = {
      weapon: sanitizeEquip(d.equip?.weapon, "weapon"),
      shield: sanitizeEquip(d.equip?.shield, "shield"),
      armor: sanitizeEquip(d.equip?.armor, "armor"),
    };
    m.hp = clamp(num(d.hp, m.maxHp), 0, m.maxHp);
    m.mp = clamp(num(d.mp, m.maxMp), 0, m.maxMp);
    return m;
  }

  static createHero(): PartyMember {
    return new PartyMember("hero", "ゆうしゃ", "hero", 1);
  }

  static fromCompanion(def: CompanionDef, level: number): PartyMember {
    return new PartyMember(def.id, def.name, def.classId, level);
  }
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function sanitizeEquip(inst: unknown, slot: EquipSlot): EquipInstance | null {
  if (typeof inst !== "object" || inst === null) return null;
  const cand = inst as Partial<EquipInstance>;
  if (typeof cand.id !== "string") return null;
  // 実在してスロットが一致する装備のみ受け入れる
  const def = EQUIPMENT[cand.id as EquipId];
  if (!def || def.slot !== slot) return null;
  return { id: def.id, plus: clamp(num(cand.plus, 0), 0, 3) };
}
