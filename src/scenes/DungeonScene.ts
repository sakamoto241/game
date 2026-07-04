import { Camera } from "../core/Camera";
import type { Renderer } from "../core/Renderer";
import { UI_W, UI_H, WORLD_W, WORLD_H } from "../core/Renderer";
import { Scene } from "../core/Scene";
import {
  DUNGEON_MAX_FLOOR,
  ENCOUNTER_RATE,
  GRACE_AFTER_BATTLE,
  GRACE_FLOOR_START,
  MIDBOSS_FLOOR,
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
  midbossDef,
  enemyById,
  pickEnemy,
  spawnEnemy,
  type EnemyDef,
} from "../data/enemies";
import { ITEMS } from "../data/items";
import { T, TILE_DEFS } from "../data/tiles";
import { TILE, TileMap } from "../gfx/TileMap";
import { Lighting, type LightSource } from "../gfx/Lighting";
import { Particles, drawTorchFlame } from "../gfx/Particles";
import { drawBanner, drawHudRow, drawMessage } from "../ui/Windows";
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

  // --- 演出（ライティング・パーティクル） ---
  private lighting = new Lighting();
  /** 闇の下に沈む粒子（塵・きらめき） */
  private ambientFx = new Particles();
  /** 闇の上で光る粒子（火の粉・煙） */
  private glowFx = new Particles();
  private emberTimer = 0;
  private smokeTimer = 0;
  private dustTimer = 0;
  private sparkTimer = 0;
  private pendingBattle: (() => void) | null = null;
  private leaving = false;
  /** 中ボスの門番がいる階段の位置（撃破前のみ）。null なら門番なし */
  private guardianAt: { x: number; y: number } | null = null;

  constructor(
    private state: GameState,
    private floor: number,
  ) {
    super();
  }

  override onEnter(): void {
    if (!this.state.run) this.state.startRun(this.game);
    // 階段を降りて新フロアに入るたびにここが走る = 到達記録の自動更新ポイント
    this.state.recordFloorReached(this.floor);
    const plan = generateFloor(this.state.run!.seed, this.floor);
    this.map = plan.map;
    this.player = new Player(plan.entry.x, plan.entry.y);
    this.followers = this.state.party
      .slice(1)
      .map((m) => new Follower(m, plan.entry.x, plan.entry.y));
    this.grace = GRACE_FLOOR_START;
    // 中ボス階: この潜行で未撃破なら、階段の前に桜の木を植え、門番を立たせる
    this.guardianAt = null;
    if (
      this.floor === MIDBOSS_FLOOR &&
      !(this.state.run?.midbossDefeated.has(this.floor) ?? false)
    ) {
      this.setupGuardian();
    }
    this.game.audio.playBgm("dungeon");
  }

  override resume(): void {
    // 戦闘から帰ってきた直後は少し安全に
    this.grace = Math.max(this.grace, GRACE_AFTER_BATTLE);
    // 門番を倒した直後: 桜を残しつつ門番を消し、階段の上にいれば下層へ
    if (this.guardianAt && (this.state.run?.midbossDefeated.has(this.floor) ?? false)) {
      const g = this.guardianAt;
      this.guardianAt = null;
      if (this.player.tileX === g.x && this.player.tileY === g.y) {
        this.descend();
        return;
      }
    }
    this.game.audio.playBgm("dungeon");
  }

  /** 階段の前に桜を植え、門番（中ボス）を配置する */
  private setupGuardian(): void {
    const stairs = this.map.findTiles(T.STAIRS)[0];
    if (!stairs) return;
    this.guardianAt = stairs;
    // 階段に近い岩壁を1〜2本、桜に変える（岩壁のみ変更＝到達性を壊さない）。
    // 半径を広げつつ、上方（背景）を優先して探す。
    let planted = 0;
    for (let r = 1; r <= 4 && planted < 2; r++) {
      const ring: { x: number; y: number }[] = [];
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          ring.push({ x: stairs.x + dx, y: stairs.y + dy });
        }
      }
      // 上（y が小さい）を背景として優先
      ring.sort((a, b) => a.y - b.y);
      for (const p of ring) {
        if (planted >= 2) break;
        if (this.map.get(p.x, p.y) === T.ROCK) {
          this.map.set(p.x, p.y, T.SAKURA);
          planted++;
        }
      }
    }
  }

  update(dt: number): void {
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.poisonFlash > 0) this.poisonFlash -= dt;
    for (const f of this.followers) f.update(dt);
    this.updateFx(dt);
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
      // 門番が守る階段: 未撃破なら降りる代わりに中ボス戦
      if (this.guardianAt && this.guardianAt.x === x && this.guardianAt.y === y) {
        this.message = this.game.text.wrap(
          "さくらの きの したで、はかもりの よみまるが しずかに ふりむいた。\n「‥‥ここから さきへは、とおさぬ。」",
          40,
        );
        this.startBattle(false, midbossDef());
        return;
      }
      this.descend();
      return;
    }

    if (tile === T.BOSS) {
      if (this.state.bossDefeated) {
        this.message = this.game.text.wrap(
          `${bossDef().name}の すがたは もう ない。しずかな あんこくだけが のこっている……`,
          40,
        );
      } else {
        this.message = this.game.text.wrap(
          "しんえんの そこから、しょけいにんの きはいが たちのぼる……！",
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
          `${bossDef().name}を うちたおした！`,
          "しんえんに しずけさが もどり、ゆうしゃは 村へ かえった。",
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

  private sparkIdx = 0;

  /** 演出パーティクルの生成（ロジックには影響しない） */
  private updateFx(dt: number): void {
    this.ambientFx.update(dt);
    this.glowFx.update(dt);

    // 松明の火の粉と煙
    this.emberTimer -= dt;
    if (this.emberTimer <= 0) {
      this.emberTimer = 0.11;
      this.glowFx.ember(this.player.px + 13, this.player.py + 2);
    }
    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.5;
      this.glowFx.smoke(this.player.px + 13, this.player.py - 3);
    }

    // 画面内を漂う塵
    this.dustTimer -= dt;
    if (this.dustTimer <= 0) {
      this.dustTimer = 0.3;
      const t = this.game.elapsed;
      const dx = this.cam.x + ((Math.sin(t * 1.7) + 1) / 2) * this.cam.viewW;
      const dy = this.cam.y + ((Math.sin(t * 2.3 + 1.7) + 1) / 2) * this.cam.viewH;
      this.ambientFx.dust(dx, dy);
    }

    // 特別なタイルのきらめき（順繰りに光らせる）
    this.sparkTimer -= dt;
    if (this.sparkTimer <= 0) {
      this.sparkTimer = 0.35;
      const specials = this.visibleSpecialTiles();
      if (specials.length > 0) {
        this.sparkIdx = (this.sparkIdx + 1) % specials.length;
        const pick = specials[this.sparkIdx]!;
        this.ambientFx.sparkle(pick.x * TILE + 8, pick.y * TILE + 6, pick.color);
      }
    }
  }

  private visibleSpecialTiles(): { x: number; y: number; color: string }[] {
    const x0 = Math.max(0, Math.floor(this.cam.x / TILE));
    const y0 = Math.max(0, Math.floor(this.cam.y / TILE));
    const x1 = Math.min(this.map.cols - 1, Math.ceil((this.cam.x + this.cam.viewW) / TILE));
    const y1 = Math.min(this.map.rows - 1, Math.ceil((this.cam.y + this.cam.viewH) / TILE));
    const found: { x: number; y: number; color: string }[] = [];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const id = this.map.get(x, y);
        if (id === T.CHEST) found.push({ x, y, color: "#ffd24a" });
        else if (id === T.ORE) found.push({ x, y, color: "#6fd8c8" });
        else if (id === T.STAIRS || id === T.EXIT) found.push({ x, y, color: "#8fe8d8" });
        else if (id === T.BOSS) found.push({ x, y, color: "#e05a7a" });
        else if (id === T.SAKURA) found.push({ x, y, color: "#f7c8dc" });
      }
    }
    return found;
  }

  /** 光源リスト（スクリーン座標） */
  private collectLights(): LightSource[] {
    const lights: LightSource[] = [
      {
        x: this.cam.toScreenX(this.player.px + 13),
        y: this.cam.toScreenY(this.player.py + 4),
        radius: 96,
        flicker: 1,
        color: "#ff9a3c",
        glow: 0.6,
      },
    ];
    for (const f of this.followers) {
      lights.push({
        x: this.cam.toScreenX(f.px + 8),
        y: this.cam.toScreenY(f.py + 8),
        radius: 34,
        color: "#ff9a3c",
        glow: 0.2,
      });
    }
    for (const s of this.visibleSpecialTiles()) {
      lights.push({
        x: this.cam.toScreenX(s.x * TILE + 8),
        y: this.cam.toScreenY(s.y * TILE + 8),
        radius: s.color === "#e05a7a" ? 34 : 26,
        color: s.color,
        glow: 0.45,
        flicker: 0.5,
      });
    }
    return lights;
  }

  /** 階段の上で待ち構える中ボスの門番を描く（ゆらぎ付き） */
  private renderGuardian(ctx: CanvasRenderingContext2D): void {
    if (!this.guardianAt) return;
    const bob = Math.round(Math.sin(this.game.elapsed * 2.2) * 1.5);
    this.game.assets.drawSprite(
      ctx,
      "battle.yomimaru",
      this.guardianAt.x * TILE,
      this.guardianAt.y * TILE - 3 + bob,
      TILE,
      TILE,
    );
  }

  private descend(): void {
    this.game.audio.playSe("stairs");
    this.game.scenes.replace(new DungeonScene(this.state, this.floor + 1), 0.45);
    this.leaving = true;
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

    ctx.fillStyle = "#141220";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    this.cam.begin(ctx);
    this.map.render(ctx, this.cam, TILE_DEFS, this.game.assets);
    this.ambientFx.render(ctx); // 塵・きらめきは闇に沈む
    this.renderGuardian(ctx);
    for (let i = this.followers.length - 1; i >= 0; i--) {
      this.followers[i]!.render(ctx, this.game.assets);
    }
    this.player.render(ctx, this.game.assets, this.state.hero);
    this.cam.end(ctx);

    // ダイナミックライティング（松明・宝箱・階段・祭壇が闇を照らす）
    this.lighting.render(ctx, this.collectLights(), 0.94, this.game.elapsed);

    // 闇の上で光るもの: 松明の炎・火の粉・煙
    this.cam.begin(ctx);
    drawTorchFlame(ctx, this.player.px + 12, this.player.py + 3, this.game.elapsed);
    this.glowFx.render(ctx);
    this.cam.end(ctx);

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
    const h = 40 + s.party.length * 18;
    text.window(ctx, UI_W - 246, 10, 236, h);
    text.draw(ctx, `B${this.floor}F / B${DUNGEON_MAX_FLOOR}F`, UI_W - 230, 20, {
      size: 10,
      color: "#e3c98b",
    });
    text.draw(ctx, `${s.gold} G`, UI_W - 26, 20, {
      size: 10,
      align: "right",
      color: "#ffd970",
    });
    s.party.forEach((m, i) => {
      const y = 38 + i * 18;
      drawHudRow(this.game, ctx, m, UI_W - 230, y);
    });
  }
}
