import type { AssetManager } from "../core/AssetManager";
import type { Camera } from "../core/Camera";

/** 1タイルのピクセルサイズ。プロジェクト全体の規約 */
export const TILE = 16;

export interface TileDef {
  name: string;
  solid: boolean;
  /** AssetManager に渡すスプライトID */
  sprite: string;
}

export type TileDefs = Record<number, TileDef>;

/** 範囲外を表す番兵。isSolid では常に「壁」として扱う */
export const OUT_OF_BOUNDS = -1;

/**
 * タイルマップ。データ構造・当たり判定・描画（可視範囲カリング付き）。
 * Phase 1 のランダム生成ダンジョンもこのクラスにタイルを流し込むだけで動く。
 */
export class TileMap {
  private tiles: Uint16Array;

  constructor(
    readonly cols: number,
    readonly rows: number,
    fill = 0,
  ) {
    this.tiles = new Uint16Array(cols * rows).fill(fill);
  }

  /**
   * 文字列アートからマップを作る。行の長さ不一致・未知の文字は即エラーにして
   * マップデータのタイプミスを起動時に検出する。
   */
  static fromStrings(rows: readonly string[], legend: Record<string, number>): TileMap {
    const first = rows[0];
    if (!first) throw new Error("TileMap.fromStrings: 空のマップです");
    const cols = first.length;
    const map = new TileMap(cols, rows.length);
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y]!;
      if (row.length !== cols) {
        throw new Error(
          `TileMap.fromStrings: 行 ${y} の長さが不一致です (${row.length} != ${cols})`,
        );
      }
      for (let x = 0; x < cols; x++) {
        const ch = row[x]!;
        const id = legend[ch];
        if (id === undefined) {
          throw new Error(`TileMap.fromStrings: 未知のタイル文字 '${ch}' (${x}, ${y})`);
        }
        map.set(x, y, id);
      }
    }
    return map;
  }

  get widthPx(): number {
    return this.cols * TILE;
  }

  get heightPx(): number {
    return this.rows * TILE;
  }

  /** 範囲外は OUT_OF_BOUNDS */
  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return OUT_OF_BOUNDS;
    return this.tiles[y * this.cols + x]!;
  }

  set(x: number, y: number, id: number): void {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    this.tiles[y * this.cols + x] = id;
  }

  /** 範囲外・未定義タイルは通行不可として扱う（安全側に倒す） */
  isSolid(x: number, y: number, defs: TileDefs): boolean {
    const id = this.get(x, y);
    if (id === OUT_OF_BOUNDS) return true;
    return defs[id]?.solid ?? true;
  }

  /** 指定タイルIDの位置を全て列挙する（ポータルやスポーン地点の検索用） */
  findTiles(id: number): { x: number; y: number }[] {
    const found: { x: number; y: number }[] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.get(x, y) === id) found.push({ x, y });
      }
    }
    return found;
  }

  /** カメラの可視範囲のみ描画する */
  render(
    ctx: CanvasRenderingContext2D,
    cam: Camera,
    defs: TileDefs,
    assets: AssetManager,
  ): void {
    const x0 = Math.max(0, Math.floor(cam.x / TILE));
    const y0 = Math.max(0, Math.floor(cam.y / TILE));
    const x1 = Math.min(this.cols - 1, Math.ceil((cam.x + cam.viewW) / TILE));
    const y1 = Math.min(this.rows - 1, Math.ceil((cam.y + cam.viewH) / TILE));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const def = defs[this.get(x, y)];
        if (!def) continue;
        assets.drawSprite(ctx, def.sprite, x * TILE, y * TILE, TILE, TILE);
        // プレースホルダー（色付き矩形）のときだけ市松の明暗で単調さを消す
        if (!assets.hasArt(def.sprite) && (x + y) % 2 === 0) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.045)";
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }
  }
}
