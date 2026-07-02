import type { AssetManager } from "../core/AssetManager";
import type { TileDefs } from "../gfx/TileMap";

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

  // --- キャラクター（向きごとにID を分けておく = 将来の歩行アニメ差し替えに対応） ---
  assets.definePlaceholder("hero.up", { color: "#4a7dd4", symbol: "↑", symbolColor: "#dce8fa" });
  assets.definePlaceholder("hero.down", { color: "#4a7dd4", symbol: "↓", symbolColor: "#dce8fa" });
  assets.definePlaceholder("hero.left", { color: "#4a7dd4", symbol: "←", symbolColor: "#dce8fa" });
  assets.definePlaceholder("hero.right", { color: "#4a7dd4", symbol: "→", symbolColor: "#dce8fa" });
}
