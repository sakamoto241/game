import type { Game } from "./Game";
import type { Renderer } from "./Renderer";

/**
 * シーン基底クラス。
 *
 * ライフサイクル:
 *   attach(game) → onEnter() → update/render ループ →
 *   （上に別シーンが push されたら pause / 戻ったら resume）→ onExit()
 */
export abstract class Scene {
  abstract readonly name: string;

  /**
   * 上に重ねたシーン（メニュー等）の下に自分を描画させたい場合に true。
   * SceneManager はスタック描画時にこのフラグを見る。
   */
  readonly isOverlay: boolean = false;

  protected game!: Game;

  /** SceneManager が登録時に呼ぶ */
  attach(game: Game): void {
    this.game = game;
  }

  /** シーンがアクティブになった直後 */
  onEnter(): void {}

  /** シーンが破棄される直前 */
  onExit(): void {}

  /** 上に他のシーンが push された */
  pause(): void {}

  /** 上のシーンが pop されて戻ってきた */
  resume(): void {}

  /** 固定タイムステップ（dt は常に 1/60 秒） */
  abstract update(dt: number): void;

  abstract render(r: Renderer): void;
}
