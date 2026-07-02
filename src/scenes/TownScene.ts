import { Camera } from "../core/Camera";
import type { Renderer } from "../core/Renderer";
import { UI_W, UI_H } from "../core/Renderer";
import { Scene } from "../core/Scene";
import { T, TILE_DEFS, TOWN_LEGEND } from "../data/tiles";
import { TOWN_MAP_ROWS } from "../data/maps";
import { TILE, TileMap } from "../gfx/TileMap";
import { Player } from "../world/Player";
import { DungeonScene } from "./DungeonScene";

const DEFAULT_SPAWN = { x: 12, y: 9 };

/**
 * 街「アルバの村」。Phase 0 では歩行・宿屋の扉調べ・ポータルからのダンジョン遷移まで。
 */
export class TownScene extends Scene {
  readonly name = "Town";

  private map!: TileMap;
  private player!: Player;
  private cam = new Camera();
  private bannerTimer = 3;
  private message: string[] | null = null;
  /** ダンジョンから戻った直後にポータルが即再発動しないようにするラッチ */
  private portalArmed = false;
  private leaving = false;

  constructor(private spawn: { x: number; y: number } = DEFAULT_SPAWN) {
    super();
  }

  override onEnter(): void {
    this.map = TileMap.fromStrings(TOWN_MAP_ROWS, TOWN_LEGEND);
    this.player = new Player(this.spawn.x, this.spawn.y);
    this.portalArmed = this.map.get(this.spawn.x, this.spawn.y) !== T.PORTAL;
    this.game.audio.playBgm("town");
  }

  update(dt: number): void {
    if (this.bannerTimer > 0) this.bannerTimer -= dt;

    const input = this.game.input;

    // メッセージ表示中は移動を止め、閉じる操作だけ受け付ける
    if (this.message) {
      if (input.pressed("confirm") || input.pressed("cancel")) {
        this.message = null;
        this.game.audio.playSe("cancel");
      }
      return;
    }
    if (this.leaving) return;

    this.player.update(dt, input, this.map, TILE_DEFS);
    this.game.debug.set("Pos", `(${this.player.tileX}, ${this.player.tileY})`);

    const standingTile = this.map.get(this.player.tileX, this.player.tileY);

    // ポータル: 一度離れてから乗ったときだけ発動
    if (standingTile !== T.PORTAL) {
      this.portalArmed = true;
    } else if (this.portalArmed && !this.player.isMoving) {
      this.leaving = true;
      this.game.audio.playSe("warp");
      this.game.scenes.replace(new DungeonScene(), 0.5);
      return;
    }

    // しらべる: 目の前 or 足元の扉
    if (input.pressed("confirm") && !this.player.isMoving) {
      const facing = this.player.facingTile();
      const target =
        this.map.get(facing.x, facing.y) === T.DOOR
          ? T.DOOR
          : standingTile === T.DOOR
            ? T.DOOR
            : null;
      if (target === T.DOOR) {
        this.game.audio.playSe("decide");
        this.message = this.game.text.wrap(
          "やどや『ねむりの おおかみ亭』\n「いらっしゃい！ ‥‥‥といいたいところだが、まだ かいそうちゅうなんだ。Phase 1 を たのしみに しておくれ！」",
          40,
        );
      }
    }
  }

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

    // 到着バナー
    if (this.bannerTimer > 0) {
      const alpha = Math.min(1, this.bannerTimer / 0.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      text.window(ctx, UI_W / 2 - 90, 18, 180, 34);
      text.draw(ctx, "アルバの村", UI_W / 2, 27, {
        size: 15,
        align: "center",
        bold: true,
      });
      ctx.restore();
    }

    // メッセージウィンドウ
    if (this.message) {
      this.renderMessage(ctx, this.message);
    } else {
      text.draw(ctx, "移動: 矢印/WASD   Z: しらべる", UI_W - 12, UI_H - 20, {
        size: 10,
        align: "right",
        color: "#cfc8e8",
      });
    }
  }

  private renderMessage(ctx: CanvasRenderingContext2D, lines: string[]): void {
    const text = this.game.text;
    const w = UI_W - 96;
    const h = Math.max(64, lines.length * 18 + 26);
    const x = 48;
    const y = UI_H - h - 16;
    text.window(ctx, x, y, w, h);
    lines.forEach((line, i) => {
      text.draw(ctx, line, x + 16, y + 14 + i * 18, { size: 13 });
    });
    // 入力待ちカーソル（点滅）
    if (Math.sin(this.game.elapsed * 6) > 0) {
      text.draw(ctx, "▼", x + w - 22, y + h - 20, { size: 12, color: "#ffe9a0" });
    }
  }
}
