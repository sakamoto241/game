import type { AssetManager } from "../core/AssetManager";
import type { Rng } from "../core/Rng";
import type { DayPhase } from "../data/balance";
import type { NpcDef } from "../data/npcs";
import { T } from "../data/tiles";
import { drawCharacter } from "../gfx/CharSprite";
import { TILE, type TileDefs, type TileMap } from "../gfx/TileMap";
import type { Dir } from "./Player";

/**
 * 村人。時間帯ごとのアンカー地点へ歩いて向かい、着いたら周辺をうろつく。
 * 通行判定はタイルのみ（他キャラとはすり抜け。プレイヤーの邪魔をしない）。
 */
export class Npc {
  tileX: number;
  tileY: number;
  px: number;
  py: number;
  dir: Dir = "down";
  /** 今の時間帯に姿を見せているか */
  visible = true;

  private fromX: number;
  private fromY: number;
  private progress = 1;
  private anchor: { x: number; y: number } | null = null;
  private idleTimer = 0;
  private speed = 3.2; // プレイヤーよりのんびり

  constructor(
    readonly def: NpcDef,
    private rng: Rng,
  ) {
    const start = def.schedule.day ?? def.schedule.morning ?? { x: 18, y: 9 };
    this.tileX = start.x;
    this.tileY = start.y;
    this.fromX = start.x;
    this.fromY = start.y;
    this.px = start.x * TILE;
    this.py = start.y * TILE;
  }

  /** 時間帯が変わったら呼ぶ */
  setPhase(phase: DayPhase): void {
    this.anchor = this.def.schedule[phase];
    this.visible = this.anchor !== null;
  }

  update(
    dt: number,
    map: TileMap,
    defs: TileDefs,
    playerTile: { x: number; y: number },
  ): void {
    if (!this.visible) return;

    if (this.progress < 1) {
      this.progress = Math.min(1, this.progress + this.speed * dt);
      this.px = lerp(this.fromX, this.tileX, this.progress) * TILE;
      this.py = lerp(this.fromY, this.tileY, this.progress) * TILE;
      return;
    }

    this.idleTimer -= dt;
    if (this.idleTimer > 0) return;
    this.idleTimer = this.rng.float(0.9, 2.4);

    const anchor = this.anchor;
    if (!anchor) return;
    const distToAnchor =
      Math.abs(this.tileX - anchor.x) + Math.abs(this.tileY - anchor.y);

    let target: { x: number; y: number } | null = null;
    if (distToAnchor > 2) {
      // アンカーへ1歩近づく（塞がっていたらもう片方の軸）
      const candidates: { x: number; y: number }[] = [];
      if (anchor.x !== this.tileX) {
        candidates.push({ x: this.tileX + Math.sign(anchor.x - this.tileX), y: this.tileY });
      }
      if (anchor.y !== this.tileY) {
        candidates.push({ x: this.tileX, y: this.tileY + Math.sign(anchor.y - this.tileY) });
      }
      target = candidates.find((c) => this.canStep(c, map, defs, playerTile)) ?? null;
    } else if (this.rng.chance(0.55)) {
      // アンカー周辺をうろつく
      const dirs = [
        { x: this.tileX + 1, y: this.tileY },
        { x: this.tileX - 1, y: this.tileY },
        { x: this.tileX, y: this.tileY + 1 },
        { x: this.tileX, y: this.tileY - 1 },
      ].filter(
        (c) =>
          Math.abs(c.x - anchor.x) + Math.abs(c.y - anchor.y) <= 2 &&
          this.canStep(c, map, defs, playerTile),
      );
      target = this.rng.pick(dirs) ?? null;
    }

    if (target) {
      this.dir =
        target.x > this.tileX
          ? "right"
          : target.x < this.tileX
            ? "left"
            : target.y > this.tileY
              ? "down"
              : "up";
      this.fromX = this.tileX;
      this.fromY = this.tileY;
      this.tileX = target.x;
      this.tileY = target.y;
      this.progress = 0;
    }
  }

  private canStep(
    to: { x: number; y: number },
    map: TileMap,
    defs: TileDefs,
    playerTile: { x: number; y: number },
  ): boolean {
    if (to.x === playerTile.x && to.y === playerTile.y) return false;
    const tile = map.get(to.x, to.y);
    // 扉・ポータルの上に立ってプレイヤーの邪魔をしない
    if (tile === T.DOOR || tile === T.SHOP_DOOR || tile === T.PORTAL) return false;
    return !map.isSolid(to.x, to.y, defs);
  }

  /** プレイヤーの隣（4近傍）にいるか */
  isAdjacentTo(x: number, y: number): boolean {
    if (!this.visible) return false;
    return Math.abs(this.tileX - x) + Math.abs(this.tileY - y) === 1 ||
      (this.tileX === x && this.tileY === y);
  }

  /** プレイヤーの方を向く（話しかけられたとき） */
  faceToward(x: number, y: number): void {
    const dx = x - this.tileX;
    const dy = y - this.tileY;
    this.dir =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up";
  }

  render(ctx: CanvasRenderingContext2D, assets: AssetManager): void {
    if (!this.visible) return;
    drawCharacter(ctx, assets, `npc.${this.def.id}.${this.dir}`, this.px, this.py);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
