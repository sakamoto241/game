// Pure simulation. Positions, paint widths and hit detection share logical pixels.
export const W = 432,
  H = 768;
export const ARENA = { left: 25, right: 407, top: 288, bottom: 599 };
export const INK_RADIUS = 20,
  INK_LIFE = 4;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function pointSegment(p, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = clamp(
      ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
      0,
      1,
    );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
export function intersection(a, b) {
  const x = a.b.x - a.a.x,
    y = a.b.y - a.a.y,
    u = b.b.x - b.a.x,
    v = b.b.y - b.a.y,
    d = x * v - y * u;
  if (Math.abs(d) < 0.001) return null;
  const qx = b.a.x - a.a.x,
    qy = b.a.y - a.a.y,
    t = (qx * v - qy * u) / d,
    s = (qx * y - qy * x) / d;
  return t >= 0 && t <= 1 && s >= 0 && s <= 1
    ? { x: a.a.x + t * x, y: a.a.y + t * y }
    : null;
}
export function seeded(seed = 12345) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class Battle {
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.rng = seeded(seed);
    this.reset();
  }
  reset() {
    this.mode = "title";
    this.arena = { ...ARENA };
    this.time = 0;
    this.wave = 0;
    this.kills = 0;
    this.bestSeal = 0;
    this.totalSeal = 0;
    this.nextId = 1;
    this.enemies = [];
    this.lines = [];
    this.events = [];
    this.queue = 0;
    this.spawnTimer = 0;
    this.transition = 0;
    this.hitstop = 0;
    this.input = { x: 0, y: 0 };
    this.player = {
      x: 216,
      y: 547,
      dx: 0,
      dy: -1,
      hp: 5,
      maxHp: 5,
      radius: 12,
      slashCD: 0,
      dashCD: 0,
      sealCD: 0,
      invincible: 0,
      dashTime: 0,
      chainWindow: 0,
      pose: 0,
      action: "idle",
    };
    this.boss = null;
  }
  event(type, data = {}) {
    this.events.push({ type, ...data });
  }
  start() {
    this.reset();
    this.mode = "playing";
    this.beginWave(1);
  }
  beginWave(n) {
    this.wave = n;
    this.queue = n === 1 ? 30 : n === 2 ? 36 : 16;
    this.spawnTimer = 0.2;
    this.event("wave", { wave: n });
    if (n === 3) {
      this.boss = this.makeEnemy("boss", 216, 315);
      this.boss.hp = this.boss.maxHp = 3000;
      this.boss.wait = 2;
      this.enemies.push(this.boss);
    }
  }
  makeEnemy(kind, x, y) {
    return {
      id: this.nextId++,
      kind,
      x,
      y,
      hp: 1,
      radius: kind === "boss" ? 22 : 9,
      dx: 0,
      dy: 1,
      action: "walk",
      timer: 0,
      wait: 1.4 + this.rng() * 1.6,
      phase: 0,
      dead: false,
      fall: 0,
      pose: 0,
      seed: this.rng() * 1000,
      hitFlash: 0,
      combo: 0,
    };
  }
  spawn() {
    const n = this.nextId,
      side = this.wave > 1 ? n % 5 : 0;
    let x = 110 + this.rng() * 210,
      y = 282 - this.rng() * 20;
    if (side === 1) {
      x = 15;
      y = 330 + this.rng() * 80;
    }
    if (side === 2) {
      x = 417;
      y = 330 + this.rng() * 80;
    }
    const e = this.makeEnemy(
      this.wave > 1 && n % 4 === 0 ? "spear" : "soldier",
      x,
      y,
    );
    e.wait += 1;
    this.enemies.push(e);
    this.queue--;
  }
  direction() {
    const { x, y } = this.input,
      l = Math.hypot(x, y);
    return l > 0.08
      ? { x: x / l, y: y / l }
      : { x: this.player.dx, y: this.player.dy };
  }
  slash() {
    if (this.mode !== "playing") return false;
    const p = this.player;
    if (p.slashCD > 0 || p.dashTime > 0) return false;
    const d = this.direction();
    p.dx = d.x;
    p.dy = d.y;
    p.slashCD = 0.36;
    p.pose = 0.32;
    p.action = "slash";
    let count = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x,
        dy = e.y - p.y,
        l = Math.hypot(dx, dy);
      if (
        l < 76 + e.radius &&
        (l < 25 || (dx * d.x + dy * d.y) / (l || 1) > -0.12)
      ) {
        this.damageEnemy(
          e,
          e.kind === "boss" ? (e.action === "recover" ? 18 : 5) : 1,
          "slash",
        );
        count++;
      }
    }
    this.event("slash", { x: p.x, y: p.y, dx: d.x, dy: d.y, count });
    if (count) this.hitstop = count >= 3 ? 0.055 : 0.035;
    return true;
  }
  dash() {
    if (this.mode !== "playing") return false;
    const p = this.player;
    if (p.dashCD > 0 || p.dashTime > 0) return false;
    const d = this.direction();
    p.dx = d.x;
    p.dy = d.y;
    p.dashTime = 0.19;
    p.dashCD = p.chainWindow > 0 ? 1.55 : 0.57;
    p.chainWindow = p.chainWindow > 0 ? 0 : 1.5;
    p.invincible = Math.max(p.invincible, 0.25);
    p.pose = 0.28;
    p.action = "dash";
    const l = {
      id: this.nextId++,
      a: { x: p.x, y: p.y },
      b: { x: p.x, y: p.y },
      life: INK_LIFE,
      age: 0,
      seed: this.rng() * 10000,
    };
    this.lines.push(l);
    if (this.lines.length > 2) this.lines.shift();
    p.activeLine = l;
    this.event("dash", { x: p.x, y: p.y, dx: d.x, dy: d.y });
    return true;
  }
  seal() {
    if (
      this.mode !== "playing" ||
      !this.lines.length ||
      this.player.sealCD > 0 ||
      this.player.dashTime > 0
    )
      return false;
    const p = this.player,
      lines = this.lines.map((l) => ({ ...l, a: { ...l.a }, b: { ...l.b } }));
    const targets = this.enemies
      .filter((e) => !e.dead)
      .map((e) => ({
        e,
        hits: lines.filter(
          (l) => pointSegment(e, l.a, l.b) <= INK_RADIUS + e.radius,
        ).length,
      }))
      .filter((t) => t.hits > 0)
      .sort((a, b) => b.e.y - a.e.y);
    let count = 0;
    // All targets and damage are resolved NOW. Only the visual fall is delayed.
    for (let i = 0; i < targets.length; i++) {
      const { e, hits } = targets[i];
      if (e.kind === "boss") {
        this.damageEnemy(e, hits === 2 ? 240 : 80, "seal", i * 0.025);
        if (!e.dead) {
          e.action = "recover";
          e.timer = 1.7;
          e.combo = 0;
          this.event("stagger", { x: e.x, y: e.y, double: hits === 2 });
        }
      } else {
        this.damageEnemy(e, 1, "seal", 0.14 + i * 0.025);
        count++;
      }
    }
    this.lines = [];
    p.activeLine = null;
    p.pose = 0.5;
    p.action = "seal";
    p.sealCD = 2.2;
    p.invincible = Math.max(p.invincible, 0.17);
    this.bestSeal = Math.max(this.bestSeal, count);
    this.totalSeal += count;
    this.hitstop = targets.length ? (count >= 5 ? 0.095 : 0.065) : 0.025;
    this.event("seal", {
      lines,
      count,
      targets: targets.map((t) => ({
        x: t.e.x,
        y: t.e.y,
        boss: t.e.kind === "boss",
      })),
      cross: lines.length === 2 ? intersection(lines[0], lines[1]) : null,
    });
    return true;
  }
  damageEnemy(e, amount, cause, delay = 0) {
    if (e.dead) return;
    e.hp -= amount;
    e.hitFlash = 0.18;
    if (e.hp <= 0) {
      e.dead = true;
      e.fall = delay;
      e.deathAge = 0;
      e.cause = cause;
      const n = this.directionTo(this.player, e);
      e.deathDx = n.x;
      e.deathDy = n.y;
      this.kills++;
      this.event("kill", {
        x: e.x,
        y: e.y,
        delay,
        cause,
        boss: e.kind === "boss",
      });
    } else if (e.kind !== "boss") {
      e.action = "recover";
      e.timer = 0.3;
    }
  }
  hurt(amount = 1) {
    const p = this.player;
    if (p.invincible > 0 || this.mode !== "playing") return false;
    p.hp = Math.max(0, p.hp - amount);
    p.invincible = 1.1;
    this.event("hurt", { hp: p.hp });
    this.hitstop = 0.07;
    if (p.hp <= 0) {
      this.mode = "defeat";
      this.event("defeat");
    }
    return true;
  }
  keepIn(e) {
    const a = this.arena;
    e.x = clamp(e.x, a.left, a.right);
    e.y = clamp(e.y, a.top, a.bottom);
  }
  update(dt, input = { x: 0, y: 0 }) {
    dt = Math.min(dt, 0.04);
    if (this.mode === "victory" || this.mode === "defeat") {
      for (const e of this.enemies)
        if (e.dead) {
          e.fall -= dt;
          if (e.fall <= 0) e.deathAge += dt;
        }
      return;
    }
    if (
      this.mode === "bossintro" ||
      this.mode === "title" ||
      this.mode === "paused"
    )
      return;
    this.input = { x: input.x || 0, y: input.y || 0 };
    if (this.mode === "interlude") {
      for (const e of this.enemies)
        if (e.dead) {
          e.fall -= dt;
          if (e.fall <= 0) e.deathAge += dt;
        }
      this.enemies = this.enemies.filter((e) => !e.dead || e.deathAge < 0.75);
      this.transition -= dt;
      if (this.transition <= 0) {
        if (this.wave === 2) {
          this.mode = "bossintro";
          this.event("bossintro");
        } else {
          this.mode = "playing";
          this.beginWave(this.wave + 1);
        }
      }
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }
    this.time += dt;
    const p = this.player;
    for (const k of [
      "slashCD",
      "dashCD",
      "sealCD",
      "invincible",
      "pose",
      "chainWindow",
    ])
      p[k] = Math.max(0, p[k] - dt);
    if (p.pose === 0) p.action = "idle";
    for (const l of this.lines) {
      l.life -= dt;
      l.age += dt;
    }
    this.lines = this.lines.filter((l) => l.life > 0);
    if (p.dashTime > 0) {
      const dashStep = Math.min(dt, p.dashTime);
      p.dashTime = Math.max(0, p.dashTime - dt);
      p.x += p.dx * 1080 * dashStep;
      p.y += p.dy * 1080 * dashStep;
      this.keepIn(p);
      if (p.activeLine) {
        p.activeLine.b = { x: p.x, y: p.y };
        if (!p.activeLine.crossed) {
          const other = this.lines.find((l) => l.id !== p.activeLine.id);
          const cross = other ? intersection(p.activeLine, other) : null;
          if (cross) {
            p.activeLine.crossed = true;
            this.event("cross", cross);
          }
        }
      }
      if (p.dashTime === 0 && p.activeLine) {
        p.activeLine.life = INK_LIFE;
        p.activeLine = null;
      }
    } else {
      let { x, y } = this.input;
      const n = Math.hypot(x, y);
      if (n > 0.07) {
        x /= Math.max(1, n);
        y /= Math.max(1, n);
        p.dx = x / (Math.hypot(x, y) || 1);
        p.dy = y / (Math.hypot(x, y) || 1);
        p.x += x * 139 * dt;
        p.y += y * 139 * dt;
        this.keepIn(p);
      }
    }
    if (
      this.queue > 0 &&
      this.enemies.filter((e) => !e.dead && e.kind !== "boss").length < 19
    ) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const room =
          19 - this.enemies.filter((e) => !e.dead && e.kind !== "boss").length;
        const count = Math.min(this.queue, room, this.wave === 1 ? 18 : 16);
        for (let i = 0; i < count; i++) this.spawn();
        this.spawnTimer = 6.2;
      } else if (
        this.enemies.filter((e) => !e.dead && e.kind !== "boss").length < 4
      )
        this.spawnTimer = Math.min(this.spawnTimer, 0.8);
    }
    for (const e of this.enemies) {
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.dead) {
        e.fall -= dt;
        if (e.fall <= 0) e.deathAge += dt;
        continue;
      }
      e.pose += dt;
      this.updateEnemy(e, dt);
    }
    if (p.dashTime <= 0) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = p.x - e.x,
          dy = p.y - e.y,
          d = Math.hypot(dx, dy),
          r = e.kind === "boss" ? 42 : 21;
        if (d < r && d > 0.001) {
          p.x += (dx / d) * (r - d) * Math.min(1, dt * 16);
          p.y += (dy / d) * (r - d) * Math.min(1, dt * 16);
        }
      }
      this.keepIn(p);
    }
    // Gentle separation preserves dense groups without stacking identical sprites.
    const alive = this.enemies.filter((e) => !e.dead && e.kind !== "boss");
    for (let i = 0; i < alive.length; i++)
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i],
          b = alive[j],
          dx = a.x - b.x,
          dy = a.y - b.y,
          l = Math.hypot(dx, dy);
        if (l > 0 && l < 24) {
          const m = ((24 - l) * 4 * dt) / l;
          a.x += dx * m;
          a.y += dy * m;
          b.x -= dx * m;
          b.y -= dy * m;
        }
      }
    this.enemies = this.enemies.filter((e) => !e.dead || e.deathAge < 0.75);
    if (
      this.mode === "playing" &&
      this.queue === 0 &&
      !this.enemies.some((e) => !e.dead)
    ) {
      if (this.wave === 3) {
        this.mode = "victory";
        this.event("victory");
      } else {
        this.mode = "interlude";
        this.transition = 2;
        this.lines = [];
        p.activeLine = null;
        p.hp = Math.min(p.maxHp, p.hp + 1);
        this.event("clearwave", { wave: this.wave });
      }
    }
  }
  enterBoss() {
    if (this.mode !== "bossintro") return;
    this.mode = "playing";
    this.lines = [];
    this.player.x = 216;
    this.player.y = 548;
    this.player.invincible = 1;
    this.beginWave(3);
  }
  updateEnemy(e, dt) {
    const p = this.player,
      dx = p.x - e.x,
      dy = p.y - e.y,
      l = Math.hypot(dx, dy) || 1;
    const boss = e.kind === "boss",
      reach = boss ? 114 : e.kind === "spear" ? 92 : 49;
    e.wait -= dt;
    if (e.action === "recover") {
      e.timer -= dt;
      if (e.timer <= 0) {
        e.action = "walk";
        e.wait = boss ? 1.4 : 1.2 + this.rng();
      }
      return;
    }
    if (e.action === "windup") {
      e.timer -= dt;
      if (e.timer <= 0) {
        if (boss && e.phase) this.event("bell", { second: true });
        e.action = "strike";
        e.timer = boss ? 0.28 : 0.16;
        this.event("enemystrike", {
          x: e.x,
          y: e.y,
          dx: e.dx,
          dy: e.dy,
          boss,
          spear: e.kind === "spear",
        });
      }
      return;
    }
    if (e.action === "strike") {
      const speed = boss
        ? e.phase
          ? 500
          : 440
        : e.kind === "spear"
          ? 200
          : 135;
      e.x += e.dx * speed * dt;
      e.y += e.dy * speed * dt;
      this.keepIn(e);
      const hitD = distance(e, p),
        dot = ((p.x - e.x) * e.dx + (p.y - e.y) * e.dy) / (hitD || 1);
      if (hitD < (boss ? 58 : e.kind === "spear" ? 51 : 35) && dot > -0.4)
        this.hurt(boss ? 2 : 1);
      e.timer -= dt;
      if (e.timer <= 0) {
        e.combo = 0;
        e.action = "recover";
        e.timer = boss ? 2.3 : 0.9;
      }
      return;
    }
    if (boss && e.phase === 0 && e.hp <= e.maxHp / 2) {
      e.phase = 1;
      this.event("bossphase");
    }
    if (l > reach * 0.72) {
      const s = boss ? 39 : e.kind === "spear" ? 43 : 51;
      e.dx = dx / l;
      e.dy = dy / l;
      e.x += (dx / l) * s * dt;
      e.y += (dy / l) * s * dt;
      this.keepIn(e);
    }
    if (l < reach + 15 && e.wait <= 0) {
      const attacks = this.enemies.filter(
        (a) => !a.dead && (a.action === "windup" || a.action === "strike"),
      ).length;
      if (attacks < (boss ? 3 : 2)) {
        const d = this.directionTo(e, p);
        e.dx = d.x;
        e.dy = d.y;
        e.action = "windup";
        e.timer = boss
          ? e.phase
            ? 1.35
            : 1.1
          : e.kind === "spear"
            ? 1.0
            : 0.85;
        e.windup = e.timer;
        if (boss) this.event("bell", { second: false });
      }
    }
  }
  directionTo(a, b) {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      n = Math.hypot(dx, dy) || 1;
    return { x: dx / n, y: dy / n };
  }
}
