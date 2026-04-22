/**
 * UI ornaments — gold frames, gradient panels, glowing text, world tile textures.
 * All draw into a given CanvasRenderingContext2D. Coord is CSS-px; ctx is screen-transform.
 */

type Ctx = CanvasRenderingContext2D;

const dprOf = (): number => window.devicePixelRatio || 1;

/** Gold ornate frame around a rect (e.g., buttons, panels, cards). */
export function drawGoldFrame(
  ctx: Ctx,
  x: number, y: number, w: number, h: number,
  radius: number = 10,
  thickness: number = 1,
  accent: string = '#ffd166',
): void {
  const dpr = dprOf();
  ctx.save();
  // Outer glow
  ctx.strokeStyle = `rgba(255, 215, 102, 0.25)`;
  ctx.lineWidth = (thickness + 2) * dpr;
  ctx.beginPath();
  ctx.roundRect(x * dpr, y * dpr, w * dpr, h * dpr, radius * dpr);
  ctx.stroke();
  // Solid ring
  ctx.strokeStyle = accent;
  ctx.lineWidth = thickness * dpr;
  ctx.beginPath();
  ctx.roundRect(x * dpr, y * dpr, w * dpr, h * dpr, radius * dpr);
  ctx.stroke();
  // Corner accents
  const corner = Math.min(w, h) * 0.18;
  ctx.lineWidth = (thickness + 0.5) * dpr;
  ctx.beginPath();
  // Top-left
  ctx.moveTo((x + 4) * dpr, (y + corner) * dpr);
  ctx.lineTo((x + 4) * dpr, (y + 4) * dpr);
  ctx.lineTo((x + corner) * dpr, (y + 4) * dpr);
  // Top-right
  ctx.moveTo((x + w - corner) * dpr, (y + 4) * dpr);
  ctx.lineTo((x + w - 4) * dpr, (y + 4) * dpr);
  ctx.lineTo((x + w - 4) * dpr, (y + corner) * dpr);
  // Bottom-left
  ctx.moveTo((x + 4) * dpr, (y + h - corner) * dpr);
  ctx.lineTo((x + 4) * dpr, (y + h - 4) * dpr);
  ctx.lineTo((x + corner) * dpr, (y + h - 4) * dpr);
  // Bottom-right
  ctx.moveTo((x + w - corner) * dpr, (y + h - 4) * dpr);
  ctx.lineTo((x + w - 4) * dpr, (y + h - 4) * dpr);
  ctx.lineTo((x + w - 4) * dpr, (y + h - corner) * dpr);
  ctx.stroke();
  ctx.restore();
}

/** Glossy button — gradient fill + highlight sheen + subtle bottom shadow. */
export function drawGlossButton(
  ctx: Ctx,
  x: number, y: number, w: number, h: number,
  radius: number = 12,
  baseColor: string = '#2c8cc7',
  highlightColor: string = '#5eb8ff',
): void {
  const dpr = dprOf();
  // Shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.roundRect((x + 2) * dpr, (y + 4) * dpr, w * dpr, h * dpr, radius * dpr);
  ctx.fill();
  // Main body (vertical gradient)
  const g = ctx.createLinearGradient(0, y * dpr, 0, (y + h) * dpr);
  g.addColorStop(0, highlightColor);
  g.addColorStop(0.5, baseColor);
  g.addColorStop(1, darken(baseColor, 0.35));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x * dpr, y * dpr, w * dpr, h * dpr, radius * dpr);
  ctx.fill();
  // Top highlight sheen
  const sheen = ctx.createLinearGradient(0, y * dpr, 0, (y + h * 0.5) * dpr);
  sheen.addColorStop(0, 'rgba(255,255,255,0.35)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.roundRect((x + 2) * dpr, (y + 2) * dpr, (w - 4) * dpr, (h * 0.5) * dpr, (radius - 2) * dpr);
  ctx.fill();
  ctx.restore();
}

function darken(hex: string, amount: number): string {
  // Very simple darken: parse #rrggbb and multiply
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.max(0, Math.floor(r * (1 - amount)));
  const dg = Math.max(0, Math.floor(g * (1 - amount)));
  const db = Math.max(0, Math.floor(b * (1 - amount)));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

/** Glowing title text with multi-layer shadow. */
export function drawGlowTitle(
  ctx: Ctx,
  text: string,
  cx: number, cy: number,
  size: number,
  color: string = '#ffd166',
  glowColor: string = 'rgba(255, 159, 67, 0.7)',
): void {
  const dpr = dprOf();
  ctx.save();
  ctx.font = `bold ${size * dpr}px system-ui, -apple-system, 'Apple Color Emoji', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Multi-layer glow
  ctx.shadowColor = glowColor;
  for (let i = 6; i > 0; i--) {
    ctx.shadowBlur = i * 4 * dpr;
    ctx.fillStyle = color;
    ctx.fillText(text, cx * dpr, cy * dpr);
  }
  // Crisp core
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.fillText(text, cx * dpr, cy * dpr);
  ctx.restore();
}

/** Draw a stylized grass tile texture at world-coord (x, y) with size. */
export function drawGrassTile(
  ctx: Ctx,
  x: number, y: number, size: number,
  theme: 'grass' | 'industrial' | 'capital' | 'frozen' | 'void' = 'grass',
): void {
  const T = size;
  // Base color per theme
  const palette = GRASS_PALETTE[theme];
  ctx.fillStyle = palette.base;
  ctx.fillRect(x, y, T, T);

  // Dotted detail for texture feel
  const hash = ((x / T) * 73 + (y / T) * 37) | 0;
  const seed = Math.abs(hash) % 1000;
  ctx.fillStyle = palette.detail;
  for (let i = 0; i < 4; i++) {
    const dx = ((seed + i * 113) % 31) / 31 * T;
    const dy = ((seed + i * 47) % 29) / 29 * T;
    ctx.fillRect(x + dx, y + dy, 1.5, 1.5);
  }
  // Faint grid
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
}

interface GrassPalette {
  base: string;
  detail: string;
  grid: string;
}

const GRASS_PALETTE: Record<string, GrassPalette> = {
  grass:      { base: '#3a6b3a', detail: 'rgba(170, 220, 150, 0.45)', grid: 'rgba(20, 40, 20, 0.2)' },
  industrial: { base: '#4a4438', detail: 'rgba(200, 180, 140, 0.3)',  grid: 'rgba(20, 18, 14, 0.3)' },
  capital:    { base: '#3a3a52', detail: 'rgba(180, 180, 220, 0.4)',  grid: 'rgba(20, 20, 35, 0.25)' },
  frozen:     { base: '#4a6878', detail: 'rgba(220, 240, 255, 0.45)', grid: 'rgba(10, 30, 45, 0.3)' },
  void:       { base: '#2a1e38', detail: 'rgba(180, 120, 220, 0.35)', grid: 'rgba(15, 8, 20, 0.3)' },
};

/** Stylized path tile (road/trail). */
export function drawPathTile(
  ctx: Ctx,
  x: number, y: number, size: number,
  theme: 'grass' | 'industrial' | 'capital' | 'frozen' | 'void' = 'grass',
): void {
  const T = size;
  const p = PATH_PALETTE[theme];
  ctx.fillStyle = p.base;
  ctx.fillRect(x, y, T, T);
  // Darker edges for depth
  const g = ctx.createRadialGradient(x + T / 2, y + T / 2, T * 0.2, x + T / 2, y + T / 2, T * 0.7);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, p.shadow);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, T, T);
  // Small stones
  const hash = ((x / T) * 83 + (y / T) * 41) | 0;
  const seed = Math.abs(hash) % 1000;
  ctx.fillStyle = p.detail;
  for (let i = 0; i < 3; i++) {
    const dx = ((seed + i * 137) % 31) / 31 * T;
    const dy = ((seed + i * 59) % 29) / 29 * T;
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

const PATH_PALETTE: Record<string, { base: string; shadow: string; detail: string }> = {
  grass:      { base: '#6a4a28', shadow: 'rgba(50, 30, 15, 0.5)',  detail: 'rgba(160, 120, 80, 0.6)' },
  industrial: { base: '#3a3a3a', shadow: 'rgba(10, 10, 10, 0.6)',  detail: 'rgba(130, 130, 130, 0.5)' },
  capital:    { base: '#585870', shadow: 'rgba(20, 20, 35, 0.55)', detail: 'rgba(180, 180, 220, 0.5)' },
  frozen:     { base: '#2a3848', shadow: 'rgba(5, 15, 25, 0.6)',   detail: 'rgba(180, 220, 240, 0.5)' },
  void:       { base: '#1a0e28', shadow: 'rgba(60, 20, 90, 0.5)',  detail: 'rgba(200, 140, 255, 0.5)' },
};

/** Background gradient per world theme (full canvas). */
export function drawWorldBackground(
  ctx: Ctx,
  w: number, h: number,
  theme: 'grass' | 'industrial' | 'capital' | 'frozen' | 'void' = 'grass',
): void {
  const themes = {
    grass:      ['#2a4e2a', '#3a6b3a', '#1f3a1f'],
    industrial: ['#3a3428', '#4a4438', '#2a251c'],
    capital:    ['#2a2a3f', '#3a3a52', '#1a1a2a'],
    frozen:     ['#2a4858', '#4a6878', '#182a36'],
    void:       ['#1a1028', '#2a1e38', '#0a0618'],
  };
  const cols = themes[theme];
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, cols[0]);
  g.addColorStop(0.5, cols[1]);
  g.addColorStop(1, cols[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function themeForWorld(worldId: number): 'grass' | 'industrial' | 'capital' | 'frozen' | 'void' {
  if (worldId === 1) return 'grass';
  if (worldId === 2) return 'industrial';
  if (worldId === 3) return 'capital';
  if (worldId === 4) return 'frozen';
  if (worldId === 5) return 'void';
  return 'grass';
}
