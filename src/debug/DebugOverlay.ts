import type { Renderer } from "../core/Renderer";
import type { TextRenderer } from "../gfx/TextRenderer";

/**
 * F3 でトグルするデバッグ表示。
 * Game やシーンが set() した key: value を毎フレーム左上に描く。
 */
export class DebugOverlay {
  private visible = false;
  private entries = new Map<string, string>();

  toggle(): void {
    this.visible = !this.visible;
  }

  set(key: string, value: string): void {
    this.entries.set(key, value);
  }

  render(r: Renderer, text: TextRenderer): void {
    if (!this.visible) return;
    const ctx = r.ui;
    const lineH = 14;
    const pad = 6;
    const h = this.entries.size * lineH + pad * 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(4, 4, 190, h);
    let y = 4 + pad;
    for (const [key, value] of this.entries) {
      text.draw(ctx, `${key}: ${value}`, 10, y, { size: 10, color: "#8ef58e" });
      y += lineH;
    }
  }
}
