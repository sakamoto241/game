import { Rng } from "../core/Rng";

/**
 * パーティクル（火の粉・煙・塵・きらめき・蛍）。
 * すべてワールド座標で管理し、カメラ変換の中で描画する。演出専用。
 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  /** twinkle はアルファが明滅する */
  twinkle: boolean;
  /** 上昇減衰（煙・火の粉） */
  drag: number;
}

export class Particles {
  private list: Particle[] = [];
  private rng = new Rng(0xa11ce);

  get count(): number {
    return this.list.length;
  }

  /** 松明の火の粉 */
  ember(x: number, y: number): void {
    this.push({
      x: x + this.rng.float(-1.5, 1.5),
      y: y + this.rng.float(-1, 1),
      vx: this.rng.float(-6, 6),
      vy: this.rng.float(-26, -14),
      life: this.rng.float(0.5, 1.1),
      size: this.rng.chance(0.3) ? 2 : 1,
      color: this.rng.pick(["#ffd24a", "#ff9435", "#e8683a"])!,
      twinkle: false,
      drag: 1.6,
    });
  }

  /** 松明の煙 */
  smoke(x: number, y: number): void {
    this.push({
      x: x + this.rng.float(-1, 1),
      y,
      vx: this.rng.float(-3, 3),
      vy: this.rng.float(-14, -8),
      life: this.rng.float(0.8, 1.6),
      size: 2,
      color: "rgba(160, 160, 175, 0.28)",
      twinkle: false,
      drag: 0.6,
    });
  }

  /** 漂う塵（ダンジョンの空気感） */
  dust(x: number, y: number): void {
    this.push({
      x,
      y,
      vx: this.rng.float(-4, 4),
      vy: this.rng.float(-3, 3),
      life: this.rng.float(2.5, 5),
      size: 1,
      color: "rgba(215, 220, 245, 0.5)",
      twinkle: true,
      drag: 0,
    });
  }

  /** 宝箱・鉱脈などのきらめき */
  sparkle(x: number, y: number, color = "#ffd24a"): void {
    this.push({
      x: x + this.rng.float(-6, 6),
      y: y + this.rng.float(-6, 2),
      vx: 0,
      vy: this.rng.float(-6, -3),
      life: this.rng.float(0.6, 1.2),
      size: 1,
      color,
      twinkle: true,
      drag: 0,
    });
  }

  /** 夜の蛍 */
  firefly(x: number, y: number): void {
    this.push({
      x,
      y,
      vx: this.rng.float(-8, 8),
      vy: this.rng.float(-5, 5),
      life: this.rng.float(3, 6),
      size: 1,
      color: "#c8f078",
      twinkle: true,
      drag: 0,
    });
  }

  private push(p: Omit<Particle, "maxLife">): void {
    if (this.list.length > 220) this.list.shift(); // 安全弁
    this.list.push({ ...p, maxLife: p.life });
  }

  update(dt: number): void {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.drag > 0 ? -p.drag * dt * 6 : 0; // 火の粉は加速して昇る
      if (p.twinkle) {
        p.x += Math.sin(p.life * 5 + p.y) * 6 * dt;
      }
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      const t = p.life / p.maxLife;
      const alpha = p.twinkle ? t * (0.45 + 0.55 * Math.sin(p.life * 9)) ** 2 : t;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}

/**
 * コード製アニメーション松明。キャラの手元に描く。
 * time でゆらぎ、炎・芯・小さなグローを重ねる。
 */
export function drawTorchFlame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
): void {
  const wob = Math.sin(time * 11) * 0.8 + Math.sin(time * 23) * 0.5;
  const h = 4 + Math.round(Math.abs(wob));

  // 柄
  ctx.fillStyle = "#7a4a2b";
  ctx.fillRect(x, y + 2, 2, 5);

  // 外炎 → 内炎
  ctx.fillStyle = "#e8683a";
  ctx.fillRect(x - 1, y - h + 2, 4, h);
  ctx.fillStyle = "#ff9435";
  ctx.fillRect(x, y - h + 3, 2, h - 1);
  ctx.fillStyle = "#ffd24a";
  ctx.fillRect(x + (wob > 0 ? 1 : 0), y - h + 4, 1, 2);

  // グロー
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x + 1, y, 1, x + 1, y, 10);
  g.addColorStop(0, "rgba(255, 170, 70, 0.35)");
  g.addColorStop(1, "rgba(255, 170, 70, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - 10, y - 10, 22, 22);
  ctx.restore();
}
