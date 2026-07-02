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

    window.addEventListener("resize", () => this.resize());
    this.resize();
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

  /** フレーム終了。表示キャンバスへ整数倍合成する */
  endFrame(): void {
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
}

function must2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas 2D context を取得できませんでした");
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
