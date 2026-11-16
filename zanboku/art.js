import { W, H, INK_RADIUS, seeded, clamp } from "./core.js";
export const ASSETS = {
  background: "assets/temple-portrait.webp",
  original: "assets/temple.jpg",
  ronin: "assets/ronin.webp",
  soldier: "assets/soldier.webp",
  spear: "assets/spearman.webp",
  boss: "assets/bellkeeper.webp",
};
export class Painter {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.images = {};
    this.fx = [];
    this.shake = 0;
    this.flash = 0;
    this.clock = 0;
    this.rainPause = 0;
    this.lastPlayer = null;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resize();
    this.ready = Promise.allSettled(
      Object.entries(ASSETS).map(
        ([k, src]) =>
          new Promise((resolve, reject) => {
            const im = new Image();
            im.onload = () => {
              this.images[k] = im;
              resolve(k);
            };
            im.onerror = () => reject(src);
            im.src = src;
          }),
      ),
    );
    const r = seeded(917);
    this.rain = Array.from({ length: 65 }, () => ({
      x: r() * W,
      y: r() * H,
      s: 90 + r() * 100,
      l: 6 + r() * 10,
    }));
    this.grain = document.createElement("canvas");
    this.grain.width = 160;
    this.grain.height = 160;
    const g = this.grain.getContext("2d");
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = i % 2 ? "#fff4" : "#30291b19";
      g.fillRect(r() * 160, r() * 160, 1, 1);
    }
    this.pattern = this.ctx.createPattern(this.grain, "repeat");
  }
  resize() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = W * d;
    this.canvas.height = H * d;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
    this.dpr = d;
  }
  event(e) {
    if (e.type === "seal") {
      this.fx.push({ ...e, age: 0, life: 0.72 });
      this.rainPause = 0.18;
      this.shake = e.count > 3 ? 5 : 2;
      for (const t of e.targets) this.splatter(t.x, t.y, t.boss ? 16 : 6, 0.12);
    }
    if (e.type === "slash") {
      this.fx.push({ ...e, age: 0, life: 0.26 });
      if (e.count) this.shake = 2;
    }
    if (e.type === "dash") {
      this.fx.push({ ...e, age: 0, life: 0.23 });
    }
    if (e.type === "enemystrike") {
      this.fx.push({ ...e, age: 0, life: 0.3 });
      if (e.boss) this.shake = 3;
    }
    if (e.type === "hurt") {
      this.flash = 0.35;
      this.shake = 7;
    }
    if (e.type === "kill") {
      this.splatter(e.x, e.y, e.boss ? 30 : 8, e.delay);
    }
    if (e.type === "cross") this.fx.push({ ...e, age: 0, life: 0.24 });
    if (e.type === "stagger") {
      this.fx.push({ ...e, age: 0, life: 0.55 });
      this.shake = e.double ? 7 : 4;
    }
    if (e.type === "bell" || e.type === "bossintro") {
      this.fx.push({ type: "ripple", x: 95, y: 240, age: 0, life: 1.6 });
    }
  }
  splatter(x, y, n, delay = 0) {
    const r = Math.random;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2,
        s = 20 + r() * 65;
      this.fx.push({
        type: "drop",
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 15,
        size: 1 + r() * 2,
        age: -delay,
        life: 0.35 + r() * 0.35,
      });
    }
    if (this.fx.length > 380) this.fx.splice(0, this.fx.length - 380);
  }
  draw(game, dt) {
    this.clock += dt;
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flash = Math.max(0, this.flash - dt);
    this.rainPause = Math.max(0, this.rainPause - dt);
    const c = this.ctx;
    c.save();
    c.clearRect(0, 0, W, H);
    const bg = this.images.background || this.images.original;
    if (bg) {
      const scale = Math.max(W / bg.width, H / bg.height);
      const sw = W / scale,
        sh = H / scale;
      c.drawImage(
        bg,
        (bg.width - sw) / 2,
        (bg.height - sh) / 2,
        sw,
        sh,
        0,
        0,
        W,
        H,
      );
    } else {
      c.fillStyle = "#d8ccb4";
      c.fillRect(0, 0, W, H);
      this.fallbackFloor(c);
    }
    if (!this.reduced && this.shake > 0)
      c.translate(
        Math.sin(this.clock * 100) * this.shake,
        Math.cos(this.clock * 91) * this.shake * 0.6,
      );
    // Layer order: wet floor, paint, telegraphs, feet shadows, actors, cuts, weather.
    const fog = c.createLinearGradient(0, 160, 0, 340);
    fog.addColorStop(0, "#ede1cd00");
    fog.addColorStop(0.6, "#e8ddc32b");
    fog.addColorStop(1, "#e8ddc300");
    c.fillStyle = fog;
    c.fillRect(0, 160, W, 180);
    for (const l of game.lines) this.paintLine(c, l, clamp(l.life / 0.8, 0, 1));
    for (const e of game.enemies) if (!e.dead) this.telegraph(c, e);
    const actors = [
      ...game.enemies,
      { ...game.player, kind: "ronin", isPlayer: true },
    ].sort((a, b) => a.y - b.y);
    if (game.mode !== "title") for (const a of actors) this.actor(c, a, game);
    for (const f of this.fx) {
      f.age += dt;
      if (f.age < 0) continue;
      this.effect(c, f, dt);
    }
    this.fx = this.fx.filter((f) => f.age < f.life);
    if (this.rainPause <= 0) {
      c.strokeStyle = "#efe8d184";
      c.lineWidth = 0.6;
      for (const r of this.rain) {
        const y = (r.y + this.clock * r.s) % H;
        const x = (r.x + this.clock * 8) % W;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x - 2, y + r.l);
        c.stroke();
      }
      c.strokeStyle = "#e8e0ca72";
      c.lineWidth = 0.5;
      for (let i = 0; i < 9; i++) {
        const t = (this.clock * 0.7 + i * 0.173) % 1,
          x = 30 + ((i * 73) % 370),
          y = 325 + ((i * 59) % 270);
        c.globalAlpha = (1 - t) * 0.65;
        c.beginPath();
        c.ellipse(x, y, 3 + t * 8, 1 + t * 2.5, 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    if (this.flash) {
      c.fillStyle = `rgba(135,43,33,${this.flash * 0.9})`;
      c.fillRect(0, 0, W, H);
    }
    c.globalAlpha = 0.24;
    c.fillStyle = this.pattern;
    c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
    c.restore();
  }
  fallbackFloor(c) {
    c.strokeStyle = "#77715d44";
    c.lineWidth = 1;
    for (let y = 310; y < H; y += 54) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y - 50);
      c.stroke();
    }
    for (let x = -W; x < W * 2; x += 90) {
      c.beginPath();
      c.moveTo(x, 290);
      c.lineTo(x + 200, H);
      c.stroke();
    }
  }
  paintLine(c, l, alpha = 1) {
    c.save();
    c.globalAlpha = alpha;
    const { a, b } = l;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1) {
      c.fillStyle = "#20251eea";
      c.beginPath();
      c.arc(a.x, a.y, INK_RADIUS, 0, Math.PI * 2);
      c.fill();
      c.restore();
      return;
    }
    c.lineCap = "round";
    c.strokeStyle = "#20251eea";
    c.lineWidth = INK_RADIUS * 2;
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
    c.strokeStyle = "#10170f65";
    c.lineWidth = INK_RADIUS * 2 + 3;
    c.stroke();
    const rand = seeded(l.seed || 42),
      dx = (b.x - a.x) / len,
      dy = (b.y - a.y) / len;
    for (let i = 0; i < 20; i++) {
      const t = rand(),
        off = (rand() - 0.5) * (INK_RADIUS * 2 + 5),
        x = a.x + (b.x - a.x) * t - dy * off,
        y = a.y + (b.y - a.y) * t + dx * off;
      c.strokeStyle = i % 4 === 0 ? "#e3d4b85c" : "#1d241b";
      c.lineWidth = 0.4 + rand() * 1.5;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + dx * (3 + rand() * 13), y + dy * 9);
      c.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const t = rand(),
        off = (rand() - 0.5) * (INK_RADIUS * 2 + 10);
      c.fillStyle = "#1f251d";
      c.beginPath();
      c.ellipse(
        a.x + (b.x - a.x) * t - dy * off,
        a.y + (b.y - a.y) * t + dx * off,
        0.7 + rand() * 1.5,
        0.5 + rand(),
        0,
        0,
        7,
      );
      c.fill();
    }
    c.restore();
  }
  telegraph(c, e) {
    if (e.action !== "windup" && e.action !== "strike") return;
    const boss = e.kind === "boss",
      spear = e.kind === "spear",
      r = boss ? (e.phase ? 199 : 184) : spear ? 110 : 66,
      a = Math.atan2(e.dy, e.dx),
      progress = e.action === "strike" ? 1 : 1 - e.timer / e.windup;
    c.save();
    c.translate(e.x, e.y);
    c.rotate(a);
    c.fillStyle = `rgba(154,58,39,${0.07 + progress * 0.13})`;
    c.strokeStyle = `rgba(147,48,32,${0.35 + progress * 0.5})`;
    c.lineWidth = 1;
    if (spear) {
      c.beginPath();
      c.moveTo(0, -13);
      c.lineTo(r, -13);
      c.lineTo(r, 13);
      c.lineTo(0, 13);
      c.closePath();
    } else {
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, r, -0.53, 0.53);
      c.closePath();
    }
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(7, 0);
    c.lineTo(r * progress, 0);
    c.stroke();
    c.restore();
  }
  actor(c, a, game) {
    const player = a.isPlayer,
      boss = a.kind === "boss",
      dead = a.dead && a.fall <= 0;
    let alpha = 1,
      fall = 0;
    if (dead) {
      fall = clamp(a.deathAge / 0.45, 0, 1);
      alpha = 1 - clamp((a.deathAge - 0.15) / 0.55, 0, 1);
    }
    if (alpha <= 0) return;
    const im = this.images[a.kind];
    let h = boss ? 113 : player ? 77 : a.kind === "spear" ? 76 : 58,
      w = im ? (h * im.width) / im.height : h * 0.78;
    const move =
      a.action === "walk" ||
      (player && Math.hypot(game.input.x, game.input.y) > 0.1);
    const bob = move
      ? Math.sin(this.clock * (boss ? 7 : 12) + (a.seed || 0)) * 1.4
      : 0;
    let tilt = 0,
      offsetX = 0,
      offsetY = 0;
    if (player && a.action === "slash") {
      tilt = Math.sin((a.pose / 0.26) * Math.PI) * -0.13;
      offsetX = a.dx * 4;
      offsetY = a.dy * 4;
    }
    if (player && a.action === "dash") {
      tilt = a.dx * 0.2;
      offsetX = a.dx * 6;
      offsetY = a.dy * 6;
    }
    if (!player && a.action === "windup") {
      tilt = -a.dx * 0.12;
      offsetY = -3;
    }
    if (a.action === "strike") {
      offsetX = a.dx * 6;
      offsetY = a.dy * 6;
      tilt = a.dx * 0.18;
    }
    if (a.action === "recover" && a.hitFlash > 0) tilt = 0.16;
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = player ? "#151e164f" : "#252b2240";
    c.beginPath();
    c.ellipse(a.x, a.y + 2, boss ? 30 : player ? 20 : 14, 5, 0, 0, 7);
    c.fill();
    if (
      player &&
      a.invincible > 0 &&
      a.dashTime <= 0 &&
      Math.sin(this.clock * 35) > 0
    )
      c.globalAlpha *= 0.55;
    if (player) {
      c.strokeStyle = "#faf0d4b0";
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(a.x, a.y + 1, 17, 5, 0, 0, 7);
      c.stroke();
    }
    c.translate(a.x + offsetX, a.y + bob + offsetY);
    if (dead) {
      c.rotate(fall * (a.dx < 0 ? -1 : 1) * 1.3);
      c.scale(1, 1 - fall * 0.35);
    } else c.rotate(tilt);
    if (a.dx < -0.12) c.scale(-1, 1);
    if (im) c.drawImage(im, -w * 0.5, -h, w, h);
    else this.silhouette(c, a, w, h);
    if (a.hitFlash > 0 && !player) {
      c.globalAlpha = alpha * a.hitFlash * 2.5;
      c.strokeStyle = "#f5eed8";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-w * 0.25, -h * 0.2);
      c.lineTo(w * 0.3, -h * 0.8);
      c.stroke();
    }
    c.restore();
  }
  silhouette(c, a, w, h) {
    c.fillStyle = a.isPlayer ? "#e3d9bf" : "#2a3028";
    c.beginPath();
    c.moveTo(-w * 0.22, -h * 0.65);
    c.lineTo(w * 0.2, -h * 0.65);
    c.lineTo(w * 0.4, -h * 0.06);
    c.lineTo(-w * 0.4, -h * 0.06);
    c.closePath();
    c.fill();
    c.fillStyle = "#1e251e";
    c.beginPath();
    c.moveTo(-w * 0.5, -h * 0.7);
    c.lineTo(0, -h);
    c.lineTo(w * 0.5, -h * 0.7);
    c.fill();
    c.fillRect(-w * 0.2, -h * 0.08, 6, h * 0.08);
    c.fillRect(w * 0.1, -h * 0.08, 6, h * 0.08);
  }
  effect(c, f, dt) {
    const t = f.age / f.life;
    if (f.type === "drop") {
      c.globalAlpha = (1 - t) * 0.85;
      c.fillStyle = "#20281e";
      c.beginPath();
      c.ellipse(
        f.x + f.vx * f.age,
        f.y + f.vy * f.age + 40 * f.age * f.age,
        f.size * (1 - t * 0.4),
        f.size * 0.6,
        0,
        0,
        7,
      );
      c.fill();
      c.globalAlpha = 1;
      return;
    }
    if (f.type === "seal") {
      const q = clamp((f.age - 0.08) / 0.2, 0, 1);
      if (f.age > 0.07) {
        for (const l of f.lines) {
          c.save();
          c.globalAlpha = (1 - t) * 0.65;
          this.paintLine(c, l, 1);
          c.restore();
          c.strokeStyle = `rgba(255,251,233,${(1 - t) * 1.4})`;
          c.lineWidth = 3;
          c.lineCap = "round";
          c.beginPath();
          c.moveTo(l.a.x, l.a.y);
          c.lineTo(l.a.x + (l.b.x - l.a.x) * q, l.a.y + (l.b.y - l.a.y) * q);
          c.stroke();
          if (q < 1)
            this.star(
              c,
              l.a.x + (l.b.x - l.a.x) * q,
              l.a.y + (l.b.y - l.a.y) * q,
              13,
              1 - t,
            );
        }
        if (f.cross && f.age < 0.4)
          this.star(c, f.cross.x, f.cross.y, 24 * (1 - t), 1 - t);
      }
    }
    if (f.type === "slash") {
      const a = Math.atan2(f.dy, f.dx),
        r = 64 + Math.sin(t * Math.PI) * 8;
      c.save();
      c.translate(f.x, f.y - 9);
      c.strokeStyle = `rgba(29,38,27,${1 - t})`;
      c.lineWidth = 9 * (1 - t);
      c.beginPath();
      c.arc(0, 0, r, a - 1.3 + t * 0.6, a + 1.3 + t * 0.6);
      c.stroke();
      c.strokeStyle = `rgba(255,250,230,${1 - t})`;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, 0, r + 2, a - 1.15 + t * 0.6, a + 1.1 + t * 0.6);
      c.stroke();
      c.restore();
    }
    if (f.type === "dash") {
      c.save();
      c.globalAlpha = (1 - t) * 0.3;
      c.strokeStyle = "#faf1dc";
      c.lineWidth = 1;
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(f.x - f.dy * i * 11, f.y + f.dx * i * 11);
        c.lineTo(
          f.x + f.dx * 45 - f.dy * i * 11,
          f.y + f.dy * 45 + f.dx * i * 11,
        );
        c.stroke();
      }
      c.restore();
    }
    if (f.type === "enemystrike") {
      const a = Math.atan2(f.dy, f.dx);
      c.strokeStyle = `rgba(145,47,31,${1 - t})`;
      c.lineWidth = f.boss ? 5 : 2;
      c.beginPath();
      c.arc(f.x, f.y, f.boss ? 109 : 54, a - 0.8, a + 0.8);
      c.stroke();
    }
    if (f.type === "cross") this.star(c, f.x, f.y, 15 * (1 - t), 1 - t);
    if (f.type === "stagger") this.star(c, f.x, f.y - 58, 25 * (1 - t), 1 - t);
    if (f.type === "ripple") {
      c.strokeStyle = `rgba(244,233,211,${(1 - t) * 0.6})`;
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(f.x, f.y, 20 + t * 160, 8 + t * 40, 0, 0, 7);
      c.stroke();
    }
  }
  star(c, x, y, r, a) {
    c.save();
    c.globalAlpha = a;
    c.fillStyle = "#fffae6";
    c.beginPath();
    c.moveTo(x - r, y);
    c.lineTo(x - 2, y - 2);
    c.lineTo(x, y - r * 0.7);
    c.lineTo(x + 2, y - 2);
    c.lineTo(x + r, y);
    c.lineTo(x + 2, y + 2);
    c.lineTo(x, y + r * 0.7);
    c.lineTo(x - 2, y + 2);
    c.closePath();
    c.fill();
    c.restore();
  }
  reset() {
    this.fx = [];
    this.shake = 0;
    this.flash = 0;
    this.rainPause = 0;
  }
}
