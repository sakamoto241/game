import type { Renderer } from "../core/Renderer";
import { UI_W, UI_H, WORLD_W, WORLD_H } from "../core/Renderer";
import type { Rng } from "../core/Rng";
import { Scene } from "../core/Scene";
import {
  physDamage,
  CRIT_CHANCE,
  CRIT_MULT,
  FLEE_CHANCE,
  GUARD_MULT,
  expShare,
  bossActions,
} from "../data/balance";
import type { EnemyInstance } from "../data/enemies";
import { ITEMS, type ItemId } from "../data/items";
import { routeDefBonus, spellMpDiscount } from "../data/routes";
import { SPELLS, type SpellDef } from "../data/spells";
import type { GameState } from "../world/GameState";
import type { PartyMember } from "../world/PartyMember";
import { ListMenu } from "../ui/ListMenu";
import { drawBar } from "../ui/Windows";

export type BattleOutcome = "victory" | "defeat" | "fled" | "bossVictory";

export interface BattleResult {
  outcome: BattleOutcome;
}

type Phase = "msg" | "command" | "spell" | "item" | "target" | "done";

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

/** 対象選択が確定したときに実行する保留アクション */
type PendingAction =
  | { kind: "spell"; spell: SpellDef; caster: PartyMember }
  | { kind: "item"; item: ItemId; user: PartyMember };

const MSG_AUTO_ADVANCE = 0.85;
const MSG_SKIP_LOCK = 0.12;

/**
 * ドラクエ風ターン制戦闘（パーティ対応）。
 * ラウンド = 生存メンバーが順にコマンド実行 → 敵の行動（ボスは複数回）。
 * 終了時に onEnd → pop（全滅・ボス勝利は onEnd 側で遷移）。
 */
export class BattleScene extends Scene {
  readonly name = "Battle";

  private phase: Phase = "msg";
  private queue: QueuedMsg[] = [];
  private currentMsg: QueuedMsg | null = null;
  private msgTimer = 0;
  private afterQueue: (() => void) | null = null;

  private commandMenu: ListMenu | null = null;
  private subMenu: ListMenu | null = null;
  private targetMenu: ListMenu | null = null;
  private pending: PendingAction | null = null;

  private rng!: Rng;
  private activeIdx = -1;

  /** ぼうぎょ中のメンバーID（本人の次のコマンドで解除） */
  private guarding = new Set<string>();
  /** スカラ等の防御倍率（メンバーID → 倍率） */
  private defBuff = new Map<string, number>();
  /** ねむり中のメンバーID（戦闘終了で解除） */
  private sleeping = new Set<string>();
  /** ルカニによる敵防御倍率 */
  private enemyDefMult = 1;

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
  }

  private get members(): PartyMember[] {
    return this.state.party;
  }

  override onEnter(): void {
    this.rng = this.state.run?.battleRng ?? this.game.rootRng.fork("battle-fallback");
    this.state.markSeen(this.enemy.def.id); // 図鑑: 目撃
    // ボス・中ボスは専用テーマ、それ以外は通常戦闘テーマへクロスフェード
    const bossTheme = this.enemy.def.boss || this.enemy.def.midboss;
    this.game.audio.playBgm(bossTheme ? "boss" : "battle");
    this.queueMsgs([{ text: `${this.enemy.def.name}が あらわれた！` }], () =>
      this.startRound(),
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
  // ラウンド進行
  // =========================================================================
  private startRound(): void {
    this.activeIdx = -1;
    this.nextMember();
  }

  private nextMember(): void {
    for (let i = this.activeIdx + 1; i < this.members.length; i++) {
      const m = this.members[i]!;
      if (!m.alive) continue;
      this.activeIdx = i;
      this.guarding.delete(m.id); // 前ラウンドのぼうぎょ解除

      // ねむり: 50% で目を覚ます。眠ったままなら行動スキップ
      if (this.sleeping.has(m.id)) {
        if (this.rng.chance(0.5)) {
          this.sleeping.delete(m.id);
          this.queueMsgs([{ text: `${m.name}は めを さました！` }], () => {
            this.commandMenu = this.buildCommandMenu(m);
            this.phase = "command";
          });
        } else {
          this.queueMsgs([{ text: `${m.name}は ぐうぐう ねむっている……` }], () =>
            this.nextMember(),
          );
        }
        return;
      }

      this.commandMenu = this.buildCommandMenu(m);
      this.phase = "command";
      return;
    }
    this.enemyPhase(this.enemy.def.boss ? bossActions(this.aliveCount()) : 1);
  }

  /** 魔法都市はMPコストが下がる */
  private spellCost(spell: SpellDef): number {
    return Math.max(1, spell.mp - spellMpDiscount(this.state.route));
  }

  private aliveCount(): number {
    return this.members.filter((m) => m.alive).length;
  }

  private activeMember(): PartyMember {
    return this.members[this.activeIdx]!;
  }

  private buildCommandMenu(m: PartyMember): ListMenu {
    const items = [
      { label: "たたかう", value: "attack" },
      { label: "ぼうぎょ", value: "guard" },
    ];
    if (m.spells().length > 0) items.push({ label: "じゅもん", value: "spell" });
    items.push({ label: "どうぐ", value: "item" });
    items.push({ label: "にげる", value: "flee" });
    return new ListMenu(items, m.name);
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
        const ev = this.commandMenu?.update(input, dt);
        if (ev?.type === "select") this.onCommand(ev.item.value);
        break;
      }
      case "spell": {
        const ev = this.subMenu?.update(input, dt);
        if (!ev) break;
        if (ev.type === "cancel") this.phase = "command";
        else this.onSpellChosen(SPELLS[ev.item.value as keyof typeof SPELLS]);
        break;
      }
      case "item": {
        const ev = this.subMenu?.update(input, dt);
        if (!ev) break;
        if (ev.type === "cancel") this.phase = "command";
        else this.onItemChosen(ev.item.value as ItemId);
        break;
      }
      case "target": {
        const ev = this.targetMenu?.update(input, dt);
        if (!ev) break;
        if (ev.type === "cancel") {
          this.phase = "command";
          this.pending = null;
          break;
        }
        this.onTargetChosen(ev.item.value);
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
    const m = this.activeMember();
    switch (cmd) {
      case "attack":
        this.memberAttack(m);
        break;
      case "guard":
        this.guarding.add(m.id);
        this.queueMsgs([{ text: `${m.name}は みを まもっている。` }], () =>
          this.nextMember(),
        );
        break;
      case "spell": {
        this.subMenu = new ListMenu(
          m.spells().map((s) => ({
            label: s.name,
            value: s.id,
            note: `MP ${this.spellCost(s)}`,
            disabled: m.mp < this.spellCost(s),
          })),
          "じゅもん",
        );
        this.phase = "spell";
        break;
      }
      case "item": {
        const usable = (Object.keys(this.state.inventory) as ItemId[]).filter(
          (id) =>
            (ITEMS[id].kind === "heal" || ITEMS[id].kind === "cureStatus") &&
            this.state.itemCount(id) > 0,
        );
        if (usable.length === 0) {
          this.queueMsgs([{ text: "つかえる どうぐを もっていない！" }], () => {
            this.phase = "command";
          });
          return;
        }
        this.subMenu = new ListMenu(
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
        this.tryFlee(m);
        break;
    }
  }

  private onSpellChosen(spell: SpellDef): void {
    const caster = this.activeMember();
    if (caster.mp < this.spellCost(spell)) return;
    if (spell.kind === "attack") {
      this.castAttackSpell(caster, spell);
    } else if (spell.kind === "debuffDef") {
      this.castDebuff(caster, spell);
    } else {
      // 回復・バフ・治療は対象を選ぶ
      this.pending = { kind: "spell", spell, caster };
      this.targetMenu = this.buildTargetMenu();
      this.phase = "target";
    }
  }

  private castDebuff(caster: PartyMember, spell: SpellDef): void {
    caster.mp -= this.spellCost(spell);
    this.enemyDefMult = Math.max(0.25, this.enemyDefMult - spell.power);
    this.queueMsgs(
      [
        {
          text: `${caster.name}は ${spell.name}を となえた！`,
          fx: () => (this.spellFlash = 0.4),
        },
        { text: `${this.enemy.def.name}の まもりが やわらいだ！` },
      ],
      () => this.afterMemberAction(),
    );
  }

  private onItemChosen(item: ItemId): void {
    this.pending = { kind: "item", item, user: this.activeMember() };
    this.targetMenu = this.buildTargetMenu();
    this.phase = "target";
  }

  private buildTargetMenu(): ListMenu {
    return new ListMenu(
      this.members
        .filter((m) => m.alive)
        .map((m) => ({
          label: m.name,
          value: m.id,
          note: `HP ${m.hp}/${m.maxHp}`,
        })),
      "だれに？",
    );
  }

  private onTargetChosen(memberId: string): void {
    const target = this.members.find((m) => m.id === memberId);
    const pending = this.pending;
    this.pending = null;
    if (!target || !pending) {
      this.phase = "command";
      return;
    }
    if (pending.kind === "spell") this.castSupportSpell(pending.caster, pending.spell, target);
    else this.useItem(pending.user, pending.item, target);
  }

  // =========================================================================
  // 行動の実装
  // =========================================================================
  private memberAttack(m: PartyMember): void {
    const crit = !this.enemy.def.boss && this.rng.chance(CRIT_CHANCE);
    let dmg = physDamage(m.atk, this.enemy.defense * this.enemyDefMult, this.rng);
    if (crit) dmg = Math.round(dmg * CRIT_MULT);

    const msgs: QueuedMsg[] = [
      { text: `${m.name}の こうげき！`, fx: () => this.game.audio.playSE("attack") },
    ];
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
    this.queueMsgs(msgs, () => this.afterMemberAction());
  }

  private castAttackSpell(caster: PartyMember, spell: SpellDef): void {
    caster.mp -= this.spellCost(spell);
    const dmg = spell.power + this.rng.int(0, spell.variance);
    this.queueMsgs(
      [
        {
          text: `${caster.name}は ${spell.name}を となえた！`,
          fx: () => {
            this.spellFlash = 0.6;
            this.game.audio.playSE("spell");
          },
        },
        {
          text: `${this.enemy.def.name}に ${dmg}の ダメージ！`,
          fx: () => this.damageEnemy(dmg),
        },
      ],
      () => this.afterMemberAction(),
    );
  }

  private castSupportSpell(
    caster: PartyMember,
    spell: SpellDef,
    target: PartyMember,
  ): void {
    caster.mp -= this.spellCost(spell);
    if (spell.kind === "cureStatus") {
      const cured = target.poisoned;
      target.poisoned = false;
      this.queueMsgs(
        [
          {
            text: `${caster.name}は ${spell.name}を となえた！`,
            fx: () => (this.spellFlash = 0.3),
          },
          {
            text: cured
              ? `${target.name}の どくが きえた！`
              : `……しかし なにも おこらなかった。`,
          },
        ],
        () => this.nextMember(),
      );
      return;
    }
    if (spell.kind === "heal") {
      const healed = target.heal(spell.power + this.rng.int(0, spell.variance));
      this.queueMsgs(
        [
          {
            text: `${caster.name}は ${spell.name}を となえた！`,
            fx: () => (this.spellFlash = 0.4),
          },
          {
            text: `${target.name}の HPが ${healed} かいふくした！`,
            fx: () => this.popupAtMember(target, `+${healed}`, "#8ef58e"),
          },
        ],
        () => this.nextMember(),
      );
    } else {
      // buffDef
      const cur = this.defBuff.get(target.id) ?? 1;
      this.defBuff.set(target.id, Math.min(2, cur + spell.power));
      this.queueMsgs(
        [
          {
            text: `${caster.name}は ${spell.name}を となえた！`,
            fx: () => (this.spellFlash = 0.4),
          },
          { text: `${target.name}の しゅびりょくが あがった！` },
        ],
        () => this.nextMember(),
      );
    }
  }

  private useItem(user: PartyMember, id: ItemId, target: PartyMember): void {
    const def = ITEMS[id];
    if (this.state.itemCount(id) <= 0) {
      this.phase = "command";
      return;
    }
    if (def.kind === "cureStatus") {
      this.state.removeItem(id);
      const cured = target.poisoned;
      target.poisoned = false;
      this.queueMsgs(
        [
          { text: `${user.name}は ${def.name}を つかった！` },
          {
            text: cured
              ? `${target.name}の どくが きえた！`
              : "……しかし なにも おこらなかった。",
          },
        ],
        () => this.nextMember(),
      );
      return;
    }
    if (def.kind !== "heal") {
      this.phase = "command";
      return;
    }
    this.state.removeItem(id);
    const healed = target.heal(def.power ?? 30);
    this.queueMsgs(
      [
        { text: `${user.name}は ${def.name}を つかった！` },
        {
          text: `${target.name}の HPが ${healed} かいふくした！`,
          fx: () => this.popupAtMember(target, `+${healed}`, "#8ef58e"),
        },
      ],
      () => this.nextMember(),
    );
  }

  /** ボス・中ボスからは逃げられない */
  private get canFleeEnemy(): boolean {
    return !this.enemy.def.boss && !this.enemy.def.midboss;
  }

  /** 敵の1ターンあたりの行動回数 */
  private enemyActionCount(): number {
    return this.enemy.def.boss ? bossActions(this.aliveCount()) : 1;
  }

  private tryFlee(m: PartyMember): void {
    if (!this.canFleeEnemy) {
      this.queueMsgs(
        [
          { text: `${m.name}たちは にげだそうとした！` },
          { text: "しかし にげられなかった！" },
        ],
        () => this.enemyPhase(this.enemyActionCount()),
      );
      return;
    }
    const canFlee = m.cls.passive?.fleeAlways === true || this.rng.chance(FLEE_CHANCE);
    if (canFlee) {
      this.queueMsgs([{ text: `${m.name}たちは にげだした！` }], () =>
        this.endBattle("fled"),
      );
    } else {
      // 逃走失敗はパーティ全体のターンを失う
      this.queueMsgs(
        [
          { text: `${m.name}たちは にげだした！` },
          { text: "しかし まわりこまれてしまった！" },
        ],
        () => this.enemyPhase(this.enemyActionCount()),
      );
    }
  }

  private damageEnemy(dmg: number): void {
    this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
    this.enemyFlash = 0.3;
    this.popups.push({ text: `${dmg}`, x: UI_W / 2, y: 130, t: 0, color: "#ffffff" });
    this.game.audio.playSe("hit");
  }

  private afterMemberAction(): void {
    if (this.enemy.hp <= 0) this.victory();
    else this.nextMember();
  }

  // =========================================================================
  // 敵ターン（remaining 回、1回ずつ対象を選び直して連鎖する）
  // =========================================================================
  private enemyPhase(remaining: number): void {
    const alive = this.members.filter((m) => m.alive);
    if (alive.length === 0 || remaining <= 0) {
      this.endEnemyPhase();
      return;
    }

    // 中ボスなどの専用攻撃（確率発動・全体攻撃）
    const sm = this.enemy.def.specialMove;
    if (sm && this.rng.chance(sm.chance)) {
      this.enemySpecialMove(remaining);
      return;
    }

    const target = this.rng.pick(alive)!;
    const def =
      (target.def + routeDefBonus(this.state.route)) *
      (this.defBuff.get(target.id) ?? 1);
    let dmg = physDamage(this.enemy.atk, def, this.rng);
    if (this.guarding.has(target.id)) dmg = Math.max(1, Math.round(dmg * GUARD_MULT));
    const willSurvive = target.hp - dmg > 0;

    const msgs: QueuedMsg[] = [
      {
        text: `${this.enemy.def.name}の こうげき！`,
        fx: () => (this.enemyLunge = 1),
      },
      {
        text: `${target.name}は ${dmg}の ダメージを うけた！`,
        fx: () => {
          target.damage(dmg);
          this.shake = 6;
          this.redFlash = 0.55;
          this.popupAtMember(target, `-${dmg}`, "#ff8a8a");
          this.game.audio.playSe("damage");
          // 攻撃を受けると目が覚める
          if (this.sleeping.has(target.id)) this.sleeping.delete(target.id);
        },
      },
    ];
    if (!willSurvive) {
      msgs.push({ text: `${target.name}は たおれてしまった！` });
    } else {
      // 状態異常の付与（コウモリ=どく / ゴースト=ねむり）
      const inflict = this.enemy.def.inflict;
      if (inflict && this.rng.chance(inflict.chance)) {
        if (inflict.status === "poison" && !target.poisoned) {
          msgs.push({
            text: `${target.name}は どくを うけてしまった！`,
            fx: () => (target.poisoned = true),
          });
        } else if (inflict.status === "sleep" && !this.sleeping.has(target.id)) {
          msgs.push({
            text: `${target.name}は ねむってしまった！`,
            fx: () => this.sleeping.add(target.id),
          });
        }
      }
    }
    this.queueMsgs(msgs, () => {
      if (this.aliveCount() === 0) this.defeat();
      else this.enemyPhase(remaining - 1);
    });
  }

  /** 敵の専用技（全体 or 単体の強攻撃 + 専用SE + 大きな演出） */
  private enemySpecialMove(remaining: number): void {
    const sm = this.enemy.def.specialMove!;
    const targets = sm.all
      ? this.members.filter((m) => m.alive)
      : [this.rng.pick(this.members.filter((m) => m.alive))!];

    const msgs: QueuedMsg[] = [
      {
        text: `${this.enemy.def.name}は「${sm.name}」を はなった！`,
        fx: () => {
          this.enemyLunge = 1;
          this.spellFlash = 0.7;
          this.shake = 8;
          this.game.audio.playSE(sm.se);
        },
      },
    ];
    for (const target of targets) {
      const def = (target.def + routeDefBonus(this.state.route)) * (this.defBuff.get(target.id) ?? 1);
      let dmg = Math.round(physDamage(this.enemy.atk, def, this.rng) * sm.mult);
      if (this.guarding.has(target.id)) dmg = Math.max(1, Math.round(dmg * GUARD_MULT));
      msgs.push({
        text: `${target.name}に ${dmg}の だいダメージ！`,
        fx: () => {
          target.damage(dmg);
          this.redFlash = 0.7;
          this.shake = 8;
          this.popupAtMember(target, `-${dmg}`, "#ff6a6a");
          this.game.audio.playSe("damage");
          if (this.sleeping.has(target.id)) this.sleeping.delete(target.id);
        },
      });
    }
    this.queueMsgs(msgs, () => {
      if (this.aliveCount() === 0) this.defeat();
      else this.enemyPhase(remaining - 1);
    });
  }

  private endEnemyPhase(): void {
    if (this.aliveCount() === 0) {
      this.defeat();
      return;
    }
    // どくのダメージ（ラウンド終了時）
    const poisoned = this.members.filter((m) => m.alive && m.poisoned);
    if (poisoned.length > 0) {
      const dmg = 3;
      this.queueMsgs(
        [
          {
            text: `どくが からだを むしばむ……！`,
            fx: () => {
              for (const m of poisoned) {
                m.damage(dmg);
                this.popupAtMember(m, `-${dmg}`, "#c9a7ff");
              }
            },
          },
        ],
        () => {
          if (this.aliveCount() === 0) this.defeat();
          else this.startRound();
        },
      );
      return;
    }
    this.startRound();
  }

  // =========================================================================
  // 決着
  // =========================================================================
  private victory(): void {
    this.enemyDead = true;
    const e = this.enemy;
    const alive = this.members.filter((m) => m.alive);

    // 図鑑・統計
    this.state.recordKill(e.def.id);
    this.state.stats.battlesWon++;

    this.state.gold += e.gold;
    const each = expShare(e.exp, alive.length);
    const msgs: QueuedMsg[] = [
      { text: `${e.def.name}を たおした！` },
      { text: `けいけんち ${each} かくとく！  ${e.gold}ゴールドを てにいれた！` },
    ];

    const drop = e.def.drop;
    if (drop) {
      const hasThief = alive.some((m) => m.cls.passive?.dropRate);
      const rate = Math.min(1, drop.chance * (hasThief ? 1.5 : 1));
      if (this.rng.chance(rate)) {
        this.state.addItem(drop.item, drop.count);
        const name = ITEMS[drop.item].name;
        const count = drop.count > 1 ? ` x${drop.count}` : "";
        msgs.push({ text: `${name}${count}を ひろった！` });
      }
    }

    for (const m of alive) {
      for (const up of m.gainExp(each)) {
        msgs.push({
          text: `${up.name}は レベル ${up.level}に あがった！`,
          fx: () => {
            this.spellFlash = 0.7;
            this.game.audio.playSe("levelup");
          },
        });
        for (const spell of up.learned) {
          msgs.push({ text: `${up.name}は じゅもん「${spell.name}」を おぼえた！` });
        }
      }
    }

    if (e.def.boss) {
      this.state.bossDefeated = true;
      msgs.push({ text: "どうくつに へいわが おとずれた……" });
      msgs.push({ text: "ふしぎな ちからが みんなを つつみこむ！" });
      this.queueMsgs(msgs, () => this.endBattle("bossVictory"));
    } else if (e.def.midboss) {
      // 中ボス撃破: 専用報酬 + この潜行で撃破済みに（bossDefeated は立てない）
      this.state.run?.midbossDefeated.add(this.floor);
      const bonus = e.def.bonusReward;
      if (bonus) {
        this.state.gold += bonus.gold;
        for (const it of bonus.items) this.state.addItem(it.id, it.count);
        const itemText = bonus.items
          .map((it) => `${ITEMS[it.id].name}${it.count > 1 ? ` x${it.count}` : ""}`)
          .join("、");
        msgs.push({
          text: `ふういんが とけた！ ${bonus.gold}ゴールドと ${itemText}を てにいれた！`,
          fx: () => {
            this.spellFlash = 0.7;
            this.game.audio.playSe("chest");
          },
        });
      }
      msgs.push({ text: "したかいへの みちが ひらけた！" });
      this.queueMsgs(msgs, () => this.endBattle("victory"));
    } else {
      this.queueMsgs(msgs, () => this.endBattle("victory"));
    }
  }

  private defeat(): void {
    this.queueMsgs(
      [
        { text: "ぜんめつしてしまった……" },
        { text: "めのまえが まっくらに なった……" },
      ],
      () => this.endBattle("defeat"),
    );
  }

  private endBattle(outcome: BattleOutcome): void {
    this.phase = "done";
    this.onEnd({ outcome });
    // 全滅・ボス勝利は onEnd 側が replaceAll で遷移させる（スタックごと破棄される）
    if (outcome === "victory" || outcome === "fled") {
      this.game.scenes.pop();
    }
  }

  private popupAtMember(m: PartyMember, text: string, color: string): void {
    const idx = this.members.indexOf(m);
    this.popups.push({ text, x: 236, y: 52 + idx * 20, t: 0, color });
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

    const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    grad.addColorStop(0, "#141020");
    grad.addColorStop(1, "#2c2438");
    ctx.fillStyle = grad;
    ctx.fillRect(-8, -8, WORLD_W + 16, WORLD_H + 16);

    ctx.fillStyle = "#3a3348";
    ctx.beginPath();
    ctx.ellipse(WORLD_W / 2, 118, 90, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    this.renderEnemy(ctx);
    ctx.restore();

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

    if (this.enemyFlash > 0 && Math.floor(this.enemyFlash * 24) % 2 === 0) return;

    ctx.save();
    if (this.enemyDead) ctx.globalAlpha = 1 - this.enemyDeathT;
    this.game.assets.drawSprite(ctx, this.enemy.def.sprite, x, y, size, size);
    ctx.restore();
  }

  private renderUi(ctx: CanvasRenderingContext2D): void {
    const text = this.game.text;

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

    this.renderPartyStatus(ctx);

    // コマンド・サブメニュー
    const menuY = 64 + this.members.length * 22;
    if (this.phase === "command") {
      this.commandMenu?.render(ctx, text, 24, menuY, 140);
    } else if (this.phase === "spell" || this.phase === "item") {
      this.subMenu?.render(ctx, text, 24, menuY, 200);
    } else if (this.phase === "target") {
      this.targetMenu?.render(ctx, text, 24, menuY, 210);
    }

    // メッセージウィンドウ
    const msgText =
      this.phase === "msg" && this.currentMsg
        ? this.currentMsg.text
        : this.phase === "command"
          ? `${this.activeMember().name}の コマンド？`
          : "";
    text.window(ctx, 48, UI_H - 80, UI_W - 96, 64);
    if (msgText) {
      text.draw(ctx, msgText, 64, UI_H - 62, { size: 13 });
    }

    for (const p of this.popups) {
      const alpha = 1 - p.t / 0.8;
      const rise = p.t * 34;
      ctx.save();
      ctx.globalAlpha = alpha;
      text.draw(ctx, p.text, p.x, p.y - rise, {
        size: 18,
        align: "center",
        color: p.color,
        bold: true,
      });
      ctx.restore();
    }

    if (this.redFlash > 0) {
      ctx.fillStyle = `rgba(200, 30, 30, ${(this.redFlash * 0.3).toFixed(3)})`;
      ctx.fillRect(0, 0, UI_W, UI_H);
    }

    if (this.introT < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(1 - this.introT).toFixed(3)})`;
      ctx.fillRect(0, 0, UI_W, UI_H);
    }
  }

  private renderPartyStatus(ctx: CanvasRenderingContext2D): void {
    const text = this.game.text;
    const h = 32 + this.members.length * 22;
    text.window(ctx, 24, 24, 262, h);
    this.members.forEach((m, i) => {
      const y = 42 + i * 22;
      const isActive = this.phase !== "msg" && i === this.activeIdx;
      if (isActive) {
        text.draw(ctx, "▶", 32, y, { size: 11, color: "#ffe9a0" });
      }
      const iconId = m.classId === "hero" ? "hero.down" : `chara.${m.classId}.down`;
      ctx.save();
      if (!m.alive) ctx.globalAlpha = 0.45;
      this.game.assets.drawSprite(ctx, iconId, 44, y - 3, 14, 14);
      ctx.restore();

      const nameColor = !m.alive ? "#7d7690" : isActive ? "#ffffff" : "#d8d2e8";
      const marks = [
        m.poisoned ? "毒" : "",
        this.sleeping.has(m.id) ? "眠" : "",
        this.defBuff.has(m.id) ? "↑" : "",
        this.guarding.has(m.id) ? "盾" : "",
      ].join("");
      text.draw(ctx, `${m.name}${marks}`, 62, y, { size: 11, color: nameColor });

      drawBar(ctx, 132, y + 1, 66, 9, m.alive ? m.hp / m.maxHp : 0, "hp");
      text.draw(ctx, `${m.hp}/${m.maxHp}`, 165, y + 1, { size: 9, align: "center" });
      drawBar(ctx, 204, y + 1, 48, 9, m.maxMp > 0 ? m.mp / m.maxMp : 0, "mp");
      text.draw(ctx, `${m.mp}`, 228, y + 1, { size: 9, align: "center" });
    });
  }
}
