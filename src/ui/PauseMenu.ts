import type { Game } from "../core/Game";
import { UI_W, UI_H } from "../core/Renderer";
import { ACHIEVEMENTS } from "../data/achievements";
import { ENEMIES } from "../data/enemies";
import { equipName } from "../data/equipment";
import { ITEMS, ITEM_IDS, type ItemId } from "../data/items";
import type { GameState } from "../world/GameState";
import type { PartyMember } from "../world/PartyMember";
import { ListMenu } from "./ListMenu";
import { SettingsMenu } from "./SettingsMenu";

/**
 * C キーで開くポーズメニュー（街・ダンジョン共用）。
 * つよさ（メンバー選択→ステータス）・どうぐ（対象選択つき使用）を提供する。
 * update の戻り値: "close" = 閉じた / "wing" = 帰還のつばさ使用（呼び出し側が遷移）
 */
export type PauseMenuResult = "close" | "wing" | null;

type Phase =
  | "root"
  | "selectMember"
  | "status"
  | "items"
  | "target"
  | "dexRoot"
  | "dexList"
  | "achievements"
  | "settings";

export class PauseMenu {
  private phase: Phase = "root";
  private root = new ListMenu(
    [
      { label: "つよさ", value: "status" },
      { label: "どうぐ", value: "items" },
      { label: "ずかん", value: "dex" },
      { label: "じっせき", value: "achievements" },
      { label: "セーブ", value: "save" },
      { label: "せってい", value: "settings" },
      { label: "とじる", value: "close" },
    ],
    "メニュー",
  );
  private dexRoot: ListMenu | null = null;
  private dexList: ListMenu | null = null;
  private achList: ListMenu | null = null;
  private memberMenu: ListMenu | null = null;
  private items: ListMenu | null = null;
  private targetMenu: ListMenu | null = null;
  private settings: SettingsMenu | null = null;
  private statusTarget: PartyMember | null = null;
  private pendingItem: ItemId | null = null;
  private info: string | null = null;
  /** 手動セーブの結果トースト */
  private saveToast: { msg: string; color: string; t: number } | null = null;

  constructor(
    private state: GameState,
    private inDungeon: boolean,
  ) {}

  update(game: Game, dt: number): PauseMenuResult {
    const input = game.input;
    if (this.saveToast) {
      this.saveToast.t -= dt;
      if (this.saveToast.t <= 0) this.saveToast = null;
    }
    if (input.pressed("menu")) return "close";

    switch (this.phase) {
      case "root": {
        const ev = this.root.update(input, dt);
        if (!ev) return null;
        if (ev.type === "cancel" || ev.item.value === "close") return "close";
        if (ev.item.value === "status") {
          this.memberMenu = new ListMenu(
            this.state.party.map((m) => ({
              label: m.name,
              value: m.id,
              note: `Lv${m.level}`,
            })),
            "だれの つよさ？",
          );
          this.phase = "selectMember";
        }
        if (ev.item.value === "items") {
          this.items = this.buildItemMenu();
          this.info = null;
          this.phase = "items";
        }
        if (ev.item.value === "dex") {
          this.dexRoot = new ListMenu(
            [
              { label: "モンスターずかん", value: "monsters" },
              { label: "アイテムずかん", value: "items" },
            ],
            "ずかん",
          );
          this.phase = "dexRoot";
        }
        if (ev.item.value === "achievements") {
          const unlocked = this.state.achievements;
          this.achList = new ListMenu(
            ACHIEVEMENTS.map((a) => ({
              label: `${unlocked.includes(a.id) ? "★" : "・"}${a.name}`,
              value: a.id,
              note: unlocked.includes(a.id) ? "かいほう" : "",
            })),
            `じっせき ${unlocked.length}/${ACHIEVEMENTS.length}`,
          );
          this.phase = "achievements";
        }
        if (ev.item.value === "save") {
          this.doSave(game);
        }
        if (ev.item.value === "settings") {
          this.settings = new SettingsMenu();
          this.phase = "settings";
        }
        return null;
      }
      case "dexRoot": {
        const ev = this.dexRoot?.update(input, dt);
        if (!ev) return null;
        if (ev.type === "cancel") {
          this.phase = "root";
          return null;
        }
        this.dexList =
          ev.item.value === "monsters" ? this.buildMonsterDex() : this.buildItemDex();
        this.phase = "dexList";
        return null;
      }
      case "dexList": {
        const ev = this.dexList?.update(input, dt);
        if (ev?.type === "cancel") this.phase = "dexRoot";
        return null;
      }
      case "achievements": {
        const ev = this.achList?.update(input, dt);
        if (ev?.type === "cancel") this.phase = "root";
        return null;
      }
      case "settings": {
        if (this.settings?.update(game, dt) === "close") this.phase = "root";
        return null;
      }
      case "selectMember": {
        const ev = this.memberMenu?.update(input, dt);
        if (!ev) return null;
        if (ev.type === "cancel") {
          this.phase = "root";
          return null;
        }
        this.statusTarget =
          this.state.party.find((m) => m.id === ev.item.value) ?? null;
        this.phase = "status";
        return null;
      }
      case "status": {
        if (input.pressed("confirm") || input.pressed("cancel")) {
          this.phase = "selectMember";
        }
        return null;
      }
      case "items": {
        const ev = this.items?.update(input, dt);
        if (!ev) return null;
        if (ev.type === "cancel") {
          this.phase = "root";
          return null;
        }
        return this.onItemChosen(game, ev.item.value as ItemId);
      }
      case "target": {
        const ev = this.targetMenu?.update(input, dt);
        if (!ev) return null;
        if (ev.type === "cancel") {
          this.phase = "items";
          this.pendingItem = null;
          return null;
        }
        return this.useOnTarget(game, ev.item.value);
      }
    }
  }

  private buildMonsterDex(): ListMenu {
    const kills = this.state.stats.kills;
    const seen = this.state.seenEnemies;
    const known = ENEMIES.filter((e) => (kills[e.id] ?? 0) > 0).length;
    return new ListMenu(
      ENEMIES.map((e) => {
        const defeated = (kills[e.id] ?? 0) > 0;
        if (defeated) {
          return { label: e.name, value: e.id, note: `x${kills[e.id]}` };
        }
        if (seen.includes(e.id)) {
          return { label: e.name, value: e.id, note: "みかけた", disabled: true };
        }
        return { label: "？？？", value: e.id, note: "", disabled: true };
      }),
      `モンスターずかん ${known}/${ENEMIES.length}`,
    );
  }

  private buildItemDex(): ListMenu {
    const dex = this.state.itemDex;
    const known = ITEM_IDS.filter((id) => dex.includes(id)).length;
    return new ListMenu(
      ITEM_IDS.map((id) =>
        dex.includes(id)
          ? { label: ITEMS[id].name, value: id, note: ITEMS[id].desc }
          : { label: "？？？", value: id, note: "", disabled: true },
      ),
      `アイテムずかん ${known}/${ITEM_IDS.length}`,
    );
  }

  private buildItemMenu(): ListMenu {
    const entries = ITEM_IDS.filter((id) => this.state.itemCount(id) > 0).map(
      (id) => ({
        label: ITEMS[id].name,
        value: id,
        note: `x${this.state.itemCount(id)}`,
      }),
    );
    if (entries.length === 0) {
      entries.push({ label: "（なにも もっていない）", value: "none" as ItemId, note: "" });
    }
    return new ListMenu(entries, "どうぐ");
  }

  private onItemChosen(_game: Game, id: ItemId): PauseMenuResult {
    const def = ITEMS[id];
    if (!def || this.state.itemCount(id) <= 0) return null;
    switch (def.kind) {
      case "heal":
      case "cureStatus": {
        this.pendingItem = id;
        this.targetMenu = new ListMenu(
          this.state.party.map((m) => ({
            label: m.name,
            value: m.id,
            note: !m.alive
              ? "せんとうふのう"
              : def.kind === "cureStatus"
                ? m.poisoned
                  ? "どく"
                  : "けんこう"
                : `HP ${m.hp}/${m.maxHp}`,
            disabled: !m.alive,
          })),
          "だれに つかう？",
        );
        this.phase = "target";
        return null;
      }
      case "return": {
        if (!this.inDungeon) {
          this.info = "ここでは つかえない。";
          return null;
        }
        this.state.removeItem(id);
        return "wing";
      }
      case "material":
        this.info = "たてものの ざいりょうだ。";
        return null;
      case "valuable":
        this.info = "いちばで うれば おかねに なる。";
        return null;
      case "tool":
        this.info = "だいじな どうぐだ。つかう ばしょで Zキー。";
        return null;
    }
  }

  private useOnTarget(game: Game, memberId: string): PauseMenuResult {
    const id = this.pendingItem;
    this.pendingItem = null;
    const target = this.state.party.find((m) => m.id === memberId);
    this.phase = "items";
    if (!id || !target) return null;
    const def = ITEMS[id];
    if (def.kind === "cureStatus") {
      if (!target.poisoned) {
        this.info = `${target.name}は どくでは ない。`;
        return null;
      }
      this.state.removeItem(id);
      target.poisoned = false;
      this.info = `${target.name}の どくが きえた！`;
      game.audio.playSe("heal");
      this.items = this.buildItemMenu();
      return null;
    }
    if (target.hp >= target.maxHp) {
      this.info = `${target.name}の HPは まんたんだ。`;
      return null;
    }
    this.state.removeItem(id);
    const healed = target.heal(def.power ?? 30);
    this.info = `${target.name}の HPが ${healed} かいふくした！`;
    game.audio.playSe("heal");
    this.items = this.buildItemMenu();
    return null;
  }

  /** 手動セーブを実行し、結果トーストを仕込む */
  private doSave(game: Game): void {
    let ok = true;
    try {
      this.state.save(game);
    } catch {
      ok = false;
    }
    game.audio.playSe(ok ? "decide" : "cancel");
    this.saveToast = ok
      ? { msg: "セーブしました！", color: "#8ef58e", t: 2 }
      : { msg: "セーブできませんでした", color: "#ff6a6a", t: 2 };
  }

  render(game: Game, ctx: CanvasRenderingContext2D): void {
    const text = game.text;
    const x = UI_W - 190;
    if (this.saveToast) {
      text.draw(ctx, this.saveToast.msg, UI_W / 2, UI_H - 40, {
        size: 15,
        align: "center",
        bold: true,
        color: this.saveToast.color,
      });
    }

    switch (this.phase) {
      case "root":
        this.root.render(ctx, text, x, 50, 170);
        break;
      case "selectMember":
        this.memberMenu?.render(ctx, text, x - 30, 50, 200);
        break;
      case "status":
        this.renderStatus(game, ctx);
        break;
      case "settings":
        this.settings?.render(game, ctx);
        break;
      case "dexRoot":
        this.dexRoot?.render(ctx, text, x - 60, 50, 230);
        break;
      case "dexList":
        this.dexList?.render(ctx, text, x - 180, 30, 350);
        break;
      case "achievements": {
        this.achList?.render(ctx, text, x - 220, 20, 390);
        // 選択中の実績の説明を下に出す
        const menu = this.achList;
        if (menu) {
          const def = ACHIEVEMENTS[menu.index];
          if (def) {
            const y = 20 + menu.height() + 6;
            const w = Math.max(menu.renderedWidth, 390);
            text.window(ctx, x - 220, y, w, 32);
            text.draw(ctx, def.desc, x - 206, y + 11, { size: 11, color: "#b8b0d8" });
          }
        }
        break;
      }
      case "items":
      case "target": {
        this.items?.render(ctx, text, x - 40, 50, 210);
        if (this.phase === "target") {
          this.targetMenu?.render(ctx, text, x - 90, 90, 230);
        } else if (this.info) {
          const y = 50 + (this.items?.height() ?? 60) + 8;
          text.window(ctx, x - 40, y, 210, 34);
          text.draw(ctx, this.info, x - 26, y + 11, { size: 11 });
        }
        break;
      }
    }
  }

  private renderStatus(game: Game, ctx: CanvasRenderingContext2D): void {
    const s = this.statusTarget;
    if (!s) return;
    const text = game.text;
    const x = UI_W - 250;
    const rows: [string, string][] = [
      ["しょくぎょう", s.cls.name],
      ["レベル", `${s.level}`],
      ["HP", `${s.hp} / ${s.maxHp}`],
      ["MP", `${s.mp} / ${s.maxMp}`],
      ["こうげき力", `${s.atk}`],
      ["しゅび力", `${s.def}`],
      ["ぶき", equipName(s.equip.weapon)],
      ["たて", equipName(s.equip.shield)],
      ["よろい", equipName(s.equip.armor)],
      ["つぎのレベルまで", `${s.expToNextLevel - s.exp}`],
    ];
    const h = rows.length * 18 + 40;
    text.window(ctx, x, 30, 230, h);
    text.draw(ctx, `${s.name} の つよさ`, x + 115, 42, {
      size: 12,
      align: "center",
      color: "#ffe9a0",
      bold: true,
    });
    rows.forEach(([label, value], i) => {
      const y = 64 + i * 18;
      text.draw(ctx, label, x + 16, y, { size: 12, color: "#b8b0d8" });
      text.draw(ctx, value, x + 214, y, { size: 12, align: "right" });
    });
  }
}
