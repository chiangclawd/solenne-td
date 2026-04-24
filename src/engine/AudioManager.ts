/**
 * Procedurally-synthesized SFX + BGM via WebAudio.
 * - Three volume channels: master, sfx, bgm
 * - BGM: looping tonal layers (pad + arpeggio + bass) with per-world flavor
 * - SFX: short beeps/noise presets
 * All generated at runtime; no external audio files.
 */

export type BgmTrack = 'menu' | 'world1' | 'world2' | 'world3' | 'world4' | 'world5' | 'world6' | 'victory' | 'none';

interface BgmVoice {
  stop(atTime: number): void;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  private masterVol = 0.7;
  private sfxVol = 0.8;
  private bgmVol = 0.5;
  private muted = false;

  private currentBgm: BgmTrack = 'none';
  private bgmVoices: BgmVoice[] = [];
  private bgmSchedulerId: number | null = null;
  private bgmStartTime = 0;

  ensureContext(): void {
    if (this.ctx && this.ctx.state !== 'suspended') return;
    if (!this.ctx) {
      const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.bgmGain = this.ctx.createGain();
        this.sfxGain.connect(this.master);
        this.bgmGain.connect(this.master);
        this.master.connect(this.ctx.destination);
        this.applyVolumes(0);
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  applySettings(opts: { masterVolume: number; sfxVolume: number; bgmVolume: number; muted: boolean }): void {
    this.masterVol = opts.masterVolume;
    this.sfxVol = opts.sfxVolume;
    this.bgmVol = opts.bgmVolume;
    this.muted = opts.muted;
    this.applyVolumes(0.04);
  }

  private applyVolumes(smoothSec: number): void {
    if (!this.ctx || !this.master || !this.sfxGain || !this.bgmGain) return;
    const now = this.ctx.currentTime;
    const mTarget = this.muted ? 0 : this.masterVol;
    if (smoothSec > 0) {
      this.master.gain.setTargetAtTime(mTarget, now, smoothSec);
      this.sfxGain.gain.setTargetAtTime(this.sfxVol, now, smoothSec);
      this.bgmGain.gain.setTargetAtTime(this.bgmVol, now, smoothSec);
    } else {
      this.master.gain.value = mTarget;
      this.sfxGain.gain.value = this.sfxVol;
      this.bgmGain.gain.value = this.bgmVol;
    }
  }

  isMuted(): boolean { return this.muted; }

  toggleMute(): void {
    this.muted = !this.muted;
    this.applyVolumes(0.04);
  }

  // ---------------- SFX helpers ----------------

  private beep(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 1,
    freqEnd?: number,
    startDelay = 0,
  ): void {
    if (!this.ctx || !this.sfxGain) return;
    const start = this.ctx.currentTime + startDelay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), start + duration);
    }
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g).connect(this.sfxGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private noise(duration: number, gain = 0.3, filterFreq = 1200, startDelay = 0): void {
    if (!this.ctx || !this.sfxGain) return;
    const start = this.ctx.currentTime + startDelay;
    const sampleCount = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    src.connect(filter).connect(g).connect(this.sfxGain);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  // ---------------- SFX presets ----------------

  click(): void { this.beep(1400, 0.04, 'sine', 0.3); }
  place(): void {
    this.beep(440, 0.08, 'triangle', 0.35);
    this.beep(660, 0.1, 'triangle', 0.35, undefined, 0.05);
  }
  sell(): void {
    this.beep(700, 0.06, 'triangle', 0.3);
    this.beep(500, 0.1, 'triangle', 0.3, undefined, 0.04);
  }
  upgrade(): void {
    this.beep(500, 0.08, 'triangle', 0.4);
    this.beep(660, 0.08, 'triangle', 0.4, undefined, 0.07);
    this.beep(880, 0.12, 'triangle', 0.4, undefined, 0.14);
  }
  enemyHit(): void { this.beep(180, 0.05, 'square', 0.15); }
  enemyDie(): void {
    this.beep(320, 0.08, 'sawtooth', 0.3, 80);
    this.noise(0.1, 0.15, 800, 0.02);
  }
  explosion(): void {
    this.noise(0.25, 0.5, 500);
    this.beep(80, 0.3, 'sawtooth', 0.3, 40);
  }
  frost(): void { this.beep(2400, 0.2, 'triangle', 0.15, 1600); }
  leak(): void { this.beep(200, 0.3, 'sawtooth', 0.3, 80); }
  waveStart(): void {
    this.beep(440, 0.18, 'triangle', 0.35);
    this.beep(554, 0.18, 'triangle', 0.35, undefined, 0.18);
    this.beep(659, 0.3, 'triangle', 0.35, undefined, 0.36);
  }
  victory(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.beep(f, 0.25, 'triangle', 0.35, undefined, i * 0.12));
  }
  defeat(): void {
    [440, 392, 349, 294].forEach((f, i) => this.beep(f, 0.35, 'sawtooth', 0.3, undefined, i * 0.14));
  }
  dialog(): void { this.beep(1100, 0.02, 'sine', 0.15); }
  achievement(): void {
    [784, 988, 1175, 1568].forEach((f, i) => this.beep(f, 0.14, 'triangle', 0.25, undefined, i * 0.06));
  }
  /** Ominous two-chord stinger for boss entrance. */
  bossStinger(): void {
    // Low sustained drone
    this.beep(73, 1.6, 'sawtooth', 0.35, 55);
    // Higher tense minor chord slightly delayed
    this.beep(147, 1.2, 'sawtooth', 0.28, 110, 0.15);
    this.beep(220, 0.9, 'triangle', 0.22, undefined, 0.3);
    // Noise swell
    this.noise(0.6, 1.2, 200, 0.1);
  }
  /** Triumphant rising mini-jingle when a hero is deployed. */
  heroDeploy(): void {
    [392, 523, 659, 784].forEach((f, i) =>
      this.beep(f, 0.18, 'triangle', 0.3, undefined, i * 0.05),
    );
    this.noise(0.1, 0.18, 1200, 0.05);
  }

  // ---------------- BGM ----------------

  currentBgmTrack(): BgmTrack { return this.currentBgm; }

  playBgm(track: BgmTrack): void {
    if (this.currentBgm === track) return;
    this.currentBgm = track;
    this.stopBgmScheduler();
    if (track === 'none' || !this.ctx || !this.bgmGain) return;

    const now = this.ctx.currentTime;
    this.bgmStartTime = now;

    const preset = BGM_PRESETS[track];
    this.scheduleLoop(preset);
  }

  stopBgm(): void {
    this.currentBgm = 'none';
    this.stopBgmScheduler();
  }

  private stopBgmScheduler(): void {
    if (this.bgmSchedulerId !== null) {
      clearInterval(this.bgmSchedulerId);
      this.bgmSchedulerId = null;
    }
    if (this.ctx) {
      const atEnd = this.ctx.currentTime + 0.1;
      for (const v of this.bgmVoices) v.stop(atEnd);
    }
    this.bgmVoices = [];
  }

  private scheduleLoop(preset: BgmPreset): void {
    if (!this.ctx || !this.bgmGain) return;
    const loopBarSec = (60 / preset.bpm) * 4;

    const scheduleAhead = 1.0;
    let nextBarStart = this.ctx.currentTime + 0.08;

    const tick = (): void => {
      if (!this.ctx || !this.bgmGain) return;
      while (nextBarStart < this.ctx.currentTime + scheduleAhead) {
        this.scheduleBar(preset, nextBarStart);
        nextBarStart += loopBarSec;
      }
    };
    tick();
    this.bgmSchedulerId = window.setInterval(tick, 250);
  }

  private scheduleBar(preset: BgmPreset, startAt: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const beatSec = 60 / preset.bpm;

    // Pad chord — long sustained triad
    const chord = preset.chords[Math.floor((startAt - this.bgmStartTime) / (beatSec * 4)) % preset.chords.length];
    for (const semi of chord) {
      const freq = preset.root * Math.pow(2, semi / 12);
      this.bgmPad(freq, startAt, beatSec * 4, preset.padGain);
    }

    // Bass — root on beat 1 and 3
    const bassSemi = chord[0] - 12;
    const bassFreq = preset.root * Math.pow(2, bassSemi / 12);
    this.bgmBass(bassFreq, startAt, beatSec * 1.9, preset.bassGain);
    this.bgmBass(bassFreq, startAt + beatSec * 2, beatSec * 1.9, preset.bassGain);

    // Arpeggio — 16th notes across the chord
    if (preset.arp) {
      const arpPattern = [0, 1, 2, 1, 2, 1, 2, 1, 0, 1, 2, 1, 2, 1, 2, 1];
      for (let i = 0; i < arpPattern.length; i++) {
        const noteIdx = arpPattern[i] % chord.length;
        const arpSemi = chord[noteIdx] + preset.arpOctave * 12;
        const arpFreq = preset.root * Math.pow(2, arpSemi / 12);
        this.bgmArp(arpFreq, startAt + i * (beatSec / 4), beatSec * 0.35, preset.arpGain);
      }
    }

    // Optional high shimmer
    if (preset.shimmer) {
      this.bgmShimmer(preset.root * 4, startAt, beatSec * 4, preset.shimmerGain);
    }
  }

  private bgmPad(freq: number, start: number, dur: number, gain: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(4000, freq * 3);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.6);
    g.gain.linearRampToValueAtTime(gain * 0.9, start + dur - 0.4);
    g.gain.linearRampToValueAtTime(0.0001, start + dur);
    osc.connect(filter).connect(g).connect(this.bgmGain);
    osc.start(start);
    osc.stop(start + dur + 0.05);
    this.bgmVoices.push({ stop: (t) => { try { osc.stop(t); } catch { /* ignore */ } } });
  }

  private bgmBass(freq: number, start: number, dur: number, gain: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(this.bgmGain);
    osc.start(start);
    osc.stop(start + dur + 0.05);
    this.bgmVoices.push({ stop: (t) => { try { osc.stop(t); } catch { /* ignore */ } } });
  }

  private bgmArp(freq: number, start: number, dur: number, gain: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(this.bgmGain);
    osc.start(start);
    osc.stop(start + dur + 0.02);
    this.bgmVoices.push({ stop: (t) => { try { osc.stop(t); } catch { /* ignore */ } } });
  }

  private bgmShimmer(freq: number, start: number, dur: number, gain: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    lfo.type = 'sine';
    lfo.frequency.value = 4;
    lfoGain.gain.value = freq * 0.015;
    lfo.connect(lfoGain).connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.8);
    g.gain.linearRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(this.bgmGain);
    osc.start(start);
    lfo.start(start);
    osc.stop(start + dur + 0.05);
    lfo.stop(start + dur + 0.05);
    this.bgmVoices.push({
      stop: (t) => {
        try { osc.stop(t); } catch { /* ignore */ }
        try { lfo.stop(t); } catch { /* ignore */ }
      },
    });
  }
}

// ---------------- BGM presets ----------------

interface BgmPreset {
  bpm: number;
  root: number;
  chords: readonly number[][];
  padGain: number;
  bassGain: number;
  arp: boolean;
  arpOctave: number;
  arpGain: number;
  shimmer: boolean;
  shimmerGain: number;
}

// Progression uses semitone offsets from root. Minor triads for dark mood.
const BGM_PRESETS: Record<Exclude<BgmTrack, 'none'>, BgmPreset> = {
  menu: {
    bpm: 72,
    root: 146.83, // D3
    chords: [[0, 3, 7], [-2, 3, 7], [-4, 0, 5], [-2, 3, 7]],
    padGain: 0.18,
    bassGain: 0.12,
    arp: true,
    arpOctave: 2,
    arpGain: 0.05,
    shimmer: true,
    shimmerGain: 0.04,
  },
  world1: {
    bpm: 100,
    root: 164.81, // E3
    chords: [[0, 3, 7], [5, 8, 12], [-4, 0, 5], [-2, 3, 7]],
    padGain: 0.15,
    bassGain: 0.14,
    arp: true,
    arpOctave: 2,
    arpGain: 0.06,
    shimmer: false,
    shimmerGain: 0,
  },
  world2: {
    bpm: 116,
    root: 155.56, // Eb3 — darker
    chords: [[0, 3, 7], [-2, 3, 7], [5, 8, 12], [-5, -2, 2]],
    padGain: 0.16,
    bassGain: 0.17,
    arp: true,
    arpOctave: 1,
    arpGain: 0.07,
    shimmer: false,
    shimmerGain: 0,
  },
  world3: {
    bpm: 128,
    root: 138.59, // C#3 — darkest, urgent
    chords: [[0, 3, 7], [-2, 3, 7], [-4, 0, 5], [-7, -4, 0]],
    padGain: 0.18,
    bassGain: 0.18,
    arp: true,
    arpOctave: 2,
    arpGain: 0.08,
    shimmer: true,
    shimmerGain: 0.05,
  },
  world4: {
    bpm: 108,
    root: 130.81, // C3 — cold, spacious
    chords: [[0, 3, 7], [-2, 3, 7], [-5, 0, 5], [-7, -2, 3]],
    padGain: 0.2,
    bassGain: 0.14,
    arp: true,
    arpOctave: 3,
    arpGain: 0.05,
    shimmer: true,
    shimmerGain: 0.08,
  },
  world5: {
    bpm: 134,
    root: 123.47, // B2 — void, dread
    chords: [[0, 3, 6], [-1, 3, 6], [-3, 0, 4], [-6, -3, 0]],
    padGain: 0.17,
    bassGain: 0.2,
    arp: true,
    arpOctave: 2,
    arpGain: 0.09,
    shimmer: true,
    shimmerGain: 0.07,
  },
  world6: {
    // Abyssal — slow, deep, aquatic dread. Minor 7 + suspended chords evoke
    // the seabed. Lower root than W5 for "pressure" feel.
    bpm: 76,
    root: 98.0, // G2 — deep, submerged
    chords: [[0, 3, 7, 10], [-2, 3, 7], [0, 5, 10], [-5, 0, 3, 7]],
    padGain: 0.22,
    bassGain: 0.24,
    arp: true,
    arpOctave: 2,
    arpGain: 0.06,
    shimmer: true,
    shimmerGain: 0.10, // heavier shimmer = bubble/current ambience
  },
  victory: {
    bpm: 88,
    root: 196.0, // G3 — major, hopeful
    chords: [[0, 4, 7], [5, 9, 12], [-5, 0, 4], [0, 4, 7]],
    padGain: 0.2,
    bassGain: 0.12,
    arp: true,
    arpOctave: 2,
    arpGain: 0.06,
    shimmer: true,
    shimmerGain: 0.06,
  },
};
