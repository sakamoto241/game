import { W, H, INK_RADIUS, seeded, clamp } from "./core.js?v=4";
export const ASSETS = {
  background: "assets/temple-portrait.webp",
  original: "assets/temple.jpg",
  ronin: "assets/ronin.webp",
  backIdle: "assets/back-idle.webp",
  backStep0: "assets/back-step-0.webp",
  backStep1: "assets/back-step-1.webp",
  backCut: "assets/back-cut.webp",
  run: "assets/ronin-run.webp",
  walk0: "assets/ronin-walk-0.webp",
  walk1: "assets/ronin-walk-1.webp",
  walk2: "assets/ronin-walk-2.webp",
  walk3: "assets/ronin-walk-3.webp",
  cut: "assets/ronin-cut.webp",
  follow: "assets/ronin-follow.webp",
  sheath: "assets/ronin-sheath.webp",
  soldier: "assets/soldier.webp",
  spear: "assets/spearman.webp",
  boss: "assets/bellkeeper.webp",
};
// Dry-brush contour stays inside the same round segment used for damage.
export function inkOutline(line) {
  const { a, b } = line,
    r = INK_RADIUS,
    angle = Math.atan2(b.y - a.y, b.x - a.x),
    rng = seeded(line.seed || 42),
    out = [];
  const add = (x, y, t) => {
    const radius = r * (0.91 + rng() * 0.09);
    out.push({ x: x + Math.cos(t) * radius, y: y + Math.sin(t) * radius });
  };
  for (let i = 0; i <= 16; i++)
    add(b.x, b.y, angle - Math.PI / 2 + (i * Math.PI) / 16);
  for (let i = 1; i < 12; i++) {
    const q = i / 12;
    add(b.x + (a.x - b.x) * q, b.y + (a.y - b.y) * q, angle + Math.PI / 2);
  }
  for (let i = 0; i <= 16; i++)
    add(a.x, a.y, angle + Math.PI / 2 + (i * Math.PI) / 16);
  for (let i = 1; i < 12; i++) {
    const q = i / 12;
    add(a.x + (b.x - a.x) * q, a.y + (b.y - a.y) * q, angle - Math.PI / 2);
  }
  return out;
}
export function poseFor(actor, moving = false) {
  if (actor.action === "dash") return "run";
  if (actor.action === "slash")
    return actor.pose > 0.335 ? "ronin" : actor.pose > 0.17 ? "cut" : "follow";
  if (actor.action === "seal") return "sheath";
  return moving ? "run" : "ronin";
}
export function directionPose(actor, moving = false, stride = 0) {
  const base = poseFor(actor, moving);
  if (actor.dy < -0.35) {
    if (actor.action === "slash")
      return actor.pose > 0.335 ? "backIdle" : "backCut";
    if (actor.action === "dash") return "backStep0";
    if (moving) return "backStep" + (Math.floor(stride / 24) % 2);
    return "backIdle";
  }
  return moving ? "walk" + (Math.floor(stride / 16) % 4) : base;
}
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
    this.echoes = [];
    this.echoTimer = 0;
    this.impact = 0;
    this.finish = null;
    this.walkDistance = 0;
    this.lastFoot = null;
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
      this.fx.push({ ...e, age: 0, life: 0.94 });
      this.rainPause = 0.23;
      this.shake = e.count > 3 ? 4 : 1.5;
      if (e.targets.length) {
        this.finish = {
          age: 0,
          x: clamp(
            e.targets.reduce((n, t) => n + t.x, 0) / e.targets.length,
            150,
            282,
          ),
          y: clamp(
            e.targets.reduce((n, t) => n + t.y, 0) / e.targets.length,
            350,
            525,
          ),
        };
        this.impact = Math.max(this.impact, 0.3);
      }
      for (const t of e.targets) this.splatter(t.x, t.y, t.boss ? 16 : 6, 0.12);
    }
    if (e.type === "slash") {
      this.fx.push({ ...e, age: 0, life: 0.34 });
      for (const t of e.targets || [])
        this.fx.push({
          type: "contact",
          x: t.x,
          y: t.y,
          dx: e.dx,
          dy: e.dy,
          age: 0,
          life: 0.2,
        });
      if (e.count) {
        this.shake = 1.8;
        this.impact = Math.max(this.impact, 0.12);
      }
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
      this.splatter(e.x, e.y, e.boss ? 30 : 10, e.delay);
      this.fx.push({ type: "wake", x: e.x, y: e.y, age: -e.delay, life: 0.55 });
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
    if (this.finish) {
      this.finish.age += dt;
      if (this.finish.age > 0.9) this.finish = null;
    }
    const p = game.player;
    if (dt > 0) {
      const moving =
        game.mode === "playing" &&
        p.action === "idle" &&
        Math.hypot(game.input.x, game.input.y) > 0.1;
      const moved = this.lastFoot
        ? Math.hypot(p.x - this.lastFoot.x, p.y - this.lastFoot.y)
        : 0;
      if (moving && moved < 12) {
        const old = Math.floor(this.walkDistance / 32);
        this.walkDistance += moved;
        if (Math.floor(this.walkDistance / 32) !== old)
          this.fx.push({ type: "step", x: p.x, y: p.y, age: 0, life: 0.34 });
      }
      this.lastFoot = { x: p.x, y: p.y };
    }
    this.impact = Math.max(0, this.impact - dt * 2.1);
    this.echoTimer -= dt;
    if (
      dt > 0 &&
      game.player.dashTime > 0 &&
      this.echoTimer <= 0 &&
      !this.reduced
    ) {
      this.echoes.push({
        x: game.player.x,
        y: game.player.y,
        dx: game.player.dx,
        dy: game.player.dy,
        age: 0,
      });
      this.echoTimer = 0.035;
    }
    for (const e of this.echoes) e.age += dt;
    this.echoes = this.echoes.filter((e) => e.age < 0.23).slice(-7);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flash = Math.max(0, this.flash - dt);
    this.rainPause = Math.max(0, this.rainPause - dt);
    const c = this.ctx;
    c.save();
    c.clearRect(0, 0, W, H);
    if (!this.reduced) {
      const f = this.finish,
        t = f?.age || 0;
      const beat = !f
        ? 0
        : t < 0.12
          ? (t / 0.12) * 0.008
          : t < 0.24
            ? 0.008 + ((t - 0.12) / 0.12) * 0.045
            : 0.053 * Math.pow(Math.max(0, 1 - (t - 0.24) / 0.66), 1.6);
      const zoom = 1 + Math.sin((this.impact * Math.PI) / 2) * 0.02 + beat,
        fx = f?.x || W / 2,
        fy = f?.y || 425;
      c.translate(fx, fy);
      c.scale(zoom, zoom);
      c.translate(-fx, -fy);
      c.translate(
        Math.sin(this.clock * 93) * this.shake,
        Math.cos(this.clock * 87) * this.shake * 0.5,
      );
    }
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
    // Layer order: wet floor, paint, telegraphs, feet shadows, actors, cuts, weather.
    const fog = c.createLinearGradient(0, 160, 0, 340);
    fog.addColorStop(0, "#ede1cd00");
    fog.addColorStop(0.6, "#e8ddc32b");
    fog.addColorStop(1, "#e8ddc300");
    c.fillStyle = fog;
    c.fillRect(0, 160, W, 180);
    // Low drifting cloud at the distant edge. Keep the fighting floor clear.
    c.save();
    c.globalAlpha = 0.05;
    c.fillStyle = "#f4ead6";
    const drift = Math.sin(this.clock * 0.19) * 22;
    c.beginPath();
    c.moveTo(-20, 274);
    c.bezierCurveTo(80 + drift, 253, 180, 298, 290 + drift, 268);
    c.bezierCurveTo(350, 254, 420, 258, 460, 268);
    c.lineTo(460, 288);
    c.bezierCurveTo(300, 274, 160, 312, -20, 290);
    c.closePath();
    c.fill();
    c.restore();
    for (const l of game.lines) this.paintLine(c, l, clamp(l.life / 0.8, 0, 1));
    for (const e of game.enemies) if (!e.dead) this.telegraph(c, e);
    for (const e of this.echoes) {
      const im = e.dy < -0.35 ? this.images.backStep0 : this.images.run;
      if (!im) continue;
      c.save();
      c.globalAlpha = (1 - e.age / 0.23) * 0.16;
      c.translate(e.x, e.y);
      if (e.dx < -0.12) c.scale(-1, 1);
      const h = e.dy < -0.35 ? 80 : 77,
        w = (h * im.width) / im.height;
      c.drawImage(im, -w * 0.54, -h, w, h);
      c.restore();
    }
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
    const outline = inkOutline(l);
    c.fillStyle = "#24231fef";
    c.beginPath();
    outline.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
    c.fill();
    if (len < 1) {
      c.restore();
      return;
    }
    c.lineCap = "butt";
    const rand = seeded(l.seed || 42),
      dx = (b.x - a.x) / len,
      dy = (b.y - a.y) / len;
    for (let i = 0; i < 30; i++) {
      const t = rand(),
        off = (rand() - 0.5) * (INK_RADIUS * 2 + 5),
        x = a.x + (b.x - a.x) * t - dy * off,
        y = a.y + (b.y - a.y) * t + dx * off;
      c.strokeStyle = i % 4 === 0 ? "#e7d9bd6b" : "#1e1d19";
      c.lineWidth = 0.4 + rand() * 1.5;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + dx * (8 + rand() * 24), y + dy * (8 + rand() * 24));
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
    const fall = dead ? clamp(a.deathAge / 0.5, 0, 1) : 0;
    const alpha = dead ? 1 - clamp((a.deathAge - 0.18) / 0.55, 0, 1) : 1;
    if (alpha <= 0) return;
    const moving = player
      ? Math.hypot(game.input.x, game.input.y) > 0.1 && a.action === "idle"
      : a.action === "walk";
    const key = player ? directionPose(a, moving, this.walkDistance) : a.kind;
    const im = this.images[key] || this.images[a.kind];
    const h = boss
      ? 126
      : player
        ? {
            backIdle: 85,
            backStep0: 80,
            backStep1: 80,
            backCut: 74,
            run: 76,
            walk0: 76,
            walk1: 76,
            walk2: 76,
            walk3: 76,
            cut: 71,
            follow: 77,
            sheath: 86,
          }[key] || 83
        : a.kind === "spear"
          ? 76
          : 60;
    const w = im ? (h * im.width) / im.height : h * 0.78;
    const gait = moving
      ? Math.sin(this.clock * (boss ? 7 : 13) + (a.seed || 0))
      : 0;
    let ox = 0,
      oy = 0,
      tilt = 0;
    if (player && a.action === "slash") {
      const t = clamp(1 - a.pose / 0.39, 0, 1),
        weight = Math.sin(t * Math.PI);
      ox = a.dx * weight * 10;
      oy = a.dy * weight * 7;
      tilt = a.dx * weight * 0.05;
    }
    if (player && a.action === "dash") {
      ox = a.dx * 7;
      oy = a.dy * 6;
      tilt = a.dx * 0.1;
    }
    if (!player && a.action === "windup") {
      const t = 1 - a.timer / a.windup;
      ox = -a.dx * 6 * t;
      oy = -2 - t * 4;
      tilt = -a.dx * (boss ? 0.19 : 0.08) * t;
    }
    if (a.action === "strike") {
      ox = a.dx * (boss ? 13 : 7);
      oy = a.dy * 8;
      tilt = a.dx * (boss ? 0.25 : 0.15);
    }
    if (a.action === "recover" && a.hitFlash > 0) tilt = -a.dx * 0.19;
    c.save();
    c.globalAlpha = alpha;
    if (!dead && im) {
      c.save();
      c.globalAlpha = alpha * 0.1;
      c.translate(a.x, a.y + 3);
      c.scale(1, -0.12);
      c.drawImage(im, -w * 0.54, -h, w, h);
      c.restore();
    }
    // Small broken contact mark, instead of an opaque oval under every actor.
    c.fillStyle = "#1f291d30";
    c.beginPath();
    c.ellipse(a.x, a.y + 2, boss ? 29 : player ? 17 : 11, 3.5, 0, 0, 7);
    c.fill();
    if (player) {
      c.strokeStyle = "#f7ecd1a0";
      c.lineWidth = 0.8;
      c.beginPath();
      c.ellipse(a.x, a.y + 1, 13, 3.5, 0, 0.3, 2.8);
      c.stroke();
    }
    if (
      player &&
      a.invincible > 0 &&
      a.dashTime <= 0 &&
      a.action !== "seal" &&
      Math.sin(this.clock * 35) > 0
    )
      c.globalAlpha *= 0.65;
    c.translate(
      a.x + ox + (a.deathDx || 0) * fall * 24,
      a.y + oy + Math.abs(gait) * -2.1 + (a.deathDy || 0) * fall * 20,
    );
    if (dead) {
      c.rotate((a.deathDx || 1) * fall * 0.5);
      c.scale(1 + fall * 0.12, 1 - fall * 0.68);
    } else {
      c.rotate(tilt);
      if (moving) c.scale(1 + gait * 0.015, 1 - Math.abs(gait) * 0.025);
    }
    if (a.dx < -0.12) c.scale(-1, 1);
    if (im) c.drawImage(im, -w * 0.54, -h, w, h);
    else this.silhouette(c, a, w, h);
    if (a.hitFlash > 0 && !player) {
      c.globalAlpha = alpha * a.hitFlash * 3;
      c.strokeStyle = "#fff5dc";
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(-w * 0.3, -h * 0.2);
      c.lineTo(w * 0.26, -h * 0.8);
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
  ribbon(c, x, y, a, r, alpha, red = false) {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.globalAlpha = alpha;
    c.fillStyle = red ? "#983d2e" : "#262522";
    c.beginPath();
    for (let i = 0; i <= 24; i++) {
      const q = i / 24,
        theta = -1.45 + q * 2.9,
        rr = r + ((i % 3) - 1) * 1.1;
      const x = Math.cos(theta) * rr,
        y = Math.sin(theta) * rr;
      if (!i) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    for (let i = 24; i >= 0; i--) {
      const q = i / 24,
        theta = -1.45 + q * 2.9,
        rr = r - 2 - Math.sin(q * Math.PI) * 11;
      c.lineTo(Math.cos(theta) * rr, Math.sin(theta) * rr);
    }
    c.closePath();
    c.fill();
    c.strokeStyle = red ? "#d8b5a1" : "#fff8e5";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, r - 2, -1.3, 1.25);
    c.stroke();
    c.strokeStyle = red ? "#90392a88" : "#323a2999";
    c.lineWidth = 0.65;
    c.beginPath();
    c.arc(0, 0, r + 6, -1.05, 1.0);
    c.stroke();
    c.restore();
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
    if (f.type === "step") {
      c.save();
      c.globalAlpha = (1 - t) * 0.35;
      c.strokeStyle = "#f4ead6";
      c.lineWidth = 0.6;
      c.beginPath();
      c.ellipse(f.x, f.y, 4 + t * 10, 1 + t * 3, 0, 0.1, 5.8);
      c.stroke();
      c.restore();
    }
    if (f.type === "contact") {
      const a = Math.atan2(f.dy, f.dx) + 0.8,
        reach = 22 * (1 - t);
      c.save();
      c.globalAlpha = 1 - t;
      c.strokeStyle = "#fff8e5";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(f.x - Math.cos(a) * reach, f.y - Math.sin(a) * reach - 12);
      c.lineTo(f.x + Math.cos(a) * reach, f.y + Math.sin(a) * reach - 12);
      c.stroke();
      c.restore();
    }
    if (f.type === "wake") {
      c.save();
      c.globalAlpha = (1 - t) * 0.65;
      c.strokeStyle = "#f5e8cc";
      c.lineWidth = 0.7;
      for (let i = 0; i < 2; i++) {
        c.beginPath();
        c.ellipse(
          f.x,
          f.y,
          7 + t * 26 + i * 4,
          2 + t * 7 + i * 1.4,
          0,
          0.2,
          5.5,
        );
        c.stroke();
      }
      c.restore();
    }
    if (f.type === "seal") {
      const q = 1 - Math.pow(1 - clamp((f.age - 0.1) / 0.22, 0, 1), 3);
      if (f.age > 0.09) {
        for (const l of f.lines) {
          this.paintLine(c, l, Math.max(0, 1 - t) * 0.55);
          const x = l.a.x + (l.b.x - l.a.x) * q,
            y = l.a.y + (l.b.y - l.a.y) * q;
          c.save();
          c.globalAlpha = Math.max(0, 1 - t * 1.1);
          c.lineCap = "butt";
          c.strokeStyle = "#fbf3dd88";
          c.lineWidth = 11;
          c.beginPath();
          c.moveTo(l.a.x, l.a.y);
          c.lineTo(x, y);
          c.stroke();
          c.strokeStyle = "#fffbea";
          c.lineWidth = 2.4;
          c.stroke();
          c.strokeStyle = "#141e12aa";
          c.lineWidth = 0.7;
          c.beginPath();
          c.moveTo(l.a.x + 3, l.a.y + 3);
          c.lineTo(x + 3, y + 3);
          c.stroke();
          c.restore();
          if (q < 1) this.star(c, x, y, 19, 1 - t);
        }
        if (f.cross && f.age < 0.45)
          this.star(c, f.cross.x, f.cross.y, 34 * (1 - t), 1 - t);
        // The sweep is confined to the confirmed paint. No full-screen damage flash.
      }
    }
    if (f.type === "slash") {
      const angle = Math.atan2(f.dy, f.dx),
        q = 1 - Math.pow(1 - t, 2);
      this.ribbon(
        c,
        f.x,
        f.y - 7,
        angle - 0.25 + q * 0.65,
        68 + q * 8,
        Math.pow(1 - t, 0.7),
      );
      if (f.count && t < 0.45)
        this.star(
          c,
          f.x + f.dx * 56,
          f.y + f.dy * 56,
          10 * (1 - t),
          0.8 * (1 - t),
        );
    }
    if (f.type === "dash") {
      c.save();
      c.globalAlpha = (1 - t) * 0.6;
      c.strokeStyle = "#f7edd4";
      c.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        const off = i * 8;
        c.beginPath();
        c.moveTo(f.x - f.dy * off, f.y + f.dx * off);
        c.lineTo(
          f.x - f.dx * (30 + t * 45) - f.dy * off,
          f.y - f.dy * (30 + t * 45) + f.dx * off,
        );
        c.stroke();
      }
      c.restore();
    }
    if (f.type === "enemystrike") {
      const angle = Math.atan2(f.dy, f.dx);
      this.ribbon(
        c,
        f.x,
        f.y,
        angle - 0.4 + t * 0.8,
        f.boss ? 112 : 53,
        1 - t,
        true,
      );
    }
    if (f.type === "cross") this.star(c, f.x, f.y, 20 * (1 - t), 1 - t);
    if (f.type === "stagger") this.star(c, f.x, f.y - 65, 30 * (1 - t), 1 - t);
    if (f.type === "ripple") {
      c.strokeStyle = `rgba(244,233,211,${(1 - t) * 0.6})`;
      c.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        c.beginPath();
        c.ellipse(f.x, f.y, 20 + t * 170 + i * 12, 8 + t * 45 + i * 3, 0, 0, 7);
        c.stroke();
      }
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
    this.echoes = [];
    this.echoTimer = 0;
    this.impact = 0;
    this.finish = null;
    this.walkDistance = 0;
    this.lastFoot = null;
  }
}
