/**
 * Cinematic Scene (v2.6.1 D3).
 *
 * A single scene drives both the opening and ending cinematics. Each is
 * a procedural timeline of paint operations indexed by elapsed time.
 * Tap anywhere to skip. On finish, transitions to the next scene
 * provided in the constructor.
 *
 * Designed minimal: no asset loading, just Canvas 2D draw ops + a hand-
 * scripted beat list. Roughly 10s opening, 25s ending. Both replayable
 * from Settings → "回顧動畫".
 */
import { BaseScene } from '../ui/Scene.ts';
import type { Scene } from '../ui/Scene.ts';
import { COLORS } from '../config.ts';

export type CinematicKind = 'opening' | 'ending';

interface Rect { x: number; y: number; w: number; h: number }

export class CinematicScene extends BaseScene {
  private kind: CinematicKind;
  private elapsed = 0;
  private skipBtn: Rect | null = null;
  private next: () => Scene;
  private finished = false;

  constructor(
    ctx: import('./SceneContext.ts').SceneContext,
    kind: CinematicKind,
    next: () => Scene,
  ) {
    super(ctx);
    this.kind = kind;
    this.next = next;
  }

  override onEnter(): void {
    this.ctx.playBgm('menu');
  }

  update(dt: number): void {
    if (this.finished) return;
    this.elapsed += dt;
    const total = this.totalDuration();
    if (this.elapsed >= total) {
      this.finish();
    }
  }

  render(): void {
    const r = this.ctx.renderer;
    r.beginFrame();
    r.beginScreen();
    const vw = r.vw();
    const vh = r.vh();

    if (this.kind === 'opening') {
      this.renderOpening(r, vw, vh);
    } else {
      this.renderEnding(r, vw, vh);
    }

    // Skip button (top-right). Always present so player can bail.
    const sw = 64, sh = 28;
    this.skipBtn = { x: vw - sw - 12, y: 12, w: sw, h: sh };
    r.drawScreenRoundedRect(this.skipBtn.x, this.skipBtn.y, sw, sh, 8, 'rgba(20,28,44,0.85)');
    r.drawTextScreenCenter('跳過 ›', this.skipBtn.x + sw / 2, this.skipBtn.y + sh / 2, COLORS.text, 11, true);
  }

  // ---------- Opening (~10 s) ----------
  // Beat A (0-2):   void + title fade-in
  // Beat B (2-5):   distant horde silhouette rises on horizon, red glow
  // Beat C (5-8):   Solenne flag rises center, gold pulse
  // Beat D (8-10):  pull-back, tagline fade

  private renderOpening(r: import('../engine/Renderer.ts').Renderer, vw: number, vh: number): void {
    const t = this.elapsed;
    // Black backdrop with subtle vignette
    r.drawScreenRect(0, 0, vw, vh, '#020308');
    const vG = r.ctx.createRadialGradient(vw / 2, vh / 2, 0, vw / 2, vh / 2, Math.max(vw, vh) * 0.7);
    vG.addColorStop(0, 'rgba(20,40,80,0)');
    vG.addColorStop(1, 'rgba(0,0,0,0.7)');
    r.ctx.fillStyle = vG;
    r.ctx.fillRect(0, 0, vw * (window.devicePixelRatio || 1), vh * (window.devicePixelRatio || 1));

    // Beat B (2-5s) — enemy horde silhouette on lower horizon
    if (t >= 1.5) {
      const phase = Math.min(1, (t - 1.5) / 2.0);
      r.ctx.save();
      r.ctx.globalAlpha = phase;
      const horizonY = vh * 0.62;
      // Red haze
      const redHaze = r.ctx.createLinearGradient(0, horizonY - 30, 0, horizonY + 60);
      redHaze.addColorStop(0, 'rgba(255,80,40,0)');
      redHaze.addColorStop(1, 'rgba(140,30,20,0.5)');
      r.ctx.fillStyle = redHaze;
      r.drawScreenRect(0, horizonY - 30, vw, 90, 'rgba(180,40,30,0.4)');
      // Marching silhouette dots
      const dpr = window.devicePixelRatio || 1;
      r.ctx.fillStyle = '#000';
      for (let i = 0; i < 60; i++) {
        const dx = (i / 60) * vw + Math.sin(t * 1.5 + i) * 2;
        const dy = horizonY + (i % 3) * 4;
        r.ctx.fillRect(dx * dpr, dy * dpr, 3 * dpr, 6 * dpr);
      }
      r.ctx.restore();
    }

    // Beat C (5-8s) — Solenne flag rises center
    if (t >= 4.5) {
      const phase = Math.min(1, (t - 4.5) / 2.5);
      const flagYStart = vh * 0.85;
      const flagYEnd = vh * 0.45;
      const fy = flagYStart + (flagYEnd - flagYStart) * phase;
      const flagX = vw / 2;
      // Pole
      r.ctx.save();
      r.ctx.globalAlpha = phase;
      r.ctx.fillStyle = '#7a6c4a';
      const dpr = window.devicePixelRatio || 1;
      r.ctx.fillRect((flagX - 2) * dpr, fy * dpr, 4 * dpr, 80 * dpr);
      // Flag (gold + blue diagonal split)
      r.ctx.fillStyle = '#ffd166';
      r.ctx.beginPath();
      r.ctx.moveTo(flagX * dpr, fy * dpr);
      r.ctx.lineTo((flagX + 50) * dpr, (fy + 8) * dpr);
      r.ctx.lineTo((flagX + 40) * dpr, (fy + 28) * dpr);
      r.ctx.lineTo(flagX * dpr, (fy + 24) * dpr);
      r.ctx.closePath();
      r.ctx.fill();
      // Pulse glow
      const pulse = 0.5 + Math.sin(t * 4) * 0.3;
      const gG = r.ctx.createRadialGradient(
        (flagX + 20) * dpr, (fy + 18) * dpr, 0,
        (flagX + 20) * dpr, (fy + 18) * dpr, 80 * dpr,
      );
      gG.addColorStop(0, `rgba(255,209,102,${pulse * 0.45})`);
      gG.addColorStop(1, 'rgba(255,209,102,0)');
      r.ctx.fillStyle = gG;
      r.ctx.fillRect(0, 0, vw * dpr, vh * dpr);
      r.ctx.restore();
    }

    // Title text (Beat A onward)
    if (t >= 0.4) {
      const titlePhase = Math.min(1, (t - 0.4) / 1.5);
      r.ctx.save();
      r.ctx.globalAlpha = titlePhase;
      r.drawTextScreenCenter('索倫的最後防線', vw / 2, vh * 0.18, '#ffd166', 28, true);
      r.drawTextScreenCenter('SOLENNE · LAST LINE', vw / 2, vh * 0.18 + 32, COLORS.textDim, 11, true);
      r.ctx.restore();
    }

    // Beat D (8-10s) — tagline below flag
    if (t >= 7.5) {
      const phase = Math.min(1, (t - 7.5) / 2);
      r.ctx.save();
      r.ctx.globalAlpha = phase;
      r.drawTextScreenCenter('當鐵潮湧來，只剩一道防線。', vw / 2, vh * 0.78, '#cbd2de', 14, true);
      r.ctx.restore();
    }

    // Final fade-out (last 1s)
    const total = this.totalDuration();
    if (t >= total - 1) {
      const fade = Math.max(0, Math.min(1, (t - (total - 1)) / 1));
      r.drawScreenRect(0, 0, vw, vh, `rgba(0,0,0,${fade})`);
    }
  }

  // ---------- Ending (~25 s) ----------
  // Beat A (0-3):   sunrise across battlefield (golden gradient sweep)
  // Beat B (3-8):   three hero silhouettes walk across field, left → right
  // Beat C (8-13):  ruins fade out, flag at peace under sunset
  // Beat D (13-20): credits scroll text
  // Beat E (20-25): "But far beneath..." cliffhanger + fade

  private renderEnding(r: import('../engine/Renderer.ts').Renderer, vw: number, vh: number): void {
    const t = this.elapsed;
    // Sunset gradient — warm during, cool by the end
    const sunsetT = Math.min(1, t / 12);
    const skyTop = lerpColor('#1a1028', '#3a1810', sunsetT);
    const skyMid = lerpColor('#2a1838', '#a04030', sunsetT);
    const skyBot = lerpColor('#0a0618', '#5a2820', sunsetT);
    const sky = r.ctx.createLinearGradient(0, 0, 0, vh);
    sky.addColorStop(0, skyTop);
    sky.addColorStop(0.55, skyMid);
    sky.addColorStop(1, skyBot);
    r.ctx.fillStyle = sky;
    const dpr = window.devicePixelRatio || 1;
    r.ctx.fillRect(0, 0, vw * dpr, vh * dpr);

    // Sun
    const sunY = vh * (0.55 - sunsetT * 0.05);
    const sunR = 38;
    const sunG = r.ctx.createRadialGradient(vw / 2 * dpr, sunY * dpr, 0, vw / 2 * dpr, sunY * dpr, sunR * 2 * dpr);
    sunG.addColorStop(0, 'rgba(255,220,120,0.9)');
    sunG.addColorStop(1, 'rgba(255,180,80,0)');
    r.ctx.fillStyle = sunG;
    r.ctx.fillRect(0, 0, vw * dpr, vh * dpr);
    r.ctx.fillStyle = '#ffd166';
    r.ctx.beginPath();
    r.ctx.arc(vw / 2 * dpr, sunY * dpr, sunR * dpr, 0, Math.PI * 2);
    r.ctx.fill();

    // Distant battlefield silhouette (low horizon)
    r.ctx.fillStyle = 'rgba(8,5,12,0.85)';
    r.ctx.beginPath();
    r.ctx.moveTo(0, (vh * 0.7) * dpr);
    for (let x = 0; x <= vw; x += 8) {
      const noise = Math.sin(x * 0.05) * 6 + Math.cos(x * 0.13) * 3;
      r.ctx.lineTo(x * dpr, (vh * 0.7 + noise) * dpr);
    }
    r.ctx.lineTo(vw * dpr, vh * dpr);
    r.ctx.lineTo(0, vh * dpr);
    r.ctx.closePath();
    r.ctx.fill();

    // Beat B (3-13s) — 3 hero silhouettes walk across field
    if (t >= 2 && t <= 13) {
      const phase = Math.max(0, (t - 2) / 11);
      const xs = [0.15, 0.35, 0.55].map((p) => p + phase * 0.45);
      const heroY = vh * 0.72;
      for (let i = 0; i < 3; i++) {
        const hx = xs[i] * vw;
        const sway = Math.sin(t * 2 + i) * 1.5;
        // Body
        r.ctx.fillStyle = 'rgba(0,0,0,0.85)';
        r.ctx.fillRect((hx - 4) * dpr, (heroY - 18 + sway) * dpr, 8 * dpr, 22 * dpr);
        // Head
        r.ctx.beginPath();
        r.ctx.arc(hx * dpr, (heroY - 24 + sway) * dpr, 4 * dpr, 0, Math.PI * 2);
        r.ctx.fill();
      }
    }

    // Beat C (8-13s) — Solenne flag at peace
    if (t >= 8) {
      const phase = Math.min(1, (t - 8) / 3);
      r.ctx.save();
      r.ctx.globalAlpha = phase;
      const flagX = vw * 0.82;
      const flagY = vh * 0.50;
      r.ctx.fillStyle = '#7a6c4a';
      r.ctx.fillRect((flagX - 1.5) * dpr, flagY * dpr, 3 * dpr, 40 * dpr);
      // Gentle wave
      const sway = Math.sin(t * 1.4) * 2;
      r.ctx.fillStyle = '#ffd166';
      r.ctx.beginPath();
      r.ctx.moveTo(flagX * dpr, flagY * dpr);
      r.ctx.lineTo((flagX + 22 + sway) * dpr, (flagY + 4) * dpr);
      r.ctx.lineTo((flagX + 18 + sway) * dpr, (flagY + 14) * dpr);
      r.ctx.lineTo(flagX * dpr, (flagY + 12) * dpr);
      r.ctx.closePath();
      r.ctx.fill();
      r.ctx.restore();
    }

    // Beat D (12-20s) — credits scroll
    if (t >= 12 && t <= 21) {
      const phase = (t - 12) / 9;
      r.ctx.save();
      const baseY = vh * (1.0 - phase * 0.7);
      const lines = [
        '索倫的最後防線',
        '',
        '指揮官 — 基蘭 · 瓦西亞 · 皮普',
        '',
        '索倫王國 · 28 道防線 · 6 場試煉',
        '',
        '當潮水退去',
        '麥田再次生長',
      ];
      r.ctx.globalAlpha = Math.min(1, Math.min(phase * 3, (1 - phase) * 3));
      for (let i = 0; i < lines.length; i++) {
        r.drawTextScreenCenter(lines[i], vw / 2, baseY + i * 22, lines[i] === lines[0] ? '#ffd166' : '#cbd2de', lines[i] === lines[0] ? 18 : 12, lines[i] === lines[0]);
      }
      r.ctx.restore();
    }

    // Beat E (20-25s) — cliffhanger
    if (t >= 20) {
      const phase = Math.min(1, (t - 20) / 3);
      r.ctx.save();
      r.ctx.globalAlpha = phase;
      r.drawTextScreenCenter('但深海下方……', vw / 2, vh / 2 - 10, '#6ec8ff', 16, true);
      r.drawTextScreenCenter('某物正在甦醒。', vw / 2, vh / 2 + 16, '#5eb8ff', 14);
      r.ctx.restore();
    }

    // Final fade-out (last 1s)
    const total = this.totalDuration();
    if (t >= total - 1.5) {
      const fade = Math.max(0, Math.min(1, (t - (total - 1.5)) / 1.5));
      r.drawScreenRect(0, 0, vw, vh, `rgba(0,0,0,${fade})`);
    }
  }

  private totalDuration(): number {
    return this.kind === 'opening' ? 10 : 25;
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    // Mark seen flag in save
    if (this.kind === 'opening') {
      this.ctx.save.seenIntro = true;
    } else {
      this.ctx.save.seenOutro = true;
    }
    this.ctx.persistSave();
    this.ctx.transition(this.next());
  }

  override onTap(screenX: number, screenY: number): void {
    if (this.skipBtn && this.inside(screenX, screenY, this.skipBtn)) {
      this.ctx.audio.click();
      this.finish();
      return;
    }
    // Tapping elsewhere also skips — cinematic should never feel like a wall.
    this.finish();
  }
}

// ---------- helpers ----------

function lerpColor(a: string, b: string, t: number): string {
  const av = hexToRgb(a);
  const bv = hexToRgb(b);
  const r = Math.round(av[0] + (bv[0] - av[0]) * t);
  const g = Math.round(av[1] + (bv[1] - av[1]) * t);
  const bb = Math.round(av[2] + (bv[2] - av[2]) * t);
  return `rgb(${r},${g},${bb})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  return [0, 0, 0];
}
