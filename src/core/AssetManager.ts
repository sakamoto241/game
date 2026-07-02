/**
 * アセット管理。「後から本物のドット絵に差し替え可能」の要。
 *
 * ゲームコードはスプライトを ID でのみ参照する: assets.drawSprite(ctx, "hero.down", ...)
 *
 * - public/assets/manifest.json に画像が登録されていれば、その画像を描画する。
 * - なければ definePlaceholder() で登録された「色付き矩形 + 記号」を描画する。
 *
 * つまりドット絵への差し替えは manifest.json とファイルを置くだけで完了し、
 * ゲームコードの変更は一切不要。
 * プレースホルダーはサイズごとにオフスクリーンキャンバスへキャッシュするので
 * 毎フレーム大量に描いても速い。
 */
export interface PlaceholderSpec {
  /** ベースの塗り色 */
  color: string;
  /** 中央に描く記号（省略可）。将来のスプライトの当たりを付ける */
  symbol?: string;
  /** 記号の色。省略時は半透明の黒 */
  symbolColor?: string;
}

interface Manifest {
  images?: Record<string, string>;
  audio?: Record<string, string>;
  /** スプライトシート定義: 名前 → { path, tile } */
  sheets?: Record<string, { path: string; tile?: number }>;
  /** シート内スプライト: ID → { sheet, col, row, w?, h? } */
  sprites?: Record<
    string,
    { sheet: string; col: number; row: number; w?: number; h?: number }
  >;
}

interface SheetSprite {
  img: HTMLImageElement;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/** 未登録IDに使う「うるさい」プレースホルダー。アセット漏れを目立たせる */
const MISSING: PlaceholderSpec = { color: "#ff00ff", symbol: "?", symbolColor: "#000000" };

export class AssetManager {
  private images = new Map<string, HTMLImageElement>();
  private sheetSprites = new Map<string, SheetSprite>();
  private pixelArts = new Map<string, HTMLCanvasElement>();
  private placeholders = new Map<string, PlaceholderSpec>();
  private phCache = new Map<string, HTMLCanvasElement>();
  /** AudioManager が参照する音声ファイルのパス表 */
  readonly audioPaths = new Map<string, string>();

  /** manifest.json を読み込み、登録された画像を全てロードする */
  async loadManifest(url = "assets/manifest.json"): Promise<void> {
    // file:// (単一HTML配布) では fetch が使えないためプレースホルダーのみで動く。
    // 本物のアセットを単一ファイルに含める場合は manifest を data: URI で埋め込む予定。
    if (window.location.protocol === "file:") return;
    let manifest: Manifest;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      manifest = (await res.json()) as Manifest;
    } catch (e) {
      console.warn(`[AssetManager] manifest を読み込めませんでした (${String(e)})。プレースホルダーのみで動作します。`);
      return;
    }
    const images = manifest.images ?? {};
    await Promise.all(
      Object.entries(images).map(([id, path]) =>
        this.loadImage(id, path).catch((e) =>
          console.warn(`[AssetManager] 画像 ${id} (${path}) のロードに失敗: ${String(e)}`),
        ),
      ),
    );
    await this.loadSheets(manifest);
    for (const [id, path] of Object.entries(manifest.audio ?? {})) {
      this.audioPaths.set(id, path);
    }
  }

  /** manifest の sheets/sprites 定義からシート内スプライトを登録する */
  private async loadSheets(manifest: Manifest): Promise<void> {
    const sheets = manifest.sheets ?? {};
    const sprites = manifest.sprites ?? {};
    const loaded = new Map<string, { img: HTMLImageElement; tile: number }>();
    await Promise.all(
      Object.entries(sheets).map(async ([name, def]) => {
        try {
          const img = await loadImageElement(def.path);
          loaded.set(name, { img, tile: def.tile ?? 16 });
        } catch (e) {
          console.warn(`[AssetManager] シート ${name} のロードに失敗: ${String(e)}`);
        }
      }),
    );
    for (const [id, s] of Object.entries(sprites)) {
      const sheet = loaded.get(s.sheet);
      if (!sheet) continue;
      const t = sheet.tile;
      this.sheetSprites.set(id, {
        img: sheet.img,
        sx: s.col * t,
        sy: s.row * t,
        sw: s.w ?? t,
        sh: s.h ?? t,
      });
    }
  }

  private async loadImage(id: string, path: string): Promise<void> {
    this.images.set(id, await loadImageElement(path));
  }

  /**
   * コード製ピクセルアートを登録する。painter に 1px = 1ピクセルの
   * コンテキストが渡される。flipX を指定すると左右反転して登録する
   * （左右の向き分けに使う）。
   */
  definePixelArt(
    id: string,
    w: number,
    h: number,
    painter: (ctx: CanvasRenderingContext2D) => void,
    flipX = false,
  ): void {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    painter(ctx);
    this.pixelArts.set(id, canvas);
  }

  /** 本物の画像 or ピクセルアートを持っているか（プレースホルダーは含まない） */
  hasArt(id: string): boolean {
    return this.images.has(id) || this.sheetSprites.has(id) || this.pixelArts.has(id);
  }

  /** 画像がない間の代替描画を登録する */
  definePlaceholder(id: string, spec: PlaceholderSpec): void {
    this.placeholders.set(id, spec);
  }

  has(id: string): boolean {
    return this.images.has(id);
  }

  /**
   * スプライトを描く。優先順位:
   * manifest の画像 > manifest のシート > コード製ピクセルアート > プレースホルダー
   */
  drawSprite(
    ctx: CanvasRenderingContext2D,
    id: string,
    x: number,
    y: number,
    w = 16,
    h = 16,
  ): void {
    const img = this.images.get(id);
    if (img) {
      ctx.drawImage(img, x, y, w, h);
      return;
    }
    const sheet = this.sheetSprites.get(id);
    if (sheet) {
      ctx.drawImage(sheet.img, sheet.sx, sheet.sy, sheet.sw, sheet.sh, x, y, w, h);
      return;
    }
    const px = this.pixelArts.get(id);
    if (px) {
      ctx.drawImage(px, x, y, w, h);
      return;
    }
    const key = `${id}@${w}x${h}`;
    let cached = this.phCache.get(key);
    if (!cached) {
      cached = renderPlaceholder(this.placeholders.get(id) ?? MISSING, w, h);
      this.phCache.set(key, cached);
    }
    ctx.drawImage(cached, x, y);
  }
}

function loadImageElement(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load error"));
    img.src = path;
  });
}

function renderPlaceholder(spec: PlaceholderSpec, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = spec.color;
  ctx.fillRect(0, 0, w, h);
  // うっすら縁取りして格子感を出す
  ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  if (spec.symbol) {
    ctx.fillStyle = spec.symbolColor ?? "rgba(0, 0, 0, 0.35)";
    ctx.font = `${Math.max(6, Math.floor(h * 0.7))}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spec.symbol, w / 2, h / 2 + 1);
  }
  return canvas;
}
