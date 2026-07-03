import { WORLD_W, WORLD_H } from "../core/Renderer";
import { Rng } from "../core/Rng";
import type { Weather } from "../data/balance";

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
}

/**
 * 天候の画面エフェクト（雨・雪・霧）。ワールドレイヤーに重ねる。
 * 演出専用なので乱数はゲームロジックから独立している。
 */
export class WeatherFX {
  private weather: Weather = "sunny";
  private particles: Particle[] = [];
  private rng = new Rng(0xfeed);
  private fogT = 0;

  setWeather(weather: Weather): void {
    if (weather === this.weather) return;
    this.weather = weather;
    this.particles = [];
    const count = weather === "rain" ? 70 : weather === "snow" ? 46 : 0;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.rng.float(0, WORLD_W),
        y: this.rng.float(0, WORLD_H),
        speed:
          weather === "rain" ? this.rng.float(170, 240) : this.rng.float(18, 34),
        size: this.rng.chance(0.3) ? 2 : 1,
      });
    }
  }

  update(dt: number): void {
    this.fogT += dt;
    for (const p of this.particles) {
      if (this.weather === "rain") {
        p.y += p.speed * dt;
        p.x -= p.speed * 0.25 * dt;
      } else {
        p.y += p.speed * dt;
        p.x += Math.sin(this.fogT * 1.4 + p.y * 0.08) * 12 * dt;
      }
      if (p.y > WORLD_H) {
        p.y = -4;
        p.x = this.rng.float(0, WORLD_W);
      }
      if (p.x < 0) p.x += WORLD_W;
      if (p.x > WORLD_W) p.x -= WORLD_W;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    switch (this.weather) {
      case "rain": {
        ctx.strokeStyle = "rgba(180, 210, 240, 0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const p of this.particles) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 1.5, p.y + 5 + p.size * 2);
        }
        ctx.stroke();
        // 全体をわずかに暗く
        ctx.fillStyle = "rgba(30, 40, 70, 0.14)";
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);
        break;
      }
      case "snow": {
        ctx.fillStyle = "rgba(245, 248, 255, 0.9)";
        for (const p of this.particles) {
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        break;
      }
      case "fog": {
        // ゆっくり流れる霧のバンド
        for (let i = 0; i < 3; i++) {
          const y = ((this.fogT * (6 + i * 3) + i * 70) % (WORLD_H + 60)) - 30;
          const grad = ctx.createLinearGradient(0, y, 0, y + 44);
          grad.addColorStop(0, "rgba(210, 214, 228, 0)");
          grad.addColorStop(0.5, "rgba(210, 214, 228, 0.22)");
          grad.addColorStop(1, "rgba(210, 214, 228, 0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, y, WORLD_W, 44);
        }
        ctx.fillStyle = "rgba(205, 210, 225, 0.13)";
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);
        break;
      }
      case "sunny":
        break;
    }
  }
}
