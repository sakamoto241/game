import { Camera } from "../core/Camera";
import type { Renderer } from "../core/Renderer";
import { UI_W, UI_H, WORLD_W, WORLD_H } from "../core/Renderer";
import { Scene } from "../core/Scene";
import { T, TILE_DEFS, DUNGEON_LEGEND } from "../data/tiles";
import { DUNGEON_MAP_ROWS } from "../data/maps";
import { TILE, TileMap } from "../gfx/TileMap";
import { Player } from "../world/Player";
import { TownScene } from "./TownScene";

/** 街に戻ったとき、ポータルの上に出現する（portalArmed ラッチで再発動を防ぐ） */
const TOWN_PORTAL_SPAWN = { x: 12, y: 18 };

/**
 * ダンジョン「はじまりの洞窟」。
 * Phase 0 は固定マップ + 松明風の視界演出。X キーで街へ帰還。
 * Phase 1 でマップ生成が DungeonGenerator（シード付き Rng 使用）に置き換わる。
 */
export class DungeonScene extends Scene {
  readonly name = "Dungeon";

  private map!: TileMap;
  private player!: Player;
  private cam = new Camera();
  private bannerTimer = 3;
  private message: string[] | null = null;
  private leaving = false;

  override onEnter(): void {
    this.map = TileMap.fromStrings(DUNGEON_MAP_ROWS, DUNGEON_LEGEND);
    const spawn = this.map.findTiles(T.EXIT)[0] ?? { x: 1, y: 1 };
    this.player = new Player(spawn.x, spawn.y);
    this.game.audio.playBgm("dungeon");
  }

  update(dt: number): void {
    if (this.bannerTimer > 0) this.bannerTimer -= dt;

    const input = this.game.input;

    if (this.message) {
      if (input.pressed("confirm") || input.pressed("cancel")) {
        this.message = null;
        this.game.audio.playSe("cancel");
      }
      return;
    }
    if (this.leaving) return;

    // X キーでいつでも帰還（Phase 0 の仮仕様。Phase 1 で「帰還の巻物」等に置換）
    if (input.pressed("cancel")) {
      this.leaving = true;
      this.game.audio.playSe("warp");
      this.game.scenes.replace(new TownScene(TOWN_PORTAL_SPAWN), 0.5);
      return;
    }

    this.player.update(dt, input, this.map, TILE_DEFS);
    this.game.debug.set("Pos", `(${this.player.tileX}, ${this.player.tileY})`);

    if (input.pressed("confirm") && !this.player.isMoving) {
      const standing = this.map.get(this.player.tileX, this.player.tileY);
      const facing = this.player.facingTile();
      if (standing === T.STAIRS || this.map.get(facing.x, facing.y) === T.STAIRS) {
        this.game.audio.playSe("decide");
        this.message = this.game.text.wrap(
          "ちかふかくへ つづく かいだんだ。\n（ランダムせいせいダンジョンは Phase 1 で かいほうされます）",
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

    // マップ外の余白は洞窟の闇
    ctx.fillStyle = "#1a1722";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    this.cam.begin(ctx);
    this.map.render(ctx, this.cam, TILE_DEFS, this.game.assets);
    this.player.render(ctx, this.game.assets);
    this.cam.end(ctx);

    this.renderTorchlight(ctx);
    this.renderUi(r.ui);
  }

  /** プレイヤーを中心とした松明風の視界。ゆらぎ付き */
  private renderTorchlight(ctx: CanvasRenderingContext2D): void {
    const sx = this.cam.toScreenX(this.player.px + TILE / 2);
    const sy = this.cam.toScreenY(this.player.py + TILE / 2);
    const flicker = 4 * Math.sin(this.game.elapsed * 7.3) + 2 * Math.sin(this.game.elapsed * 13.1);
    const radius = 92 + flicker;
    const grad = ctx.createRadialGradient(sx, sy, radius * 0.32, sx, sy, radius);
    grad.addColorStop(0, "rgba(8, 6, 18, 0)");
    grad.addColorStop(0.7, "rgba(8, 6, 18, 0.55)");
    grad.addColorStop(1, "rgba(8, 6, 18, 0.92)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  private renderUi(ctx: CanvasRenderingContext2D): void {
    const text = this.game.text;

    if (this.bannerTimer > 0) {
      const alpha = Math.min(1, this.bannerTimer / 0.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      text.window(ctx, UI_W / 2 - 110, 18, 220, 34);
      text.draw(ctx, "はじまりの洞窟 B1F", UI_W / 2, 27, {
        size: 15,
        align: "center",
        bold: true,
      });
      ctx.restore();
    }

    if (this.message) {
      this.renderMessage(ctx, this.message);
    } else {
      text.draw(ctx, "Z: しらべる   X: 村へもどる", UI_W - 12, UI_H - 20, {
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
    if (Math.sin(this.game.elapsed * 6) > 0) {
      text.draw(ctx, "▼", x + w - 22, y + h - 20, { size: 12, color: "#ffe9a0" });
    }
  }
}
