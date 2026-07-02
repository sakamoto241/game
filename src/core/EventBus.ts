/**
 * 型付き Pub/Sub イベントバス。
 *
 * 層をまたぐ通知（例: ダンジョン層 → 街の発展層）を疎結合にするための仕組み。
 * イベントマップをジェネリクスで受け取るので、イベント名も payload も型安全。
 */
type Handler<T> = (payload: T) => void;

export class EventBus<E extends Record<string, unknown>> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  /** 購読する。戻り値は購読解除関数 */
  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(event, handler);
  }

  /** 一度だけ受け取る */
  once<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    const unsub = this.on(event, (payload) => {
      unsub();
      handler(payload);
    });
    return unsub;
  }

  off<K extends keyof E>(event: K, handler: Handler<E[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // ハンドラ内で購読解除されても安全なようにコピーして回す
    for (const h of [...set]) {
      (h as Handler<E[K]>)(payload);
    }
  }
}
