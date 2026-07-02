/**
 * 武器定義。Phase 1 では「恒久的な攻撃力アップ」として機能する。
 * Phase 2 で装備スロット・見た目反映・ランダム能力レア装備に拡張予定
 * （そのときもこの定義がベースデータになる）。
 */
export type WeaponId = "none" | "club" | "copper" | "steel";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  price: number;
  atk: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  none: { id: "none", name: "すで", price: 0, atk: 0 },
  club: { id: "club", name: "こんぼう", price: 60, atk: 3 },
  copper: { id: "copper", name: "どうのつるぎ", price: 240, atk: 8 },
  steel: { id: "steel", name: "はがねのつるぎ", price: 600, atk: 16 },
};

/** ショップに並ぶ順 */
export const SHOP_WEAPONS: WeaponId[] = ["club", "copper", "steel"];
