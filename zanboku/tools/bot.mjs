import { Battle, pointSegment, INK_RADIUS } from "../core.js";
export function bot(g) {
  if (g.mode === "bossintro") {
    g.enterBoss();
    return;
  }
  if (g.mode !== "playing") {
    g.update(1 / 60);
    return;
  }
  const p = g.player,
    live = g.enemies.filter((e) => !e.dead),
    near = live
      .slice()
      .sort(
        (a, b) =>
          Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
      )[0];
  if (!near) {
    g.update(1 / 60);
    return;
  }
  const dx = near.x - p.x,
    dy = near.y - p.y,
    d = Math.hypot(dx, dy) || 1;
  let dir = { x: dx / d, y: dy / d };
  // Evade fixed red lanes at close range, then return during recovery.
  const danger = live.find(
    (e) =>
      e.action === "windup" &&
      e.timer < 0.7 &&
      Math.hypot(e.x - p.x, e.y - p.y) < 155,
  );
  if (danger) {
    dir = { x: -danger.dy, y: danger.dx };
    if ((p.x < 60 && dir.x < 0) || (p.x > 370 && dir.x > 0))
      dir = { x: -dir.x, y: -dir.y };
  }
  g.input = dir;
  const onInk = live.filter((e) =>
    g.lines.some((l) => pointSegment(e, l.a, l.b) <= INK_RADIUS + e.radius),
  );
  const bossDouble = live.some(
    (e) =>
      e.kind === "boss" &&
      g.lines.filter((l) => pointSegment(e, l.a, l.b) <= INK_RADIUS + e.radius)
        .length === 2,
  );
  if (
    p.dashTime <= 0 &&
    g.lines.length &&
    (bossDouble ||
      onInk.filter((e) => e.kind !== "boss").length >= 5 ||
      g.lines.some((l) => l.life < 0.45))
  )
    g.seal();
  if (d < 79 && !danger) {
    g.input = { x: dx / d, y: dy / d };
    g.slash();
  }
  if (
    p.dashCD <= 0 &&
    (danger || (d > 70 && d < 190) || (near.kind === "boss" && d < 100))
  ) {
    g.input = dir;
    g.dash();
  }
  const walk = !danger && d < 52 ? { x: 0, y: 0 } : dir;
  g.update(1 / 60, walk);
}
if (process.argv[1]?.endsWith("bot.mjs"))
  for (const seed of [42, 87, 410, 144]) {
    const g = new Battle(seed);
    g.start();
    let frames = 0;
    for (; frames < 60 * 200; frames++) {
      bot(g);
      if (["defeat", "victory"].includes(g.mode)) break;
    }
    console.log(
      JSON.stringify({
        seed,
        mode: g.mode,
        time: g.time,
        kills: g.kills,
        best: g.bestSeal,
        hp: g.player.hp,
        boss: g.boss?.hp,
        frames,
      }),
    );
  }
