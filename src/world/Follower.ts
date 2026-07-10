import type { AssetManager } from "../core/AssetManager";
import { drawCharacter } from "../gfx/CharSprite";
import { TILE } from "../gfx/TileMap";
import type { PartyMember } from "./PartyMember";
import type { Dir } from "./Player";

/**
 * 隊列で勇者についてくる仲間（DQ式の数珠つなぎ）。
 * 勇者が空けたタイル（trail）を目標に、勇者と同じ速度で滑らかに歩く。
 * 入力も当たり判定も持たない — 勇者が通った道は必ず歩けるため。
 */
export class Follower {
  private tileX: number;
  private tileY: number;
  private fromX: number;
  private fromY: number;
  private progress = 1;
  private dir: Dir = "down";
  px: number;
  py: number;

  speed = 6.5;

  constructor(
    readonly member: PartyMember,
    startX: number,
    startY: number,
  ) {
    this.tileX = startX;
    this.tileY = startY;
    this.fromX = startX;
    this.fromY = startY;
    this.px = startX * TILE;
    this.py = startY * TILE;
  }

  /** 目標タイルの更新。離れすぎていたら（シーン遷移直後など）スナップする */
  setTarget(x: number, y: number): void {
    if (x === this.tileX && y === this.tileY) return;
    const dist = Math.abs(x - this.tileX) + Math.abs(y - this.tileY);
    if (dist > 2) {
      this.tileX = x;
      this.tileY = y;
      this.fromX = x;
      this.fromY = y;
      this.progress = 1;
      return;
    }
    this.dir =
      x > this.tileX ? "right" : x < this.tileX ? "left" : y > this.tileY ? "down" : "up";
    this.fromX = this.tileX;
    this.fromY = this.tileY;
    this.tileX = x;
    this.tileY = y;
    this.progress = 0;
  }

  update(dt: number): void {
    if (this.progress < 1) {
      this.progress = Math.min(1, this.progress + this.speed * dt);
    }
    this.px = lerp(this.fromX, this.tileX, this.progress) * TILE;
    this.py = lerp(this.fromY, this.tileY, this.progress) * TILE;
  }

  render(ctx: CanvasRenderingContext2D, assets: AssetManager): void {
    drawCharacter(
      ctx,
      assets,
      `chara.${this.member.classId}.${this.dir}`,
      this.px,
      this.py,
      this.member.alive ? 1 : 0.45, // 戦闘不能はうっすら
    );
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
