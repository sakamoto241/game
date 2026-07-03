import { Camera } from "../core/Camera";
import type { Renderer } from "../core/Renderer";
import { UI_W, UI_H, WORLD_W, WORLD_H } from "../core/Renderer";
import { Scene } from "../core/Scene";
import {
  DUNGEON_MAX_FLOOR,
  ENCOUNTER_RATE,
  GRACE_AFTER_BATTLE,
  GRACE_FLOOR_START,
  MIMIC_CHANCE,
  MIMIC_MIN_FLOOR,
  MINE_GEM_CHANCE,
  MINE_ORE,
  MIN_PER_BATTLE,
  MIN_PER_STEP,
  NIGHT_ENCOUNTER_MULT,
  enemyHpMult,
} from "../data/balance";
import {
  enemiesForFloor,
  bossDef,
  enemyById,
  pickEnemy,
  spawnEnemy,
  type EnemyDef,
} from "../data/enemies";
import { ITEMS } from "../data/items";
import { T, TILE_DEFS } from "../data/tiles";
import { TILE, TileMap } from "../gfx/TileMap";
import { drawBanner, drawMessage } from "../ui/Windows";
import { PauseMenu } from "../ui/PauseMenu";
import { generateFloor } from "../world/DungeonGenerator";
import { Follower } from "../world/Follower";
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
  private followers: Follower[] = [];
  private cam = new Camera();
  private bannerTimer = 2.6;
  private message: string[] | null = null;
  private pauseMenu: PauseMenu | null = null;

  /** エンカウント猶予歩数 */
  private grace = GRACE_FLOOR_START;

  /** どくダメージの赤点滅 */
  private poisonFlash = 0;
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
    // 統計・到達クエストの進捗
    this.state.stats.deepestFloor = Math.max(this.state.stats.deepestFloor, this.floor);
    for (const q of this.state.quests) {
      if (q.kind === "reach" && this.floor >= q.count) q.done = true;
    }
    const plan = generateFloor(this.state.run!.seed, this.floor);
    this.map = plan.map;
    this.player = new Player(plan.entry.x, plan.entry.y);
    this.followers = this.state.party
      .slice(1)
      .map((m) => new Follower(m, plan.entry.x, plan.entry.y));
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
    if (this.poisonFlash > 0) this.poisonFlash -= dt;
    for (const f of this.followers) f.update(dt);
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
    this.followers.forEach((f, i) => {
      const target = this.player.trail[i];
      if (target) f.setTarget(target.x, target.y);
    });
    this.game.debug.set("Pos", `B${this.floor}F (${this.player.tileX}, ${this.player.tileY})`);

    // タイル到着イベント（連続移動中も1歩ごとに発火する）
    if (this.player.arrival) {
      this.state.advanceTime(MIN_PER_STEP);
      if (this.state.applyPoisonStep().length > 0) {
        this.poisonFlash = 0.4;
        this.game.audio.playSe("poison");
      }
      this.onArrive(this.player.arrival.x, this.player.arrival.y);
      return;
    }

    // しらべる（宝箱・こうみゃく）
    if (input.pressed("confirm") && !this.player.isMoving) {
      const facing = this.player.facingTile();
      const tile = this.map.get(facing.x, facing.y);
      if (tile === T.CHEST) {
        this.openChest(facing.x, facing.y);
      } else if (tile === T.ORE) {
        this.mineOre(facing.x, facing.y);
      }
    }
  }

  private mineOre(x: number, y: number): void {
    const run = this.state.run;
    if (!run) return;
    if (this.state.itemCount("pickaxe") <= 0) {
      this.message = this.game.text.wrap(
        "きらきらと ひかる こうみゃくだ。つるはしが あれば ほれそうだ。（いちばで うっている）",
        40,
      );
      return;
    }
    this.map.set(x, y, T.FLOOR);
    this.game.audio.playSe("mine");
    const ore = run.lootRng.int(MINE_ORE.min, MINE_ORE.max);
    this.state.addItem("kouseki", ore);
    const lines = ["カツン カツン……", `こうせき x${ore} を ほりだした！`];
    if (run.lootRng.chance(MINE_GEM_CHANCE)) {
      this.state.addItem("houseki");
      lines.push("おまけに ほうせきまで でてきた！！");
    }
    this.message = lines;
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

    // ランダムエンカウント（夜は地上の闇がダンジョンにも及び、遭遇が増える）
    const rate =
      ENCOUNTER_RATE * (this.state.phase() === "night" ? NIGHT_ENCOUNTER_MULT : 1);
    if (this.grace > 0) {
      this.grace--;
    } else if (this.state.run && this.state.run.battleRng.chance(rate)) {
      this.startBattle(false);
    }
  }

  private startBattle(boss: boolean, explicit?: EnemyDef): void {
    const run = this.state.run;
    if (!run) return;
    const def =
      explicit ??
      (boss
        ? bossDef()
        : pickEnemy(
            enemiesForFloor(this.floor),
            this.state.phase() === "night",
            run.battleRng.next(),
          ));
    if (!def) return;
    const enemy = spawnEnemy(def, this.floor);
    // パーティ人数に応じて敵のHPを底上げする
    const mult = enemyHpMult(this.state.aliveMembers().length);
    enemy.maxHp = Math.round(enemy.maxHp * mult);
    enemy.hp = enemy.maxHp;
    this.state.advanceTime(MIN_PER_BATTLE);

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

    // B3F以降はミミックが潜んでいることがある
    if (this.floor >= MIMIC_MIN_FLOOR && run.lootRng.chance(MIMIC_CHANCE)) {
      const mimic = enemyById("mimic");
      if (mimic) {
        this.message = ["たからばこが うごきだした！！"];
        this.startBattle(false, mimic);
        return;
      }
    }

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
    for (let i = this.followers.length - 1; i >= 0; i--) {
      this.followers[i]!.render(ctx, this.game.assets);
    }
    this.player.render(ctx, this.game.assets, this.state.hero);
    this.cam.end(ctx);

    this.renderTorchlight(ctx);

    // どくの紫フラッシュ
    if (this.poisonFlash > 0) {
      ctx.fillStyle = `rgba(140, 60, 190, ${(this.poisonFlash * 0.45).toFixed(3)})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }

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
    const h = 36 + s.party.length * 16;
    text.window(ctx, UI_W - 216, 10, 206, h);
    text.draw(ctx, `B${this.floor}F / B${DUNGEON_MAX_FLOOR}F`, UI_W - 202, 20, {
      size: 10,
      color: "#ffe9a0",
    });
    text.draw(ctx, `${s.gold} G`, UI_W - 24, 20, {
      size: 10,
      align: "right",
      color: "#ffd970",
    });
    s.party.forEach((m, i) => {
      const y = 36 + i * 16;
      const hpColor = !m.alive
        ? "#7d7690"
        : m.hp <= m.maxHp * 0.25
          ? "#ff8a8a"
          : m.hp <= m.maxHp * 0.5
            ? "#ffd970"
            : "#f5f1e8";
      text.draw(ctx, `${m.name}${m.poisoned ? "毒" : ""}`, UI_W - 202, y, {
        size: 10,
        color: m.alive ? (m.poisoned ? "#c9a7ff" : "#d8d2e8") : "#7d7690",
      });
      text.draw(ctx, `HP${m.hp}`, UI_W - 128, y, { size: 10, color: hpColor });
      text.draw(ctx, `MP${m.mp}`, UI_W - 78, y, { size: 10, color: "#a8c8f0" });
    });
  }
}
