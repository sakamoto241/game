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
  // 背景（凹み）
  ctx.fillStyle = "rgba(8, 7, 18, 0.85)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(227, 201, 139, 0.22)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (r <= 0) return;

  let top: string;
  let bottom: string;
  if (kind === "mp") {
    top = "#7ab4f0";
    bottom = "#3a6ab8";
  } else if (kind === "exp") {
    top = "#e8cc70";
    bottom = "#b0903a";
  } else if (r > 0.5) {
    top = "#7ade5c";
    bottom = "#3a9a3a";
  } else if (r > 0.25) {
    top = "#f0d05a";
    bottom = "#c89a2e";
  } else {
    top = "#f0705a";
    bottom = "#b83a2e";
  }
  const fillW = Math.max(1, Math.round((w - 2) * r));
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(x + 1, y + 1, fillW, h - 2);
  // 上端ハイライト
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fillRect(x + 1, y + 1, fillW, 1);
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
