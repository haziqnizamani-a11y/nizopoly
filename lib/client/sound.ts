"use client";

/**
 * Synthesised sound effects. No audio files: everything is generated with the
 * Web Audio API, so there are no assets to load and nothing to go stale.
 *
 * Browsers refuse to start audio before a user gesture, so the context is
 * created lazily on the first play() and resumed on the first click.
 */

export type SoundName =
  | "step"
  | "land"
  | "dice"
  | "buy"
  | "rent"
  | "collect"
  | "passGo"
  | "card"
  | "jail"
  | "build"
  | "trade"
  | "turn"
  | "win"
  | "lose"
  | "error";

const MUTE_KEY = "nizopoly:muted";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;
  private listeners = new Set<(muted: boolean) => void>();

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.muted = window.localStorage.getItem(MUTE_KEY) === "1";
      } catch {
        this.muted = false;
      }
    }
  }

  isMuted() {
    return this.muted;
  }

  /** Returns an unsubscribe function suitable for a useEffect cleanup. */
  onChange(fn: (muted: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      // Storage unavailable; the setting just won't persist.
    }
    for (const fn of this.listeners) fn(muted);
    if (!muted) void this.ensure();
  }

  toggle() {
    this.setMuted(!this.muted);
  }

  /** Safe to call from a click handler to satisfy the autoplay policy. */
  async ensure(): Promise<void> {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        // Still waiting on a gesture.
      }
    }
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noise) return this.noise;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;
    return buf;
  }

  /** One shaped oscillator note. */
  private tone(
    freq: number,
    opts: {
      at?: number;
      dur?: number;
      type?: OscillatorType;
      gain?: number;
      slideTo?: number;
    } = {}
  ) {
    const ctx = this.ctx!;
    const { at = 0, dur = 0.15, type = "sine", gain = 0.6, slideTo } = opts;
    const t0 = ctx.currentTime + at;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, dur * 0.25));
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(env).connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Filtered noise, for dice rattle and paper swooshes. */
  private hiss(
    opts: { at?: number; dur?: number; from?: number; to?: number; gain?: number; q?: number } = {}
  ) {
    const ctx = this.ctx!;
    const { at = 0, dur = 0.2, from = 900, to = 500, gain = 0.35, q = 1 } = opts;
    const t0 = ctx.currentTime + at;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter).connect(env).connect(this.master!);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  play(name: SoundName) {
    if (this.muted) return;
    void this.ensure().then(() => {
      if (!this.ctx || !this.master || this.ctx.state !== "running") return;
      this.render(name);
    });
  }

  private render(name: SoundName) {
    switch (name) {
      // Quiet tick as a token hops a tile. Plays a lot — keep it tiny.
      case "step":
        this.tone(320, { dur: 0.05, type: "triangle", gain: 0.16, slideTo: 240 });
        return;

      case "land":
        this.tone(150, { dur: 0.13, type: "sine", gain: 0.5, slideTo: 90 });
        this.hiss({ dur: 0.06, from: 1600, to: 500, gain: 0.12 });
        return;

      // Dice tumbling in a cup, then landing.
      case "dice":
        for (let i = 0; i < 7; i++) {
          this.hiss({ at: i * 0.055, dur: 0.045, from: 2600, to: 1100, gain: 0.2, q: 2 });
        }
        this.tone(180, { at: 0.42, dur: 0.1, type: "triangle", gain: 0.35, slideTo: 120 });
        return;

      case "buy":
        this.tone(523.25, { dur: 0.11, type: "triangle", gain: 0.5 });
        this.tone(783.99, { at: 0.1, dur: 0.18, type: "triangle", gain: 0.5 });
        return;

      case "rent":
        this.tone(392, { dur: 0.14, type: "sawtooth", gain: 0.28 });
        this.tone(261.63, { at: 0.12, dur: 0.24, type: "sawtooth", gain: 0.26 });
        return;

      case "collect":
        this.tone(880, { dur: 0.08, type: "sine", gain: 0.45 });
        this.tone(1174.66, { at: 0.07, dur: 0.14, type: "sine", gain: 0.4 });
        return;

      // Passing GO deserves a little fanfare.
      case "passGo":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(f, { at: i * 0.075, dur: 0.16, type: "triangle", gain: 0.42 })
        );
        return;

      case "card":
        this.hiss({ dur: 0.26, from: 500, to: 2800, gain: 0.3, q: 0.7 });
        this.tone(660, { at: 0.2, dur: 0.1, type: "sine", gain: 0.28 });
        return;

      // Cell door.
      case "jail":
        this.tone(220, { dur: 0.34, type: "square", gain: 0.3, slideTo: 110 });
        this.tone(233, { dur: 0.34, type: "square", gain: 0.22, slideTo: 116 });
        this.hiss({ dur: 0.3, from: 3200, to: 800, gain: 0.16, q: 3 });
        return;

      case "build":
        this.tone(1200, { dur: 0.05, type: "square", gain: 0.3, slideTo: 700 });
        this.tone(1200, { at: 0.11, dur: 0.06, type: "square", gain: 0.32, slideTo: 600 });
        return;

      case "trade":
        this.tone(587.33, { dur: 0.1, type: "sine", gain: 0.4 });
        this.tone(880, { at: 0.09, dur: 0.14, type: "sine", gain: 0.4 });
        return;

      case "turn":
        this.tone(987.77, { dur: 0.12, type: "sine", gain: 0.4 });
        return;

      case "win":
        [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
          this.tone(f, { at: i * 0.11, dur: 0.3, type: "triangle", gain: 0.5 })
        );
        return;

      case "lose":
        [440, 392, 349.23, 261.63].forEach((f, i) =>
          this.tone(f, { at: i * 0.13, dur: 0.3, type: "sawtooth", gain: 0.3 })
        );
        return;

      case "error":
        this.tone(160, { dur: 0.16, type: "square", gain: 0.28 });
        return;
    }
  }
}

export const sound = new SoundEngine();

/** Attach once so the first tap anywhere unlocks audio. */
export function primeAudioOnFirstGesture() {
  if (typeof window === "undefined") return;
  const unlock = () => {
    void sound.ensure();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}
