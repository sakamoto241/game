import test from "node:test";
import assert from "node:assert/strict";
import { stickVector, ActionBuffer, attackDirection } from "../controls.js";
test("thumb contact and tiny jitter do not move the hero", () => {
  for (const [x, y] of [
    [0, 0],
    [2, 1],
    [-3, 3],
  ]) {
    const v = stickVector(x, y);
    assert.equal(v.x, 0);
    assert.equal(v.y, 0);
  }
});
test("stick speed rises smoothly and diagonals never exceed full speed", () => {
  const a = stickVector(10, 0),
    b = stickVector(25, 0),
    c = stickVector(200, 200);
  assert.ok(a.x > 0 && a.x < b.x && b.x < 1);
  assert.ok(Math.abs(Math.hypot(c.x, c.y) - 1) < 1e-9);
  assert.ok(Math.abs(Math.hypot(c.knobX, c.knobY) - 38) < 1e-9);
});
test("early input executes exactly once when the technique becomes available", () => {
  const q = new ActionBuffer();
  let ready = false,
    count = 0;
  q.push("seal", { x: 0, y: -1 });
  const run = () => {
    if (!ready) return false;
    count++;
    return true;
  };
  q.tick(0.06, run);
  ready = true;
  q.tick(0.06, run);
  q.tick(0.03, run);
  assert.equal(count, 1);
  assert.equal(q.pending, null);
});
test("an expired command cannot unexpectedly execute later", () => {
  const q = new ActionBuffer();
  q.push("dash", { x: 1, y: 0 });
  let count = 0;
  q.tick(0.2, () => {
    count++;
    return true;
  });
  assert.equal(count, 0);
  assert.equal(q.pending, null);
});
test("the latest command wins and its pressed direction stays fixed", () => {
  const q = new ActionBuffer();
  const d = { x: 1, y: 0 };
  q.push("slash", { x: 0, y: -1 });
  q.push("dash", d);
  d.x = -1;
  q.tick(0.02, (action, dir) => {
    assert.equal(action, "dash");
    assert.equal(dir.x, 1);
    return true;
  });
});
test("canceling a buffered input leaves no attack to replay", () => {
  const q = new ActionBuffer();
  q.push("seal", { x: 0, y: 1 });
  q.clear();
  q.tick(0.01, () => assert.fail("canceled action replayed"));
});
test("nearby attack assistance never overrides a movement direction or turns behind", () => {
  const p = { x: 0, y: 0, dx: 0, dy: -1 };
  const enemies = [
    { x: 15, y: -50 },
    { x: 0, y: 10 },
  ];
  assert.deepEqual(attackDirection(p, { x: -1, y: 0 }, enemies), {
    x: -1,
    y: 0,
  });
  const d = attackDirection(p, { x: 0, y: 0 }, enemies);
  assert.ok(d.y < 0 && d.x > 0);
  assert.deepEqual(attackDirection(p, { x: 0, y: 0 }, [{ x: 0, y: 10 }]), {
    x: 0,
    y: -1,
  });
});
