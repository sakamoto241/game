import type { Game } from "../core/Game";
import { UI_W, UI_H } from "../core/Renderer";
import type { PartyMember } from "../world/PartyMember";

/** シーン間で共用する定型ウィンドウ描画 */

/** HUD の1行: 顔アイコン + 名前 + HP/MP バー（街・ダンジョン共用） */
export function drawHudRow(
  game: Game,
  ctx: CanvasRenderingContext2D,
  m: PartyMember,
  x: number,
  y: number,
): void {
  const text = game.text;
  const iconId = m.classId === "hero" ? "hero.down" : `chara.${m.classId}.down`;
  ctx.save();
  if (!m.alive) ctx.globalAlpha = 0.45;
  game.assets.drawSprite(ctx, iconId, x, y - 3, 14, 14);
  ctx.restore();

  text.draw(ctx, `${m.name}${m.poisoned ? "毒" : ""}`, x + 18, y, {
    size: 10,
    color: !m.alive ? "#7d7690" : m.poisoned ? "#c9a7ff" : "#e8e2f5",
  });

  drawBar(ctx, x + 82, y + 1, 60, 8, m.alive ? m.hp / m.maxHp : 0, "hp");
  text.draw(ctx, `${m.hp}`, x + 112, y, { size: 9, align: "center" });
  drawBar(ctx, x + 150, y + 1, 46, 8, m.maxMp > 0 ? m.mp / m.maxMp : 0, "mp");
  text.draw(ctx, `${m.mp}`, x + 173, y, { size: 9, align: "center" });
}

/**
 * HP/MP などのステータスバー。
 * kind='hp' は残量で 緑→黄→赤 に変わる。
 */
export function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
  kind: "hp" | "mp" | "exp" = "hp",
): void {
  const r = Math.max(0, Math.min(1, ratio));
  // SFC 風フラットゲージ: 黒背景 + 白枠 + ベタ塗り（立体感なし）
  ctx.fillStyle = "#000000";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (r <= 0) return;

  let fill: string;
  if (kind === "mp") {
    fill = "#38a0f0";
  } else if (kind === "exp") {
    fill = "#f0c838";
  } else if (r > 0.5) {
    fill = "#3ac83a";
  } else if (r > 0.25) {
    fill = "#f0c838";
  } else {
    fill = "#e83c2c";
  }
  const fillW = Math.max(1, Math.round((w - 2) * r));
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, fillW, h - 2);
}

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

/** 画面上部の場所名バナー。timer 残り0.5秒でフェードアウト。
 *  右上の HUD と重ならないよう、既定では左寄りに出す */
export function drawBanner(
  game: Game,
  ctx: CanvasRenderingContext2D,
  title: string,
  timer: number,
  width = 200,
  centerX = (UI_W - 250) / 2,
): void {
  if (timer <= 0) return;
  const alpha = Math.min(1, timer / 0.5);
  ctx.save();
  ctx.globalAlpha = alpha;
  game.text.window(ctx, centerX - width / 2, 18, width, 34);
  game.text.draw(ctx, title, centerX, 27, { size: 15, align: "center", bold: true });
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
