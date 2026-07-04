import bgmTown from "../assets/audio/bgm_town.ogg";
import bgmDungeon from "../assets/audio/bgm_dungeon.ogg";

/**
 * BGM/SE のソース定義（データ駆動）。
 *
 * Vite が import を解決し、ビルド時は data: URI としてインライン化される
 * （vite.config.ts の assetsInlineLimit を大きく設定）。
 * data: URI は file:// でも fetch/decode 可能なので、単一HTML配布でも音が鳴る。
 *
 * 追加する場合: ファイルを src/assets/audio/ に置き、ここに1行足すだけ。
 */
export interface AudioSource {
  url: string;
  loop: boolean;
  /** 個別の音量倍率（0..1）。曲ごとの音圧差を吸収する */
  gain?: number;
}

export const BGM_SOURCES: Record<string, AudioSource> = {
  town: { url: bgmTown, loop: true, gain: 0.9 },
  dungeon: { url: bgmDungeon, loop: true, gain: 0.9 },
};

/** SE は Phase 6 以降で追加予定（インターフェースは AudioManager 側に用意済み） */
export const SE_SOURCES: Record<string, AudioSource> = {};
