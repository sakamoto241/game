import type { AssetManager } from "./AssetManager";
import { BGM_SOURCES, SE_SOURCES, type AudioSource } from "../data/audioAssets";

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

interface BgmVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export class AudioManager {
  bgmVolume = 0.55;
  seVolume = 0.8;
  /** 現在リクエストされている BGM の ID（デバッグ表示・シーンからの参照用） */
  currentBgm: string | null = null;

  private ctx: AudioContext | null = null;
  private masterBgm: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private current: BgmVoice | null = null;
  private unlocked = false;
  /** デコード待ちなどで unlock 前に鳴らせなかった BGM を覚えておく */
  private pendingBgm: string | null = null;

  constructor(private assets: AssetManager) {
    void this.assets;
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
    this.masterBgm = this.ctx.createGain();
    this.masterBgm.gain.value = this.bgmVolume;
    this.masterBgm.connect(this.ctx.destination);

    for (const [id, src] of Object.entries(BGM_SOURCES)) {
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

  playSe(id: string): void {
    if (!this.ctx || !this.unlocked) return;
    const buffer = this.buffers.get(id);
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = this.seVolume * (SE_SOURCES[id]?.gain ?? 1);
    src.connect(g).connect(this.ctx.destination);
    src.start();
  }

  setBgmVolume(v: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    if (this.masterBgm && this.ctx) {
      this.masterBgm.gain.setTargetAtTime(this.bgmVolume, this.ctx.currentTime, 0.05);
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
