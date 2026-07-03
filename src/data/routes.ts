/**
 * 街の発展ルート。全施設が建つと村長から選べる（恒久・セーブされる）。
 * 効果はここのヘルパー経由で参照し、ロジック側に定数を散らさない。
 */
export type RouteId = "commerce" | "magic" | "industry" | "fortress";

export interface RouteDef {
  id: RouteId;
  name: string;
  townTitle: string;
  desc: string;
  perks: string;
}

export const ROUTES: Record<RouteId, RouteDef> = {
  commerce: {
    id: "commerce",
    name: "しょうぎょうとし",
    townTitle: "商業都市アルバ",
    desc: "ひとと モノが あつまる まち",
    perks: "うりね +25% / かいもの -10%",
  },
  magic: {
    id: "magic",
    name: "まほうとし",
    townTitle: "魔法都市アルバ",
    desc: "じゅもんの けんきゅうが さかんな まち",
    perks: "じゅもんの しょうひMP -1",
  },
  industry: {
    id: "industry",
    name: "こうぎょうとし",
    townTitle: "工業都市アルバ",
    desc: "ふいごの おとが ひびく まち",
    perks: "かじだい はんがく / そうびを +4まで きたえられる",
  },
  fortress: {
    id: "fortress",
    name: "ようさいとし",
    townTitle: "要塞都市アルバ",
    desc: "たかい かべに まもられた まち",
    perks: "ぜんいんの しゅび +2 / やどや むりょう",
  },
};

export const ROUTE_IDS = Object.keys(ROUTES) as RouteId[];

// --- 効果ヘルパー ---
export function sellMult(route: RouteId | null): number {
  return route === "commerce" ? 1.25 : 1;
}
export function buyMult(route: RouteId | null): number {
  return route === "commerce" ? 0.9 : 1;
}
export function spellMpDiscount(route: RouteId | null): number {
  return route === "magic" ? 1 : 0;
}
export function smithyCostMult(route: RouteId | null): number {
  return route === "industry" ? 0.5 : 1;
}
export function smithyMaxPlus(route: RouteId | null): number {
  return route === "industry" ? 4 : 3;
}
export function routeDefBonus(route: RouteId | null): number {
  return route === "fortress" ? 2 : 0;
}
export function innPrice(route: RouteId | null, base: number): number {
  return route === "fortress" ? 0 : base;
}
/** 購入価格に街の割引を適用 */
export function applyBuy(route: RouteId | null, price: number): number {
  return Math.floor(price * buyMult(route));
}
/** 売却価格に街の割増を適用 */
export function applySell(route: RouteId | null, price: number): number {
  return Math.floor(price * sellMult(route));
}
