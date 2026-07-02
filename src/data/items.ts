/** アイテム定義（データ駆動）。追加はここに書くだけ */
export type ItemId = "yakusou" | "tsubasa" | "kouseki" | "houseki";

export type ItemKind = "heal" | "return" | "material" | "valuable";

export interface ItemDef {
  id: ItemId;
  name: string;
  desc: string;
  /** ショップでの購入価格（0 = 非売品） */
  price: number;
  /** 市場での売却価格（0 = 売れない） */
  sell: number;
  kind: ItemKind;
  /** heal の回復量など */
  power?: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  yakusou: {
    id: "yakusou",
    name: "やくそう",
    desc: "HPを 30ほど かいふくする",
    price: 15,
    sell: 7,
    kind: "heal",
    power: 30,
  },
  tsubasa: {
    id: "tsubasa",
    name: "帰還のつばさ",
    desc: "ダンジョンから 村へ もどる",
    price: 30,
    sell: 15,
    kind: "return",
  },
  kouseki: {
    id: "kouseki",
    name: "こうせき",
    desc: "たてものの ざいりょうに なる",
    price: 0,
    sell: 15,
    kind: "material",
  },
  houseki: {
    id: "houseki",
    name: "ほうせき",
    desc: "いちばで たかく うれる",
    price: 0,
    sell: 120,
    kind: "valuable",
  },
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
