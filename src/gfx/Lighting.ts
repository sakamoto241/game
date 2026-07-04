import { WORLD_W, WORLD_H } from "../core/Renderer";

/**
 * ダイナミックライティング。
 *
 * 1. オフスクリーンに「闇」を敷き、光源ごとに destination-out で焼き抜く
 *    （中心は完全に明るく、外周へ滑らかに減衰）
 * 2. その闇をワールドレイヤーへ重ねる
 * 3. 光源色の暖色グローを加算合成（lighter）で薄く重ね、灯りに温度を与える
 *
 * 演出専用 — ゲームロジックには一切影響しない。
 */
export interface LightSource {
  /** スクリーン座標（カメラ適用後） */
  x: number;
  y: number;
  radius: number;
  /** グローの色。省略時は暖色 */
  color?: string;
  /** 0..1 ゆらぎの強さ（松明など） */
  flicker?: number;
  /** グローの強さ 0..1（省略時 0.5） */
  glow?: number;
}

export class Lighting {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = WORLD_W;
    this.canvas.height = WORLD_H;
    this.ctx = this.canvas.getContext("2d")!;
  }

  /**
   * @param ambient 闇の濃さ 0..1（ダンジョン 0.94 / 夜の村 0.6 など）
   * @param time 演出時間（ゆらぎ用）
   */
  render(
    target: CanvasRenderingContext2D,
    lights: LightSource[],
    ambient: number,
    time: number,
  ): void {
    const c = this.ctx;

    // --- 闇のマスク ---
    c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, WORLD_W, WORLD_H);
    c.fillStyle = `rgba(7, 5, 18, ${ambient})`;
    c.fillRect(0, 0, WORLD_W, WORLD_H);

    c.globalCompositeOperation = "destination-out";
    for (const light of lights) {
      const r = this.flickered(light, time);
      if (r <= 0) continue;
      const g = c.createRadialGradient(light.x, light.y, r * 0.18, light.x, light.y, r);
      g.addColorStop(0, "rgba(0, 0, 0, 1)");
      g.addColorStop(0.55, "rgba(0, 0, 0, 0.75)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      c.fillStyle = g;
      c.fillRect(light.x - r, light.y - r, r * 2, r * 2);
    }

    target.drawImage(this.canvas, 0, 0);

    // --- 暖色グロー（加算） ---
    target.save();
    target.globalCompositeOperation = "lighter";
    for (const light of lights) {
      const r = this.flickered(light, time);
      if (r <= 0) continue;
      const strength = (light.glow ?? 0.5) * 0.16;
      const g = target.createRadialGradient(light.x, light.y, 2, light.x, light.y, r * 0.85);
      g.addColorStop(0, this.withAlpha(light.color ?? "#ff9a3c", strength));
      g.addColorStop(1, this.withAlpha(light.color ?? "#ff9a3c", 0));
      target.fillStyle = g;
      target.fillRect(light.x - r, light.y - r, r * 2, r * 2);
    }
    target.restore();
  }

  private flickered(light: LightSource, time: number): number {
    if (!light.flicker) return light.radius;
    const wobble =
      Math.sin(time * 7.3 + light.x * 0.7) * 0.5 + Math.sin(time * 13.7 + light.y) * 0.3;
    return light.radius * (1 + wobble * 0.05 * light.flicker);
  }

  private withAlpha(hex: string, alpha: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha.toFixed(3)})`;
  }
}
