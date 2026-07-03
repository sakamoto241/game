import type { Input } from "../core/Input";
import { UI_W } from "../core/Renderer";
import type { TextRenderer } from "../gfx/TextRenderer";

/**
 * カーソル式リストメニュー。タイトル・ショップ・コマンド選択など全メニューで共用。
 * 上下キーの押しっぱなしオートリピート対応。
 */
export interface MenuItem {
  label: string;
  value: string;
  /** 右端に表示する補足（価格・個数など） */
  note?: string;
  disabled?: boolean;
}

export type MenuEvent =
  | { type: "select"; item: MenuItem }
  | { type: "cancel" }
  | null;

const REPEAT_DELAY = 0.34;
const REPEAT_INTERVAL = 0.09;

export class ListMenu {
  index = 0;
  /** 直近の描画で実際に使った幅（自動拡張後）。付随ウィンドウの幅合わせ用 */
  renderedWidth = 0;
  private holdTimer = 0;
  private holdDir = 0;

  constructor(
    public items: MenuItem[],
    private title?: string,
  ) {}

  update(input: Input, dt: number): MenuEvent {
    if (this.items.length === 0) {
      if (input.pressed("cancel")) return { type: "cancel" };
      return null;
    }

    const dir = (input.down("down") ? 1 : 0) - (input.down("up") ? 1 : 0);
    if (input.pressed("down")) this.move(1);
    else if (input.pressed("up")) this.move(-1);
    else if (dir !== 0 && dir === this.holdDir) {
      this.holdTimer += dt;
      if (this.holdTimer >= REPEAT_DELAY) {
        this.holdTimer -= REPEAT_INTERVAL;
        this.move(dir);
      }
    }
    if (dir !== this.holdDir) {
      this.holdDir = dir;
      this.holdTimer = 0;
    }

    if (input.pressed("confirm")) {
      const item = this.items[this.index];
      if (item && !item.disabled) return { type: "select", item };
      return null; // disabled はブザー相当（無反応）
    }
    if (input.pressed("cancel")) return { type: "cancel" };
    return null;
  }

  private move(dir: number): void {
    const n = this.items.length;
    this.index = (this.index + dir + n) % n;
  }

  /** 必要な高さ（ウィンドウ込み）を返す */
  height(): number {
    return this.items.length * 18 + (this.title ? 22 : 0) + 22;
  }

  render(
    ctx: CanvasRenderingContext2D,
    text: TextRenderer,
    x: number,
    y: number,
    w: number,
  ): void {
    // 内容の実測幅に合わせて自動で広げる（画面右端は超えない）
    const limit = UI_W - x - 12;
    let contentW = w;
    if (this.title) {
      contentW = Math.max(contentW, text.measure(ctx, this.title, 12, true) + 36);
    }
    for (const item of this.items) {
      const noteW = item.note ? text.measure(ctx, item.note, 12) + 18 : 0;
      contentW = Math.max(
        contentW,
        28 + text.measure(ctx, item.label, 13) + noteW + 16,
      );
    }
    const finalW = Math.max(w, Math.min(contentW, limit));
    this.renderedWidth = finalW;

    const h = this.height();
    text.window(ctx, x, y, finalW, h);
    let ty = y + 12;
    if (this.title) {
      const title = text.truncate(ctx, this.title, finalW - 24, 12, true);
      text.draw(ctx, title, x + finalW / 2, ty, {
        size: 12,
        align: "center",
        color: "#ffe9a0",
        bold: true,
      });
      ty += 22;
    }
    this.items.forEach((item, i) => {
      const selected = i === this.index;
      const color = item.disabled ? "#7d7690" : selected ? "#ffffff" : "#d8d2e8";
      if (selected) {
        text.draw(ctx, "▶", x + 12, ty, { size: 12, color: "#ffe9a0" });
      }
      const noteW = item.note ? text.measure(ctx, item.note, 12) + 18 : 0;
      const label = text.truncate(ctx, item.label, finalW - 28 - 14 - noteW, 13);
      text.draw(ctx, label, x + 28, ty, { size: 13, color });
      if (item.note) {
        text.draw(ctx, item.note, x + finalW - 14, ty, {
          size: 12,
          align: "right",
          color: item.disabled ? "#7d7690" : "#b8b0d8",
        });
      }
      ty += 18;
    });
  }
}
