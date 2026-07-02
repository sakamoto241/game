import type { Renderer } from "../core/Renderer";
import { UI_W, UI_H, WORLD_W, WORLD_H } from "../core/Renderer";
import type { Rng } from "../core/Rng";
import { Scene } from "../core/Scene";
import {
  physDamage,
  CRIT_CHANCE,
  CRIT_MULT,
  FLEE_CHANCE,
} from "../data/balance";
import type { EnemyInstance } from "../data/enemies";
import { ITEMS, type ItemId } from "../data/items";
import { SPELLS, type SpellId } from "../data/spells";
import type { GameState } from "../world/GameState";
import { ListMenu } from "../ui/ListMenu";

export type BattleOutcome = "victory" | "defeat" | "fled" | "bossVictory";

export interface BattleResult {
  outcome: BattleOutcome;
}

type Phase = "msg" | "command" | "spell" | "item" | "done";

interface QueuedMsg {
  text: string;
  /** メッセージ表示と同時に発火する演出・状態変化 */
  fx?: () => void;
}

interface Popup {
  text: string;
  x: number;
  y: number;
  t: number;
  color: string;
}

/** メッセージ自動送りの秒数。テンポの生命線 */
const MSG_AUTO_ADVANCE = 0.85;
const MSG_SKIP_LOCK = 0.12;

/**
 * ドラクエ風ターン制戦闘。
 * DungeonScene から push され、終了時に onEnd → pop（死亡・ボス勝利は onEnd 側で遷移）。
 * 演出は「フラッシュ・シェイク・ダメージポップアップ」をテンポ最優先で重ねる。
 */
export class BattleScene extends Scene {
  readonly name = "Battle";

  private phase: Phase = "msg";
  private queue: QueuedMsg[] = [];
  private currentMsg: QueuedMsg | null = null;
  private msgTimer = 0;
  private afterQueue: (() => void) | null = null;

  private commandMenu: ListMenu;
  private spellMenu: ListMenu | null = null;
  private itemMenu: ListMenu | null = null;

  private rng!: Rng;

  // --- 演出タイマー ---
  private introT = 0;
  private enemyFlash = 0;
  private enemyLunge = 0;
  private shake = 0;
  private redFlash = 0;
  private spellFlash = 0;
  private enemyDeathT = 0;
  private enemyDead = false;
  private popups: Popup[] = [];

  constructor(
    private state: GameState,
    private enemy: EnemyInstance,
    private floor: number,
    private onEnd: (result: BattleResult) => void,
  ) {
    super();
    this.commandMenu = new ListMenu([
      { label: "たたかう", value: "attack" },
      { label: "じゅもん", value: "spell" },
      { label: "どうぐ", value: "item" },
      { label: "にげる", value: "flee" },
    ]);
  }

  override onEnter(): void {
    this.rng = this.state.run?.battleRng ?? this.game.rootRng.fork("battle-fallback");
    this.game.audio.playBgm(this.enemy.def.boss ? "boss" : "battle");
    this.queueMsgs(
      [{ text: `${this.enemy.def.name}が あらわれた！` }],
      () => (this.phase = "command"),
    );
  }

  // =========================================================================
  // メッセージキュー
  // =========================================================================
  private queueMsgs(msgs: QueuedMsg[], after: () => void): void {
    this.queue = [...msgs];
    this.afterQueue = after;
    this.phase = "msg";
    this.advanceMsg();
  }

  private advanceMsg(): void {
    const next = this.queue.shift() ?? null;
    this.currentMsg = next;
    this.msgTimer = 0;
    if (next) {
      next.fx?.();
    } else {
      const after = this.afterQueue;
      this.afterQueue = null;
      after?.();
    }
  }

  // =========================================================================
  // 更新
  // =========================================================================
  update(dt: number): void {
    this.tickFx(dt);
    const input = this.game.input;

    switch (this.phase) {
      case "msg": {
        this.msgTimer += dt;
        const skip = input.pressed("confirm") && this.msgTimer > MSG_SKIP_LOCK;
        if (skip || this.msgTimer >= MSG_AUTO_ADVANCE) this.advanceMsg();
        break;
      }
      case "command": {
        const ev = this.commandMenu.update(input, dt);
        if (ev?.type === "select") this.onCommand(ev.item.value);
        break;
      }
      case "spell": {
        const ev = this.spellMenu?.update(input, dt);
        if (!ev) break;
        if (ev.type === "cancel") this.phase = "command";
        else this.castSpell(ev.item.value as SpellId);
        break;
      }
      case "item": {
        const ev = this.itemMenu?.update(input, dt);
        if (!ev) break;
        if (ev.type === "cancel") this.phase = "command";
        else this.useItem(ev.item.value as ItemId);
        break;
      }
      case "done":
        break;
    }
  }

  private tickFx(dt: number): void {
    this.introT = Math.min(1, this.introT + dt * 3);
    this.enemyFlash = Math.max(0, this.enemyFlash - dt);
    this.enemyLunge = Math.max(0, this.enemyLunge - dt * 6);
    this.shake = Math.max(0, this.shake - dt * 22);
    this.redFlash = Math.max(0, this.redFlash - dt * 3);
    this.spellFlash = Math.max(0, this.spellFlash - dt * 4);
    if (this.enemyDead) this.enemyDeathT = Math.min(1, this.enemyDeathT + dt * 2.2);
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter((p) => p.t < 0.8);
  }

  // =========================================================================
  // コマンド処理
  // =========================================================================
  private onCommand(cmd: string): void {
    switch (cmd) {
      case "attack":
        this.playerAttack();
        break;
      case "spell": {
        const spells = this.state.spells();
        if (spells.length === 0) {
          this.queueMsgs(
            [{ text: "まだ じゅもんを おぼえていない！" }],
            () => (this.phase = "command"),
          );
          return;
        }
        this.spellMenu = new ListMenu(
          spells.map((s) => ({
            label: s.name,
            value: s.id,
            note: `MP ${s.mp}`,
            disabled: this.state.mp < s.mp,
          })),
          "じゅもん",
        );
        this.phase = "spell";
        break;
      }
      case "item": {
        const usable = (Object.keys(this.state.inventory) as ItemId[]).filter(
          (id) => ITEMS[id].kind === "heal" && this.state.itemCount(id) > 0,
        );
        if (usable.length === 0) {
          this.queueMsgs(
            [{ text: "つかえる どうぐを もっていない！" }],
            () => (this.phase = "command"),
          );
          return;
        }
        this.itemMenu = new ListMenu(
          usable.map((id) => ({
            label: ITEMS[id].name,
            value: id,
            note: `x${this.state.itemCount(id)}`,
          })),
          "どうぐ",
        );
        this.phase = "item";
        break;
      }
      case "flee":
        this.tryFlee();
        break;
    }
  }

  private playerAttack(): void {
    const crit = !this.enemy.def.boss && this.rng.chance(CRIT_CHANCE);
    let dmg = physDamage(this.state.atk, this.enemy.defense, this.rng);
    if (crit) dmg = Math.round(dmg * CRIT_MULT);

    const msgs: QueuedMsg[] = [{ text: "ゆうしゃの こうげき！" }];
    if (crit) {
      msgs.push({
        text: "かいしんの いちげき！！",
        fx: () => {
          this.shake = 5;
          this.spellFlash = 0.5;
        },
      });
    }
    msgs.push({
      text: `${this.enemy.def.name}に ${dmg}の ダメージ！`,
      fx: () => this.damageEnemy(dmg),
    });
    this.queueMsgs(msgs, () => this.afterPlayerAction());
  }

  private castSpell(id: SpellId): void {
    const spell = SPELLS[id];
    if (this.state.mp < spell.mp) return;
    this.state.mp -= spell.mp;

    if (spell.kind === "attack") {
      const dmg = spell.power + this.rng.int(0, spell.variance);
      this.queueMsgs(
        [
          {
            text: `ゆうしゃは ${spell.name}を となえた！`,
            fx: () => (this.spellFlash = 0.6),
          },
          {
            text: `${this.enemy.def.name}に ${dmg}の ダメージ！`,
            fx: () => this.damageEnemy(dmg),
          },
        ],
        () => this.afterPlayerAction(),
      );
    } else {
      const healed = this.state.heal(spell.power + this.rng.int(0, spell.variance));
      this.queueMsgs(
        [
          {
            text: `ゆうしゃは ${spell.name}を となえた！`,
            fx: () => (this.spellFlash = 0.4),
          },
          {
            text: `HPが ${healed} かいふくした！`,
            fx: () => this.popup(`+${healed}`, 96, 300, "#8ef58e"),
          },
        ],
        () => this.enemyTurn(),
      );
    }
  }

  private useItem(id: ItemId): void {
    const def = ITEMS[id];
    if (def.kind !== "heal" || this.state.itemCount(id) <= 0) return;
    this.state.removeItem(id);
    const healed = this.state.heal(def.power ?? 30);
    this.queueMsgs(
      [
        { text: `ゆうしゃは ${def.name}を つかった！` },
        {
          text: `HPが ${healed} かいふくした！`,
          fx: () => this.popup(`+${healed}`, 96, 300, "#8ef58e"),
        },
      ],
      () => this.enemyTurn(),
    );
  }

  private tryFlee(): void {
    if (!this.enemy.def.boss && this.rng.chance(FLEE_CHANCE)) {
      this.queueMsgs([{ text: "ゆうしゃは にげだした！" }], () =>
        this.endBattle("fled"),
      );
    } else {
      this.queueMsgs(
        [
          { text: "ゆうしゃは にげだした！" },
          { text: "しかし まわりこまれてしまった！" },
        ],
        () => this.enemyTurn(),
      );
    }
  }

  private damageEnemy(dmg: number): void {
    this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
    this.enemyFlash = 0.3;
    this.popup(`${dmg}`, UI_W / 2, 130, "#ffffff");
    this.game.audio.playSe("hit");
  }

  private afterPlayerAction(): void {
    if (this.enemy.hp <= 0) this.victory();
    else this.enemyTurn();
  }

  // =========================================================================
  // 敵ターン
  // =========================================================================
  private enemyTurn(): void {
    const dmg = physDamage(this.enemy.atk, this.state.def, this.rng);
    this.queueMsgs(
      [
        {
          text: `${this.enemy.def.name}の こうげき！`,
          fx: () => (this.enemyLunge = 1),
        },
        {
          text: `ゆうしゃは ${dmg}の ダメージを うけた！`,
          fx: () => {
            this.state.hp = Math.max(0, this.state.hp - dmg);
            this.shake = 6;
            this.redFlash = 0.55;
            this.popup(`-${dmg}`, 96, 84, "#ff8a8a");
            this.game.audio.playSe("damage");
          },
        },
      ],
      () => {
        if (this.state.hp <= 0) this.defeat();
        else this.phase = "command";
      },
    );
  }

  // =========================================================================
  // 決着
  // =========================================================================
  private victory(): void {
    this.enemyDead = true;
    const e = this.enemy;

    // 報酬は先に確定させ、メッセージは結果を語るだけにする
    this.state.gold += e.gold;
    const msgs: QueuedMsg[] = [
      { text: `${e.def.name}を たおした！` },
      { text: `けいけんち ${e.exp} かくとく！  ${e.gold}ゴールドを てにいれた！` },
    ];

    const drop = e.def.drop;
    if (drop && this.rng.chance(drop.chance)) {
      this.state.addItem(drop.item, drop.count);
      const name = ITEMS[drop.item].name;
      const count = drop.count > 1 ? ` x${drop.count}` : "";
      msgs.push({ text: `${name}${count}を ひろった！` });
    }

    for (const up of this.state.gainExp(e.exp)) {
      msgs.push({
        text: `レベルが ${up.level}に あがった！`,
        fx: () => {
          this.spellFlash = 0.7;
          this.game.audio.playSe("levelup");
        },
      });
      for (const spell of up.learned) {
        msgs.push({ text: `じゅもん「${spell.name}」を おぼえた！` });
      }
    }

    if (e.def.boss) {
      this.state.bossDefeated = true;
      msgs.push({ text: "どうくつに へいわが おとずれた……" });
      msgs.push({ text: "ふしぎな ちからが ゆうしゃを つつみこむ！" });
      this.queueMsgs(msgs, () => this.endBattle("bossVictory"));
    } else {
      this.queueMsgs(msgs, () => this.endBattle("victory"));
    }
  }

  private defeat(): void {
    this.queueMsgs(
      [
        { text: "ゆうしゃは たおれてしまった……" },
        { text: "めのまえが まっくらに なった……" },
      ],
      () => this.endBattle("defeat"),
    );
  }

  private endBattle(outcome: BattleOutcome): void {
    this.phase = "done";
    this.onEnd({ outcome });
    // 死亡・ボス勝利は onEnd 側が replaceAll で遷移させる（スタックごと破棄される）
    if (outcome === "victory" || outcome === "fled") {
      this.game.scenes.pop();
    }
  }

  private popup(text: string, x: number, y: number, color: string): void {
    this.popups.push({ text, x, y, t: 0, color });
  }

  // =========================================================================
  // 描画
  // =========================================================================
  render(r: Renderer): void {
    this.renderWorld(r.world);
    this.renderUi(r.ui);
  }

  private renderWorld(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.shake > 0) {
      const t = this.game.elapsed;
      ctx.translate(
        Math.round(Math.sin(t * 91) * this.shake),
        Math.round(Math.cos(t * 83) * this.shake * 0.6),
      );
    }

    // 洞窟の背景
    const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    grad.addColorStop(0, "#141020");
    grad.addColorStop(1, "#2c2438");
    ctx.fillStyle = grad;
    ctx.fillRect(-8, -8, WORLD_W + 16, WORLD_H + 16);

    // 地面
    ctx.fillStyle = "#3a3348";
    ctx.beginPath();
    ctx.ellipse(WORLD_W / 2, 118, 90, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    this.renderEnemy(ctx);
    ctx.restore();

    // 呪文・会心のフラッシュ
    if (this.spellFlash > 0) {
      ctx.fillStyle = `rgba(255, 200, 90, ${(this.spellFlash * 0.4).toFixed(3)})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
  }

  private renderEnemy(ctx: CanvasRenderingContext2D): void {
    if (this.enemyDead && this.enemyDeathT >= 1) return;
    const size = this.enemy.def.boss ? 64 : 48;
    const bob = this.enemyDead ? 0 : Math.sin(this.game.elapsed * 2.4) * 2;
    const lunge = Math.sin(Math.min(1, 1 - this.enemyLunge) * Math.PI) * 10;
    const x = WORLD_W / 2 - size / 2;
    const y = 108 - size + bob + (this.enemyLunge > 0 ? lunge : 0);

    // 被弾中の点滅
    if (this.enemyFlash > 0 && Math.floor(this.enemyFlash * 24) % 2 === 0) return;

    ctx.save();
    if (this.enemyDead) ctx.globalAlpha = 1 - this.enemyDeathT;
    this.game.assets.drawSprite(ctx, this.enemy.def.sprite, x, y, size, size);
    ctx.restore();
  }

  private renderUi(ctx: CanvasRenderingContext2D): void {
    const text = this.game.text;

    // 敵の名前（生存中のみ）
    if (!this.enemyDead) {
      text.draw(ctx, this.enemy.def.name, UI_W / 2, 44, {
        size: 13,
        align: "center",
        color: "#e8ddf5",
      });
    }
    text.draw(ctx, `B${this.floor}F`, UI_W - 16, 12, {
      size: 11,
      align: "right",
      color: "#8f87a8",
    });

    this.renderPlayerStatus(ctx);

    // コマンド・サブメニュー
    if (this.phase === "command") {
      this.commandMenu.render(ctx, text, 48, 158, 130);
    } else if (this.phase === "spell") {
      this.spellMenu?.render(ctx, text, 48, 150, 190);
    } else if (this.phase === "item") {
      this.itemMenu?.render(ctx, text, 48, 150, 190);
    }

    // メッセージウィンドウ
    const msgText =
      this.phase === "msg" && this.currentMsg
        ? this.currentMsg.text
        : this.phase === "command"
          ? "コマンドを えらんでください"
          : "";
    text.window(ctx, 48, UI_H - 80, UI_W - 96, 64);
    if (msgText) {
      text.draw(ctx, msgText, 64, UI_H - 62, { size: 13 });
    }

    // ダメージポップアップ
    for (const p of this.popups) {
      const alpha = 1 - p.t / 0.8;
      const rise = p.t * 34;
      ctx.save();
      ctx.globalAlpha = alpha;
      text.draw(ctx, p.text, p.x, p.y - rise, {
        size: 20,
        align: "center",
        color: p.color,
        bold: true,
      });
      ctx.restore();
    }

    // 被弾の赤フラッシュ
    if (this.redFlash > 0) {
      ctx.fillStyle = `rgba(200, 30, 30, ${(this.redFlash * 0.3).toFixed(3)})`;
      ctx.fillRect(0, 0, UI_W, UI_H);
    }

    // 戦闘突入時のフェードイン
    if (this.introT < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(1 - this.introT).toFixed(3)})`;
      ctx.fillRect(0, 0, UI_W, UI_H);
    }
  }

  private renderPlayerStatus(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    const text = this.game.text;
    text.window(ctx, 24, 24, 168, 76);
    text.draw(ctx, `ゆうしゃ  Lv ${s.level}`, 40, 36, { size: 12, bold: true });
    const hpColor =
      s.hp <= s.maxHp * 0.25 ? "#ff8a8a" : s.hp <= s.maxHp * 0.5 ? "#ffd970" : "#f5f1e8";
    text.draw(ctx, `HP ${s.hp} / ${s.maxHp}`, 40, 56, { size: 12, color: hpColor });
    text.draw(ctx, `MP ${s.mp} / ${s.maxMp}`, 40, 74, { size: 12, color: "#a8c8f0" });
  }
}
