import type { AssetManager } from "./AssetManager";

/**
 * サウンド管理（Phase 0 ではインターフェースのみ確定させたスタブ）。
 *
 * シーン側は今から audio.playBgm("town") のように呼んでおく。
 * 音声ファイルが manifest.json に登録された時点で、
 * このクラスの内部実装（Web Audio API）を実装するだけで全シーンに音が付く。
 */
export class AudioManager {
  bgmVolume = 0.8;
  seVolume = 0.9;
  /** 現在リクエストされている BGM の ID（デバッグ表示用） */
  currentBgm: string | null = null;

  constructor(private assets: AssetManager) {}

  playBgm(id: string): void {
    if (this.currentBgm === id) return;
    this.currentBgm = id;
    // TODO(Phase 1+): assets.audioPaths.get(id) をロードしてループ再生 + クロスフェード
    void this.assets;
  }

  stopBgm(): void {
    this.currentBgm = null;
  }

  playSe(_id: string): void {
    // TODO(Phase 1+): 効果音のワンショット再生（同時発音数の制御込み）
  }
}
