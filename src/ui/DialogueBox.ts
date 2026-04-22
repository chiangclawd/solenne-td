import type { Renderer } from '../engine/Renderer.ts';
import { COLORS } from '../config.ts';

export interface DialogueLine {
  speaker: string;
  text: string;
  color?: string;
  portrait?: string;
}

const portraitCache = new Map<string, HTMLImageElement>();

function getPortrait(src: string): HTMLImageElement | null {
  const cached = portraitCache.get(src);
  if (cached) {
    if (cached.complete && cached.naturalWidth > 0) return cached;
    return null;
  }
  const img = new Image();
  img.onerror = () => { portraitCache.delete(src); };
  img.src = src;
  portraitCache.set(src, img);
  return null;
}

export class DialogueBox {
  private lines: readonly DialogueLine[] = [];
  private index: number = 0;
  private active: boolean = false;
  private onComplete: (() => void) | null = null;

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
  }

  advance(): void {
    if (!this.active) return;
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

    renderer.drawScreenRect(0, 0, vw, vh, 'rgba(0, 0, 0, 0.65)');

    const boxMargin = 16;
    const boxW = vw - boxMargin * 2;
    const boxH = 180;
    const boxX = boxMargin;
    const boxY = vh - boxH - 30;

    renderer.drawScreenRoundedRect(boxX + 2, boxY + 3, boxW, boxH, 12, 'rgba(0, 0, 0, 0.5)');
    renderer.drawScreenRoundedRect(boxX, boxY, boxW, boxH, 12, 'rgba(12, 18, 32, 0.96)');
    renderer.drawScreenRoundedRectOutline(boxX, boxY, boxW, boxH, 12, '#3a4a66', 2);

    const speakerColor = line.color ?? '#5eb8ff';
    let textOffsetX = 0;

    // Optional portrait (file at <base>assets/portraits/<portrait>.svg or .png)
    if (line.portrait) {
      const base = import.meta.env.BASE_URL;
      const img = getPortrait(`${base}assets/portraits/${line.portrait}.svg`);
      if (img) {
        const dpr = window.devicePixelRatio || 1;
        const pSize = 90;
        renderer.ctx.save();
        renderer.ctx.beginPath();
        renderer.ctx.roundRect((boxX + 12) * dpr, (boxY + 12) * dpr, pSize * dpr, pSize * dpr, 8 * dpr);
        renderer.ctx.clip();
        renderer.ctx.drawImage(img, (boxX + 12) * dpr, (boxY + 12) * dpr, pSize * dpr, pSize * dpr);
        renderer.ctx.restore();
        textOffsetX = pSize + 12;
      }
    }

    renderer.drawTextScreen(line.speaker, boxX + 18 + textOffsetX, boxY + 14, speakerColor, 15);

    const textSize = 13;
    const padX = 18;
    const maxCssPx = boxW - padX * 2 - textOffsetX;
    const wrapped = this.wrap(renderer, line.text, maxCssPx, textSize);
    wrapped.forEach((l, i) => {
      renderer.drawTextScreen(l, boxX + padX + textOffsetX, boxY + 42 + i * 20, COLORS.text, textSize);
    });

    renderer.drawTextScreen(
      `${this.index + 1} / ${this.lines.length}  ·  tap to continue ▼`,
      boxX + padX, boxY + boxH - 22, COLORS.textDim, 10,
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
