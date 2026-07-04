import type { AssetManager } from "../core/AssetManager";
import type { Input } from "../core/Input";
import { TILE, type TileDefs, type TileMap } from "../gfx/TileMap";
import type { PartyMember } from "./PartyMember";

export type Dir = "up" | "down" | "left" | "right";

const DIR_DELTA: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/**
 * プレイヤー（グリッド移動 + ピクセル補間）。
 *
 * ドラクエ・シレン流の「1タイルずつ移動、見た目は滑らか」方式。
 * ロジックは常にタイル座標 (tileX, tileY) で完結するので、
 * Phase 1 のターン制ダンジョン処理にそのまま接続できる。
 */
export class Player {
  tileX: number;
  tileY: number;
  dir: Dir = "down";
  /** 描画用ピクセル座標（左上） */
  px: number;
  py: number;

  /** 移動速度（タイル/秒） */
  speed = 6.5;

  /**
   * このステップで新しいタイルに到着した瞬間だけ座標が入る（毎 update 冒頭でクリア）。
   * キー押しっぱなしの連続移動でも1タイルごとに必ず発火する。
   * エンカウント判定・階段・ポータルなどのタイルイベントはこれを見ること。
   */
  arrival: { x: number; y: number } | null = null;

  /**
   * 勇者が直前に空けたタイルの履歴（新しい順）。
   * 仲間の隊列（Follower）が trail[i] を目標にする。
   */
  readonly trail: { x: number; y: number }[] = [];

  private fromX: number;
  private fromY: number;
  private progress = 0; // 0..1
  private moving = false;

  constructor(tileX: number, tileY: number) {
    this.tileX = tileX;
    this.tileY = tileY;
    this.fromX = tileX;
    this.fromY = tileY;
    this.px = tileX * TILE;
    this.py = tileY * TILE;
  }

  get isMoving(): boolean {
    return this.moving;
  }

  /** 向いている先のタイル座標（「しらべる」の対象） */
  facingTile(): { x: number; y: number } {
    const d = DIR_DELTA[this.dir];
    return { x: this.tileX + d.dx, y: this.tileY + d.dy };
  }

  update(
    dt: number,
    input: Input,
    map: TileMap,
    defs: TileDefs,
    /** タイル以外の障害物（NPCなど）。true を返すと進めない */
    blockedAt?: (x: number, y: number) => boolean,
  ): void {
    this.arrival = null;
    if (this.moving) {
      this.progress += this.speed * dt;
      if (this.progress >= 1) {
        this.progress = 0;
        this.moving = false;
        this.fromX = this.tileX;
        this.fromY = this.tileY;
        this.arrival = { x: this.tileX, y: this.tileY };
      }
    }

    // 移動完了した同じステップ内で次の入力を拾う → キー押しっぱなしで滑らかに歩き続ける
    if (!this.moving) {
      const dir = this.readDirection(input);
      if (dir) {
        this.dir = dir;
        const d = DIR_DELTA[dir];
        const nx = this.tileX + d.dx;
        const ny = this.tileY + d.dy;
        if (!map.isSolid(nx, ny, defs) && !blockedAt?.(nx, ny)) {
          this.trail.unshift({ x: this.tileX, y: this.tileY });
          if (this.trail.length > 8) this.trail.pop();
          this.fromX = this.tileX;
          this.fromY = this.tileY;
          this.tileX = nx;
          this.tileY = ny;
          this.moving = true;
        }
      }
    }

    const t = this.moving ? this.progress : 1;
    this.px = lerp(this.fromX, this.tileX, t) * TILE;
    this.py = lerp(this.fromY, this.tileY, t) * TILE;
  }

  private readDirection(input: Input): Dir | null {
    // 縦横同時押しは縦を優先（どちらかに決めておけば操作感が安定する）
    if (input.down("up")) return "up";
    if (input.down("down")) return "down";
    if (input.down("left")) return "left";
    if (input.down("right")) return "right";
    return null;
  }

  /**
   * 描画。member を渡すと装備がキャラに一体化して反映される（DQ1/2 風）:
   * 胴 = 鎧ティアで色替え / 盾・武器 = 方向別レイヤーを手元に重ねる。
   */
  render(ctx: CanvasRenderingContext2D, assets: AssetManager, member?: PartyMember): void {
    const x = Math.round(this.px);
    const y = Math.round(this.py);

    if (!member) {
      assets.drawSprite(ctx, `hero.${this.dir}`, x, y, TILE, TILE);
      return;
    }
    const { weapon, shield, armor } = member.equip;
    // 体（鎧の色を反映）
    const armorKey = armor ? armor.id : "base";
    assets.drawSprite(ctx, `hero.body.${armorKey}.${this.dir}`, x, y, TILE, TILE);
    // 盾（手元レイヤー）
    if (shield) {
      assets.drawSprite(ctx, `hero.shield.${shield.id}.${this.dir}`, x, y, TILE, TILE);
    }
    // 武器（剣/斧レイヤー）
    if (weapon) {
      const wk = weapon.id === "axe" ? "axe" : weapon.id;
      assets.drawSprite(ctx, `hero.weapon.${wk}.${this.dir}`, x, y, TILE, TILE);
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
