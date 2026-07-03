import type { AssetManager } from "../core/AssetManager";
import { CLASSES, type ClassId } from "./classes";
import { NPCS } from "./npcs";

/**
 * コード製ピクセルアート（Kenney "Tiny Dungeon / Tiny Town" 風）。
 *
 * 16x16・太いアウトライン・限定パレットのチビキャラ調で統一。
 * 本物のタイルシート(PNG)を使う場合は public/assets/manifest.json の
 * sheets/sprites に登録すれば、ここの定義は自動的に上書きされる。
 *
 * グリッドは1文字=1px。'.' は透明。行長が違うと即エラーになる。
 */

// 共通パレット
const PAL: Record<string, string> = {
  o: "#45283c", // アウトライン（暗い赤紫）
  e: "#2b1b28", // 目・開口部
  G: "#63a24d", // 草
  g: "#528a40", // 草かげ
  h: "#83c46a", // 草ハイライト
  S: "#d8a05f", // 砂・土
  s: "#b9814e", // 砂かげ
  u: "#e5b878", // 砂ハイライト
  W: "#4c93c8", // 水
  w: "#8fd0f0", // 水ハイライト
  d: "#3a719c", // 水かげ
  K: "#c9ccdf", // 石ハイライト
  k: "#9296b0", // 石
  m: "#6a6d88", // 石かげ
  M: "#4d4a63", // モルタル・暗部
  x: "#2a1e33", // 深い闇（穴・洞窟）
  B: "#a2643a", // 木材
  b: "#7a4a2b", // 木材かげ
  Y: "#e8c170", // 金
  y: "#c1913c", // 金かげ
  P: "#e8d8b0", // しっくい
  p: "#c9b184", // しっくいかげ
  F: "#eec39a", // 肌
  f: "#d19a6b", // 肌かげ
  X: "#f4f4f0", // 白
  Z: "#5ac54f", // スライム
  z: "#3f9e3a", // スライムかげ
  c: "#9ee87f", // スライムハイライト
  V: "#9d59c4", // 紫
  v: "#c9a7ff", // 紫ハイライト
  Q: "#a03a3a", // 魔物の赤
  q: "#7a2a2a", // 魔物の赤かげ
  R: "#b5453c", // 赤屋根
  L: "#4a6db5", // 青屋根
  E: "#4d9448", // 緑（葉・屋根）
  C: "#3e7c3e", // 葉かげ
  N: "#c9cbde", // 白屋根
  D: "#5a5666", // 黒屋根
  T: "#6fd8c8", // 魔法のあお
  I: "#e08bb0", // 花ピンク
  J: "#e8d152", // 花・目の黄
  U: "#4a7dd4", // 勇者の青
  A: "#c8a832", // からし色（盗賊）
};

type Painter = (ctx: CanvasRenderingContext2D) => void;

/** グリッドを描く。extra でパレットを上書き（キャラの色替えに使う） */
function grid(rows: string[], extra?: Record<string, string>): Painter {
  return (ctx) => {
    rows.forEach((row, y) => {
      if (row.length !== 16) {
        throw new Error(`pixelart: 行 ${y} の長さが16ではありません (${row.length})`);
      }
      for (let x = 0; x < 16; x++) {
        const ch = row[x]!;
        if (ch === ".") continue;
        const color = extra?.[ch] ?? PAL[ch];
        if (!color) throw new Error(`pixelart: 未知のパレット文字 '${ch}'`);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    });
  };
}

function fill(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 16, 16);
}

function dots(
  ctx: CanvasRenderingContext2D,
  color: string,
  points: [number, number][],
  w = 1,
  h = 1,
): void {
  ctx.fillStyle = color;
  for (const [x, y] of points) ctx.fillRect(x, y, w, h);
}

// =============================================================================
// 地形タイル（プロシージャル）
// =============================================================================
const grass: Painter = (ctx) => {
  fill(ctx, PAL.G!);
  dots(ctx, PAL.g!, [[2, 3], [7, 1], [12, 4], [5, 8], [10, 11], [3, 13], [14, 9], [8, 6], [1, 10], [13, 14]]);
  dots(ctx, PAL.h!, [[4, 5], [11, 2], [6, 12], [14, 6]], 1, 2);
};

const path: Painter = (ctx) => {
  fill(ctx, PAL.S!);
  dots(ctx, PAL.s!, [[3, 2], [9, 4], [13, 1], [6, 7], [1, 9], [11, 10], [4, 13], [14, 12], [8, 14]]);
  dots(ctx, PAAL_SAFE("u"), [[5, 4], [12, 7], [2, 11]]);
};

const water: Painter = (ctx) => {
  fill(ctx, PAL.W!);
  dots(ctx, PAL.d!, [[2, 6], [9, 2], [13, 9], [5, 13], [11, 14]]);
  dots(ctx, PAL.w!, [[2, 3], [3, 3], [4, 3], [9, 8], [10, 8], [11, 8], [12, 8], [4, 12], [5, 12], [6, 12]]);
};

/** 屋根（色違いで共用） */
function roof(base: string, dark: string, light: string): Painter {
  return (ctx) => {
    fill(ctx, base);
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillStyle = dark;
    ctx.fillRect(0, 4, 16, 1);
    ctx.fillRect(0, 9, 16, 1);
    ctx.fillRect(0, 14, 16, 1);
    // 瓦の縦目地（段ごとにずらす）
    for (const [x, y0] of [[5, 0], [11, 0], [2, 5], [8, 5], [14, 5], [5, 10], [11, 10]] as const) {
      ctx.fillRect(x, y0, 1, 4);
    }
  };
}

const plasterWall: Painter = (ctx) => {
  fill(ctx, PAL.P!);
  ctx.fillStyle = PAL.b!;
  ctx.fillRect(0, 0, 16, 2); // 上部の梁
  ctx.fillStyle = PAL.p!;
  ctx.fillRect(0, 15, 16, 1);
  dots(ctx, PAL.p!, [[3, 5], [12, 7], [7, 10], [2, 12], [13, 12]]);
};

/** 石レンガ（ダンジョンの壁） */
const rockWall: Painter = (ctx) => {
  fill(ctx, PAL.k!);
  // レンガごとの立体感（上辺ハイライト・下辺の影）
  ctx.fillStyle = PAL.K!;
  for (const y of [0, 4, 8, 12]) ctx.fillRect(0, y, 16, 1);
  ctx.fillStyle = PAL.m!;
  for (const y of [2, 6, 10, 14]) ctx.fillRect(0, y, 16, 1);
  // 目地は最後に描いてレンガの区切りをはっきりさせる
  ctx.fillStyle = PAL.M!;
  for (const y of [3, 7, 11, 15]) ctx.fillRect(0, y, 16, 1);
  for (const [x, y0] of [[7, 0], [3, 4], [11, 4], [7, 8], [3, 12], [11, 12]] as const) {
    ctx.fillRect(x, y0, 1, 3);
  }
};

const dungeonFloor: Painter = (ctx) => {
  fill(ctx, PAL.S!);
  dots(ctx, PAL.s!, [[2, 3], [7, 1], [12, 4], [5, 8], [10, 11], [3, 13], [14, 9], [8, 6]]);
  dots(ctx, PAAL_SAFE("u"), [[4, 5], [11, 2], [6, 12]]);
  dots(ctx, PAL.m!, [[13, 13]], 2, 1); // 小石
};

// PAL アクセスの typo 対策（存在チェック付き）
function PAAL_SAFE(ch: string): string {
  const c = PAL[ch];
  if (!c) throw new Error(`pixelart: パレット '${ch}' がありません`);
  return c;
}

// =============================================================================
// グリッド定義（オブジェクト・キャラ・モンスター）
// =============================================================================
const TREE = [
  "................",
  ".....ooooo......",
  "...ooEEEEEoo....",
  "..oEEhEEEEEEo...",
  "..oEhEEEEEEEo...",
  ".oEEEEEEEEEEEo..",
  ".oEEEEEEEEEECo..",
  "..oECEEEEECCo...",
  "..oCCECCCCCCo...",
  "...ooCCCCCoo....",
  ".....oobboo.....",
  "......obbo......",
  "......obbo......",
  "......oooo......",
  "................",
  "................",
];

const FLOWERS = [
  "................",
  "................",
  "...I............",
  "..IJI.......J...",
  "...I.......JIJ..",
  "............J...",
  "................",
  "................",
  "................",
  "......J.........",
  ".....JIJ........",
  "......J.....I...",
  "...........IJI..",
  "............I...",
  "................",
  "................",
];

const DOOR = [
  "................",
  "................",
  "................",
  "....oooooooo....",
  "...oBBBBBBBBo...",
  "..oBBbBBBBbBBo..",
  "..oBBbBBBBbBBo..",
  "..oBBbBBBBbBBo..",
  "..oBBbBBBBbBBo..",
  "..oBBbBBBBbBBo..",
  "..oBBbBBBYbBBo..",
  "..oBBbBBBBbBBo..",
  "..oBBbBBBBbBBo..",
  "..oBBbBBBBbBBo..",
  "..oBBbBBBBbBBo..",
  "..oooooooooooo..",
];

const AWNING = [
  "oRXoRXoRXoRXoRXo",
  "oXRoXRoXRoXRoXRo",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

const PORTAL = [
  "................",
  "................",
  "....oooooooo....",
  "...okkkkkkkko...",
  "..okkoVVVVokko..",
  "..okoVVvvVVoko..",
  "..okoVvVVvVoko..",
  "..okoVVvvVVoko..",
  "..okoVVVVVVoko..",
  "..okkoVVVVokko..",
  "...okkkkkkkko...",
  "....oooooooo....",
  "................",
  "................",
  "................",
  "................",
];

const SIGN = [
  "................",
  "................",
  "................",
  "................",
  "...oooooooo.....",
  "...oBBooBBo.....",
  "...oBBooBBo.....",
  "...oBBBBBBo.....",
  "...oBBooBBo.....",
  "...oooooooo.....",
  "......obo.......",
  "......obo.......",
  "......ooo.......",
  "................",
  "................",
  "................",
];

const CHEST = [
  "................",
  "................",
  "................",
  "................",
  "...oooooooooo...",
  "..oBBBBBBBBBBo..",
  "..oBBBBBBBBBBo..",
  "..oYYYYYYYYYYo..",
  "..oBBBoYYoBBBo..",
  "..oBBBoyyoBBBo..",
  "..obBBBBBBBBbo..",
  "..obbbbbbbbbbo..",
  "...oooooooooo...",
  "................",
  "................",
  "................",
];

const CHEST_OPEN = [
  "................",
  "................",
  "................",
  "...oooooooooo...",
  "..obbbbbbbbbbo..",
  "..oxxxxxxxxxxo..",
  "..oxxxxxxxxxxo..",
  "..oBBBBBBBBBBo..",
  "..oBBBBBBBBBBo..",
  "..oBBBBBBBBBBo..",
  "..obBBBBBBBBbo..",
  "..obbbbbbbbbbo..",
  "...oooooooooo...",
  "................",
  "................",
  "................",
];

const STAIRS = [
  "................",
  "..oooooooooo....",
  "..oxxxxxxxxo....",
  "..oxxbxxbxxo....",
  "..oxxbxxbxxo....",
  "..oxxBBBBxxo....",
  "..oxxbxxbxxo....",
  "..oxxbxxbxxo....",
  "..oxxBBBBxxo....",
  "..oxxbxxbxxo....",
  "..oxxbxxbxxo....",
  "..oxxBBBBxxo....",
  "..oxxxxxxxxo....",
  "..oooooooooo....",
  "................",
  "................",
];

const EXIT_RUNE = [
  "................",
  "................",
  "................",
  "................",
  "......TTTT......",
  "....TT....TT....",
  "....T......T....",
  "...T...TT...T...",
  "...T...TT...T...",
  "....T......T....",
  "....TT....TT....",
  "......TTTT......",
  "................",
  "................",
  "................",
  "................",
];

const BOSS_ALTAR = [
  "................",
  "................",
  ".....oooooo.....",
  "....oXXXXXXo....",
  "....oXeXXeXo....",
  "....oXXXXXXo....",
  ".....oXooXo.....",
  "......oooo......",
  "....okkkkkko....",
  "...okKkkkkKko...",
  "...oMMMMMMMMo...",
  "...oooooooooo...",
  "................",
  "................",
  "................",
  "................",
];

// --- キャラクター（前向き。全方向で共用、左向きは反転） ---
// H = 髪/フード色, B = 服の色 を extra で差し替える
const CHARA_BASE = [
  "................",
  "....oooooooo....",
  "...oHHHHHHHHo...",
  "...oHHHHHHHHo...",
  "...oFFFFFFFFo...",
  "...oFeFFFFeFo...",
  "...oFFFFFFFFo...",
  "...ofFFFFFFfo...",
  "....oooooooo....",
  "...oBBBBBBBBo...",
  "..oFoBBBBBBoFo..",
  "....oBBBBBBo....",
  "....obBBBBbo....",
  "....oMo..oMo....",
  "....oo....oo....",
  "................",
];

// 魔法使い（とんがり帽子）
const CHARA_MAGE = [
  ".......oo.......",
  "......oHHo......",
  ".....oHHHHo.....",
  "..ooooHHHHoooo..",
  "..oHHHHHHHHHHo..",
  "...oFFFFFFFFo...",
  "...oFeFFFFeFo...",
  "...ofFFFFFFfo...",
  "....oooooooo....",
  "...oBBBBBBBBo...",
  "..oFoBBBBBBoFo..",
  "....oBBBBBBo....",
  "....obBBBBbo....",
  "....oMo..oMo....",
  "....oo....oo....",
  "................",
];

// 戦士（兜）
const CHARA_WARRIOR = [
  "................",
  "....oooooooo....",
  "...okkkkkkkko...",
  "...okKkkkkKko...",
  "...okkkkkkkko...",
  "...oFeFFFFeFo...",
  "...oFFFFFFFFo...",
  "...ofFFFFFFfo...",
  "....oooooooo....",
  "...oBBBBBBBBo...",
  "..oFoBBBBBBoFo..",
  "....oBBBBBBo....",
  "....obBBBBbo....",
  "....oMo..oMo....",
  "....oo....oo....",
  "................",
];

// --- モンスター ---
const SLIME = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".....oooooo.....",
  "....oZZZZZZo....",
  "...oZcZZZZZZo...",
  "..oZcZZZZZZZZo..",
  "..oZXeZZZZXeZo..",
  "..oZZZZooZZZZo..",
  "..ozZZZZZZZZzo..",
  "...ozzzzzzzzo...",
  "....oooooooo....",
  "................",
];

const BAT = [
  "................",
  "................",
  "................",
  "................",
  "....oo....oo....",
  "...oVVo..oVVo...",
  "..ooVVVVVVVVoo..",
  ".oVVVVVVVVVVVVo.",
  "oVVoVXeVVXeVoVVo",
  "oVvoVVVVVVVVoVvo",
  ".oo.oVVooVVo.oo.",
  ".....oVVVVo.....",
  "......oooo......",
  "................",
  "................",
  "................",
];

const SKELETON = [
  "................",
  "................",
  ".....oooooo.....",
  "....oXXXXXXo....",
  "....oXeXXeXo....",
  "....oXXooXXo....",
  ".....oXXXXo.....",
  "....oooooooo....",
  ".....oXXXXo.....",
  "....oXoXXoXo....",
  ".....oXXXXo.....",
  ".....oXXXXo.....",
  "....oXo..oXo....",
  "....oo....oo....",
  "................",
  "................",
];

const RAT = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "...oo......oo...",
  "..oBBo....oBBo..",
  "..oBBBooooBBBo..",
  ".oBBBBBBBBBBBBo.",
  ".oBeBBBBBBBBBBoo",
  ".oBBBooBBBBBBo.o",
  "..oBBBBBBBBBo...",
  "...oo.oo.oo.....",
  "................",
];

const GHOST = [
  "................",
  "................",
  "................",
  ".....oooooo.....",
  "....oXXXXXXo....",
  "...oXXXXXXXXo...",
  "...oXeXXXXeXo...",
  "...oXXXXXXXXo...",
  "...oXXXooXXXo...",
  "...oXXXXXXXXo...",
  "...oXXXXXXXXo...",
  "...oXXXXXXXXo...",
  "...oXoXXoXXoo...",
  "....o.oo.oo.....",
  "................",
  "................",
];

const MIMIC = [
  "................",
  "................",
  "................",
  "...oooooooooo...",
  "..oBBBBBBBBBBo..",
  "..oBBBBBBBBBBo..",
  "..oxXxXxXxXxxo..",
  "..oxxxxxxxxxxo..",
  "..oXxXxXxXxXxo..",
  "..oBBBBBBBBBBo..",
  "..oBeBBBBBBeBo..",
  "..obBBBBBBBBbo..",
  "..obbbbbbbbbbo..",
  "...oooooooooo...",
  "................",
  "................",
];

const ORE_NODE = [
  "................",
  "................",
  "................",
  "....oooooo......",
  "...okkkkkko.....",
  "..okkYkkkkko....",
  "..okkkkkTkkko...",
  ".okkkkkkkkkkko..",
  ".okkTkkkkkkkko..",
  ".okkkkkkYkkkko..",
  ".okmkkkkkkkmko..",
  ".ommmkkkkmmmmo..",
  "..oommmmmmmoo...",
  "....ooooooo.....",
  "................",
  "................",
];

const NUSHI = [
  "................",
  ".oo..........oo.",
  ".oQo........oQo.",
  "..oQoo....ooQo..",
  "...oQQooooQQo...",
  "..oQQQQQQQQQQo..",
  "..oQJJQQQQJJQo..",
  "..oQeeQQQQeeQo..",
  "..oqQQQQQQQQqo..",
  "..oQXoQQQQoXQo..",
  "..oqqQQQQQQqqo..",
  "...oqqqqqqqqo...",
  "....oooooooo....",
  "................",
  "................",
  "................",
];

// --- 装備オーバーレイ（キャラの手元に描く小物） ---
const SWORD = [
  "................",
  "...........oo...",
  "..........oXKo..",
  ".........oXKo...",
  "........oXKo....",
  ".......oXKo.....",
  "..oo..oXKo......",
  "..oYooXKo.......",
  "...oYYXo........",
  "...oboYo........",
  "..obo..o........",
  "...o............",
  "................",
  "................",
  "................",
  "................",
];

const CLUB = [
  "................",
  "................",
  "........oo......",
  ".......oBBo.....",
  "......oBBBBo....",
  "......oBBBo.....",
  ".....obBBo......",
  "....obBo........",
  "...obbo.........",
  "..oboo..........",
  "..oo............",
  "................",
  "................",
  "................",
  "................",
  "................",
];

const AXE = [
  "................",
  "....ooooooo.....",
  "...oKKoboKKo....",
  "...oKKoboKKo....",
  "....ooobooo.....",
  "......obo.......",
  "......obo.......",
  "......obo.......",
  "......obo.......",
  "......ooo.......",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

const SHIELD = [
  "................",
  "................",
  "................",
  "....oooooo......",
  "...oBYYYYBo.....",
  "...oBKKKKBo.....",
  "...oBKkkKBo.....",
  "...oBKKKKBo.....",
  "...oBBBBBBo.....",
  "....oBBBBo......",
  ".....oBBo.......",
  "......oo........",
  "................",
  "................",
  "................",
  "................",
];

// =============================================================================
// 登録
// =============================================================================
function layered(...painters: Painter[]): Painter {
  return (ctx) => {
    for (const p of painters) p(ctx);
  };
}

/** キャラを4方向ぶん登録（left のみ反転） */
function registerChara(assets: AssetManager, baseId: string, painter: Painter): void {
  for (const dir of ["up", "down", "right"] as const) {
    assets.definePixelArt(`${baseId}.${dir}`, 16, 16, painter);
  }
  assets.definePixelArt(`${baseId}.left`, 16, 16, painter, true);
}

export function registerPixelArt(assets: AssetManager): void {
  const def = (id: string, painter: Painter) => assets.definePixelArt(id, 16, 16, painter);

  // --- 地形 ---
  def("tile.grass", grass);
  def("tile.flower", layered(grass, grid(FLOWERS)));
  def("tile.path", path);
  def("tile.water", water);
  def("tile.tree", layered(grass, grid(TREE)));
  def("tile.wall", plasterWall);
  def("tile.roof", roof(PAL.R!, "#8e3630", "#cf6a5a"));
  def("tile.roofBlue", roof(PAL.L!, "#39538c", "#7291d4"));
  def("tile.roofGreen", roof(PAL.E!, "#3b7238", "#74b869"));
  def("tile.roofDark", roof(PAL.D!, "#403d4a", "#807b90"));
  def("tile.roofGold", roof("#c8963c", "#9a7028", "#e8c170"));
  def("tile.roofWhite", roof(PAL.N!, "#9a9cb5", "#eceef8"));
  def("tile.door", layered(plasterWall, grid(DOOR)));
  def("tile.shopDoor", layered(plasterWall, grid(DOOR), grid(AWNING)));
  def("tile.portal", layered(grass, grid(PORTAL)));
  def("tile.sign", layered(grass, grid(SIGN)));

  // --- ダンジョン ---
  def("tile.rock", rockWall);
  def("tile.floor", dungeonFloor);
  def("tile.stairs", layered(dungeonFloor, grid(STAIRS)));
  def("tile.exit", layered(dungeonFloor, grid(EXIT_RUNE)));
  def("tile.chest", layered(dungeonFloor, grid(CHEST)));
  def("tile.chestOpen", layered(dungeonFloor, grid(CHEST_OPEN)));
  def("tile.boss", layered(dungeonFloor, grid(BOSS_ALTAR)));
  def("tile.ore", layered(dungeonFloor, grid(ORE_NODE)));

  // --- キャラクター（職業色はクラス定義から） ---
  const charaPainter = (classId: ClassId): Painter => {
    const cls = CLASSES[classId];
    const body = { B: cls.color, b: shade(cls.color) };
    switch (classId) {
      case "mage":
        return grid(CHARA_MAGE, { H: "#7a3fa8", ...body });
      case "warrior":
        return grid(CHARA_WARRIOR, body);
      case "priest":
        return grid(CHARA_BASE, { H: "#e8e8e0", ...body });
      case "thief":
        return grid(CHARA_BASE, { H: PAL.A!, ...body });
      default:
        return grid(CHARA_BASE, { H: "#7a4a2b", B: PAL.U!, b: "#39538c" });
    }
  };
  registerChara(assets, "hero", charaPainter("hero"));
  for (const cls of Object.values(CLASSES)) {
    registerChara(assets, `chara.${cls.id}`, charaPainter(cls.id));
  }

  // --- 村人（施設で増える住民。配色は npcs.ts から） ---
  for (const npc of NPCS) {
    registerChara(
      assets,
      `npc.${npc.id}`,
      grid(CHARA_BASE, { H: npc.hair, B: npc.body, b: shade(npc.body) }),
    );
  }

  // --- モンスター ---
  def("battle.slime", grid(SLIME));
  def("battle.bat", grid(BAT));
  def("battle.skeleton", grid(SKELETON));
  def("battle.nushi", grid(NUSHI));
  def("battle.rat", grid(RAT));
  def("battle.ghost", grid(GHOST));
  def("battle.mimic", grid(MIMIC));

  // --- 装備オーバーレイ ---
  def("overlay.sword", grid(SWORD));
  def("overlay.club", grid(CLUB));
  def("overlay.axe", grid(AXE));
  def("overlay.shield", grid(SHIELD));
}

/** 単純な暗色化（服の影用） */
function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.floor(((n >> 16) & 0xff) * 0.72);
  const g = Math.floor(((n >> 8) & 0xff) * 0.72);
  const b = Math.floor((n & 0xff) * 0.72);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
