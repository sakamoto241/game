/**
 * 接地影。キャラや物の足元に柔らかい楕円影を落として「浮き」を消す。
 * HD-2D 風の立体感で一番効くのがこの一手。ワールド座標で呼ぶこと
 * （カメラ変換の内側で描画する）。
 */
export function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx = 5,
  ry = 2.2,
  alpha = 0.3,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#05040c";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
