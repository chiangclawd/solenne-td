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

export type TerrainTheme = 'grass' | 'industrial' | 'capital' | 'frozen' | 'void';

// Deterministic per-tile hash; stable across renders and sessions.
function tileHash(tx: number, ty: number, salt = 0): number {
  let h = (tx * 73 + ty * 37 + salt * 97) | 0;
  h = (h ^ (h >>> 13)) * 16807;
  return Math.abs(h) % 10000;
}

/**
 * Rich grass tile — per-theme multi-layer texture.
 * x, y are world coords of tile top-left; size is tile size.
 */
export function drawGrassTile(ctx: Ctx, x: number, y: number, size: number, theme: TerrainTheme = 'grass'): void {
  switch (theme) {
    case 'grass': drawGrassGrass(ctx, x, y, size); break;
    case 'industrial': drawGrassIndustrial(ctx, x, y, size); break;
    case 'capital': drawGrassCapital(ctx, x, y, size); break;
    case 'frozen': drawGrassFrozen(ctx, x, y, size); break;
    case 'void': drawGrassVoid(ctx, x, y, size); break;
  }
}

// ---------- Grass Theme (邊境) ----------
function drawGrassGrass(ctx: Ctx, x: number, y: number, T: number): void {
  const tx = Math.floor(x / T);
  const ty = Math.floor(y / T);
  const h = tileHash(tx, ty);

  // Base gradient — slight variation per tile
  const hue = 105 + ((h % 10) - 5); // 100..110
  const sat = 32 + (h >> 4) % 8;
  const light = 24 + (h >> 8) % 5;
  const g = ctx.createLinearGradient(x, y, x, y + T);
  g.addColorStop(0, `hsl(${hue}, ${sat}%, ${light + 2}%)`);
  g.addColorStop(1, `hsl(${hue}, ${sat}%, ${light - 3}%)`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, T, T);

  // Scattered grass tufts (V-shaped marks)
  ctx.strokeStyle = `hsla(100, 45%, 45%, 0.55)`;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 6; i++) {
    const px = x + ((h + i * 113) % 37) / 37 * T;
    const py = y + ((h + i * 47) % 31) / 31 * T;
    ctx.beginPath();
    ctx.moveTo(px - 2, py + 1.5);
    ctx.lineTo(px, py - 1.5);
    ctx.lineTo(px + 2, py + 1.5);
    ctx.stroke();
  }

  // Occasional tile features (darker grass patch, small flowers, pebble)
  const feature = h % 7;
  if (feature === 0) {
    // Dark moss patch
    ctx.fillStyle = 'rgba(20, 45, 20, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x + T * 0.3, y + T * 0.7, T * 0.18, T * 0.12, (h % 7) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (feature === 1) {
    // Yellow flowers
    for (let f = 0; f < 3; f++) {
      const fx = x + ((h + f * 71) % 29) / 29 * T;
      const fy = y + ((h + f * 53) % 29) / 29 * T;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(fx, fy, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c89020';
      ctx.beginPath();
      ctx.arc(fx, fy, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (feature === 2) {
    // White daisies
    for (let f = 0; f < 2; f++) {
      const fx = x + ((h + f * 89) % 29) / 29 * T;
      const fy = y + ((h + f * 41) % 29) / 29 * T;
      ctx.fillStyle = '#f0f0e0';
      for (let p = 0; p < 5; p++) {
        const a = (Math.PI * 2 * p) / 5;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * 1.2, fy + Math.sin(a) * 1.2, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(fx, fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (feature === 3) {
    // Small grey pebble
    ctx.fillStyle = 'rgba(150, 145, 130, 0.7)';
    ctx.beginPath();
    ctx.ellipse(x + T * 0.6, y + T * 0.3, 2.2, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (feature === 4) {
    // Dirt crack
    ctx.strokeStyle = 'rgba(60, 40, 20, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + T * 0.4);
    ctx.lineTo(x + T - 6, y + T * 0.6);
    ctx.stroke();
  }
  // Very subtle vignette corners
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(x, y, 1, 1);
  ctx.fillRect(x + T - 1, y + T - 1, 1, 1);
}

// ---------- Industrial Theme (工業) ----------
function drawGrassIndustrial(ctx: Ctx, x: number, y: number, T: number): void {
  const tx = Math.floor(x / T);
  const ty = Math.floor(y / T);
  const h = tileHash(tx, ty);

  // Base metal plate
  const g = ctx.createLinearGradient(x, y, x, y + T);
  g.addColorStop(0, '#4a423a');
  g.addColorStop(1, '#322a20');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, T, T);

  // Metal plate seams (corner rivets)
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(x, y, T, 1.5);
  ctx.fillRect(x, y + T - 1.5, T, 1.5);
  ctx.fillRect(x, y, 1.5, T);
  ctx.fillRect(x + T - 1.5, y, 1.5, T);

  // Corner rivets
  ctx.fillStyle = '#8a7a5a';
  for (const [cx, cy] of [[x + 4, y + 4], [x + T - 4, y + 4], [x + 4, y + T - 4], [x + T - 4, y + T - 4]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3020';
    ctx.beginPath();
    ctx.arc(cx, cy, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a7a5a';
  }

  // Rust streaks (diagonal)
  const feature = h % 6;
  if (feature === 0) {
    // Heavy rust patch
    ctx.fillStyle = 'rgba(160, 70, 30, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + T * 0.5, y + T * 0.5, T * 0.3, T * 0.2, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 40, 15, 0.5)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + T * 0.3, y + T * 0.4 + i * 2);
      ctx.lineTo(x + T * 0.7, y + T * 0.6 + i * 2);
      ctx.stroke();
    }
  } else if (feature === 1) {
    // Oil puddle
    ctx.fillStyle = 'rgba(10, 5, 15, 0.6)';
    ctx.beginPath();
    ctx.ellipse(x + T * 0.45, y + T * 0.55, T * 0.25, T * 0.15, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Rainbow oil sheen
    ctx.fillStyle = 'rgba(100, 60, 120, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x + T * 0.42, y + T * 0.52, T * 0.15, T * 0.08, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (feature === 2) {
    // Warning stripe diagonal
    ctx.fillStyle = 'rgba(255, 200, 60, 0.4)';
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 3, y + 3, T - 6, T - 6);
    ctx.clip();
    for (let i = -T; i < T; i += 6) {
      ctx.fillRect(x + i, y, 3, T);
    }
    ctx.restore();
  } else if (feature === 3) {
    // Vent grille
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + T * 0.3, y + T * 0.3, T * 0.4, T * 0.4);
    ctx.strokeStyle = '#5a5044';
    ctx.lineWidth = 0.6;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x + T * 0.3, y + T * 0.3 + i * (T * 0.08));
      ctx.lineTo(x + T * 0.7, y + T * 0.3 + i * (T * 0.08));
      ctx.stroke();
    }
  } else if (feature === 4) {
    // Bolt pattern
    ctx.fillStyle = '#6a5a3a';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const bx = x + T * 0.3 + i * (T * 0.2);
        const by = y + T * 0.3 + j * (T * 0.2);
        ctx.beginPath();
        ctx.arc(bx, by, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// ---------- Capital Theme (首都) ----------
function drawGrassCapital(ctx: Ctx, x: number, y: number, T: number): void {
  const tx = Math.floor(x / T);
  const ty = Math.floor(y / T);
  const h = tileHash(tx, ty);

  // Marble base with slight hue shift
  const g = ctx.createLinearGradient(x, y, x + T, y + T);
  g.addColorStop(0, '#504a68');
  g.addColorStop(1, '#2a2638');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, T, T);

  // Marble veins (bezier-like curves)
  ctx.strokeStyle = 'rgba(200, 200, 230, 0.25)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 3; i++) {
    const startX = x + ((h + i * 31) % 37) / 37 * T;
    const startY = y;
    const endX = x + ((h + i * 53) % 41) / 41 * T;
    const endY = y + T;
    const cp1x = x + ((h + i * 97) % 43) / 43 * T;
    const cp1y = y + T * 0.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cp1x, cp1y, endX, endY);
    ctx.stroke();
  }

  // Stone tile grid — 4 quadrants separated by darker seam
  ctx.strokeStyle = 'rgba(10, 10, 20, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + T / 2, y);
  ctx.lineTo(x + T / 2, y + T);
  ctx.moveTo(x, y + T / 2);
  ctx.lineTo(x + T, y + T / 2);
  ctx.stroke();

  const feature = h % 6;
  if (feature === 0) {
    // Gold inlay cross
    ctx.strokeStyle = 'rgba(255, 200, 80, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + T * 0.3, y + T * 0.5);
    ctx.lineTo(x + T * 0.7, y + T * 0.5);
    ctx.moveTo(x + T * 0.5, y + T * 0.3);
    ctx.lineTo(x + T * 0.5, y + T * 0.7);
    ctx.stroke();
  } else if (feature === 1) {
    // Crack along diagonal
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 5);
    ctx.lineTo(x + T * 0.4, y + T * 0.3);
    ctx.lineTo(x + T * 0.6, y + T * 0.45);
    ctx.lineTo(x + T - 5, y + T - 5);
    ctx.stroke();
  } else if (feature === 2) {
    // Small moss growing in seam
    ctx.fillStyle = 'rgba(90, 130, 70, 0.5)';
    ctx.beginPath();
    ctx.arc(x + T / 2, y + T / 2, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (feature === 3) {
    // Orange autumn leaf
    ctx.save();
    ctx.translate(x + T * 0.6, y + T * 0.4);
    ctx.rotate(((h % 100) / 100) * Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 100, 40, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------- Frozen Theme (凍原) ----------
function drawGrassFrozen(ctx: Ctx, x: number, y: number, T: number): void {
  const tx = Math.floor(x / T);
  const ty = Math.floor(y / T);
  const h = tileHash(tx, ty);

  // Ice base with variation
  const hue = 195 + (h % 8);
  const light = 32 + (h >> 5) % 6;
  const g = ctx.createLinearGradient(x, y, x + T, y + T);
  g.addColorStop(0, `hsl(${hue}, 25%, ${light + 6}%)`);
  g.addColorStop(1, `hsl(${hue}, 30%, ${light}%)`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, T, T);

  // Frost pattern — small fractal lines
  ctx.strokeStyle = 'rgba(220, 240, 255, 0.35)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    const ox = x + ((h + i * 71) % 37) / 37 * T;
    const oy = y + ((h + i * 29) % 31) / 31 * T;
    for (let ray = 0; ray < 4; ray++) {
      const a = (Math.PI * 2 * ray) / 4 + (h % 10) * 0.1;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(a) * 3, oy + Math.sin(a) * 3);
      ctx.stroke();
    }
  }

  const feature = h % 6;
  if (feature === 0) {
    // Snow drift patch (brighter irregular area)
    ctx.fillStyle = 'rgba(240, 250, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x + T * 0.4, y + T * 0.6, T * 0.35, T * 0.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (feature === 1) {
    // Ice crack
    ctx.strokeStyle = 'rgba(30, 60, 90, 0.5)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x + 3, y + T * 0.3);
    ctx.lineTo(x + T * 0.4, y + T * 0.6);
    ctx.lineTo(x + T * 0.3, y + T * 0.9);
    ctx.lineTo(x + T - 5, y + T - 5);
    ctx.moveTo(x + T * 0.4, y + T * 0.6);
    ctx.lineTo(x + T * 0.7, y + T * 0.5);
    ctx.stroke();
  } else if (feature === 2) {
    // Hex snowflake symbol
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 0.7;
    const cx = x + T * 0.5;
    const cy = y + T * 0.5;
    for (let r = 0; r < 6; r++) {
      const a = (Math.PI * 2 * r) / 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4);
      ctx.stroke();
    }
  } else if (feature === 3) {
    // Frozen puddle
    ctx.fillStyle = 'rgba(100, 180, 220, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x + T * 0.5, y + T * 0.5, T * 0.25, T * 0.15, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220, 240, 255, 0.6)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  } else if (feature === 4) {
    // Small bare rock
    ctx.fillStyle = 'rgba(60, 70, 80, 0.8)';
    ctx.beginPath();
    ctx.ellipse(x + T * 0.3, y + T * 0.3, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- Void Theme (虛空) ----------
function drawGrassVoid(ctx: Ctx, x: number, y: number, T: number): void {
  const tx = Math.floor(x / T);
  const ty = Math.floor(y / T);
  const h = tileHash(tx, ty);

  // Dark obsidian base
  const g = ctx.createLinearGradient(x, y, x + T, y + T);
  g.addColorStop(0, '#1e1030');
  g.addColorStop(1, '#0a0518');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, T, T);

  // Energy veins (glowing purple)
  ctx.strokeStyle = 'rgba(180, 120, 220, 0.35)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    const sx = x + ((h + i * 43) % 37) / 37 * T;
    const sy = y;
    const ex = x + ((h + i * 71) % 37) / 37 * T;
    const ey = y + T;
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(x + T / 2 + (h % 20 - 10), y + T / 2, ex, ey);
    ctx.stroke();
  }
  // Vein glow overlay
  ctx.shadowColor = 'rgba(200, 120, 255, 0.5)';
  ctx.shadowBlur = 4;

  const feature = h % 7;
  if (feature === 0) {
    // Alien rune
    ctx.strokeStyle = 'rgba(220, 150, 255, 0.7)';
    ctx.lineWidth = 0.8;
    const cx = x + T * 0.5;
    const cy = y + T * 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 3);
    ctx.lineTo(cx + 3, cy + 3);
    ctx.moveTo(cx + 3, cy - 3);
    ctx.lineTo(cx - 3, cy + 3);
    ctx.stroke();
  } else if (feature === 1) {
    // Floating crystal shard
    ctx.fillStyle = 'rgba(200, 140, 255, 0.8)';
    ctx.beginPath();
    ctx.moveTo(x + T * 0.5, y + T * 0.3);
    ctx.lineTo(x + T * 0.6, y + T * 0.5);
    ctx.lineTo(x + T * 0.5, y + T * 0.7);
    ctx.lineTo(x + T * 0.4, y + T * 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (feature === 2) {
    // Black fissure
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + T * 0.4);
    ctx.lineTo(x + T, y + T * 0.6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200, 140, 255, 0.4)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  } else if (feature === 3) {
    // Pulsing dot
    ctx.fillStyle = 'rgba(220, 150, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(x + T * 0.35, y + T * 0.65, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

/** Rich path tile — per-theme styling. */
export function drawPathTile(ctx: Ctx, x: number, y: number, size: number, theme: TerrainTheme = 'grass'): void {
  switch (theme) {
    case 'grass': drawPathGrass(ctx, x, y, size); break;
    case 'industrial': drawPathIndustrial(ctx, x, y, size); break;
    case 'capital': drawPathCapital(ctx, x, y, size); break;
    case 'frozen': drawPathFrozen(ctx, x, y, size); break;
    case 'void': drawPathVoid(ctx, x, y, size); break;
  }
}

function drawPathGrass(ctx: Ctx, x: number, y: number, T: number): void {
  const h = tileHash(Math.floor(x / T), Math.floor(y / T), 7);
  // Earth path
  const g = ctx.createLinearGradient(x, y, x, y + T);
  g.addColorStop(0, '#8a6a3a');
  g.addColorStop(1, '#5a3e20');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, T, T);
  // Darker edges
  ctx.fillStyle = 'rgba(30, 20, 10, 0.35)';
  ctx.fillRect(x, y, T, 2);
  ctx.fillRect(x, y + T - 2, T, 2);
  ctx.fillRect(x, y, 2, T);
  ctx.fillRect(x + T - 2, y, 2, T);
  // Tire-ruts — two parallel darker streaks
  ctx.fillStyle = 'rgba(50, 30, 15, 0.4)';
  ctx.fillRect(x + T * 0.25, y, 2, T);
  ctx.fillRect(x + T * 0.7, y, 2, T);
  // Pebbles
  ctx.fillStyle = 'rgba(180, 150, 110, 0.7)';
  for (let i = 0; i < 4; i++) {
    const px = x + ((h + i * 131) % 31) / 31 * T;
    const py = y + ((h + i * 67) % 29) / 29 * T;
    ctx.beginPath();
    ctx.arc(px, py, 1 + (h % 2) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Grass tufts at edges
  ctx.strokeStyle = 'rgba(80, 110, 60, 0.5)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 2; i++) {
    const px = x + 2 + ((h + i * 17) % 4);
    const py = y + ((h + i * 43) % 20) / 20 * T;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 1, py - 3);
    ctx.stroke();
  }
}

function drawPathIndustrial(ctx: Ctx, x: number, y: number, T: number): void {
  const h = tileHash(Math.floor(x / T), Math.floor(y / T), 11);
  // Dark metal base
  const g = ctx.createLinearGradient(x, y, x, y + T);
  g.addColorStop(0, '#3a3838');
  g.addColorStop(1, '#1a1818');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, T, T);
  // Metal grating — alternating horizontal bars
  ctx.fillStyle = 'rgba(120, 110, 100, 0.5)';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x + 2, y + 4 + i * 7, T - 4, 2);
  }
  // Yellow warning chevron at center
  ctx.fillStyle = 'rgba(255, 200, 60, 0.4)';
  const seg = (h % 2) === 0;
  if (seg) {
    ctx.fillRect(x + T * 0.3, y + T * 0.35, T * 0.4, 3);
    ctx.fillRect(x + T * 0.3, y + T * 0.55, T * 0.4, 3);
  }
  // Rust patches
  if ((h % 3) === 0) {
    ctx.fillStyle = 'rgba(180, 80, 30, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + T * 0.3, y + T * 0.7, 4, 2.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPathCapital(ctx: Ctx, x: number, y: number, T: number): void {
  const h = tileHash(Math.floor(x / T), Math.floor(y / T), 13);
  // Marble tiles — base
  const g = ctx.createLinearGradient(x, y, x + T, y + T);
  g.addColorStop(0, '#706888');
  g.addColorStop(1, '#3a3548');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, T, T);
  // 2×2 marble tile grid
  ctx.strokeStyle = 'rgba(20, 15, 30, 0.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + T / 2, y);
  ctx.lineTo(x + T / 2, y + T);
  ctx.moveTo(x, y + T / 2);
  ctx.lineTo(x + T, y + T / 2);
  ctx.stroke();
  // Gold inlay pattern
  ctx.strokeStyle = 'rgba(255, 200, 80, 0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x + T * 0.25, y + T * 0.25);
  ctx.lineTo(x + T * 0.75, y + T * 0.25);
  ctx.lineTo(x + T * 0.75, y + T * 0.75);
  ctx.lineTo(x + T * 0.25, y + T * 0.75);
  ctx.closePath();
  ctx.stroke();
  // Subtle cracks on some tiles
  if ((h % 4) === 0) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + T * 0.3, y + T * 0.35);
    ctx.lineTo(x + T * 0.55, y + T * 0.55);
    ctx.stroke();
  }
}

function drawPathFrozen(ctx: Ctx, x: number, y: number, T: number): void {
  const h = tileHash(Math.floor(x / T), Math.floor(y / T), 17);
  // Frozen stone base
  const g = ctx.createLinearGradient(x, y, x, y + T);
  g.addColorStop(0, '#4a6878');
  g.addColorStop(1, '#1a2838');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, T, T);
  // Ice sheen overlay
  const ice = ctx.createLinearGradient(x, y, x + T, y + T);
  ice.addColorStop(0, 'rgba(220, 240, 255, 0.4)');
  ice.addColorStop(0.5, 'rgba(220, 240, 255, 0.1)');
  ice.addColorStop(1, 'rgba(220, 240, 255, 0.3)');
  ctx.fillStyle = ice;
  ctx.fillRect(x, y, T, T);
  // Stone block outlines
  ctx.strokeStyle = 'rgba(0, 20, 40, 0.5)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
  // Ice cracks
  ctx.strokeStyle = 'rgba(200, 230, 255, 0.6)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x + T * 0.2, y + T * 0.3);
  ctx.lineTo(x + T * 0.5, y + T * 0.5);
  ctx.lineTo(x + T * 0.7, y + T * 0.4);
  ctx.lineTo(x + T * 0.85, y + T * 0.7);
  ctx.stroke();
  // Snow patches at edges
  if ((h % 3) === 0) {
    ctx.fillStyle = 'rgba(250, 252, 255, 0.55)';
    ctx.beginPath();
    ctx.ellipse(x + T * 0.3, y + T * 0.85, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPathVoid(ctx: Ctx, x: number, y: number, T: number): void {
  const h = tileHash(Math.floor(x / T), Math.floor(y / T), 19);
  // Obsidian base
  const g = ctx.createLinearGradient(x, y, x + T, y + T);
  g.addColorStop(0, '#1a0828');
  g.addColorStop(1, '#080210');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, T, T);
  // Glowing rune path — runes flow across
  ctx.shadowColor = 'rgba(200, 120, 255, 0.7)';
  ctx.shadowBlur = 5;
  ctx.strokeStyle = 'rgba(200, 140, 255, 0.6)';
  ctx.lineWidth = 1.2;
  // Draw a rune line through the tile
  ctx.beginPath();
  if ((h % 2) === 0) {
    ctx.moveTo(x, y + T / 2);
    ctx.lineTo(x + T, y + T / 2);
  } else {
    ctx.moveTo(x + T / 2, y);
    ctx.lineTo(x + T / 2, y + T);
  }
  ctx.stroke();
  // Rune nodes at center
  ctx.fillStyle = 'rgba(220, 180, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(x + T / 2, y + T / 2, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Edge darkening
  ctx.strokeStyle = 'rgba(100, 60, 150, 0.4)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
}

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
