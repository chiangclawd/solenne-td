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

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
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

  drawTextScreen(text: string, x: number, y: number, color: string = COLORS.text, size = 14, bold = false): void {
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${size * dpr}px system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(text, x * dpr, y * dpr);
  }

  drawTextScreenCenter(text: string, cx: number, cy: number, color: string = COLORS.text, size = 14, bold = false): void {
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${size * dpr}px system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, cx * dpr, cy * dpr);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'top';
  }

  measureTextScreen(text: string, size: number, bold = false): number {
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.font = `${bold ? 'bold ' : ''}${size * dpr}px system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif`;
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
