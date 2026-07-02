import type { AssetManager } from "../core/AssetManager";
import type { TileDefs } from "../gfx/TileMap";
import { CLASSES } from "./classes";

/**
 * タイルID定義。マップデータとロジック（当たり判定・イベントトリガー）が参照する。
 * 新しいタイルは ID を追加 → TILE_DEFS に定義 → LEGEND に文字を割り当てるだけ。
 */
export const T = {
  GRASS: 0,
  FLOWER: 1,
  PATH: 2,
  WATER: 3,
  TREE: 4,
  ROOF: 5,
  WALL: 6,
  DOOR: 7,
  PORTAL: 8,
  ROCK: 9,
  FLOOR: 10,
  STAIRS: 11,
  EXIT: 12,
  CHEST: 13,
  CHEST_OPEN: 14,
  BOSS: 15,
  SIGN: 16,
  SHOP_DOOR: 17,
  ROOF_BLUE: 18,
  ROOF_GREEN: 19,
  ROOF_DARK: 20,
  ROOF_GOLD: 21,
  ROOF_WHITE: 22,
} as const;

export const TILE_DEFS: TileDefs = {
  [T.GRASS]: { name: "草地", solid: false, sprite: "tile.grass" },
  [T.FLOWER]: { name: "花畑", solid: false, sprite: "tile.flower" },
  [T.PATH]: { name: "道", solid: false, sprite: "tile.path" },
  [T.WATER]: { name: "水面", solid: true, sprite: "tile.water" },
  [T.TREE]: { name: "木", solid: true, sprite: "tile.tree" },
  [T.ROOF]: { name: "屋根", solid: true, sprite: "tile.roof" },
  [T.WALL]: { name: "壁", solid: true, sprite: "tile.wall" },
  [T.DOOR]: { name: "宿屋の扉", solid: false, sprite: "tile.door" },
  [T.PORTAL]: { name: "ダンジョンへの門", solid: false, sprite: "tile.portal" },
  [T.ROCK]: { name: "岩壁", solid: true, sprite: "tile.rock" },
  [T.FLOOR]: { name: "洞窟の床", solid: false, sprite: "tile.floor" },
  [T.STAIRS]: { name: "下り階段", solid: false, sprite: "tile.stairs" },
  [T.EXIT]: { name: "出口", solid: false, sprite: "tile.exit" },
  [T.CHEST]: { name: "宝箱", solid: true, sprite: "tile.chest" },
  [T.CHEST_OPEN]: { name: "空の宝箱", solid: true, sprite: "tile.chestOpen" },
  [T.BOSS]: { name: "ぬしの祭壇", solid: false, sprite: "tile.boss" },
  [T.SIGN]: { name: "建築予定地", solid: true, sprite: "tile.sign" },
  [T.SHOP_DOOR]: { name: "店の扉", solid: false, sprite: "tile.shopDoor" },
  [T.ROOF_BLUE]: { name: "青い屋根", solid: true, sprite: "tile.roofBlue" },
  [T.ROOF_GREEN]: { name: "緑の屋根", solid: true, sprite: "tile.roofGreen" },
  [T.ROOF_DARK]: { name: "黒い屋根", solid: true, sprite: "tile.roofDark" },
  [T.ROOF_GOLD]: { name: "黄の屋根", solid: true, sprite: "tile.roofGold" },
  [T.ROOF_WHITE]: { name: "白い屋根", solid: true, sprite: "tile.roofWhite" },
};

/** 街マップの文字 → タイルID */
export const TOWN_LEGEND: Record<string, number> = {
  ".": T.GRASS,
  F: T.FLOWER,
  "-": T.PATH,
  "~": T.WATER,
  T: T.TREE,
  R: T.ROOF,
  "#": T.WALL,
  D: T.DOOR,
  P: T.PORTAL,
  B: T.SIGN,
};

/** ダンジョンマップの文字 → タイルID */
export const DUNGEON_LEGEND: Record<string, number> = {
  r: T.ROCK,
  f: T.FLOOR,
  S: T.STAIRS,
  E: T.EXIT,
};

/**
 * プレースホルダーアートの登録。
 * 本物のドット絵ができたら public/assets/manifest.json に同じIDで画像を
 * 登録するだけで、ここの定義は自動的に使われなくなる。
 */
export function registerPlaceholderArt(assets: AssetManager): void {
  // --- タイル ---
  assets.definePlaceholder("tile.grass", { color: "#5c8a44" });
  assets.definePlaceholder("tile.flower", {
    color: "#5c8a44",
    symbol: "*",
    symbolColor: "#e08bb0",
  });
  assets.definePlaceholder("tile.path", { color: "#c2a86f" });
  assets.definePlaceholder("tile.water", {
    color: "#3d6e9e",
    symbol: "~",
    symbolColor: "#6fa3cf",
  });
  assets.definePlaceholder("tile.tree", {
    color: "#5c8a44",
    symbol: "♣",
    symbolColor: "#2c5230",
  });
  assets.definePlaceholder("tile.roof", { color: "#a24b3f" });
  assets.definePlaceholder("tile.wall", { color: "#b8a98c" });
  assets.definePlaceholder("tile.door", {
    color: "#7a4a2b",
    symbol: "∩",
    symbolColor: "#3d2414",
  });
  assets.definePlaceholder("tile.portal", {
    color: "#5b3a9e",
    symbol: "◆",
    symbolColor: "#c9a7ff",
  });
  assets.definePlaceholder("tile.rock", { color: "#322e3c" });
  assets.definePlaceholder("tile.floor", { color: "#5a5266" });
  assets.definePlaceholder("tile.stairs", {
    color: "#5a5266",
    symbol: "▼",
    symbolColor: "#e0d28a",
  });
  assets.definePlaceholder("tile.exit", {
    color: "#5a5266",
    symbol: "△",
    symbolColor: "#7fd8c8",
  });
  assets.definePlaceholder("tile.chest", {
    color: "#8a6a34",
    symbol: "$",
    symbolColor: "#ffd970",
  });
  assets.definePlaceholder("tile.chestOpen", {
    color: "#6e5a3a",
    symbol: "$",
    symbolColor: "#4a3d28",
  });
  assets.definePlaceholder("tile.boss", {
    color: "#4a1f30",
    symbol: "主",
    symbolColor: "#e05a7a",
  });
  assets.definePlaceholder("tile.sign", {
    color: "#9c7a4a",
    symbol: "!",
    symbolColor: "#fff2c0",
  });
  assets.definePlaceholder("tile.shopDoor", {
    color: "#8a5a33",
    symbol: "∩",
    symbolColor: "#3d2414",
  });
  assets.definePlaceholder("tile.roofBlue", { color: "#3a5a9e" });
  assets.definePlaceholder("tile.roofGreen", { color: "#3a7a4a" });
  assets.definePlaceholder("tile.roofDark", { color: "#4a4652" });
  assets.definePlaceholder("tile.roofGold", { color: "#b8923a" });
  assets.definePlaceholder("tile.roofWhite", { color: "#b8bcd0" });

  // --- キャラクター（向きごとにID を分けておく = 将来の歩行アニメ差し替えに対応） ---
  assets.definePlaceholder("hero.up", { color: "#4a7dd4", symbol: "↑", symbolColor: "#dce8fa" });
  assets.definePlaceholder("hero.down", { color: "#4a7dd4", symbol: "↓", symbolColor: "#dce8fa" });
  assets.definePlaceholder("hero.left", { color: "#4a7dd4", symbol: "←", symbolColor: "#dce8fa" });
  assets.definePlaceholder("hero.right", { color: "#4a7dd4", symbol: "→", symbolColor: "#dce8fa" });

  // --- 仲間キャラ（職業ごと・向きごと。歩行アニメ差し替えに対応する命名） ---
  const arrows = { up: "↑", down: "↓", left: "←", right: "→" } as const;
  for (const cls of Object.values(CLASSES)) {
    for (const [dir, symbol] of Object.entries(arrows)) {
      assets.definePlaceholder(`chara.${cls.id}.${dir}`, {
        color: cls.color,
        symbol,
        symbolColor: "#f0ecdc",
      });
    }
  }

  // --- 戦闘用の敵スプライト ---
  assets.definePlaceholder("battle.slime", { color: "#4aa3d8", symbol: "ス", symbolColor: "#1c4a68" });
  assets.definePlaceholder("battle.bat", { color: "#7a5aa8", symbol: "コ", symbolColor: "#2e1f4a" });
  assets.definePlaceholder("battle.skeleton", { color: "#c8c2b0", symbol: "骨", symbolColor: "#55503f" });
  assets.definePlaceholder("battle.nushi", { color: "#8a4a5a", symbol: "主", symbolColor: "#2e1018" });
}
