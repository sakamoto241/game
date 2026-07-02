import { Camera } from "../core/Camera";
import type { Renderer } from "../core/Renderer";
import { UI_W, UI_H } from "../core/Renderer";
import { Scene } from "../core/Scene";
import { INN_PRICE, WEAPON_SHOP_COST } from "../data/balance";
import { ITEMS } from "../data/items";
import { T, TILE_DEFS, TOWN_LEGEND } from "../data/tiles";
import { TOWN_MAP_ROWS } from "../data/maps";
import { WEAPONS, SHOP_WEAPONS, type WeaponId } from "../data/weapons";
import { TILE, TileMap } from "../gfx/TileMap";
import { ListMenu } from "../ui/ListMenu";
import { drawBanner, drawMessage, drawToast } from "../ui/Windows";
import { PauseMenu } from "../ui/PauseMenu";
import type { GameState } from "../world/GameState";
import { Player } from "../world/Player";
import { DungeonScene } from "./DungeonScene";

export const DEFAULT_SPAWN = { x: 12, y: 9 };
/** 宿屋の扉の前 */
export const INN_SPAWN = { x: 12, y: 6 };
/** ポータルの上（portalArmed ラッチで即再発動を防ぐ） */
export const PORTAL_SPAWN = { x: 12, y: 18 };

/** 武器屋の建設位置（屋根2段 + 扉の段） */
const SHOP_PLOT = { x0: 3, x1: 8, roofY0: 3, roofY1: 4, doorY: 5 };
const SIGN_POS = { x: 5, y: 7 };

type Dialog =
  | { kind: "message"; lines: string[] }
  | { kind: "menu"; id: "inn" | "shop" | "build"; menu: ListMenu }
  | null;

/**
 * 街「アルバの村」。宿屋・建築予定地・武器屋(建設後)・ポータル。
 * 街に入るたびにオートセーブする。
 */
export class TownScene extends Scene {
  readonly name = "Town";

  private map!: TileMap;
  private player!: Player;
  private cam = new Camera();
  private bannerTimer = 2.6;
  private dialog: Dialog = null;
  private pauseMenu: PauseMenu | null = null;
  private toastTimer = 0;
  private portalArmed = false;
  private leaving = false;

  constructor(
    private state: GameState,
    private spawn: { x: number; y: number } = DEFAULT_SPAWN,
    private introMessage?: string[],
  ) {
    super();
  }

  override onEnter(): void {
    this.state.endRun(); // 街に戻った時点でランは終了
    this.map = TileMap.fromStrings(TOWN_MAP_ROWS, TOWN_LEGEND);
    this.applyTownState();
    this.player = new Player(this.spawn.x, this.spawn.y);
    this.portalArmed = this.map.get(this.spawn.x, this.spawn.y) !== T.PORTAL;
    this.game.audio.playBgm("town");
    if (this.introMessage) {
      this.dialog = { kind: "message", lines: this.introMessage };
      this.introMessage = undefined;
    }
    this.state.save(this.game);
    this.toastTimer = 1.8;
  }

  /** 街の発展状態をマップに反映する */
  private applyTownState(): void {
    if (this.state.town.weaponShop) {
      const p = SHOP_PLOT;
      for (let x = p.x0; x <= p.x1; x++) {
        this.map.set(x, p.roofY0, T.ROOF);
        this.map.set(x, p.roofY1, T.ROOF);
        this.map.set(x, p.doorY, T.WALL);
      }
      this.map.set(5, p.doorY, T.SHOP_DOOR);
      this.map.set(6, p.doorY, T.SHOP_DOOR);
      this.map.set(SIGN_POS.x, SIGN_POS.y, T.GRASS);
    }
  }

  // =========================================================================
  // 更新
  // =========================================================================
  update(dt: number): void {
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.toastTimer > 0) this.toastTimer -= dt;
    if (this.leaving) return;

    const input = this.game.input;

    if (this.dialog) {
      this.updateDialog(dt);
      return;
    }

    if (this.pauseMenu) {
      const result = this.pauseMenu.update(this.game, dt);
      if (result === "close" || result === "wing") this.pauseMenu = null;
      return;
    }
    if (input.pressed("menu")) {
      this.pauseMenu = new PauseMenu(this.state, false);
      return;
    }

    this.player.update(dt, input, this.map, TILE_DEFS);
    this.game.debug.set("Pos", `(${this.player.tileX}, ${this.player.tileY})`);

    const standingTile = this.map.get(this.player.tileX, this.player.tileY);

    // ポータル（到着イベントで判定。スポーン直後の即再発動はラッチで防ぐ）
    const arrival = this.player.arrival;
    if (arrival) {
      if (this.map.get(arrival.x, arrival.y) !== T.PORTAL) {
        this.portalArmed = true;
      } else if (this.portalArmed) {
        this.leaving = true;
        this.game.audio.playSe("warp");
        this.game.scenes.replace(new DungeonScene(this.state, 1), 0.5);
        return;
      }
    }

    // しらべる
    if (input.pressed("confirm") && !this.player.isMoving) {
      const facing = this.player.facingTile();
      const target = this.map.get(facing.x, facing.y);
      const here = standingTile;
      if (target === T.DOOR || here === T.DOOR) this.openInn();
      else if (target === T.SHOP_DOOR || here === T.SHOP_DOOR) this.openShop();
      else if (target === T.SIGN) this.openBuildMenu();
    }
  }

  private updateDialog(dt: number): void {
    const input = this.game.input;
    const dialog = this.dialog;
    if (!dialog) return;

    if (dialog.kind === "message") {
      if (input.pressed("confirm") || input.pressed("cancel")) {
        this.dialog = null;
      }
      return;
    }

    const ev = dialog.menu.update(input, dt);
    if (!ev) return;
    if (ev.type === "cancel") {
      this.dialog = null;
      return;
    }
    switch (dialog.id) {
      case "inn":
        this.onInnSelect(ev.item.value);
        break;
      case "shop":
        this.onShopSelect(ev.item.value as WeaponId | "quit");
        break;
      case "build":
        this.onBuildSelect(ev.item.value);
        break;
    }
  }

  // =========================================================================
  // 宿屋
  // =========================================================================
  private openInn(): void {
    this.game.audio.playSe("decide");
    this.dialog = {
      kind: "menu",
      id: "inn",
      menu: new ListMenu(
        [
          { label: "とまる（HP・MP かいふく）", value: "rest", note: `${INN_PRICE}G` },
          { label: `${ITEMS.yakusou.name}を かう`, value: "yakusou", note: `${ITEMS.yakusou.price}G` },
          { label: `${ITEMS.tsubasa.name}を かう`, value: "tsubasa", note: `${ITEMS.tsubasa.price}G` },
          { label: "やめる", value: "quit" },
        ],
        "やどや『ねむりのおおかみ亭』",
      ),
    };
  }

  private onInnSelect(value: string): void {
    switch (value) {
      case "rest": {
        if (this.state.gold < INN_PRICE) {
          this.showMessage(["「おかねが たりないようだね。」"]);
          return;
        }
        this.state.gold -= INN_PRICE;
        this.state.hp = this.state.maxHp;
        this.state.mp = this.state.maxMp;
        this.state.save(this.game);
        this.showMessage([
          "ぐっすり ねむって つかれが とれた！",
          "HPと MPが ぜんかいふくした！",
        ]);
        this.game.audio.playSe("heal");
        return;
      }
      case "yakusou":
      case "tsubasa": {
        const item = ITEMS[value];
        if (this.state.gold < item.price) {
          this.showMessage(["「おかねが たりないようだね。」"]);
          return;
        }
        this.state.gold -= item.price;
        this.state.addItem(item.id);
        this.state.save(this.game);
        this.showMessage([`${item.name}を こうにゅうした！（x${this.state.itemCount(item.id)}）`]);
        this.game.audio.playSe("buy");
        return;
      }
      default:
        this.dialog = null;
    }
  }

  // =========================================================================
  // 武器屋
  // =========================================================================
  private openShop(): void {
    this.game.audio.playSe("decide");
    this.dialog = {
      kind: "menu",
      id: "shop",
      menu: new ListMenu(
        [
          ...SHOP_WEAPONS.map((id) => {
            const w = WEAPONS[id];
            const owned = this.weaponRank(this.state.weaponId) >= this.weaponRank(id);
            return {
              label: `${w.name}（こうげき +${w.atk}）`,
              value: id,
              note: owned ? "そうびちゅう" : `${w.price}G`,
              disabled: owned,
            };
          }),
          { label: "やめる", value: "quit" },
        ],
        "ぶきや『はがねのタカ』",
      ),
    };
  }

  private weaponRank(id: WeaponId): number {
    return SHOP_WEAPONS.indexOf(id); // none は -1
  }

  private onShopSelect(value: WeaponId | "quit"): void {
    if (value === "quit") {
      this.dialog = null;
      return;
    }
    const weapon = WEAPONS[value];
    if (this.state.gold < weapon.price) {
      this.showMessage(["「おかねが たりないぜ。 また きてくれ！」"]);
      return;
    }
    this.state.gold -= weapon.price;
    this.state.weaponId = weapon.id;
    this.state.save(this.game);
    this.game.audio.playSe("buy");
    this.showMessage([
      `${weapon.name}を こうにゅうして そうびした！`,
      `こうげき力が ${this.state.atk}に あがった！`,
    ]);
  }

  // =========================================================================
  // 建築
  // =========================================================================
  private openBuildMenu(): void {
    this.game.audio.playSe("decide");
    const cost = WEAPON_SHOP_COST;
    this.dialog = {
      kind: "menu",
      id: "build",
      menu: new ListMenu(
        [
          {
            label: "ぶきやを たてる",
            value: "build",
            note: `こうせき${cost.kouseki} + ${cost.gold}G`,
          },
          { label: "やめる", value: "quit" },
        ],
        `けんちくよていち（こうせき: ${this.state.itemCount("kouseki")}こ しょじ）`,
      ),
    };
  }

  private onBuildSelect(value: string): void {
    if (value !== "build") {
      this.dialog = null;
      return;
    }
    const cost = WEAPON_SHOP_COST;
    if (this.state.itemCount("kouseki") < cost.kouseki || this.state.gold < cost.gold) {
      this.showMessage([
        "ざいりょうが たりない！",
        `ひつよう: こうせき${cost.kouseki}こ と ${cost.gold}ゴールド`,
        "（こうせきは ダンジョンの たからばこや がいこつへいから てにはいる）",
      ]);
      return;
    }
    // 建設予定地の上に立っていたら建てられない
    const p = SHOP_PLOT;
    if (
      this.player.tileX >= p.x0 &&
      this.player.tileX <= p.x1 &&
      this.player.tileY >= p.roofY0 &&
      this.player.tileY <= p.doorY
    ) {
      this.showMessage(["そこに たっていては たてられない！"]);
      return;
    }
    this.state.removeItem("kouseki", cost.kouseki);
    this.state.gold -= cost.gold;
    this.state.town.weaponShop = true;
    this.applyTownState();
    this.state.save(this.game);
    this.game.audio.playSe("build");
    this.bannerTimer = 3; // 完成を祝って村名バナー再表示
    this.showMessage([
      "トンテンカン トンテンカン……",
      "ぶきや『はがねのタカ』が かんせいした！！",
      "むらが すこし にぎやかに なった。",
    ]);
  }

  private showMessage(lines: string[]): void {
    this.dialog = { kind: "message", lines };
  }

  // =========================================================================
  // 描画
  // =========================================================================
  render(r: Renderer): void {
    const ctx = r.world;
    const px = this.player.px + TILE / 2;
    const py = this.player.py + TILE / 2;
    this.cam.centerOn(px, py, this.map.widthPx, this.map.heightPx);

    this.cam.begin(ctx);
    this.map.render(ctx, this.cam, TILE_DEFS, this.game.assets);
    this.player.render(ctx, this.game.assets);
    this.cam.end(ctx);

    this.renderUi(r.ui);
  }

  private renderUi(ctx: CanvasRenderingContext2D): void {
    const text = this.game.text;
    this.renderHud(ctx);
    drawBanner(this.game, ctx, "アルバの村", this.bannerTimer);
    drawToast(this.game, ctx, "オートセーブしました", this.toastTimer);

    if (this.pauseMenu) {
      this.pauseMenu.render(this.game, ctx);
      return;
    }

    const dialog = this.dialog;
    if (dialog?.kind === "message") {
      drawMessage(this.game, ctx, dialog.lines);
    } else if (dialog?.kind === "menu") {
      dialog.menu.render(ctx, text, 64, UI_H - dialog.menu.height() - 96, 320);
    } else {
      text.draw(ctx, "移動: 矢印/WASD   Z: しらべる   C: メニュー", UI_W - 12, UI_H - 20, {
        size: 10,
        align: "right",
        color: "#cfc8e8",
      });
    }
  }

  private renderHud(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    const text = this.game.text;
    text.window(ctx, UI_W - 196, 10, 186, 46);
    const hpColor =
      s.hp <= s.maxHp * 0.25 ? "#ff8a8a" : s.hp <= s.maxHp * 0.5 ? "#ffd970" : "#f5f1e8";
    text.draw(ctx, `HP ${s.hp}/${s.maxHp}`, UI_W - 182, 20, { size: 11, color: hpColor });
    text.draw(ctx, `MP ${s.mp}/${s.maxMp}`, UI_W - 96, 20, { size: 11, color: "#a8c8f0" });
    text.draw(ctx, `${s.gold} G`, UI_W - 182, 37, { size: 11, color: "#ffd970" });
    text.draw(ctx, `Lv ${s.level}`, UI_W - 96, 37, { size: 11 });
  }
}
