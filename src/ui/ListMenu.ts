import type { Input } from "../core/Input";
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
    const h = this.height();
    text.window(ctx, x, y, w, h);
    let ty = y + 12;
    if (this.title) {
      text.draw(ctx, this.title, x + w / 2, ty, {
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
      text.draw(ctx, item.label, x + 28, ty, { size: 13, color });
      if (item.note) {
        text.draw(ctx, item.note, x + w - 14, ty, {
          size: 12,
          align: "right",
          color: item.disabled ? "#7d7690" : "#b8b0d8",
        });
      }
      ty += 18;
    });
  }
}
