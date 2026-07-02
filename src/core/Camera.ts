import { WORLD_W, WORLD_H } from "./Renderer";

/**
 * ワールドレイヤー用カメラ。
 * 対象（通常はプレイヤー）を中央に捉えつつ、マップ端では画面をはみ出さない。
 */
export class Camera {
  x = 0;
  y = 0;
  readonly viewW = WORLD_W;
  readonly viewH = WORLD_H;

  /** ワールド座標 (px, py) を画面中央に捉える。マップ境界でクランプ */
  centerOn(px: number, py: number, mapWidthPx: number, mapHeightPx: number): void {
    this.x = clamp(px - this.viewW / 2, 0, Math.max(0, mapWidthPx - this.viewW));
    this.y = clamp(py - this.viewH / 2, 0, Math.max(0, mapHeightPx - this.viewH));
  }

  /** カメラ変換を適用（ctx.save 込み）。end() と対で使う */
  begin(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(-Math.round(this.x), -Math.round(this.y));
  }

  end(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  /** ワールド座標 → スクリーン座標 */
  toScreenX(wx: number): number {
    return Math.round(wx - this.x);
  }

  toScreenY(wy: number): number {
    return Math.round(wy - this.y);
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
