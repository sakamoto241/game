import type { Game } from "../core/Game";
import { UI_W, UI_H } from "../core/Renderer";

/** シーン間で共用する定型ウィンドウ描画 */

/** 画面下部のメッセージウィンドウ（DQ風）。入力待ちカーソル付き */
export function drawMessage(
  game: Game,
  ctx: CanvasRenderingContext2D,
  lines: string[],
  opts: { cursor?: boolean } = {},
): void {
  const { cursor = true } = opts;
  const text = game.text;
  const w = UI_W - 96;
  const h = Math.max(64, lines.length * 18 + 26);
  const x = 48;
  const y = UI_H - h - 16;
  text.window(ctx, x, y, w, h);
  lines.forEach((line, i) => {
    text.draw(ctx, line, x + 16, y + 14 + i * 18, { size: 13 });
  });
  if (cursor && Math.sin(game.elapsed * 6) > 0) {
    text.draw(ctx, "▼", x + w - 22, y + h - 20, { size: 12, color: "#ffe9a0" });
  }
}

/** 画面上部中央の場所名バナー。timer 残り0.5秒でフェードアウト */
export function drawBanner(
  game: Game,
  ctx: CanvasRenderingContext2D,
  title: string,
  timer: number,
  width = 200,
): void {
  if (timer <= 0) return;
  const alpha = Math.min(1, timer / 0.5);
  ctx.save();
  ctx.globalAlpha = alpha;
  game.text.window(ctx, UI_W / 2 - width / 2, 18, width, 34);
  game.text.draw(ctx, title, UI_W / 2, 27, { size: 15, align: "center", bold: true });
  ctx.restore();
}

/** 左下の小さな通知トースト（オートセーブ等） */
export function drawToast(
  game: Game,
  ctx: CanvasRenderingContext2D,
  message: string,
  timer: number,
): void {
  if (timer <= 0) return;
  const alpha = Math.min(1, timer / 0.4);
  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = "rgba(10, 10, 22, 0.85)";
  ctx.fillRect(10, UI_H - 32, message.length * 11 + 24, 22);
  game.text.draw(ctx, message, 22, UI_H - 27, { size: 11, color: "#8ef58e" });
  ctx.restore();
}
