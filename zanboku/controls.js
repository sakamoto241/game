// Input shaping is independent from rendering and combat timing.
export function stickVector(dx, dy, radius = 38, deadzone = 5) {
  const distance = Math.hypot(dx, dy),
    scale = distance > radius ? radius / distance : 1;
  const strength =
    distance <= deadzone
      ? 0
      : Math.min(1, (distance - deadzone) / (radius - deadzone));
  return {
    x: strength ? (dx / distance) * strength : 0,
    y: strength ? (dy / distance) * strength : 0,
    knobX: dx * scale,
    knobY: dy * scale,
  };
}
export class ActionBuffer {
  constructor(duration = 0.18) {
    this.window = duration;
    this.pending = null;
  }
  push(action, direction) {
    this.pending = {
      action,
      direction: { ...direction },
      remaining: this.window,
    };
  }
  clear() {
    this.pending = null;
  }
  tick(dt, execute) {
    const p = this.pending;
    if (!p) return false;
    p.remaining -= dt;
    if (p.remaining < 0) {
      this.clear();
      return false;
    }
    if (execute(p.action, p.direction)) {
      this.clear();
      return true;
    }
    return false;
  }
}
export function attackDirection(player, move, enemies) {
  if (Math.hypot(move.x, move.y) > 0.08) return { ...move };
  const forward = { x: player.dx, y: player.dy };
  let target = null,
    best = 92;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - player.x,
      dy = e.y - player.y,
      d = Math.hypot(dx, dy);
    if (d > 1 && d < best && (dx * forward.x + dy * forward.y) / d > 0.64) {
      target = { x: dx / d, y: dy / d };
      best = d;
    }
  }
  return target || forward;
}
