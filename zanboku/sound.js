// Original procedural sound: rain, inharmonic temple bell, steel and scabbard.
// No recordings, external services, music APIs, or downloaded music.
export class Sound {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.lastSlash = 0;
    this.suspended = false;
  }
  async start() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 0.38 : 0;
        this.master.connect(this.ctx.destination);
        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.value = 0.1;
        this.rainGain.connect(this.master);
        const n = this.ctx.sampleRate * 3,
          b = this.ctx.createBuffer(1, n, this.ctx.sampleRate),
          v = b.getChannelData(0);
        let prev = 0;
        for (let i = 0; i < n; i++) {
          prev = (prev + Math.random() * 0.04 - 0.02) / 1.025;
          v[i] = prev;
        }
        this.noise = b;
        const src = this.ctx.createBufferSource();
        src.buffer = b;
        src.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 620;
        src.connect(filter);
        filter.connect(this.rainGain);
        src.start();
      }
      if (this.ctx.state !== "running" && this.ctx.state !== "closed")
        await this.ctx.resume();
      this.suspended = this.ctx.state !== "running";
    } catch {
      /* Audio is optional. Gameplay continues. */
    }
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.ctx)
      this.master.gain.setTargetAtTime(
        this.enabled ? 0.38 : 0,
        this.ctx.currentTime,
        0.06,
      );
    return this.enabled;
  }
  tone(hz, seconds, level = 0.1, delay = 0, type = "sine") {
    if (!this.ctx || !this.enabled || this.suspended) return;
    const t = this.ctx.currentTime + delay,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = hz;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + seconds + 0.02);
  }
  rustle(seconds, level, filterHz = 1400, delay = 0) {
    if (!this.ctx || !this.enabled || this.suspended) return;
    const t = this.ctx.currentTime + delay,
      src = this.ctx.createBufferSource(),
      g = this.ctx.createGain(),
      f = this.ctx.createBiquadFilter();
    src.buffer = this.noise;
    f.type = "bandpass";
    f.frequency.value = filterHz;
    f.Q.value = 0.5;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + seconds + 0.02);
  }
  bell(second = false) {
    const base = second ? 116 : 103;
    [1, 2.01, 2.7, 4.18, 5.43].forEach((n, i) =>
      this.tone(base * n, 2.8 - i * 0.33, 0.1 / (1 + i * 0.8)),
    );
  }
  event(e) {
    if (!this.ctx || !this.enabled || this.suspended) return;
    if (e.type === "bell" || e.type === "bossintro") this.bell(e.second);
    if (e.type === "slash") {
      this.rustle(0.16, 0.8, 2300);
      if (e.count) this.tone(1450, 0.12, 0.035);
    }
    if (e.type === "dash") this.rustle(0.2, 0.9, 800);
    if (e.type === "seal") {
      this.rustle(0.05, 0.8, 2400);
      this.tone(2700, 0.055, 0.04);
      const t = this.ctx.currentTime;
      this.rainGain.gain.cancelScheduledValues(t);
      this.rainGain.gain.setValueAtTime(0.1, t);
      this.rainGain.gain.linearRampToValueAtTime(0.005, t + 0.03);
      this.rainGain.gain.setValueAtTime(0.005, t + 0.18);
      this.rainGain.gain.linearRampToValueAtTime(0.1, t + 0.5);
      if (e.count || e.targets.length) {
        this.rustle(0.3, 1.3, 1700, 0.12);
        this.tone(122, 0.3, 0.12, 0.12);
      }
    }
    if (e.type === "hurt") {
      this.rustle(0.28, 0.7, 240);
      this.tone(71, 0.25, 0.12);
    }
    if (e.type === "stagger") {
      this.tone(177, 0.45, 0.12);
      this.rustle(0.3, 0.7, 700);
    }
    if (e.type === "victory") {
      [196, 294, 392].forEach((f, i) => this.tone(f, 2, 0.07, i * 0.18));
    }
  }
  pause() {
    this.suspended = true;
    if (this.ctx) this.ctx.suspend().catch(() => {});
  }
}
