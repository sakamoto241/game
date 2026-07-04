/**
 * 入力管理。
 *
 * シーン側は物理キーを一切知らず、抽象アクション名（"confirm" など）だけを見る。
 * キーコンフィグ・ゲームパッド対応は BINDINGS の差し替えで実現できる。
 *
 * pressed/released は「次の update ステップまで」有効。
 * 固定タイムステップで1フレームに複数回 update が走っても、
 * 各キー押下がちょうど1ステップでのみ pressed になる（メニューの二重反応を防ぐ）。
 */
export type Action =
  | "up"
  | "down"
  | "left"
  | "right"
  | "confirm"
  | "cancel"
  | "menu"
  | "debug";

const DEFAULT_BINDINGS: Record<string, Action> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  KeyZ: "confirm",
  Enter: "confirm",
  Space: "confirm",
  KeyX: "cancel",
  Escape: "cancel",
  KeyC: "menu",
  F3: "debug",
};

export class Input {
  private bindings: Record<string, Action>;
  private downSet = new Set<Action>();
  private pressedSet = new Set<Action>();
  private releasedSet = new Set<Action>();

  constructor(target: Window = window, bindings = DEFAULT_BINDINGS) {
    this.bindings = bindings;
    target.addEventListener("keydown", (e) => {
      const action = this.bindings[e.code];
      if (!action) return;
      e.preventDefault();
      if (!e.repeat && !this.downSet.has(action)) {
        this.pressedSet.add(action);
      }
      this.downSet.add(action);
    });
    target.addEventListener("keyup", (e) => {
      const action = this.bindings[e.code];
      if (!action) return;
      e.preventDefault();
      this.downSet.delete(action);
      this.releasedSet.add(action);
    });
    // フォーカス喪失で押しっぱなしが残らないようにする
    target.addEventListener("blur", () => {
      this.downSet.clear();
    });

    // マウス/タップは「決定」として扱う（メッセージ送り・メニュー決定）。
    // 1ステップだけ pressed("confirm") を立てる（押しっぱなし扱いにはしない）。
    const asConfirm = (e: Event) => {
      e.preventDefault();
      this.pressedSet.add("confirm");
    };
    target.addEventListener("pointerdown", asConfirm);
  }

  /** 押されている間ずっと true */
  down(action: Action): boolean {
    return this.downSet.has(action);
  }

  /** 押した瞬間の1ステップだけ true */
  pressed(action: Action): boolean {
    return this.pressedSet.has(action);
  }

  /** 離した瞬間の1ステップだけ true */
  released(action: Action): boolean {
    return this.releasedSet.has(action);
  }

  /** 左右入力を -1/0/+1 で返す */
  axisX(): number {
    return (this.down("right") ? 1 : 0) - (this.down("left") ? 1 : 0);
  }

  /** 上下入力を -1/0/+1 で返す */
  axisY(): number {
    return (this.down("down") ? 1 : 0) - (this.down("up") ? 1 : 0);
  }

  /** 各固定更新ステップの最後に Game が呼ぶ */
  postUpdate(): void {
    this.pressedSet.clear();
    this.releasedSet.clear();
  }
}
