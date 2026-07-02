import { Scene } from "../core/Scene";
import type { Renderer } from "../core/Renderer";
import { WORLD_W, WORLD_H, UI_W, UI_H } from "../core/Renderer";
import { TownScene } from "./TownScene";

interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
}

/**
 * タイトル画面。夕暮れの空 + 街のシルエット（すべて矩形描画のプレースホルダー）。
 */
export class TitleScene extends Scene {
  readonly name = "Title";

  private stars: Star[] = [];
  private time = 0;

  override onEnter(): void {
    const rng = this.game.rootRng.fork("title-stars");
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: rng.int(0, WORLD_W - 1),
        y: rng.int(0, Math.floor(WORLD_H * 0.55)),
        size: rng.chance(0.2) ? 2 : 1,
        phase: rng.float(0, Math.PI * 2),
      });
    }
    this.game.audio.playBgm("title");
  }

  update(dt: number): void {
    this.time += dt;
    if (this.game.input.pressed("confirm")) {
      this.game.audio.playSe("decide");
      this.game.scenes.replace(new TownScene());
    }
  }

  render(r: Renderer): void {
    this.renderSky(r.world);
    this.renderTownSilhouette(r.world);
    this.renderUi(r.ui);
  }

  private renderSky(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    grad.addColorStop(0, "#141a33");
    grad.addColorStop(0.55, "#33305e");
    grad.addColorStop(1, "#71455c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    for (const s of this.stars) {
      const tw = 0.55 + 0.45 * Math.sin(this.time * 1.8 + s.phase);
      ctx.fillStyle = `rgba(240, 240, 255, ${(tw * 0.9).toFixed(2)})`;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // 月
    ctx.fillStyle = "#e8e4d0";
    ctx.beginPath();
    ctx.arc(258, 38, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(20, 26, 51, 0.25)";
    ctx.beginPath();
    ctx.arc(253, 35, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderTownSilhouette(ctx: CanvasRenderingContext2D): void {
    const ground = WORLD_H - 34;
    // 遠景の山
    ctx.fillStyle = "#2a2440";
    ctx.beginPath();
    ctx.moveTo(0, ground);
    ctx.lineTo(60, ground - 42);
    ctx.lineTo(130, ground);
    ctx.lineTo(200, ground - 56);
    ctx.lineTo(290, ground);
    ctx.lineTo(WORLD_W, ground - 30);
    ctx.lineTo(WORLD_W, ground);
    ctx.closePath();
    ctx.fill();
    // 家々のシルエット
    ctx.fillStyle = "#191527";
    const houses: [number, number, number][] = [
      [30, 22, 18],
      [70, 30, 26],
      [118, 18, 14],
      [150, 26, 22],
      [205, 34, 30],
      [252, 20, 16],
      [284, 26, 20],
    ];
    for (const [x, w, h] of houses) {
      ctx.fillRect(x, ground - h, w, h);
      ctx.beginPath();
      ctx.moveTo(x - 3, ground - h);
      ctx.lineTo(x + w / 2, ground - h - 9);
      ctx.lineTo(x + w + 3, ground - h);
      ctx.closePath();
      ctx.fill();
    }
    // 窓の明かり
    ctx.fillStyle = "#e8b465";
    for (const [x, w, h] of houses) {
      if (w > 16) ctx.fillRect(x + Math.floor(w / 2) - 1, ground - Math.floor(h / 2), 3, 4);
    }
    // 地面
    ctx.fillStyle = "#100d1c";
    ctx.fillRect(0, ground, WORLD_W, WORLD_H - ground);
  }

  private renderUi(ctx: CanvasRenderingContext2D): void {
    const text = this.game.text;
    const cx = UI_W / 2;
    text.draw(ctx, "まちと迷宮", cx, 92, {
      size: 44,
      bold: true,
      align: "center",
      color: "#f5f1e8",
    });
    text.draw(ctx, "- TOWN & DUNGEON -", cx, 148, {
      size: 13,
      align: "center",
      color: "#b8b0d8",
    });

    // 点滅するスタートプロンプト
    if (Math.sin(this.time * 4.2) > -0.25) {
      text.draw(ctx, "Z キーで はじめる", cx, 246, {
        size: 16,
        align: "center",
        color: "#ffe9a0",
      });
    }

    text.draw(ctx, "Phase 0 Prototype  v0.1.0", cx, UI_H - 22, {
      size: 10,
      align: "center",
      color: "#8f87a8",
    });
  }
}
