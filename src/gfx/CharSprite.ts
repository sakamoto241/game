import type { AssetManager } from "../core/AssetManager";
import { drawGroundShadow } from "./Shadow";

/**
 * キャラの描画（接地影つき）。
 * CharaMEL のドット絵は 32x32 で、16px タイルより一回り大きく描くと
 * ちょうど RPG らしい頭身になる。足元をタイル下端に合わせて配置する。
 */
export const CHAR_W = 22;
export const CHAR_H = 26;
/** タイル(16)中央に横位置を合わせるオフセット */
const OX = Math.round((16 - CHAR_W) / 2); // -3
/** 足元をタイル下端付近に合わせる縦オフセット */
const OY = 16 - CHAR_H + 2; // -8

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  assets: AssetManager,
  id: string,
  px: number,
  py: number,
  alpha = 1,
): void {
  const x = Math.round(px);
  const y = Math.round(py);
  drawGroundShadow(ctx, x + 8, y + 14.5, 5.4, 2.3, alpha < 1 ? 0.14 : 0.28);
  if (alpha < 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    assets.drawSprite(ctx, id, x + OX, y + OY, CHAR_W, CHAR_H);
    ctx.restore();
  } else {
    assets.drawSprite(ctx, id, x + OX, y + OY, CHAR_W, CHAR_H);
  }
}
