import type { Game } from "./Game";
import type { Renderer } from "./Renderer";
import { UI_W, UI_H } from "./Renderer";
import type { Scene } from "./Scene";

/**
 * シーン管理（スタック方式）。
 *
 * - replace: フェード付きでシーンを切り替える（街 → ダンジョン等）
 * - push/pop: 現在のシーンの上に重ねる（フィールドの上のメニュー等）
 *
 * フェード中はシーンの update を止める（演出中の入力事故を防ぐ）。
 */
interface FadeTransition {
  phase: "out" | "in";
  t: number;
  duration: number;
  pending: Scene | null;
  /** true ならスタック全体を破棄して pending に置き換える */
  clearStack?: boolean;
}

export class SceneManager {
  private stack: Scene[] = [];
  private transition: FadeTransition | null = null;

  constructor(
    private game: Game,
    private onChange?: (sceneName: string) => void,
  ) {}

  get current(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  /** スタック最上位をフェード付きで置き換える */
  replace(scene: Scene, fadeSec = 0.35): void {
    if (this.transition) return; // 遷移中の多重リクエストは無視
    scene.attach(this.game);
    if (this.stack.length === 0 || fadeSec <= 0) {
      this.applyReplace(scene);
      if (fadeSec > 0) {
        this.transition = { phase: "in", t: 0, duration: fadeSec, pending: null };
      }
      return;
    }
    this.transition = { phase: "out", t: 0, duration: fadeSec, pending: scene };
  }

  /**
   * スタックを全て破棄してシーンを置き換える。
   * 戦闘（push中）からの死亡帰還など「どこにいても街へ戻る」遷移に使う。
   */
  replaceAll(scene: Scene, fadeSec = 0.35): void {
    if (this.transition) return;
    scene.attach(this.game);
    if (this.stack.length === 0 || fadeSec <= 0) {
      this.clearAll();
      this.stack.push(scene);
      scene.onEnter();
      this.notifyChange();
      if (fadeSec > 0) {
        this.transition = { phase: "in", t: 0, duration: fadeSec, pending: null };
      }
      return;
    }
    this.transition = {
      phase: "out",
      t: 0,
      duration: fadeSec,
      pending: scene,
      clearStack: true,
    };
  }

  /** 現在のシーンの上に重ねる（フェードなし・即時） */
  push(scene: Scene): void {
    scene.attach(this.game);
    this.current?.pause();
    this.stack.push(scene);
    scene.onEnter();
    this.notifyChange();
  }

  pop(): void {
    const top = this.stack.pop();
    top?.onExit();
    this.current?.resume();
    this.notifyChange();
  }

  update(dt: number): void {
    const tr = this.transition;
    if (tr) {
      tr.t += dt;
      if (tr.t >= tr.duration) {
        if (tr.phase === "out" && tr.pending) {
          if (tr.clearStack) this.clearAll();
          this.applyReplace(tr.pending);
          this.transition = { phase: "in", t: 0, duration: tr.duration, pending: null };
        } else {
          this.transition = null;
        }
      }
      return; // フェード中はシーンの時間を止める
    }
    this.current?.update(dt);
  }

  render(r: Renderer): void {
    // overlay シーンが上にある場合、その下のシーンも描く
    const visibleFrom = this.findVisibleBase();
    for (let i = visibleFrom; i < this.stack.length; i++) {
      this.stack[i]?.render(r);
    }
    this.renderFade(r);
  }

  private findVisibleBase(): number {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (!this.stack[i]?.isOverlay) return i;
    }
    return 0;
  }

  private clearAll(): void {
    while (this.stack.length > 0) {
      this.stack.pop()?.onExit();
    }
  }

  private applyReplace(scene: Scene): void {
    const old = this.stack.pop();
    old?.onExit();
    this.stack.push(scene);
    scene.onEnter();
    this.notifyChange();
  }

  private renderFade(r: Renderer): void {
    const tr = this.transition;
    if (!tr) return;
    const progress = Math.min(1, tr.t / tr.duration);
    const alpha = tr.phase === "out" ? progress : 1 - progress;
    r.ui.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
    r.ui.fillRect(0, 0, UI_W, UI_H);
  }

  private notifyChange(): void {
    const name = this.current?.name ?? "(none)";
    this.onChange?.(name);
  }
}
