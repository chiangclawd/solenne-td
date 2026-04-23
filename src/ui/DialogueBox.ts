import type { Renderer } from '../engine/Renderer.ts';
import { COLORS } from '../config.ts';

export interface DialogueLine {
  speaker: string;
  text: string;
  color?: string;
  portrait?: string;
}

// Per-portrait loader state: sequential PNG → WebP → SVG fallback.
// Never shows a lower-priority image while a higher-priority one is still pending —
// this prevents the "SVG flashes then gets replaced by PNG" problem.
interface PortraitState {
  extIdx: number;
  img: HTMLImageElement | null;
  exhausted: boolean;
}
const EXTS = ['webp', 'png', 'svg'] as const;
const portraitState = new Map<string, PortraitState>();

function getPortrait(id: string, baseUrl: string): HTMLImageElement | null {
  let st = portraitState.get(id);
  if (!st) {
    st = { extIdx: 0, img: null, exhausted: false };
    portraitState.set(id, st);
    tryNext(id, baseUrl, st);
  }
  // Ready image available?
  if (st.img && st.img.complete && st.img.naturalWidth > 0) return st.img;
  // Loading: show nothing (caller skips portrait area)
  return null;
}

function tryNext(id: string, baseUrl: string, st: PortraitState): void {
  if (st.extIdx >= EXTS.length) { st.exhausted = true; return; }
  const ext = EXTS[st.extIdx];
  const src = `${baseUrl}assets/portraits/${id}.${ext}`;
  const img = new Image();
  img.onload = () => { st.img = img; };
  img.onerror = () => {
    st.extIdx++;
    tryNext(id, baseUrl, st);
  };
  img.src = src;
}

const ADVANCE_COOLDOWN = 0.25; // seconds — prevents mobile touch/mouse double-fire
const SHOW_GRACE = 0.35;       // seconds after show() before tap can advance

export class DialogueBox {
  private lines: readonly DialogueLine[] = [];
  private index: number = 0;
  private active: boolean = false;
  private onComplete: (() => void) | null = null;
  private showTime = 0;          // performance.now() when shown
  private lastAdvance = 0;       // performance.now() of last advance

  isActive(): boolean {
    return this.active;
  }

  show(lines: readonly DialogueLine[], onComplete?: () => void): void {
    if (lines.length === 0) {
      onComplete?.();
      return;
    }
    this.lines = lines;
    this.index = 0;
    this.active = true;
    this.onComplete = onComplete ?? null;
    this.showTime = performance.now();
    this.lastAdvance = this.showTime;
  }

  advance(): void {
    if (!this.active) return;
    const now = performance.now();
    // Grace window right after show — ignore accidental stale taps
    if (now - this.showTime < SHOW_GRACE * 1000) return;
    // Debounce rapid double-fire (mobile touch + synth mouse events)
    if (now - this.lastAdvance < ADVANCE_COOLDOWN * 1000) return;
    this.lastAdvance = now;
    this.index++;
    if (this.index >= this.lines.length) {
      this.active = false;
      const cb = this.onComplete;
      this.onComplete = null;
      cb?.();
    }
  }

  render(renderer: Renderer): void {
    if (!this.active) return;
    const line = this.lines[this.index];
    if (!line) return;
    const vw = renderer.vw();
    const vh = renderer.vh();

    renderer.drawScreenRect(0, 0, vw, vh, 'rgba(0, 0, 0, 0.7)');

    const boxMargin = 14;
    const boxW = vw - boxMargin * 2;
    const boxH = 230;
    const boxX = boxMargin;
    const boxY = vh - boxH - 24;

    renderer.drawScreenRoundedRect(boxX + 2, boxY + 3, boxW, boxH, 14, 'rgba(0, 0, 0, 0.5)');
    renderer.drawScreenRoundedRect(boxX, boxY, boxW, boxH, 14, 'rgba(12, 18, 32, 0.97)');
    renderer.drawScreenRoundedRectOutline(boxX, boxY, boxW, boxH, 14, '#3a4a66', 2);

    const speakerColor = line.color ?? '#5eb8ff';
    let textOffsetX = 0;

    // Optional portrait — tries PNG/WebP/SVG in that priority
    if (line.portrait) {
      const base = import.meta.env.BASE_URL;
      const img = getPortrait(line.portrait, base);
      if (img) {
        const dpr = window.devicePixelRatio || 1;
        const pSize = 108;
        renderer.ctx.save();
        renderer.ctx.beginPath();
        renderer.ctx.roundRect((boxX + 14) * dpr, (boxY + 14) * dpr, pSize * dpr, pSize * dpr, 10 * dpr);
        renderer.ctx.clip();
        renderer.ctx.drawImage(img, (boxX + 14) * dpr, (boxY + 14) * dpr, pSize * dpr, pSize * dpr);
        renderer.ctx.restore();
        textOffsetX = pSize + 14;
      }
    }

    renderer.drawTextScreen(line.speaker, boxX + 20 + textOffsetX, boxY + 16, speakerColor, 19, true);

    const textSize = 17;
    const padX = 20;
    const maxCssPx = boxW - padX * 2 - textOffsetX;
    const wrapped = this.wrap(renderer, line.text, maxCssPx, textSize);
    wrapped.forEach((l, i) => {
      renderer.drawTextScreen(l, boxX + padX + textOffsetX, boxY + 48 + i * 26, COLORS.text, textSize);
    });

    renderer.drawTextScreen(
      `${this.index + 1} / ${this.lines.length}  ·  點擊繼續 ▼`,
      boxX + padX, boxY + boxH - 24, COLORS.textDim, 12,
    );
  }

  private wrap(renderer: Renderer, text: string, maxCssPx: number, fontSize: number): string[] {
    const dpr = window.devicePixelRatio || 1;
    const ctx = renderer.ctx;
    ctx.save();
    ctx.font = `${fontSize * dpr}px system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif`;
    const maxPx = maxCssPx * dpr;
    const lines: string[] = [];
    let current = '';
    for (const ch of text) {
      const candidate = current + ch;
      if (ctx.measureText(candidate).width > maxPx && current) {
        lines.push(current);
        current = ch;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    ctx.restore();
    return lines;
  }
}
