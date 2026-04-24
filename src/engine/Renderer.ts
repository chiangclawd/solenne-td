import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE, COLORS } from '../config.ts';

export interface WorldPoint {
  x: number;
  y: number;
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private shakeMag = 0;
  private shakeTime = 0;
  private shakeOffX = 0;
  private shakeOffY = 0;
  private shakeEnabled = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // Also observe canvas size changes directly (handles CSS constraint resizes)
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(canvas);
    }
  }

  /** Canvas CSS width in logical px (for scene layouts). */
  vw(): number {
    return this.canvas.clientWidth || window.innerWidth;
  }

  /** Canvas CSS height in logical px (for scene layouts). */
  vh(): number {
    return this.canvas.clientHeight || window.innerHeight;
  }

  /**
   * Returns extra bottom offset (CSS px) that scenes should subtract from
   * `vh()` when positioning bottom-anchored HUD (tower dock, Start Wave
   * button). Adaptive: if CSS body `padding-bottom: env(safe-area-inset-bottom)`
   * already shrinks the canvas below the home indicator, this returns 0.
   * If the canvas renders edge-to-edge into the indicator area (some iOS
   * PWA standalone combos do this despite CSS padding), returns the raw
   * `env(safe-area-inset-bottom)` so the HUD lifts above the indicator.
   */
  safeBottom(): number {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--sab').trim();
    if (!raw) return 0;
    const sab = parseFloat(raw);
    if (!Number.isFinite(sab) || sab <= 0) return 0;
    const canvasH = this.canvas.clientHeight || 0;
    const windowH = window.innerHeight || 0;
    // Canvas is at least `sab - 2` shorter than the window: CSS padding has
    // already carved out the home-indicator region. No extra lift needed.
    if (windowH - canvasH >= sab - 2) return 0;
    return sab;
  }

  /** iOS notch / status-bar safe-area padding, adaptive like safeBottom. */
  safeTop(): number {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--sat').trim();
    if (!raw) return 0;
    const sat = parseFloat(raw);
    if (!Number.isFinite(sat) || sat <= 0) return 0;
    const canvasH = this.canvas.clientHeight || 0;
    const windowH = window.innerHeight || 0;
    if (windowH - canvasH >= sat - 2) return 0;
    return sat;
  }

  setShakeEnabled(on: boolean): void { this.shakeEnabled = on; }

  shake(duration: number, magnitude: number): void {
    if (!this.shakeEnabled) return;
    this.shakeTime = Math.max(this.shakeTime, duration);
    this.shakeMag = Math.max(this.shakeMag, magnitude);
  }

  updateShake(dt: number): void {
    if (this.shakeTime <= 0) { this.shakeMag = 0; this.shakeOffX = 0; this.shakeOffY = 0; return; }
    this.shakeTime -= dt;
    const decay = Math.max(0, this.shakeTime / 0.4);
    const m = this.shakeMag * decay;
    this.shakeOffX = (Math.random() - 0.5) * 2 * m;
    this.shakeOffY = (Math.random() - 0.5) * 2 * m;
  }

  screenToWorld(sx: number, sy: number): WorldPoint {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cx = (sx - rect.left) * dpr;
    const cy = (sy - rect.top) * dpr;
    return {
      x: (cx - this.offsetX) / this.scale,
      y: (cy - this.offsetY) / this.scale,
    };
  }

  /** Convert world (x, y) to canvas-relative CSS px (top-left origin). */
  worldToScreenCss(wx: number, wy: number): WorldPoint {
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (wx * this.scale + this.offsetX) / dpr,
      y: (wy * this.scale + this.offsetY) / dpr,
    };
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    // Use canvas CSS size (constrained by style.css) so UI stays proportional on desktop
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    this.canvas.width = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));
    this.scale = Math.min(w / WORLD_WIDTH, h / WORLD_HEIGHT) * dpr;
    this.offsetX = (this.canvas.width - WORLD_WIDTH * this.scale) / 2;
    this.offsetY = (this.canvas.height - WORLD_HEIGHT * this.scale) / 2;
  }

  beginFrame(): void {
    const { ctx, canvas } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLORS.bgOuter;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  beginWorld(): void {
    const { ctx } = this;
    const sx = this.shakeOffX * this.scale;
    const sy = this.shakeOffY * this.scale;
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX + sx, this.offsetY + sy);
    ctx.fillStyle = COLORS.bgWorld;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  beginScreen(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  drawSprite(image: HTMLImageElement, x: number, y: number, width: number, height: number, rotation = 0): void {
    const { ctx } = this;
    if (rotation === 0) {
      ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
    } else {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
      ctx.restore();
    }
  }

  drawTileBackground(image: HTMLImageElement, x: number, y: number, w: number, h: number, tileSize: number): void {
    const { ctx } = this;
    for (let ty = y; ty < y + h; ty += tileSize) {
      for (let tx = x; tx < x + w; tx += tileSize) {
        ctx.drawImage(image, tx, ty, tileSize, tileSize);
      }
    }
  }

  drawGrid(): void {
    const { ctx } = this;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1 / this.scale;
    ctx.beginPath();
    for (let x = 0; x <= WORLD_WIDTH; x += TILE_SIZE) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += TILE_SIZE) {
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_WIDTH, y);
    }
    ctx.stroke();
  }

  /**
   * v2.5.1 D2 — UI scale multiplier. Set via Settings; multiplies every
   * drawTextScreen* call's size. Does NOT affect world-space or positional
   * math (HUD layout still uses the raw coordinates you pass in).
   * Clamped to [0.9, 1.5] to avoid UI breaking.
   */
  uiTextScale = 1.0;

  /**
   * v2.5.1 D2 — color-blind hue override. Maps red/green tokens to a
   * protanopia-safe amber/blue palette. Bypassed when false.
   */
  private cbPalette: Readonly<Record<string, string>> | null = null;

  setAccessibility(opts: { uiScale?: number; colorBlindPalette?: Record<string, string> | null }): void {
    if (typeof opts.uiScale === 'number') {
      this.uiTextScale = Math.max(0.9, Math.min(1.5, opts.uiScale));
    }
    if (opts.colorBlindPalette === undefined) return;
    this.cbPalette = opts.colorBlindPalette;
  }

  private cbResolve(color: string): string {
    if (!this.cbPalette) return color;
    const mapped = this.cbPalette[color.toLowerCase()];
    return mapped ?? color;
  }

  drawTextScreen(text: string, x: number, y: number, color: string = COLORS.text, size = 14, bold = false): void {
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    const scaled = size * this.uiTextScale;
    ctx.fillStyle = this.cbResolve(color);
    ctx.font = `${bold ? 'bold ' : ''}${scaled * dpr}px system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(text, x * dpr, y * dpr);
  }

  drawTextScreenCenter(text: string, cx: number, cy: number, color: string = COLORS.text, size = 14, bold = false): void {
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    const scaled = size * this.uiTextScale;
    ctx.fillStyle = this.cbResolve(color);
    ctx.font = `${bold ? 'bold ' : ''}${scaled * dpr}px system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, cx * dpr, cy * dpr);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'top';
  }

  measureTextScreen(text: string, size: number, bold = false): number {
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    const scaled = size * this.uiTextScale;
    ctx.save();
    ctx.font = `${bold ? 'bold ' : ''}${scaled * dpr}px system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif`;
    const w = ctx.measureText(text).width / dpr;
    ctx.restore();
    return w;
  }

  drawScreenRect(x: number, y: number, w: number, h: number, color: string): void {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x * dpr, y * dpr, w * dpr, h * dpr);
  }

  drawScreenRectOutline(x: number, y: number, w: number, h: number, color: string, lineWidth: number): void {
    const dpr = window.devicePixelRatio || 1;
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth * dpr;
    ctx.strokeRect(x * dpr, y * dpr, w * dpr, h * dpr);
  }

  drawScreenRoundedRect(x: number, y: number, w: number, h: number, r: number, color: string): void {
    const dpr = window.devicePixelRatio || 1;
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x * dpr, y * dpr, w * dpr, h * dpr, r * dpr);
    ctx.fill();
  }

  drawScreenRoundedRectOutline(x: number, y: number, w: number, h: number, r: number, color: string, lineWidth: number): void {
    const dpr = window.devicePixelRatio || 1;
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth * dpr;
    ctx.beginPath();
    ctx.roundRect(x * dpr, y * dpr, w * dpr, h * dpr, r * dpr);
    ctx.stroke();
  }

  drawScreenVerticalGradient(x: number, y: number, w: number, h: number, colorTop: string, colorBottom: string): void {
    const dpr = window.devicePixelRatio || 1;
    const { ctx } = this;
    const grad = ctx.createLinearGradient(0, y * dpr, 0, (y + h) * dpr);
    grad.addColorStop(0, colorTop);
    grad.addColorStop(1, colorBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(x * dpr, y * dpr, w * dpr, h * dpr);
  }

  drawScreenRadialGradient(cx: number, cy: number, r: number, colorInner: string, colorOuter: string): void {
    const dpr = window.devicePixelRatio || 1;
    const { ctx } = this;
    const grad = ctx.createRadialGradient(cx * dpr, cy * dpr, 0, cx * dpr, cy * dpr, r * dpr);
    grad.addColorStop(0, colorInner);
    grad.addColorStop(1, colorOuter);
    ctx.fillStyle = grad;
    ctx.fillRect((cx - r) * dpr, (cy - r) * dpr, r * 2 * dpr, r * 2 * dpr);
  }

  drawScreenCircle(cx: number, cy: number, r: number, color: string): void {
    const dpr = window.devicePixelRatio || 1;
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx * dpr, cy * dpr, r * dpr, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSpriteScreen(image: HTMLImageElement, x: number, y: number, w: number, h: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.drawImage(image, x * dpr, y * dpr, w * dpr, h * dpr);
  }

  drawTextWorld(text: string, x: number, y: number, color: string = COLORS.text, size = 14, bold = false): void {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
  }

  drawRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  drawRoundedRect(x: number, y: number, w: number, h: number, r: number, color: string): void {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  drawCircleOutline(x: number, y: number, radius: number, color: string, width: number): void {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawCircle(x: number, y: number, radius: number, color: string): void {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPath(points: readonly WorldPoint[], color: string, width: number): void {
    if (points.length < 2) return;
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }
}
