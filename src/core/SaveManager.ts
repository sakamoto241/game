/**
 * セーブ管理（スロット式・バージョン付き JSON）。
 *
 * version フィールドとマイグレーション処理の「口」を Phase 0 から用意しておく。
 * 後付けすると既存プレイヤーのセーブデータを壊すため、ここだけは最初から作る。
 *
 * 保存先は localStorage。将来のクラウドセーブは
 * このクラスの read/write を差し替えるだけで対応できるよう、
 * ストレージアクセスを private メソッドに閉じ込めてある。
 */
export const SAVE_VERSION = 2;

export interface SaveData {
  [key: string]: unknown;
}

export interface SaveFile {
  version: number;
  savedAt: string; // ISO 8601
  data: SaveData;
}

export interface SlotInfo {
  slot: number;
  savedAt: string;
}

export class SaveManager {
  constructor(private prefix = "machi-meikyu.save.") {}

  save(slot: number, data: SaveData): void {
    const file: SaveFile = {
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      data,
    };
    this.write(slot, file);
  }

  /** 存在しない・壊れている場合は null */
  load(slot: number): SaveData | null {
    const file = this.read(slot);
    if (!file) return null;
    return this.migrate(file).data;
  }

  has(slot: number): boolean {
    return this.read(slot) !== null;
  }

  remove(slot: number): void {
    localStorage.removeItem(this.key(slot));
  }

  /** スロット一覧（空きスロットは null） */
  list(maxSlots = 3): (SlotInfo | null)[] {
    const result: (SlotInfo | null)[] = [];
    for (let slot = 0; slot < maxSlots; slot++) {
      const file = this.read(slot);
      result.push(file ? { slot, savedAt: file.savedAt } : null);
    }
    return result;
  }

  /** 旧バージョンのセーブデータを現行形式へ段階的に変換する */
  private migrate(file: SaveFile): SaveFile {
    // v1 → v2 はデータ形状の違いで判別できるため GameState.load 側で変換する
    if (file.version > SAVE_VERSION) {
      console.warn(`[SaveManager] 未来のセーブバージョン: ${file.version}`);
    }
    return file;
  }

  private key(slot: number): string {
    return `${this.prefix}${slot}`;
  }

  private write(slot: number, file: SaveFile): void {
    localStorage.setItem(this.key(slot), JSON.stringify(file));
  }

  private read(slot: number): SaveFile | null {
    const raw = localStorage.getItem(this.key(slot));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SaveFile;
      if (typeof parsed.version !== "number" || typeof parsed.data !== "object") {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
