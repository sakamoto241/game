import type { Game } from "../core/Game";
import { UI_W } from "../core/Renderer";
import { equipName } from "../data/equipment";
import { ITEMS, ITEM_IDS, type ItemId } from "../data/items";
import type { GameState } from "../world/GameState";
import type { PartyMember } from "../world/PartyMember";
import { ListMenu } from "./ListMenu";

/**
 * C キーで開くポーズメニュー（街・ダンジョン共用）。
 * つよさ（メンバー選択→ステータス）・どうぐ（対象選択つき使用）を提供する。
 * update の戻り値: "close" = 閉じた / "wing" = 帰還のつばさ使用（呼び出し側が遷移）
 */
export type PauseMenuResult = "close" | "wing" | null;

type Phase = "root" | "selectMember" | "status" | "items" | "target";

export class PauseMenu {
  private phase: Phase = "root";
  private root = new ListMenu(
    [
      { label: "つよさ", value: "status" },
      { label: "どうぐ", value: "items" },
      { label: "とじる", value: "close" },
    ],
    "メニュー",
  );
  private memberMenu: ListMenu | null = null;
  private items: ListMenu | null = null;
  private targetMenu: ListMenu | null = null;
  private statusTarget: PartyMember | null = null;
  private pendingItem: ItemId | null = null;
  private info: string | null = null;

  constructor(
    private state: GameState,
    private inDungeon: boolean,
  ) {}

  update(game: Game, dt: number): PauseMenuResult {
    const input = game.input;
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
      case "heal": {
        this.pendingItem = id;
        this.targetMenu = new ListMenu(
          this.state.party.map((m) => ({
            label: m.name,
            value: m.id,
            note: m.alive ? `HP ${m.hp}/${m.maxHp}` : "せんとうふのう",
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

  render(game: Game, ctx: CanvasRenderingContext2D): void {
    const text = game.text;
    const x = UI_W - 190;

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
