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
}

/** 未登録IDに使う「うるさい」プレースホルダー。アセット漏れを目立たせる */
const MISSING: PlaceholderSpec = { color: "#ff00ff", symbol: "?", symbolColor: "#000000" };

export class AssetManager {
  private images = new Map<string, HTMLImageElement>();
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
    for (const [id, path] of Object.entries(manifest.audio ?? {})) {
      this.audioPaths.set(id, path);
    }
  }

  private loadImage(id: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(id, img);
        resolve();
      };
      img.onerror = () => reject(new Error("load error"));
      img.src = path;
    });
  }

  /** 画像がない間の代替描画を登録する */
  definePlaceholder(id: string, spec: PlaceholderSpec): void {
    this.placeholders.set(id, spec);
  }

  has(id: string): boolean {
    return this.images.has(id);
  }

  /** スプライトを描く。画像があれば画像、なければプレースホルダー */
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
    const key = `${id}@${w}x${h}`;
    let cached = this.phCache.get(key);
    if (!cached) {
      cached = renderPlaceholder(this.placeholders.get(id) ?? MISSING, w, h);
      this.phCache.set(key, cached);
    }
    ctx.drawImage(cached, x, y);
  }
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
