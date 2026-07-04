import type { AssetManager } from "./AssetManager";
import {
  BGM_SOURCES,
  SE_FILE_SOURCES,
  SE_RECIPES,
  SE_FALLBACK,
  type AudioSource,
  type SeBlip,
} from "../data/audioAssets";

/**
 * サウンド管理（Web Audio API 実装）。
 *
 * - BGM: ループ再生 + クロスフェード切り替え。
 * - ブラウザの自動再生ポリシー対策: 最初のユーザー操作まで AudioContext は
 *   suspended のまま。unlock() を最初のキー入力で呼ぶと再生が始まる。
 * - 音源は data: URI（audioAssets.ts）なので file:// 単一HTMLでも鳴る。
 *
 * シーン側のインターフェース（playBgm/stopBgm/playSe）は Phase 0 から不変。
 */
const FADE_SEC = 0.9;
const SETTINGS_KEY = "machi-meikyu.audio";

interface BgmVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export class AudioManager {
  /** 0..1。設定画面から調整・localStorage に保存される */
  masterVolume = 0.8;
  bgmVolume = 0.7;
  seVolume = 0.85;
  /** 現在リクエストされている BGM の ID（デバッグ表示・シーンからの参照用） */
  currentBgm: string | null = null;

  private ctx: AudioContext | null = null;
  /** 全体の最終段。masterBgm/masterSe がここに集まり destination へ */
  private masterGain: GainNode | null = null;
  private masterBgm: GainNode | null = null;
  /** SE 用マスター（BGM とは独立。BGM を止めずに重ねて鳴らす） */
  private masterSe: GainNode | null = null;
  /** ホワイトノイズのバッファ（SE 合成で使い回す） */
  private noiseBuffer: AudioBuffer | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private current: BgmVoice | null = null;
  private unlocked = false;
  /** デコード待ちなどで unlock 前に鳴らせなかった BGM を覚えておく */
  private pendingBgm: string | null = null;

  constructor(private assets: AssetManager) {
    void this.assets;
    this.loadSettings();
  }

  /** AudioContext を生成し、全 BGM を非同期にデコードしておく */
  init(): void {
    if (this.ctx) return;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) {
      console.warn("[AudioManager] Web Audio API 非対応。無音で動作します。");
      return;
    }
    this.ctx = new Ctor();

    // masterBgm ┐          ┌ (destination)
    // masterSe  ┴ masterGain┘
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(this.ctx.destination);

    this.masterBgm = this.ctx.createGain();
    this.masterBgm.gain.value = this.bgmVolume;
    this.masterBgm.connect(this.masterGain);

    this.masterSe = this.ctx.createGain();
    this.masterSe.gain.value = this.seVolume;
    this.masterSe.connect(this.masterGain);

    // SE 合成用の 1 秒ホワイトノイズを用意
    this.noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    for (const [id, src] of Object.entries(BGM_SOURCES)) {
      void this.load(id, src);
    }
    // ファイル音源の SE があれば先読み（プロシージャル合成より優先される）
    for (const [id, src] of Object.entries(SE_FILE_SOURCES)) {
      void this.load(id, src);
    }
  }

  /** 最初のユーザー操作で呼ぶ（AudioContext を resume し、保留 BGM を鳴らす） */
  unlock(): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.unlocked = true;
    const pending = this.pendingBgm ?? this.currentBgm;
    if (pending && !this.current) {
      this.currentBgm = null; // 再スタートさせる
      this.playBgm(pending);
    }
  }

  playBgm(id: string): void {
    if (this.currentBgm === id && this.current) return;
    this.currentBgm = id;
    if (!this.ctx || !this.unlocked) {
      this.pendingBgm = id; // まだ鳴らせない → unlock 時に再生
      return;
    }
    this.pendingBgm = null;

    const buffer = this.buffers.get(id);
    if (!buffer) {
      // デコード未完了。完了時に「まだこの曲が最新なら」再生する
      this.pendingBgm = id;
      return;
    }
    this.crossfadeTo(id, buffer);
  }

  stopBgm(): void {
    this.currentBgm = null;
    this.pendingBgm = null;
    if (this.current && this.ctx) {
      this.fadeOutAndStop(this.current, FADE_SEC);
      this.current = null;
    }
  }

  /**
   * 効果音を再生する。BGM を止めず、複数同時（ポリフォニー）に鳴らせる。
   * - ファイル音源が登録されていればそれを再生。
   * - なければプロシージャル合成レシピ（SE_RECIPES）で生成。
   * 各呼び出しは独立したノードを作り、鳴り終えたら自動で切り離される。
   */
  playSE(id: string): void {
    if (!this.ctx || !this.masterSe || !this.unlocked) return;

    // 1) ファイル音源（あれば優先）
    const buffer = this.buffers.get(id);
    if (buffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const g = this.ctx.createGain();
      g.gain.value = SE_FILE_SOURCES[id]?.gain ?? 1;
      src.connect(g).connect(this.masterSe);
      src.start();
      return;
    }

    // 2) プロシージャル合成
    const recipe = SE_RECIPES[id] ?? SE_FALLBACK;
    const now = this.ctx.currentTime;
    for (const blip of recipe) this.playBlip(blip, now);
  }

  /** 後方互換のエイリアス（既存コードは playSe を呼んでいる） */
  playSe(id: string): void {
    this.playSE(id);
  }

  /** SE の 1 粒を合成再生する */
  private playBlip(blip: SeBlip, when: number): void {
    if (!this.ctx || !this.masterSe) return;
    const t0 = when + blip.t0;
    const t1 = t0 + blip.dur;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(blip.gain, t0 + 0.005); // 5ms アタック
    g.gain.exponentialRampToValueAtTime(0.0001, t1); // 指数減衰
    g.connect(this.masterSe);

    if (blip.wave === "noise") {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      // 中心周波数まわりのバンドパスで「シュッ」「ドン」を作る
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(blip.f0, t0);
      if (blip.f1 !== undefined) bp.frequency.exponentialRampToValueAtTime(Math.max(20, blip.f1), t1);
      bp.Q.value = 0.8;
      src.connect(bp).connect(g);
      src.start(t0);
      src.stop(t1 + 0.02);
    } else {
      const osc = this.ctx.createOscillator();
      osc.type = blip.wave;
      osc.frequency.setValueAtTime(blip.f0, t0);
      if (blip.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, blip.f1), t1);
      osc.connect(g);
      osc.start(t0);
      osc.stop(t1 + 0.02);
    }
  }

  setMasterVolume(v: number): void {
    this.masterVolume = clamp01(v);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.03);
    }
    this.saveSettings();
  }

  setBgmVolume(v: number): void {
    this.bgmVolume = clamp01(v);
    if (this.masterBgm && this.ctx) {
      this.masterBgm.gain.setTargetAtTime(this.bgmVolume, this.ctx.currentTime, 0.03);
    }
    this.saveSettings();
  }

  setSeVolume(v: number): void {
    this.seVolume = clamp01(v);
    if (this.masterSe && this.ctx) {
      this.masterSe.gain.setTargetAtTime(this.seVolume, this.ctx.currentTime, 0.03);
    }
    this.saveSettings();
  }

  // --- 設定の永続化（セーブスロットとは別の localStorage キー） ---
  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as Partial<Record<"master" | "bgm" | "se", number>>;
      if (typeof s.master === "number") this.masterVolume = clamp01(s.master);
      if (typeof s.bgm === "number") this.bgmVolume = clamp01(s.bgm);
      if (typeof s.se === "number") this.seVolume = clamp01(s.se);
    } catch {
      /* 壊れていれば既定値のまま */
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ master: this.masterVolume, bgm: this.bgmVolume, se: this.seVolume }),
      );
    } catch {
      /* localStorage 不可でも動作は継続 */
    }
  }

  // -------------------------------------------------------------------------
  private async load(id: string, src: AudioSource): Promise<void> {
    if (!this.ctx) return;
    try {
      const res = await fetch(src.url);
      const arr = await res.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(arr);
      this.buffers.set(id, buffer);
      // ロード完了時、この曲が「今鳴らすべき曲」なら再生を開始
      if (this.unlocked && this.currentBgm === id && !this.current) {
        this.crossfadeTo(id, buffer);
      }
    } catch (e) {
      console.warn(`[AudioManager] ${id} のロード/デコードに失敗: ${String(e)}`);
    }
  }

  private crossfadeTo(id: string, buffer: AudioBuffer): void {
    if (!this.ctx || !this.masterBgm) return;
    const now = this.ctx.currentTime;

    if (this.current) this.fadeOutAndStop(this.current, FADE_SEC);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(BGM_SOURCES[id]?.gain ?? 1, now + FADE_SEC);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = BGM_SOURCES[id]?.loop ?? true;
    source.connect(gain).connect(this.masterBgm);
    source.start();
    this.current = { source, gain };
  }

  private fadeOutAndStop(voice: BgmVoice, sec: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + sec);
    try {
      voice.source.stop(now + sec + 0.05);
    } catch {
      /* 既に停止済みなら無視 */
    }
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
