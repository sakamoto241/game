import type { Game } from "../core/Game";
import { UI_W } from "../core/Renderer";
import { drawBar } from "./Windows";

/**
 * 音量設定パネル（マスター / BGM / 効果音）。
 *
 * 上下でスライダーを選択、左右で 5% 刻みで増減。値は AudioManager が
 * localStorage に保存する。効果音を変えたときは試聴用の SE を鳴らす。
 * update の戻り値: "close" = 閉じる / null = 継続。
 */
type Row = "master" | "bgm" | "se";

const ROWS: { id: Row; label: string }[] = [
  { id: "master", label: "マスター" },
  { id: "bgm", label: "BGM" },
  { id: "se", label: "こうかおん" },
];

const STEP = 0.05;
const REPEAT_DELAY = 0.34;
const REPEAT_INTERVAL = 0.06;

export class SettingsMenu {
  private index = 0;
  private holdDir = 0;
  private holdTimer = 0;

  private get(game: Game, row: Row): number {
    const a = game.audio;
    return row === "master" ? a.masterVolume : row === "bgm" ? a.bgmVolume : a.seVolume;
  }

  private set(game: Game, row: Row, v: number): void {
    const a = game.audio;
    if (row === "master") a.setMasterVolume(v);
    else if (row === "bgm") a.setBgmVolume(v);
    else a.setSeVolume(v);
  }

  update(game: Game, dt: number): "close" | null {
    const input = game.input;

    if (input.pressed("up")) this.move(-1);
    else if (input.pressed("down")) this.move(1);

    // 左右は押しっぱなしオートリピート
    const dir = (input.down("right") ? 1 : 0) - (input.down("left") ? 1 : 0);
    if (input.pressed("left")) this.adjust(game, -1);
    else if (input.pressed("right")) this.adjust(game, 1);
    else if (dir !== 0 && dir === this.holdDir) {
      this.holdTimer += dt;
      if (this.holdTimer >= REPEAT_DELAY) {
        this.holdTimer -= REPEAT_INTERVAL;
        this.adjust(game, dir);
      }
    }
    if (dir !== this.holdDir) {
      this.holdDir = dir;
      this.holdTimer = 0;
    }

    if (input.pressed("confirm") || input.pressed("cancel") || input.pressed("menu")) {
      return "close";
    }
    return null;
  }

  private move(d: number): void {
    this.index = (this.index + d + ROWS.length) % ROWS.length;
  }

  private adjust(game: Game, d: number): void {
    const row = ROWS[this.index]!.id;
    const before = this.get(game, row);
    const next = Math.round((before + d * STEP) * 100) / 100;
    if (next === before) return;
    this.set(game, row, next);
    // 効果音・マスターを触ったときは試聴音を鳴らす
    if (row !== "bgm") game.audio.playSE("decide");
  }

  render(game: Game, ctx: CanvasRenderingContext2D): void {
    const text = game.text;
    const w = 300;
    const h = 40 + ROWS.length * 34 + 26;
    const x = (UI_W - w) / 2;
    const y = 70;

    text.window(ctx, x, y, w, h);
    text.draw(ctx, "おんりょう せってい", x + w / 2, y + 14, {
      size: 14,
      align: "center",
      bold: true,
      color: "#ffe9a0",
    });

    ROWS.forEach((r, i) => {
      const ry = y + 42 + i * 34;
      const selected = i === this.index;
      if (selected) text.draw(ctx, "▶", x + 16, ry + 8, { size: 12, color: "#ffe9a0" });
      text.draw(ctx, r.label, x + 34, ry + 8, {
        size: 13,
        color: selected ? "#ffffff" : "#d8d2e8",
      });
      const v = this.get(game, r.id);
      drawBar(ctx, x + 150, ry + 6, 96, 12, v, "exp");
      text.draw(ctx, `${Math.round(v * 100)}%`, x + w - 18, ry + 8, {
        size: 12,
        align: "right",
        color: "#b8b0d8",
      });
    });

    text.draw(ctx, "←→: ちょうせつ   ↑↓: せんたく   Z/X: とじる", x + w / 2, y + h - 14, {
      size: 10,
      align: "center",
      color: "#8f87a8",
    });
  }
}
