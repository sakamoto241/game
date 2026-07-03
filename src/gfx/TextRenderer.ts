/**
 * テキストとメッセージウィンドウの描画（UI レイヤー用）。
 *
 * Phase 0 はシステムフォントを使う。
 * TODO(Phase 1+): PixelMplus 等のピクセルフォントを assets/ に同梱して
 * fontFamily を差し替え、全環境で見た目を統一する。
 */
export interface TextOptions {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  /** 可読性のための 1px 落ち影。既定で有効 */
  shadow?: boolean;
  bold?: boolean;
}

export class TextRenderer {
  fontFamily =
    `'PixelMplus10', 'MS Gothic', 'Hiragino Kaku Gothic ProN', ` +
    `'Noto Sans CJK JP', 'Noto Sans JP', sans-serif`;

  draw(
    ctx: CanvasRenderingContext2D,
    str: string,
    x: number,
    y: number,
    opts: TextOptions = {},
  ): void {
    const {
      size = 12,
      color = "#f5f1e8",
      align = "left",
      baseline = "top",
      shadow = true,
      bold = false,
    } = opts;
    ctx.font = `${bold ? "bold " : ""}${size}px ${this.fontFamily}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    if (shadow) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillText(str, x + 1, y + 1);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  /** 文字幅を計測する（フォント設定込み） */
  measure(ctx: CanvasRenderingContext2D, str: string, size = 12, bold = false): number {
    ctx.font = `${bold ? "bold " : ""}${size}px ${this.fontFamily}`;
    return ctx.measureText(str).width;
  }

  /** maxWidth に収まるよう末尾を「…」で切り詰める */
  truncate(
    ctx: CanvasRenderingContext2D,
    str: string,
    maxWidth: number,
    size = 12,
    bold = false,
  ): string {
    if (this.measure(ctx, str, size, bold) <= maxWidth) return str;
    let s = str;
    while (s.length > 1 && this.measure(ctx, `${s}…`, size, bold) > maxWidth) {
      s = s.slice(0, -1);
    }
    return `${s}…`;
  }

  /** ドラクエ風メッセージウィンドウ（黒地 + 白の二重枠） */
  window(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = "rgba(10, 10, 22, 0.92)";
    fillRound(ctx, x, y, w, h, 6);
    ctx.strokeStyle = "#f5f1e8";
    ctx.lineWidth = 2;
    strokeRound(ctx, x + 1, y + 1, w - 2, h - 2, 5);
    ctx.lineWidth = 1;
    strokeRound(ctx, x + 4.5, y + 4.5, w - 9, h - 9, 3);
  }

  /**
   * 文字数ベースの簡易折り返し。既存の改行 (\n) も尊重する。
   * 日本語前提なので単語境界は考慮しない（英文対応は必要になったときに拡張）。
   */
  wrap(text: string, maxChars: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
      if (paragraph.length === 0) {
        lines.push("");
        continue;
      }
      for (let i = 0; i < paragraph.length; i += maxChars) {
        lines.push(paragraph.slice(i, i + maxChars));
      }
    }
    return lines;
  }
}

function fillRound(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function strokeRound(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
}
