import type { AssetManager } from "../core/AssetManager";
import charsUrl from "../assets/art/chars_sheet.png";
import tilesetUrl from "../assets/art/tileset.png";
import bossYomimaruUrl from "../assets/art/boss_a.png";
import bossGashadokuroUrl from "../assets/art/boss_b.png";

/**
 * 本物のドット絵アセットを登録する（reference ビルドの見た目をソースへ移植）。
 *
 * PNG を import すると Vite が data: URI に埋め込む（assetsInlineLimit 16MB）ので、
 * 単一HTML（file://・オフライン）でも通信なしで表示できる。
 * ここで登録したスプライトは AssetManager でコード製ピクセルアートより優先され、
 * 同じ ID（tile.grass / hero.down / chara.warrior.down …）を上書きする。
 *
 * - tileset.png : 16px グリッドの合成タイル（横一列 15枚）
 * - chars_sheet.png : CharaMEL 32px グリッド。1キャラ = 96x128（3列×4行）。
 *   行順 = 下→左→右→上、列1(中央)を待機フレームとして使う。
 * - boss_*.png : 32x32 のボス立ち絵。
 */

// --- タイル: strip の index → スプライトID（見た目を見て調整可） ---
const TILE_MAP: Record<string, number> = {
  "tile.grass": 0,
  "tile.path": 1,
  "tile.wall": 3,
  "tile.roof": 4, // オレンジ屋根
  "tile.roofBlue": 5,
  "tile.tree": 7,
  "tile.flower": 8,
  "tile.sign": 9,
  "tile.board": 9,
  "tile.door": 10,
  "tile.shopDoor": 11,
  "tile.rock": 13, // ダンジョン岩壁
  "tile.floor": 2, // ダンジョン石床（石で統一）
  "tile.ore": 14,
};

// --- キャラ: ブロック座標 (bx,by) → スプライトID ベース ---
// 各ブロックは 96x128。party（勇者+4職）と NPC を割り当てる。
const CHAR_BLOCKS: { base: string; bx: number; by: number }[] = [
  { base: "hero", bx: 0, by: 0 }, // 男_勇者（剣盾）
  { base: "chara.warrior", bx: 1, by: 0 }, // 男_戦士（鎧）
  { base: "chara.mage", bx: 2, by: 0 }, // 女_魔法使い（赤帽）
  { base: "chara.priest", bx: 1, by: 2 }, // 男_僧侶（白ローブ）
  { base: "chara.thief", bx: 0, by: 1 }, // 女_盗賊（桃）
  // NPC
  { base: "npc.noa", bx: 3, by: 0 }, // シスター・ノア（女_僧侶）
  { base: "npc.bald", bx: 1, by: 1 }, // 店主バルド
  { base: "npc.mame", bx: 2, by: 1 }, // こどものマメ
  { base: "npc.mayor", bx: 3, by: 1 }, // そんちょう
  { base: "npc.polka", bx: 0, by: 2 }, // 女将ポルカ
  { base: "npc.nico", bx: 2, by: 2 }, // 農夫ニコ
  { base: "npc.rico", bx: 3, by: 2 }, // 売り子リコ
];

// ブロック内の行 = 向き（下→左→右→上）。列1(中央=index1)を待機フレームに使う。
const DIR_ROW: Record<"down" | "left" | "right" | "up", number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};
const IDLE_COL = 1;

export async function loadRealArt(assets: AssetManager): Promise<void> {
  const [tiles, chars, bossY, bossG] = await Promise.all([
    assets.loadArtImage(tilesetUrl),
    assets.loadArtImage(charsUrl),
    assets.loadArtImage(bossYomimaruUrl),
    assets.loadArtImage(bossGashadokuroUrl),
  ]);

  // タイル（16px）。TileMap は地形の反復を消すため tile.xxx~1..3 を引くので、
  // 実アセットではそれらも同じ絵に登録して、格子模様にならないよう均一化する。
  const VARIED = new Set(["tile.grass", "tile.path", "tile.floor", "tile.rock"]);
  for (const [id, i] of Object.entries(TILE_MAP)) {
    assets.defineImageSprite(id, tiles, i * 16, 0, 16, 16);
    if (VARIED.has(id)) {
      for (let v = 1; v <= 3; v++) {
        assets.defineImageSprite(`${id}~${v}`, tiles, i * 16, 0, 16, 16);
      }
    }
  }

  // キャラ（32px、4方向）
  for (const { base, bx, by } of CHAR_BLOCKS) {
    for (const [dir, row] of Object.entries(DIR_ROW)) {
      assets.defineImageSprite(
        `${base}.${dir}`,
        chars,
        bx * 96 + IDLE_COL * 32,
        by * 128 + row * 32,
        32,
        32,
      );
    }
  }

  // ボス（32px 立ち絵）
  assets.defineImageSprite("battle.yomimaru", bossY, 0, 0, 32, 32);
  assets.defineImageSprite("battle.gashadokuro", bossG, 0, 0, 32, 32);
}
