import { T } from "./tiles";

/**
 * 施設定義。建設コスト・建設位置・営業時間をデータ駆動で管理。
 * 建物は 6x3（屋根2段 + 扉の段）で統一。扉は左から3・4番目のタイル。
 * 新施設はここに追加し、街マップに空き地を確保するだけで機能する。
 */
export type FacilityId =
  | "weaponShop"
  | "armorShop"
  | "tavern"
  | "smithy"
  | "market"
  | "church";

export interface FacilityDef {
  id: FacilityId;
  name: string;
  desc: string;
  cost: { kouseki: number; gold: number };
  /** 建物の左上タイル（幅6・高さ3） */
  plot: { x: number; y: number };
  roofTile: number;
  /** 建築予定地の看板の位置 */
  sign: { x: number; y: number };
  /** 営業時間（時）。省略時は常時営業 */
  hours?: { open: number; close: number };
}

export const FACILITY_W = 6;
export const FACILITY_H = 3;

export const FACILITIES: Record<FacilityId, FacilityDef> = {
  weaponShop: {
    id: "weaponShop",
    name: "ぶきや『はがねのタカ』",
    desc: "ぶきを うっている",
    cost: { kouseki: 6, gold: 120 },
    plot: { x: 3, y: 3 },
    roofTile: T.ROOF,
    sign: { x: 5, y: 7 },
    hours: { open: 6, close: 19 },
  },
  armorShop: {
    id: "armorShop",
    name: "ぼうぐや『しろがねの亀』",
    desc: "たてと よろいを うっている",
    cost: { kouseki: 10, gold: 300 },
    plot: { x: 3, y: 9 },
    roofTile: T.ROOF_BLUE,
    sign: { x: 5, y: 13 },
    hours: { open: 6, close: 19 },
  },
  smithy: {
    id: "smithy",
    name: "かじや『ふいごのオルド』",
    desc: "そうびを きたえて つよくする",
    cost: { kouseki: 12, gold: 500 },
    plot: { x: 3, y: 15 },
    roofTile: T.ROOF_DARK,
    sign: { x: 5, y: 19 },
    hours: { open: 6, close: 19 },
  },
  tavern: {
    id: "tavern",
    name: "さかば『おどるヤギ』",
    desc: "なかまを さそえる",
    cost: { kouseki: 8, gold: 200 },
    plot: { x: 25, y: 3 },
    roofTile: T.ROOF_GREEN,
    sign: { x: 27, y: 7 },
  },
  market: {
    id: "market",
    name: "いちば『あさひどおり』",
    desc: "ふようひんを うれる",
    cost: { kouseki: 8, gold: 250 },
    plot: { x: 25, y: 9 },
    roofTile: T.ROOF_GOLD,
    sign: { x: 27, y: 13 },
    hours: { open: 6, close: 19 },
  },
  church: {
    id: "church",
    name: "きょうかい『あけぼの堂』",
    desc: "たおれた なかまを よみがえらせる",
    cost: { kouseki: 12, gold: 400 },
    plot: { x: 32, y: 3 },
    roofTile: T.ROOF_WHITE,
    sign: { x: 34, y: 7 },
  },
};

export const FACILITY_IDS = Object.keys(FACILITIES) as FacilityId[];

/** 扉タイルの座標（2枚） */
export function facilityDoors(def: FacilityDef): { x: number; y: number }[] {
  const doorY = def.plot.y + FACILITY_H - 1;
  return [
    { x: def.plot.x + 2, y: doorY },
    { x: def.plot.x + 3, y: doorY },
  ];
}

/** 営業中か（hour は 0-23） */
export function isOpen(def: FacilityDef, hour: number): boolean {
  if (!def.hours) return true;
  return hour >= def.hours.open && hour < def.hours.close;
}
