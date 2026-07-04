import bgmTown from "../assets/audio/bgm_town.ogg";
import bgmDungeon from "../assets/audio/bgm_dungeon.ogg";
import bgmBattle from "../assets/audio/bgm_battle.mp3";
import bgmBoss from "../assets/audio/bgm_boss.mp3";

/**
 * BGM/SE の定義（データ駆動）。
 *
 * BGM: Vite が import を解決し、ビルド時は data: URI としてインライン化される
 *   （vite.config.ts の assetsInlineLimit を大きく設定）。
 *   data: URI は file:// でも fetch/decode 可能なので、単一HTML配布でも音が鳴る。
 *   追加は src/assets/audio/ に置いてここに1行足すだけ。
 *
 * SE: 音源ファイル不要のプロシージャル合成（AudioManager が Web Audio で生成）。
 *   file:// でも CORS/アセット問題が原理的に起きない。
 *   もし本物の SE ファイルを使いたければ、上と同様に import して
 *   SE_FILE_SOURCES に登録すれば、そちらが優先される。
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
  // 通常戦闘 / ボス戦のテーマ（戦闘突入でクロスフェード切替）
  battle: { url: bgmBattle, loop: true, gain: 0.85 },
  boss: { url: bgmBoss, loop: true, gain: 0.85 },
};

/** ファイル音源の SE（省略可。登録すればプロシージャル合成より優先） */
export const SE_FILE_SOURCES: Record<string, AudioSource> = {};

// ---------------------------------------------------------------------------
// プロシージャル SE のレシピ（Web Audio で合成）
// ---------------------------------------------------------------------------
export type SeWave = "sine" | "square" | "triangle" | "sawtooth" | "noise";

/** 1つの音の粒。開始時刻 t0 から dur 秒、f0→f1 へスイープしつつ減衰する */
export interface SeBlip {
  wave: SeWave;
  /** 開始周波数(Hz)。noise では中心周波数の目安（フィルタ用） */
  f0: number;
  /** 終了周波数(Hz)。省略時は f0 固定 */
  f1?: number;
  /** グループ内の相対開始時刻(秒) */
  t0: number;
  /** 長さ(秒) */
  dur: number;
  /** 音量(0..1) */
  gain: number;
}

export type SeRecipe = SeBlip[];

const B = (
  wave: SeWave,
  f0: number,
  t0: number,
  dur: number,
  gain: number,
  f1?: number,
): SeBlip => ({ wave, f0, f1, t0, dur, gain });

/**
 * 効果音レシピ集。既存コードの playSe(id) の id をすべて網羅。
 * 未定義 id はソフトなブリップにフォールバックする。
 */
export const SE_RECIPES: Record<string, SeRecipe> = {
  // UI
  decide: [B("square", 660, 0, 0.06, 0.5, 990)],
  cancel: [B("square", 480, 0, 0.07, 0.45, 300)],
  buy: [B("square", 720, 0, 0.05, 0.4), B("square", 960, 0.06, 0.06, 0.4)],
  // 戦闘
  attack: [B("noise", 2600, 0, 0.09, 0.35, 700)],
  hit: [B("noise", 1400, 0, 0.08, 0.5), B("square", 180, 0, 0.07, 0.4, 90)],
  damage: [B("noise", 900, 0, 0.14, 0.5, 200), B("square", 150, 0, 0.12, 0.35, 70)],
  spell: [B("sine", 380, 0, 0.28, 0.4, 1500)],
  levelup: [
    B("triangle", 523, 0, 0.1, 0.45),
    B("triangle", 659, 0.1, 0.1, 0.45),
    B("triangle", 784, 0.2, 0.1, 0.45),
    B("triangle", 1047, 0.3, 0.18, 0.5),
  ],
  encounter: [B("square", 880, 0, 0.06, 0.4), B("square", 1320, 0.07, 0.09, 0.4)],
  // 中ボスの専用攻撃（不気味・強烈）
  bossSpecial: [
    B("sawtooth", 220, 0, 0.5, 0.5, 60),
    B("noise", 500, 0.05, 0.45, 0.45, 120),
    B("square", 110, 0.1, 0.4, 0.4, 55),
  ],
  // 敵の回避（ヒュッと空を切る）
  evade: [B("noise", 3200, 0, 0.1, 0.3, 1400), B("sine", 1200, 0.02, 0.08, 0.2, 2000)],
  // 逃走（コミカルに駆け去る下降音）
  flee: [B("square", 880, 0, 0.06, 0.35, 1100), B("square", 660, 0.06, 0.06, 0.35, 440), B("square", 440, 0.12, 0.1, 0.3, 220)],
  // HP吸収（ねばつく上昇音）
  drain: [B("sawtooth", 180, 0, 0.3, 0.35, 700), B("sine", 500, 0.05, 0.25, 0.3, 1000)],
  // 自爆（爆発）
  explode: [
    B("noise", 400, 0, 0.4, 0.6, 80),
    B("noise", 900, 0, 0.15, 0.5, 200),
    B("square", 120, 0.02, 0.35, 0.4, 40),
  ],
  // 探索・演出
  heal: [
    B("sine", 660, 0, 0.09, 0.4),
    B("sine", 880, 0.08, 0.09, 0.4),
    B("sine", 1100, 0.16, 0.16, 0.42),
  ],
  warp: [B("sine", 200, 0, 0.4, 0.45, 1200)],
  stairs: [B("sine", 700, 0, 0.28, 0.4, 240)],
  chest: [
    B("square", 784, 0, 0.08, 0.4),
    B("square", 988, 0.08, 0.08, 0.4),
    B("square", 1319, 0.16, 0.16, 0.45),
  ],
  build: [B("noise", 600, 0, 0.09, 0.5, 200), B("noise", 500, 0.14, 0.1, 0.5, 160)],
  mine: [B("noise", 700, 0, 0.1, 0.5, 220), B("square", 160, 0, 0.09, 0.35, 80)],
  bite: [B("square", 520, 0, 0.05, 0.4, 880)],
  catch: [B("sine", 440, 0, 0.22, 0.42, 1100)],
  poison: [B("sine", 320, 0, 0.3, 0.35, 180)],
};

/** 未定義 id 用のフォールバック */
export const SE_FALLBACK: SeRecipe = [B("square", 600, 0, 0.05, 0.3, 720)];
