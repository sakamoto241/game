import { Camera } from "../core/Camera";
import type { Renderer } from "../core/Renderer";
import { UI_W, UI_H, WORLD_W, WORLD_H } from "../core/Renderer";
import { Scene } from "../core/Scene";
import {
  DUNGEON_MAX_FLOOR,
  ENCOUNTER_RATE,
  GRACE_AFTER_BATTLE,
  GRACE_FLOOR_START,
} from "../data/balance";
import { enemiesForFloor, bossDef, spawnEnemy } from "../data/enemies";
import { ITEMS } from "../data/items";
import { T, TILE_DEFS } from "../data/tiles";
import { TILE, TileMap } from "../gfx/TileMap";
import { drawBanner, drawMessage } from "../ui/Windows";
import { PauseMenu } from "../ui/PauseMenu";
import { generateFloor } from "../world/DungeonGenerator";
import type { GameState } from "../world/GameState";
import { Player } from "../world/Player";
import { BattleScene, type BattleResult } from "./BattleScene";
import { TownScene, INN_SPAWN, PORTAL_SPAWN } from "./TownScene";

/**
 * ランダム生成ダンジョン。
 * 1歩ごとにエンカウント判定、宝箱、階段による降下、B5Fのボス祭壇。
 * X(キャンセル)は使わず、帰還は「帰還のつばさ」(ポーズメニュー) or 死亡 or ボス撃破。
 */
export class DungeonScene extends Scene {
  readonly name = "Dungeon";

  private map!: TileMap;
  private player!: Player;
  private cam = new Camera();
  private bannerTimer = 2.6;
  private message: string[] | null = null;
  private pauseMenu: PauseMenu | null = null;

  /** エンカウント猶予歩数 */
  private grace = GRACE_FLOOR_START;

  /** エンカウント演出（白フラッシュ）中は >0。終了時に戦闘へ */
  private encounterFx = 0;
  private pendingBattle: (() => void) | null = null;
  private leaving = false;

  constructor(
    private state: GameState,
    private floor: number,
  ) {
    super();
  }

  override onEnter(): void {
    if (!this.state.run) this.state.startRun(this.game);
    const plan = generateFloor(this.state.run!.seed, this.floor);
    this.map = plan.map;
    this.player = new Player(plan.entry.x, plan.entry.y);
    this.grace = GRACE_FLOOR_START;
    this.game.audio.playBgm("dungeon");
  }

  override resume(): void {
    // 戦闘から帰ってきた直後は少し安全に
    this.grace = Math.max(this.grace, GRACE_AFTER_BATTLE);
    this.game.audio.playBgm("dungeon");
  }

  update(dt: number): void {
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.leaving) return;

    // エンカウント演出 → 戦闘開始
    if (this.encounterFx > 0) {
      this.encounterFx -= dt;
      if (this.encounterFx <= 0 && this.pendingBattle) {
        const start = this.pendingBattle;
        this.pendingBattle = null;
        start();
      }
      return;
    }

    const input = this.game.input;

    if (this.message) {
      if (input.pressed("confirm") || input.pressed("cancel")) {
        this.message = null;
      }
      return;
    }

    // ポーズメニュー
    if (this.pauseMenu) {
      const result = this.pauseMenu.update(this.game, dt);
      if (result === "close") this.pauseMenu = null;
      else if (result === "wing") this.returnHome("つばさの ちからで 村へ もどった！");
      return;
    }
    if (input.pressed("menu")) {
      this.pauseMenu = new PauseMenu(this.state, true);
      return;
    }

    this.player.update(dt, input, this.map, TILE_DEFS);
    this.game.debug.set("Pos", `B${this.floor}F (${this.player.tileX}, ${this.player.tileY})`);

    // タイル到着イベント（連続移動中も1歩ごとに発火する）
    if (this.player.arrival) {
      this.onArrive(this.player.arrival.x, this.player.arrival.y);
      return;
    }

    // しらべる（宝箱）
    if (input.pressed("confirm") && !this.player.isMoving) {
      const facing = this.player.facingTile();
      if (this.map.get(facing.x, facing.y) === T.CHEST) {
        this.openChest(facing.x, facing.y);
      }
    }
  }

  private onArrive(x: number, y: number): void {
    const tile = this.map.get(x, y);

    if (tile === T.STAIRS) {
      this.game.audio.playSe("stairs");
      this.game.scenes.replace(new DungeonScene(this.state, this.floor + 1), 0.45);
      this.leaving = true;
      return;
    }

    if (tile === T.BOSS) {
      if (this.state.bossDefeated) {
        this.message = this.game.text.wrap(
          "ぬしの すがたは もう ない。しずかな いせきだけが のこっている……",
          40,
        );
      } else {
        this.message = this.game.text.wrap(
          "くらやみの おくで なにかが うごめいている……！",
          40,
        );
        this.startBattle(true);
      }
      return;
    }

    // ランダムエンカウント
    if (this.grace > 0) {
      this.grace--;
    } else if (this.state.run && this.state.run.battleRng.chance(ENCOUNTER_RATE)) {
      this.startBattle(false);
    }
  }

  private startBattle(boss: boolean): void {
    const run = this.state.run;
    if (!run) return;
    const def = boss ? bossDef() : run.battleRng.pick(enemiesForFloor(this.floor));
    if (!def) return;
    const enemy = spawnEnemy(def, this.floor);

    this.encounterFx = 0.45;
    this.game.audio.playSe("encounter");
    this.pendingBattle = () => {
      this.message = null;
      this.game.scenes.push(
        new BattleScene(this.state, enemy, this.floor, (r) => this.onBattleEnd(r)),
      );
    };
  }

  private onBattleEnd(result: BattleResult): void {
    switch (result.outcome) {
      case "victory":
      case "fled":
        break; // BattleScene が pop してくれる。resume() で猶予歩数が付く
      case "defeat": {
        const { goldLost, oreLost } = this.state.applyDeath();
        const lines = [
          "……ゆうしゃは しんでしまった。",
          "きがつくと やどやの ベッドの うえだった。",
          `もっていた ${goldLost}ゴールド${oreLost > 0 ? `と こうせき${oreLost}こ` : ""}を うしなった……`,
        ];
        this.game.scenes.replaceAll(new TownScene(this.state, INN_SPAWN, lines), 0.9);
        break;
      }
      case "bossVictory": {
        this.state.endRun();
        const lines = [
          "どうくつの ぬしを たおした！",
          "ひかりに つつまれ、ゆうしゃは 村へ もどった。",
        ];
        this.game.scenes.replaceAll(new TownScene(this.state, PORTAL_SPAWN, lines), 0.9);
        break;
      }
    }
  }

  private openChest(x: number, y: number): void {
    const run = this.state.run;
    if (!run) return;
    this.map.set(x, y, T.CHEST_OPEN);
    this.game.audio.playSe("chest");

    const roll = run.lootRng.next();
    if (roll < 0.45) {
      const gold = 12 + 8 * this.floor + run.lootRng.int(0, 10);
      this.state.gold += gold;
      this.message = [`たからばこを あけた！`, `${gold}ゴールドを てにいれた！`];
    } else if (roll < 0.72) {
      this.state.addItem("yakusou");
      this.message = [`たからばこを あけた！`, `${ITEMS.yakusou.name}を てにいれた！`];
    } else if (roll < 0.94) {
      const count = this.floor >= 3 ? run.lootRng.int(1, 2) : 1;
      this.state.addItem("kouseki", count);
      this.message = [
        `たからばこを あけた！`,
        `${ITEMS.kouseki.name}${count > 1 ? ` x${count}` : ""}を てにいれた！`,
      ];
    } else {
      this.state.addItem("tsubasa");
      this.message = [`たからばこを あけた！`, `${ITEMS.tsubasa.name}を てにいれた！`];
    }
  }

  private returnHome(reason: string): void {
    this.leaving = true;
    this.state.endRun();
    this.game.audio.playSe("warp");
    this.game.scenes.replaceAll(new TownScene(this.state, PORTAL_SPAWN, [reason]), 0.6);
  }

  // =========================================================================
  // 描画
  // =========================================================================
  render(r: Renderer): void {
    const ctx = r.world;
    const px = this.player.px + TILE / 2;
    const py = this.player.py + TILE / 2;
    this.cam.centerOn(px, py, this.map.widthPx, this.map.heightPx);

    ctx.fillStyle = "#1a1722";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    this.cam.begin(ctx);
    this.map.render(ctx, this.cam, TILE_DEFS, this.game.assets);
    this.player.render(ctx, this.game.assets);
    this.cam.end(ctx);

    this.renderTorchlight(ctx);

    // エンカウントの白フラッシュ（2回点滅）
    if (this.encounterFx > 0) {
      const phase = Math.floor(this.encounterFx * 13) % 2 === 0;
      if (phase) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      }
    }

    this.renderUi(r.ui);
  }

  private renderTorchlight(ctx: CanvasRenderingContext2D): void {
    const sx = this.cam.toScreenX(this.player.px + TILE / 2);
    const sy = this.cam.toScreenY(this.player.py + TILE / 2);
    const flicker =
      4 * Math.sin(this.game.elapsed * 7.3) + 2 * Math.sin(this.game.elapsed * 13.1);
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
    this.renderHud(ctx);
    drawBanner(this.game, ctx, `はじまりの洞窟 B${this.floor}F`, this.bannerTimer, 220);

    if (this.pauseMenu) {
      this.pauseMenu.render(this.game, ctx);
    }
    if (this.message) {
      drawMessage(this.game, ctx, this.message);
    } else if (!this.pauseMenu) {
      text.draw(ctx, "Z: しらべる   C: メニュー", UI_W - 12, UI_H - 20, {
        size: 10,
        align: "right",
        color: "#cfc8e8",
      });
    }
  }

  private renderHud(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    const text = this.game.text;
    text.window(ctx, UI_W - 196, 10, 186, 62);
    text.draw(ctx, `B${this.floor}F / B${DUNGEON_MAX_FLOOR}F`, UI_W - 182, 20, {
      size: 11,
      color: "#ffe9a0",
    });
    const hpColor =
      s.hp <= s.maxHp * 0.25 ? "#ff8a8a" : s.hp <= s.maxHp * 0.5 ? "#ffd970" : "#f5f1e8";
    text.draw(ctx, `HP ${s.hp}/${s.maxHp}`, UI_W - 182, 37, { size: 11, color: hpColor });
    text.draw(ctx, `MP ${s.mp}/${s.maxMp}`, UI_W - 96, 37, { size: 11, color: "#a8c8f0" });
    text.draw(ctx, `${s.gold} G`, UI_W - 182, 53, { size: 11, color: "#ffd970" });
    text.draw(ctx, `Lv ${s.level}`, UI_W - 96, 53, { size: 11 });
  }
}
