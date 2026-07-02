import type { Game } from "../core/Game";
import { UI_W } from "../core/Renderer";
import { ITEMS, ITEM_IDS, type ItemId } from "../data/items";
import { WEAPONS } from "../data/weapons";
import type { GameState } from "../world/GameState";
import { ListMenu } from "./ListMenu";

/**
 * C キーで開くポーズメニュー（街・ダンジョン共用）。
 * つよさ（ステータス）・どうぐ（使用）を提供する。
 * update の戻り値: "close" = 閉じた / "wing" = 帰還のつばさ使用（呼び出し側が遷移）
 */
export type PauseMenuResult = "close" | "wing" | null;

type Phase = "root" | "status" | "items";

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
  private items: ListMenu | null = null;
  /** メニュー下に出す1行フィードバック */
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
        if (ev.type === "cancel") return "close";
        if (ev.item.value === "close") return "close";
        if (ev.item.value === "status") this.phase = "status";
        if (ev.item.value === "items") {
          this.items = this.buildItemMenu();
          this.info = null;
          this.phase = "items";
        }
        return null;
      }
      case "status": {
        if (input.pressed("confirm") || input.pressed("cancel")) {
          this.phase = "root";
        }
        return null;
      }
      case "items": {
        if (!this.items) {
          this.phase = "root";
          return null;
        }
        const ev = this.items.update(input, dt);
        if (!ev) return null;
        if (ev.type === "cancel") {
          this.phase = "root";
          return null;
        }
        return this.useItem(game, ev.item.value as ItemId);
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

  private useItem(game: Game, id: ItemId): PauseMenuResult {
    const def = ITEMS[id];
    if (!def || this.state.itemCount(id) <= 0) return null;
    switch (def.kind) {
      case "heal": {
        if (this.state.hp >= this.state.maxHp) {
          this.info = "HPは まんたんだ。";
          return null;
        }
        this.state.removeItem(id);
        const healed = this.state.heal(def.power ?? 30);
        this.info = `HPが ${healed} かいふくした！`;
        game.audio.playSe("heal");
        this.items = this.buildItemMenu();
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
      case "material": {
        this.info = "たてものの ざいりょうだ。";
        return null;
      }
    }
  }

  render(game: Game, ctx: CanvasRenderingContext2D): void {
    const text = game.text;
    const x = UI_W - 190;

    switch (this.phase) {
      case "root":
        this.root.render(ctx, text, x, 50, 170);
        break;
      case "status":
        this.renderStatus(game, ctx);
        break;
      case "items": {
        this.items?.render(ctx, text, x - 40, 50, 210);
        if (this.info) {
          const y = 50 + (this.items?.height() ?? 60) + 8;
          text.window(ctx, x - 40, y, 210, 34);
          text.draw(ctx, this.info, x - 26, y + 11, { size: 11 });
        }
        break;
      }
    }
  }

  private renderStatus(game: Game, ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    const text = game.text;
    const x = UI_W - 230;
    const rows: [string, string][] = [
      ["レベル", `${s.level}`],
      ["HP", `${s.hp} / ${s.maxHp}`],
      ["MP", `${s.mp} / ${s.maxMp}`],
      ["こうげき力", `${s.atk}`],
      ["しゅび力", `${s.def}`],
      ["ぶき", WEAPONS[s.weaponId].name],
      ["つぎのレベルまで", `${s.expToNextLevel - s.exp}`],
      ["ゴールド", `${s.gold} G`],
    ];
    const h = rows.length * 18 + 40;
    text.window(ctx, x, 40, 210, h);
    text.draw(ctx, "つよさ", x + 105, 52, {
      size: 12,
      align: "center",
      color: "#ffe9a0",
      bold: true,
    });
    rows.forEach(([label, value], i) => {
      const y = 74 + i * 18;
      text.draw(ctx, label, x + 16, y, { size: 12, color: "#b8b0d8" });
      text.draw(ctx, value, x + 194, y, { size: 12, align: "right" });
    });
  }
}
