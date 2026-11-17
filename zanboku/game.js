import { Battle, W, H, clamp } from "./core.js?v=4";
import { Painter } from "./art.js?v=4";
import { ActionBuffer, stickVector, attackDirection } from "./controls.js?v=4";
import { Sound } from "./sound.js?v=4";
const $ = (id) => document.getElementById(id),
  game = new Battle(),
  paint = new Painter($("game")),
  sound = new Sound();
const keys = new Set(),
  stickInput = { x: 0, y: 0 },
  pointers = new Map(),
  actionBuffer = new ActionBuffer();
let backgrounded = document.hidden,
  lastViewportWidth = 0,
  stickId = null,
  stickAnchor = null,
  slashHeld = false,
  pausedFrom = null,
  helpFrom = "title",
  tipLeft = 0,
  comboLeft = 0,
  endLeft = -1,
  lastTime = 0,
  lastHUD = "",
  bestRecord = 0;
try {
  const n = Number(localStorage.getItem("zanboku-best-v1"));
  if (Number.isFinite(n) && n >= 0 && n < 1000) bestRecord = n;
  const a = localStorage.getItem("zanboku-sound-v1");
  if (a === "off") sound.enabled = false;
} catch {}
function fit() {
  const vv = window.visualViewport;
  document.documentElement.style.setProperty(
    "--height",
    `${Math.round(vv ? vv.height : window.innerHeight)}px`,
  );
  if (!$("hud").hidden) {
    const s = $("stage").getBoundingClientRect(),
      r = $("slash").getBoundingClientRect();
    game.arena.bottom = clamp(((r.top - s.top - 10) / s.height) * H, 535, 599);
    game.keepIn(game.player);
  }
  const width = window.innerWidth;
  if (lastViewportWidth && Math.abs(width - lastViewportWidth) > 2)
    resetInput();
  lastViewportWidth = width;
}
function resetInput() {
  keys.clear();
  pointers.clear();
  stickId = null;
  stickAnchor = null;
  actionBuffer.clear();
  stick.classList.remove("active");
  stick.style.removeProperty("--stick-x");
  stick.style.removeProperty("--stick-y");
  for (const b of document.querySelectorAll(".skill"))
    b.classList.remove("is-held", "queued");
  stickInput.x = 0;
  stickInput.y = 0;
  slashHeld = false;
  game.input = { x: 0, y: 0 };
  $("stickKnob").style.transform = "";
}
function input() {
  let x = stickInput.x,
    y = stickInput.y;
  if (keys.has("a") || keys.has("arrowleft")) x--;
  if (keys.has("d") || keys.has("arrowright")) x++;
  if (keys.has("w") || keys.has("arrowup")) y--;
  if (keys.has("s") || keys.has("arrowdown")) y++;
  const n = Math.hypot(x, y);
  if (n > 1) {
    x /= n;
    y /= n;
  }
  return { x, y };
}
function activateAudio() {
  if (
    sound.ctx &&
    (sound.suspended || sound.ctx.state !== "running") &&
    !backgrounded &&
    game.mode !== "paused"
  )
    sound.start();
}
function executeAction(what, direction) {
  const original = game.input;
  game.input = direction;
  const success = game[what]();
  game.input = original;
  return success;
}
function act(what) {
  activateAudio();
  actionBuffer.clear();
  const move = input(),
    p = game.player;
  const direction =
    what === "slash"
      ? attackDirection(p, move, game.enemies)
      : Math.hypot(move.x, move.y) > 0.08
        ? move
        : { x: p.dx, y: p.dy };
  if (executeAction(what, direction)) {
    actionBuffer.clear();
    return;
  }
  const cooldown =
    what === "slash" ? p.slashCD : what === "dash" ? p.dashCD : p.sealCD;
  if (
    game.mode === "playing" &&
    (what !== "seal" || game.lines.length) &&
    Math.max(cooldown, p.dashTime, p.sealRecovery) + game.hitstop <= 0.18
  )
    actionBuffer.push(what, direction);
}
function tip(text, seconds = 4) {
  $("tip").textContent = text;
  tipLeft = seconds;
}
function soundLabels() {
  const t = "音";
  $("soundBtn").textContent = t;
  $("titleSound").textContent = sound.enabled ? "音 入" : "音 切";
  $("soundBtn").setAttribute("aria-pressed", String(sound.enabled));
  $("titleSound").setAttribute("aria-pressed", String(sound.enabled));
}
function toggleSound() {
  sound.toggle();
  sound.start();
  soundLabels();
  try {
    localStorage.setItem("zanboku-sound-v1", sound.enabled ? "on" : "off");
  } catch {}
}
function show(id) {
  for (const n of ["title", "bossIntro", "result", "pause", "help"])
    $(n).hidden = n !== id;
}
function start() {
  resetInput();
  paint.reset();
  game.start();
  show(null);
  $("hud").hidden = false;
  fit();
  endLeft = -1;
  lastHUD = "";
  comboLeft = 0;
  $("combo").classList.remove("show");
  pausedFrom = null;
  sound.start();
  tip("抜刀で墨を引き、納刀で断つ。", 6);
}
function title() {
  pausedFrom = null;
  resetInput();
  game.reset();
  paint.reset();
  show("title");
  $("hud").hidden = true;
  endLeft = -1;
  lastHUD = "";
  sound.start();
}
function pause() {
  if (!["playing", "interlude", "bossintro"].includes(game.mode)) return;
  pausedFrom = game.mode;
  game.mode = "paused";
  resetInput();
  show("pause");
  sound.pause();
}
function resume() {
  if (!pausedFrom) return;
  game.mode = pausedFrom;
  show(game.mode === "bossintro" ? "bossIntro" : null);
  pausedFrom = null;
  resetInput();
  sound.start();
}
function openHelp(from) {
  helpFrom = from;
  show("help");
}
function closeHelp() {
  show(helpFrom === "pause" ? "pause" : "title");
}
function result(win) {
  show("result");
  $("hud").hidden = true;
  resetInput();
  $("bossHud").hidden = true;
  $("resultEyebrow").textContent = win
    ? "三陣、踏破。"
    : "雨は、まだ止まない。";
  $("resultTitle").textContent = win ? "残心" : "落命";
  $("resultCopy").textContent = win
    ? "刀を収める。\n石畳には、まだ墨が残っている。"
    : "間合いを変えろ。\n墨に誘い、朱の予告から離れる。";
  $("resultKills").innerHTML = `${game.kills}<small>人</small>`;
  $("resultBest").innerHTML = `${game.bestSeal}<small>人</small>`;
  const seconds = Math.floor(game.time),
    record = Math.max(bestRecord, game.bestSeal);
  $("resultTime").textContent =
    `${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, "0")}秒　／　自己最多 ${record}人一閃`;
  $("shareStatus").textContent = "";
  if (game.bestSeal > bestRecord) {
    bestRecord = game.bestSeal;
    try {
      localStorage.setItem("zanboku-best-v1", String(bestRecord));
    } catch {}
  }
}
function handle(e) {
  paint.event(e);
  sound.event(e);
  if (e.type === "wave") {
    const sub = ["", "雨中の来客", "四方の刃", "鐘、鳴り止まず"];
    $("wave").textContent = ["", "第一陣", "第二陣", "第三陣"][e.wave];
    $("waveSub").textContent = sub[e.wave];
    if (e.wave === 2) tip("槍は、横へ避ける。", 4);
    if (e.wave === 3) tip("二本の墨を、鐘守へ。", 4);
  }
  if (e.type === "dash" && game.wave === 1 && game.totalSeal === 0)
    tip("墨の上に誘い、納刀。", 3.5);
  if (e.type === "seal") {
    if (e.count > 0) {
      $("combo").querySelector("strong").textContent = e.count;
      $("combo").classList.add("show");
      comboLeft = 1.6;
    } else if (!e.targets.length) tip("墨の上に、敵を誘い込め。", 2);
  }
  if (e.type === "clearwave")
    tip(
      `第${e.wave === 1 ? "一" : "二"}陣、討ち果たした。\n命がひとつ戻った。`,
      2,
    );
  if (e.type === "bossintro") {
    resetInput();
    show("bossIntro");
  }
  if (e.type === "bossphase") tip("一打で構え、二打で踏み込む。", 3);
  if (e.type === "stagger" && e.double) tip("二線交差 ― 体勢を崩した。", 1.4);
  if (e.type === "victory" || e.type === "defeat") {
    resetInput();
    endLeft = 0.8;
  }
}
function hud() {
  const p = game.player,
    b = game.boss,
    stamp = [game.kills, p.hp, !!b, b?.hp, b?.phase, game.lines.length].join(
      ",",
    );
  if (stamp !== lastHUD) {
    $("kills").textContent = game.kills;
    $("healthPips").innerHTML = Array.from(
      { length: 5 },
      (_, i) =>
        `<i class="${i >= p.hp ? "empty" : p.hp <= 2 ? "low" : ""}"></i>`,
    ).join("");
    $("health").setAttribute("aria-label", `体力 ${p.hp} / 5`);
    $("bossHud").hidden = !b || b.dead || game.mode === "title";
    if (b) {
      $("bossHealth").style.width = `${Math.max(0, b.hp / b.maxHp) * 100}%`;
      $("bossPhase").textContent = b.phase ? "二打・踏み込み" : "大薙刀";
    }
    lastHUD = stamp;
  }
  const n = game.lines.length,
    can = n > 0;
  $("seal").disabled = !can;
  $("seal").setAttribute("aria-disabled", String(!can || p.sealCD > 0));
  for (const id of ["slash", "dash", "seal"])
    $(id).classList.toggle("queued", actionBuffer.pending?.action === id);
  $("seal").classList.toggle("ready", can);
  $("seal").classList.toggle(
    "expiring",
    can && game.lines.some((l) => l.life < 1),
  );
  $("lineCount").textContent =
    p.sealCD > 0.01 ? `${p.sealCD.toFixed(1)}` : n ? ["", "一", "二"][n] : "";
  $("seal").querySelector("i").style.transform =
    `scaleX(${clamp(p.sealCD / 2.2, 0, 1)})`;
  $("dashTimer").textContent = p.dashCD > 0.01 ? `${p.dashCD.toFixed(1)}` : "";
  $("dash").querySelector("i").style.transform =
    `scaleX(${clamp(p.dashCD / (p.dashCD > 0.57 ? 1.55 : 0.57), 0, 1)})`;
  $("slash").querySelector("i").style.transform =
    `scaleX(${clamp(p.slashCD / 0.39, 0, 1)})`;
  $("dash").setAttribute("aria-disabled", String(p.dashCD > 0));
}
$("start").addEventListener("click", start);
$("retry").addEventListener("click", start);
$("returnTitle").addEventListener("click", title);
$("pauseTitle").addEventListener("click", title);
$("pauseBtn").addEventListener("click", pause);
$("resume").addEventListener("click", resume);
$("howBtn").addEventListener("click", () => openHelp("title"));
$("pauseHelp").addEventListener("click", () => openHelp("pause"));
$("helpClose").addEventListener("click", closeHelp);
$("soundBtn").addEventListener("click", toggleSound);
$("titleSound").addEventListener("click", toggleSound);
$("bossIntro").addEventListener("click", () => {
  if (game.mode !== "bossintro") return;
  game.enterBoss();
  resetInput();
  show(null);
  sound.start();
});
$("share").addEventListener("click", () => {
  const text = `斬ったのは、一度。倒れたのは、${game.bestSeal}人。\n『残墨』 ${game.kills}人斬り${game.mode === "victory" ? "・三陣踏破" : ""}\n#残墨 #ブラウザゲーム`;
  const url = new URL(".", location.href).href;
  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    "_blank",
    "noopener,noreferrer",
  );
  $("shareStatus").textContent = "戦果とゲームURLを共有します。";
});
const stick = $("stick");
function moveStick(e) {
  if (!stickAnchor) return;
  const r = stick.getBoundingClientRect(),
    radius = Math.min(r.width, r.height) * 0.33;
  let dx = e.clientX - stickAnchor.x,
    dy = e.clientY - stickAnchor.y;
  const n = Math.hypot(dx, dy),
    limit = radius * 1.65;
  if (n > limit) {
    stickAnchor.x += (dx / n) * (n - limit);
    stickAnchor.y += (dy / n) * (n - limit);
    dx = e.clientX - stickAnchor.x;
    dy = e.clientY - stickAnchor.y;
  }
  const v = stickVector(dx, dy, radius, 5);
  stickInput.x = v.x;
  stickInput.y = v.y;
  stick.style.setProperty(
    "--stick-x",
    `${stickAnchor.x - r.left - r.width / 2}px`,
  );
  stick.style.setProperty(
    "--stick-y",
    `${stickAnchor.y - r.top - r.height / 2}px`,
  );
  $("stickKnob").style.transform = `translate(${v.knobX}px,${v.knobY}px)`;
}
stick.addEventListener("pointerdown", (e) => {
  if (game.mode !== "playing" || stickId !== null) return;
  e.preventDefault();
  activateAudio();
  stickId = e.pointerId;
  stickAnchor = { x: e.clientX, y: e.clientY };
  stick.classList.add("active");
  stick.setPointerCapture(e.pointerId);
  moveStick(e);
});
stick.addEventListener("pointermove", (e) => {
  if (e.pointerId === stickId) {
    e.preventDefault();
    moveStick(e);
  }
});
function updateHeld() {
  slashHeld = [...pointers.values()].includes("slash");
  for (const id of ["slash", "dash", "seal"])
    $(id).classList.toggle("is-held", [...pointers.values()].includes(id));
}
function release(e) {
  if (e.pointerId === stickId) {
    stickId = null;
    stickAnchor = null;
    stickInput.x = 0;
    stickInput.y = 0;
    stick.classList.remove("active");
    stick.style.removeProperty("--stick-x");
    stick.style.removeProperty("--stick-y");
    $("stickKnob").style.transform = "";
  }
  if (e.type === "pointercancel") actionBuffer.clear();
  pointers.delete(e.pointerId);
  updateHeld();
}
for (const k of ["pointerup", "pointercancel", "lostpointercapture"])
  window.addEventListener(k, release);
for (const id of ["slash", "dash", "seal"])
  $(id).addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (game.mode !== "playing") return;
    $(id).setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, id);
    updateHeld();
    act(id);
  });
window.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId) || game.mode !== "playing") return;
  const current = pointers.get(e.pointerId);
  const inside = (id, margin) => {
    const r = $(id).getBoundingClientRect();
    return (
      e.clientX >= r.left - margin &&
      e.clientX <= r.right + margin &&
      e.clientY >= r.top - margin &&
      e.clientY <= r.bottom + margin
    );
  };
  if (current && inside(current, 7)) return;
  const next = ["slash", "dash", "seal"].find((id) => inside(id, 2)) || "";
  if (next === current) return;
  pointers.set(e.pointerId, next);
  updateHeld();
  if (next) act(next);
});
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
    e.preventDefault();
  if (k === "escape") {
    if (e.repeat) return;
    if (game.mode === "paused") resume();
    else pause();
    return;
  }
  if (game.mode !== "playing") return;
  keys.add(k);
  if (e.repeat) return;
  if (k === "j") act("slash");
  if (k === "k") act("dash");
  if (k === "l") act("seal");
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
// Focus changes are common inside mobile webviews. Only an explicit action
// opens the pause menu. A hidden document freezes silently and resumes itself.
function suspendInBackground() {
  backgrounded = true;
  resetInput();
  sound.pause();
  lastTime = 0;
}
function returnToGame() {
  if (document.hidden || !backgrounded) return;
  backgrounded = false;
  resetInput();
  lastTime = performance.now();
  if (sound.ctx && game.mode !== "paused") sound.start();
}
window.addEventListener("blur", () => {
  keys.clear();
  if (document.hidden) suspendInBackground();
  else game.input = input();
});
window.addEventListener("focus", () => {
  if (backgrounded) returnToGame();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) suspendInBackground();
  else returnToGame();
});
window.addEventListener("resize", fit);
window.visualViewport?.addEventListener("resize", fit);
window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("pagehide", suspendInBackground);
window.addEventListener("pageshow", () => {
  if (backgrounded) returnToGame();
});
function frame(ms) {
  const dt = Math.min(0.04, (ms - lastTime) / 1000 || 0.016);
  lastTime = ms;
  const frozen = game.mode === "paused" || backgrounded;
  if (!frozen) {
    if (game.mode === "playing") {
      actionBuffer.tick(dt, executeAction);
      if (!actionBuffer.pending && (slashHeld || keys.has("j"))) {
        const move = input();
        executeAction(
          "slash",
          attackDirection(game.player, move, game.enemies),
        );
      }
    } else actionBuffer.clear();
    game.update(dt, input());
    let e;
    while ((e = game.events.shift())) handle(e);
    if (tipLeft > 0) {
      tipLeft -= dt;
      if (tipLeft <= 0) $("tip").textContent = "";
    }
    if (comboLeft > 0) {
      comboLeft -= dt;
      if (comboLeft <= 0) $("combo").classList.remove("show");
    }
    if (endLeft >= 0) {
      endLeft -= dt;
      if (endLeft < 0) result(game.mode === "victory");
    }
    paint.draw(game, dt);
  } else paint.draw(game, 0);
  hud();
  requestAnimationFrame(frame);
}
fit();
soundLabels();
paint.ready.then((results) => {
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length)
    $("loadNote").textContent =
      "一部の絵を読み込めませんでした。簡易描画で遊べます。";
});
requestAnimationFrame(frame);
// Read-only diagnostics are opt-in; no game cheats or debug UI in the public flow.
if (new URLSearchParams(location.search).has("test"))
  window.__zanboku = {
    game,
    paint,
    input,
    resetInput,
    start,
    pause,
    resume,
    act,
    sound,
    actionBuffer,
    get backgrounded() {
      return backgrounded;
    },
  };
