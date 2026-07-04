import { AssetManager } from "./AssetManager";
import { AudioManager } from "./AudioManager";
import { EventBus } from "./EventBus";
import { Input } from "./Input";
import { Renderer } from "./Renderer";
import { Rng, hashString } from "./Rng";
import { SaveManager } from "./SaveManager";
import type { Scene } from "./Scene";
import { SceneManager } from "./SceneManager";
import { DebugOverlay } from "../debug/DebugOverlay";
import { TextRenderer } from "../gfx/TextRenderer";

/** ゲーム全体を流れるイベントの型定義。機能追加時はここへ足していく */
export interface AppEvents extends Record<string, unknown> {
  "scene:changed": { name: string };
}

/**
 * ゲーム本体。サブシステムの生成とメインループを担う。
 *
 * メインループは「固定タイムステップ + アキュムレータ」方式。
 * 描画は requestAnimationFrame 任せ（可変）だが、
 * update は常に 1/60 秒刻みで呼ばれるため、
 * 120Hz モニタでもゲーム速度が変わらず、
 * 将来の「シード + 入力列」によるダンジョン再現・リプレイにも耐える。
 */
export class Game {
  static readonly STEP = 1 / 60;
  /** タブ復帰などで巨大な dt が来たときの暴走防止 */
  private static readonly MAX_FRAME_SEC = 0.25;

  readonly renderer: Renderer;
  readonly input: Input;
  readonly assets: AssetManager;
  readonly audio: AudioManager;
  readonly saves: SaveManager;
  readonly text: TextRenderer;
  readonly events: EventBus<AppEvents>;
  readonly scenes: SceneManager;
  readonly debug: DebugOverlay;
  /** 全乱数の親。ここから fork したストリームだけを使う */
  readonly rootRng: Rng;

  /** ゲーム起動からの累計時間（秒）。演出のタイマーなどに使う */
  elapsed = 0;

  private accumulator = 0;
  private lastTime: number | null = null;
  private fpsCounter = 0;
  private upsCounter = 0;
  private statTimer = 0;
  private fps = 0;
  private ups = 0;

  constructor(parent: HTMLElement, seed: string = `run-${Date.now()}`) {
    this.renderer = new Renderer(parent);
    this.input = new Input();
    this.assets = new AssetManager();
    this.audio = new AudioManager(this.assets);
    this.saves = new SaveManager();
    this.text = new TextRenderer();
    this.events = new EventBus<AppEvents>();
    this.debug = new DebugOverlay();
    this.rootRng = new Rng(hashString(seed));
    this.scenes = new SceneManager(this, (name) =>
      this.events.emit("scene:changed", { name }),
    );
  }

  async start(makeInitialScene: (game: Game) => Scene): Promise<void> {
    await this.assets.loadManifest();
    this.audio.init();
    this.installAudioUnlock();
    this.scenes.replace(makeInitialScene(this), 0.6);
    requestAnimationFrame((t) => this.frame(t));
  }

  /**
   * ブラウザの自動再生ポリシー対策。
   * AudioContext.resume() は「ユーザー操作のハンドラ内」で呼ぶ必要があるため、
   * 最初の入力を直接のイベントリスナーで捕まえて unlock する（1回だけ）。
   */
  private installAudioUnlock(): void {
    const unlock = () => {
      this.audio.unlock();
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("keydown", unlock);
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("touchstart", unlock);
  }

  private frame(timeMs: number): void {
    if (this.lastTime === null) this.lastTime = timeMs;
    const frameSec = Math.min((timeMs - this.lastTime) / 1000, Game.MAX_FRAME_SEC);
    this.lastTime = timeMs;
    this.accumulator += frameSec;
    this.statTimer += frameSec;

    while (this.accumulator >= Game.STEP) {
      this.step(Game.STEP);
      this.accumulator -= Game.STEP;
      this.upsCounter++;
    }

    this.render();
    this.fpsCounter++;

    if (this.statTimer >= 1) {
      this.fps = this.fpsCounter;
      this.ups = this.upsCounter;
      this.fpsCounter = 0;
      this.upsCounter = 0;
      this.statTimer -= 1;
    }

    requestAnimationFrame((t) => this.frame(t));
  }

  private step(dt: number): void {
    this.elapsed += dt;
    if (this.input.pressed("debug")) this.debug.toggle();
    this.scenes.update(dt);
    this.input.postUpdate();
  }

  private render(): void {
    this.renderer.beginFrame();
    this.scenes.render(this.renderer);
    this.debug.set("FPS", `${this.fps} (update ${this.ups}/s)`);
    this.debug.set("Scene", this.scenes.current?.name ?? "-");
    this.debug.set("BGM", this.audio.currentBgm ?? "-");
    this.debug.render(this.renderer, this.text);
    this.renderer.endFrame();
  }
}
