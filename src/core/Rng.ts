/**
 * シード付き乱数 (mulberry32)。
 *
 * このプロジェクトでは Math.random() の使用を全面禁止する。
 * 「同じシードなら同じダンジョン・同じ戦闘結果」を保証することが、
 * ローグライクの再現性・デバッグ・将来のリプレイ/デイリーチャレンジの土台になる。
 *
 * 用途別に fork() でストリームを分岐して使う。
 * 例: rng.fork("dungeon:B1"), rng.fork("battle"), rng.fork("vfx")
 * 演出用の乱数消費がゲームロジックの乱数列を汚染しないように分離する。
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** [0, 1) の浮動小数 */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [min, max] の整数（両端を含む） */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** [min, max) の浮動小数 */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** 確率 p (0..1) で true */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** 配列からランダムに1つ選ぶ。空配列は undefined */
  pick<T>(arr: readonly T[]): T | undefined {
    if (arr.length === 0) return undefined;
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Fisher-Yates シャッフル（破壊的） */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const a = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = a;
    }
    return arr;
  }

  /** ラベルから決定論的に派生ストリームを作る */
  fork(label: string): Rng {
    return new Rng((this.state ^ hashString(label)) >>> 0);
  }
}

/** FNV-1a 32bit 文字列ハッシュ */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
