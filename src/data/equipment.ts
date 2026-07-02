/**
 * 装備定義（武器・盾・鎧の3スロット）。
 * Phase 2: 購入して装備、鍛冶屋で +3 まで強化、見た目（プレースホルダーの
 * オーバーレイ色）に反映。ランダム能力レア装備は Phase 4 でこの型を拡張する。
 */
export type EquipSlot = "weapon" | "shield" | "armor";

export type EquipId =
  | "club"
  | "copper"
  | "steel"
  | "axe"
  | "leatherShield"
  | "scaleShield"
  | "steelShield"
  | "cloth"
  | "leatherArmor"
  | "chain"
  | "steelArmor";

export interface EquipDef {
  id: EquipId;
  name: string;
  slot: EquipSlot;
  price: number;
  atk: number;
  def: number;
  /** キャラ見た目のオーバーレイ色 */
  color: string;
}

/** 所持している装備の実体。plus は鍛冶強化値 (0〜SMITHY_MAX_PLUS) */
export interface EquipInstance {
  id: EquipId;
  plus: number;
}

export const SMITHY_MAX_PLUS = 3;
/** 強化1段階あたりのステータス上昇 */
export const PLUS_BONUS = 2;

export const EQUIPMENT: Record<EquipId, EquipDef> = {
  // --- 武器 ---
  club: { id: "club", name: "こんぼう", slot: "weapon", price: 60, atk: 3, def: 0, color: "#a0764a" },
  copper: { id: "copper", name: "どうのつるぎ", slot: "weapon", price: 240, atk: 8, def: 0, color: "#c87c3a" },
  steel: { id: "steel", name: "はがねのつるぎ", slot: "weapon", price: 600, atk: 16, def: 0, color: "#c8ccd8" },
  axe: { id: "axe", name: "バトルアックス", slot: "weapon", price: 1300, atk: 24, def: 0, color: "#8a94b8" },
  // --- 盾 ---
  leatherShield: { id: "leatherShield", name: "かわのたて", slot: "shield", price: 80, atk: 0, def: 2, color: "#a0764a" },
  scaleShield: { id: "scaleShield", name: "うろこのたて", slot: "shield", price: 300, atk: 0, def: 5, color: "#4a9a8a" },
  steelShield: { id: "steelShield", name: "はがねのたて", slot: "shield", price: 750, atk: 0, def: 9, color: "#c8ccd8" },
  // --- 鎧 ---
  cloth: { id: "cloth", name: "ぬののふく", slot: "armor", price: 50, atk: 0, def: 2, color: "#7aa04a" },
  leatherArmor: { id: "leatherArmor", name: "かわのよろい", slot: "armor", price: 220, atk: 0, def: 5, color: "#a0764a" },
  chain: { id: "chain", name: "くさりかたびら", slot: "armor", price: 550, atk: 0, def: 9, color: "#8a94a8" },
  steelArmor: { id: "steelArmor", name: "はがねのよろい", slot: "armor", price: 1200, atk: 0, def: 14, color: "#c8ccd8" },
};

export const WEAPON_SHOP_STOCK: EquipId[] = ["club", "copper", "steel", "axe"];
export const ARMOR_SHOP_STOCK: EquipId[] = [
  "cloth",
  "leatherArmor",
  "chain",
  "steelArmor",
  "leatherShield",
  "scaleShield",
  "steelShield",
];

export function equipAtk(inst: EquipInstance | null): number {
  if (!inst) return 0;
  const def = EQUIPMENT[inst.id];
  return def.atk + (def.slot === "weapon" ? inst.plus * PLUS_BONUS : 0);
}

export function equipDefense(inst: EquipInstance | null): number {
  if (!inst) return 0;
  const def = EQUIPMENT[inst.id];
  return def.def + (def.slot !== "weapon" ? inst.plus * PLUS_BONUS : 0);
}

export function equipName(inst: EquipInstance | null): string {
  if (!inst) return "なし";
  return inst.plus > 0 ? `${EQUIPMENT[inst.id].name}+${inst.plus}` : EQUIPMENT[inst.id].name;
}

export const SLOT_NAMES: Record<EquipSlot, string> = {
  weapon: "ぶき",
  shield: "たて",
  armor: "よろい",
};
