import test from "node:test";
import assert from "node:assert/strict";
import {
  Battle,
  pointSegment,
  intersection,
  INK_LIFE,
  INK_RADIUS,
  ARENA,
} from "../core.js";
const advance = (g, t, input = { x: 0, y: 0 }) => {
  for (let s = 0; s < t; s += 1 / 120) g.update(1 / 120, input);
};
function field() {
  const g = new Battle(42);
  g.start();
  g.queue = 0;
  g.enemies = [];
  g.events = [];
  return g;
}
function enemy(g, x, y, kind = "soldier") {
  const e = g.makeEnemy(kind, x, y);
  g.enemies.push(e);
  return e;
}
const line = (a, b) => ({ a, b, life: 4, age: 0, seed: 99 });
test("segment distance includes rounded ends and intersection is exact", () => {
  assert.equal(
    pointSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    4,
  );
  assert.equal(
    pointSegment({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    5,
  );
  assert.deepEqual(
    intersection(
      line({ x: 0, y: 0 }, { x: 10, y: 10 }),
      line({ x: 10, y: 0 }, { x: 0, y: 10 }),
    ),
    { x: 5, y: 5 },
  );
});
test("normal directional slash kills several enemies, but not enemies behind or outside arc", () => {
  const g = field();
  const p = g.player;
  p.dx = 0;
  p.dy = -1;
  [
    [-20, -40],
    [0, -45],
    [30, -40],
    [0, 60],
    [90, -30],
  ].forEach(([x, y]) => enemy(g, p.x + x, p.y + y));
  g.slash();
  assert.equal(g.kills, 3);
  assert.equal(g.enemies.filter((e) => !e.dead).length, 2);
  assert.equal(g.slash(), false);
});
test("seal snapshots 12 overlapping targets; double intersection never duplicates kills", () => {
  const g = field();
  g.lines = [
    line({ x: 80, y: 420 }, { x: 350, y: 420 }),
    line({ x: 215, y: 310 }, { x: 215, y: 550 }),
  ];
  for (let i = 0; i < 12; i++) enemy(g, 200 + i * 2, 420);
  assert.equal(g.seal(), true);
  assert.equal(g.kills, 12);
  assert.equal(g.bestSeal, 12);
  assert.equal(g.events.find((e) => e.type === "seal").count, 12);
  assert.equal(g.lines.length, 0);
  assert.ok(g.enemies.every((e) => e.dead));
  assert.ok(g.enemies[11].fall > g.enemies[0].fall);
});
test("paint hit width matches visible radius; empty seal consumes paint without imaginary score", () => {
  const g = field();
  g.lines = [line({ x: 90, y: 400 }, { x: 330, y: 400 })];
  enemy(g, 200, 400 + INK_RADIUS + 9 + 0.01);
  assert.equal(g.seal(), true);
  assert.equal(g.kills, 0);
  assert.equal(g.bestSeal, 0);
  assert.equal(g.lines.length, 0);
  assert.equal(g.seal(), false);
});
test("moving a doomed enemy after input cannot reverse the confirmed hit", () => {
  const g = field();
  const e = enemy(g, 200, 400);
  g.lines = [line({ x: 80, y: 400 }, { x: 330, y: 400 })];
  g.seal();
  e.x = 400;
  e.y = 580;
  assert.ok(e.dead);
  assert.equal(g.kills, 1);
});
test("dash records actual path and clamps to stage; third line replaces oldest", () => {
  const g = field();
  enemy(g, 400, 300);
  g.player.x = 100;
  g.player.y = 440;
  g.input = { x: 1, y: 0 };
  g.dash();
  advance(g, 0.23);
  assert.ok(g.player.x > 260);
  assert.equal(g.lines[0].b.x, g.player.x);
  const first = g.lines[0].id;
  advance(g, 0.6);
  g.input = { x: -1, y: 0 };
  g.dash();
  advance(g, 1.7);
  g.input = { x: 0, y: 1 };
  g.dash();
  advance(g, 0.22);
  assert.equal(g.lines.length, 2);
  assert.ok(!g.lines.some((l) => l.id === first));
  assert.ok(g.player.y <= ARENA.bottom);
});
test("rain expires ink after four seconds; title and pause do not expire it", () => {
  const g = field();
  enemy(g, 400, 300);
  g.lines = [line({ x: 100, y: 400 }, { x: 300, y: 400 })];
  g.mode = "paused";
  advance(g, 5);
  assert.equal(g.lines.length, 1);
  g.mode = "playing";
  advance(g, INK_LIFE + 0.1);
  assert.equal(g.lines.length, 0);
});
test("boss takes higher double-line damage and windup is interrupted instantly", () => {
  const g = field();
  const b = enemy(g, 220, 400, "boss");
  b.hp = b.maxHp = 610;
  b.action = "windup";
  b.timer = 0.1;
  b.windup = 1;
  g.boss = b;
  g.lines = [
    line({ x: 80, y: 400 }, { x: 360, y: 400 }),
    line({ x: 220, y: 300 }, { x: 220, y: 580 }),
  ];
  g.seal();
  assert.equal(b.hp, 370);
  assert.equal(b.action, "recover");
  assert.ok(b.timer > 1);
  assert.equal(g.kills, 0);
  assert.ok(g.events.some((e) => e.type === "stagger" && e.double));
});
test("boss half health uses first tell, second tell, then recovery; aim remains fixed", () => {
  const g = field();
  g.wave = 3;
  g.player.x = 216;
  g.player.y = 500;
  const b = enemy(g, 216, 415, "boss");
  g.boss = b;
  b.hp = 300;
  b.maxHp = 610;
  b.wait = 0;
  g.update(0.01);
  assert.equal(b.phase, 1);
  assert.equal(b.action, "windup");
  const dir = { dx: b.dx, dy: b.dy };
  g.player.x = 400;
  advance(g, 0.4);
  assert.equal(b.dx, dir.dx);
  assert.equal(b.dy, dir.dy);
  advance(g, 0.97);
  assert.equal(b.action, "strike");
  assert.ok(g.events.some((e) => e.type === "bell" && e.second));
  advance(g, 1.5);
  assert.equal(b.action, "recover");
});
test("all three waves connect, boss intro waits for input, victory and defeat are reachable", () => {
  const g = field();
  g.update(0.01);
  assert.equal(g.mode, "interlude");
  advance(g, 2.2);
  assert.equal(g.wave, 2);
  g.queue = 0;
  g.enemies = [];
  g.update(0.01);
  advance(g, 2.2);
  assert.equal(g.mode, "bossintro");
  advance(g, 10);
  assert.equal(g.mode, "bossintro");
  g.enterBoss();
  assert.equal(g.wave, 3);
  assert.equal(g.boss.hp, 3000);
  g.queue = 0;
  g.enemies.forEach((e) => g.damageEnemy(e, 9999, "slash"));
  g.update(0.01);
  assert.equal(g.mode, "victory");
  g.start();
  g.player.invincible = 0;
  g.hurt(5);
  assert.equal(g.mode, "defeat");
});
test("retry completely resets HP, enemies, paint, score, cooldown and movement", () => {
  const g = field();
  g.kills = 50;
  g.bestSeal = 12;
  g.lines = [line({ x: 0, y: 0 }, { x: 40, y: 40 })];
  g.player.hp = 1;
  g.input = { x: 1, y: 1 };
  g.player.dashTime = 0.1;
  g.start();
  assert.equal(g.wave, 1);
  assert.equal(g.player.hp, 5);
  assert.equal(g.player.dashTime, 0);
  assert.deepEqual(g.input, { x: 0, y: 0 });
  assert.equal(g.kills, 0);
  assert.equal(g.bestSeal, 0);
  assert.equal(g.enemies.length, 0);
  assert.equal(g.lines.length, 0);
});
test("natural first-wave spawn allows twelve-enemy seal without placing enemies manually", () => {
  const g = new Battle(42);
  g.start();
  advance(g, 3);
  g.input = { x: 0, y: -1 };
  g.dash();
  advance(g, 0.25);
  g.seal();
  assert.ok(g.bestSeal >= 10, `only ${g.bestSeal} were caught`);
  assert.ok(g.bestSeal <= g.kills);
});
test("last group falls during the intermission, rather than freezing until the next wave", () => {
  const g = field();
  const e = enemy(g, 200, 400);
  g.lines = [line({ x: 80, y: 400 }, { x: 330, y: 400 })];
  g.seal();
  advance(g, 0.5);
  assert.equal(g.mode, "interlude");
  assert.ok(e.deathAge > 0.1);
});
