/**
 * 二層解像度レンダラ。
 *
 * - world レイヤー: 320x180。タイルマップ・キャラなどゲーム世界を描く。
 *   太いドット感（16pxタイルが横20枚）を出すための低解像度。
 * - ui レイヤー: 640x360。ウィンドウ・テキストなど UI を描く。
 *   日本語の漢字が潰れない解像度を確保する。
 *
 * 合成時は表示キャンバスに整数倍スケーリング（ドットが滲まない）+
 * レターボックスで中央配置。HiDPI (devicePixelRatio) にも対応する。
 */
export const WORLD_W = 320;
export const WORLD_H = 180;
export const UI_W = 640;
export const UI_H = 360;

/** ワールド仕上げ（ポストFX）の強度設定 */
export interface PostFxConfig {
  /** 加算ブルームの不透明度 0..1（明部の滲み量） */
  bloom: number;
  /** ブルームのぼかし半径(px, 半解像度基準) */
  bloomRadius: number;
  /** ビネット（周辺減光）の不透明度 0..1 */
  vignette: number;
}

/** 屋外の既定。ほんのり発光 + 軽いビネット */
export const DEFAULT_POSTFX: PostFxConfig = {
  bloom: 0.26,
  bloomRadius: 2.2,
  vignette: 0.34,
};

export class Renderer {
  /** ゲーム世界用コンテキスト (320x180) */
  readonly world: CanvasRenderingContext2D;
  /** UI用コンテキスト (640x360) */
  readonly ui: CanvasRenderingContext2D;

  private displayCanvas: HTMLCanvasElement;
  private displayCtx: CanvasRenderingContext2D;
  private worldCanvas: HTMLCanvasElement;
  private uiCanvas: HTMLCanvasElement;
  /** UI レイヤー基準の整数スケール（world はこの2倍で合成される） */
  private scale = 1;

  /** ポストFX（ブルーム/ビネット）。シーンから強度を変えられる */
  private bloomCanvas: HTMLCanvasElement;
  private bloomCtx: CanvasRenderingContext2D;
  private vignetteCanvas: HTMLCanvasElement;
  /** ワールド仕上げの設定。シーンが onEnter などで上書きする */
  postFx: PostFxConfig = { ...DEFAULT_POSTFX };

  constructor(parent: HTMLElement) {
    this.displayCanvas = document.createElement("canvas");
    parent.appendChild(this.displayCanvas);
    this.displayCtx = must2d(this.displayCanvas);

    this.worldCanvas = document.createElement("canvas");
    this.worldCanvas.width = WORLD_W;
    this.worldCanvas.height = WORLD_H;
    this.world = must2d(this.worldCanvas);

    this.uiCanvas = document.createElement("canvas");
    this.uiCanvas.width = UI_W;
    this.uiCanvas.height = UI_H;
    this.ui = must2d(this.uiCanvas);

    // ブルームは半解像度で十分（軽く・柔らかく）
    this.bloomCanvas = document.createElement("canvas");
    this.bloomCanvas.width = WORLD_W >> 1;
    this.bloomCanvas.height = WORLD_H >> 1;
    this.bloomCtx = must2d(this.bloomCanvas);
    this.vignetteCanvas = buildVignette(WORLD_W, WORLD_H);

    window.addEventListener("resize", () => this.resize());
    this.resize();
  }

  /** シーンが世界の「空気感」を宣言する（未指定項目は現状維持） */
  setPostFx(cfg: Partial<PostFxConfig>): void {
    this.postFx = { ...this.postFx, ...cfg };
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.displayCanvas.style.width = `${w}px`;
    this.displayCanvas.style.height = `${h}px`;
    this.displayCanvas.width = Math.max(1, Math.round(w * dpr));
    this.displayCanvas.height = Math.max(1, Math.round(h * dpr));
    // 表示領域に収まる最大の整数倍を選ぶ（最低1倍）
    this.scale = Math.max(
      1,
      Math.floor(
        Math.min(this.displayCanvas.width / UI_W, this.displayCanvas.height / UI_H),
      ),
    );
  }

  /** フレーム開始。両レイヤーをクリアする */
  beginFrame(): void {
    this.world.fillStyle = "#000000";
    this.world.fillRect(0, 0, WORLD_W, WORLD_H);
    this.ui.clearRect(0, 0, UI_W, UI_H);
  }

  /** フレーム終了。ワールドに仕上げを掛けてから表示キャンバスへ整数倍合成する */
  endFrame(): void {
    this.applyWorldPostFx();

    const ctx = this.displayCtx;
    const cw = this.displayCanvas.width;
    const ch = this.displayCanvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0b0b12";
    ctx.fillRect(0, 0, cw, ch);

    const outW = UI_W * this.scale;
    const outH = UI_H * this.scale;
    const ox = Math.floor((cw - outW) / 2);
    const oy = Math.floor((ch - outH) / 2);
    // world (320x180) は UI の半分の解像度なので2倍のスケールで重ねる
    ctx.drawImage(this.worldCanvas, ox, oy, outW, outH);
    ctx.drawImage(this.uiCanvas, ox, oy, outW, outH);
  }

  /**
   * ワールドレイヤーへの仕上げ処理（HD-2D 風の「立体感」を出す肝）。
   * 1) ブルーム: ぼかした世界を加算合成 → 明るい所だけ柔らかく発光する
   *    ('lighter' は暗部の寄与がほぼ0なので、明部だけが自然に滲む)。
   * 2) ビネット: 画面周辺を落として中央へ視線を誘導、被写界深度っぽさを出す。
   * UI レイヤーには掛けないので文字は常にくっきり保たれる。
   */
  private applyWorldPostFx(): void {
    const fx = this.postFx;
    const wctx = this.world;

    if (fx.bloom > 0) {
      const bw = this.bloomCanvas.width;
      const bh = this.bloomCanvas.height;
      const bctx = this.bloomCtx;
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.globalCompositeOperation = "source-over";
      bctx.globalAlpha = 1;
      bctx.clearRect(0, 0, bw, bh);
      bctx.filter = `blur(${fx.bloomRadius}px)`;
      bctx.imageSmoothingEnabled = true;
      bctx.drawImage(this.worldCanvas, 0, 0, bw, bh);
      bctx.filter = "none";

      wctx.save();
      wctx.imageSmoothingEnabled = true;
      wctx.globalCompositeOperation = "lighter";
      wctx.globalAlpha = fx.bloom;
      wctx.drawImage(this.bloomCanvas, 0, 0, WORLD_W, WORLD_H);
      wctx.restore();
    }

    if (fx.vignette > 0) {
      wctx.save();
      wctx.globalCompositeOperation = "source-over";
      wctx.globalAlpha = fx.vignette;
      wctx.drawImage(this.vignetteCanvas, 0, 0);
      wctx.restore();
    }
  }
}

function must2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas 2D context を取得できませんでした");
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** 中央透明 → 四隅に向かって暗くなるビネットを1枚焼いておく（毎フレーム貼るだけ） */
function buildVignette(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const cx = w / 2;
  const cy = h / 2;
  const inner = Math.min(w, h) * 0.34;
  const outer = Math.hypot(cx, cy);
  const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  g.addColorStop(0, "rgba(0, 0, 0, 0)");
  g.addColorStop(0.7, "rgba(6, 5, 14, 0.28)");
  g.addColorStop(1, "rgba(3, 2, 10, 1)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return canvas;
}
