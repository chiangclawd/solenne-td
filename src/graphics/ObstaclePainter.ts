/**
 * Obstacle sprites drawn on non-path tiles.
 * Each obstacle blocks tower placement and adds strategic terrain depth.
 */

type Ctx = CanvasRenderingContext2D;

export function drawObstacle(ctx: Ctx, kind: string, cx: number, cy: number, size: number, age: number = 0): void {
  switch (kind) {
    case 'tree': paintTree(ctx, cx, cy, size, age); break;
    case 'rock': paintRock(ctx, cx, cy, size); break;
    case 'barrel': paintBarrel(ctx, cx, cy, size); break;
    case 'column': paintColumn(ctx, cx, cy, size); break;
    case 'crystal': paintCrystal(ctx, cx, cy, size, age); break;
    case 'totem': paintTotem(ctx, cx, cy, size, age); break;
    case 'ruin': paintRuin(ctx, cx, cy, size); break;
    case 'deadTree': paintDeadTree(ctx, cx, cy, size); break;
    case 'iceRock': paintIceRock(ctx, cx, cy, size); break;
    default: paintRock(ctx, cx, cy, size);
  }
}

// ---- Tree (grass world) ----
function paintTree(ctx: Ctx, cx: number, cy: number, T: number, age: number): void {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(cx + 3, cy + T * 0.35, T * 0.3, T * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Trunk
  ctx.fillStyle = '#5a3a20';
  ctx.fillRect(cx - 2, cy + T * 0.1, 4, T * 0.25);
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(cx - 2, cy + T * 0.1, 4, T * 0.25);
  // Canopy layers (3 stacked circles, slight sway)
  const sway = Math.sin(age * 0.8) * 1;
  const layers = [
    { y: -2, r: T * 0.32, color: '#2a5a28' },
    { y: -8, r: T * 0.28, color: '#3a7a38' },
    { y: -14, r: T * 0.22, color: '#4e9048' },
  ];
  for (const l of layers) {
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.arc(cx + sway, cy + l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 40, 20, 0.5)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  // Highlight
  ctx.fillStyle = 'rgba(180, 220, 150, 0.5)';
  ctx.beginPath();
  ctx.arc(cx + sway - 3, cy - 16, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ---- Rock (grass/universal) ----
function paintRock(ctx: Ctx, cx: number, cy: number, T: number): void {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + T * 0.3, T * 0.35, T * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // Main rock (irregular polygon)
  const g = ctx.createLinearGradient(0, cy - T * 0.3, 0, cy + T * 0.3);
  g.addColorStop(0, '#a0988a');
  g.addColorStop(1, '#504838');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - T * 0.35, cy + T * 0.1);
  ctx.lineTo(cx - T * 0.3, cy - T * 0.15);
  ctx.lineTo(cx - T * 0.1, cy - T * 0.3);
  ctx.lineTo(cx + T * 0.2, cy - T * 0.28);
  ctx.lineTo(cx + T * 0.35, cy - T * 0.05);
  ctx.lineTo(cx + T * 0.3, cy + T * 0.2);
  ctx.lineTo(cx + T * 0.05, cy + T * 0.3);
  ctx.lineTo(cx - T * 0.25, cy + T * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a2420';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Highlight
  ctx.fillStyle = 'rgba(200, 195, 180, 0.5)';
  ctx.beginPath();
  ctx.moveTo(cx - T * 0.2, cy - T * 0.2);
  ctx.lineTo(cx, cy - T * 0.25);
  ctx.lineTo(cx - T * 0.1, cy - T * 0.05);
  ctx.closePath();
  ctx.fill();
  // Small smaller rock beside
  ctx.fillStyle = '#6a5e50';
  ctx.beginPath();
  ctx.ellipse(cx + T * 0.25, cy + T * 0.25, T * 0.12, T * 0.08, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ---- Barrel (industrial) ----
function paintBarrel(ctx: Ctx, cx: number, cy: number, T: number): void {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + T * 0.3, T * 0.25, T * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  // Barrel body
  const g = ctx.createLinearGradient(cx - T * 0.25, 0, cx + T * 0.25, 0);
  g.addColorStop(0, '#5a4030');
  g.addColorStop(0.5, '#8a5a38');
  g.addColorStop(1, '#3a2818');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, T * 0.26, T * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Top ring
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.ellipse(cx, cy - T * 0.25, T * 0.24, T * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2818';
  ctx.beginPath();
  ctx.ellipse(cx, cy - T * 0.27, T * 0.2, T * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // Metal bands
  ctx.strokeStyle = '#1a1008';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy - T * 0.08, T * 0.25, T * 0.05, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy + T * 0.12, T * 0.25, T * 0.05, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Warning symbol
  ctx.fillStyle = '#ff9f43';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 2);
  ctx.lineTo(cx + 3, cy + 3);
  ctx.lineTo(cx - 3, cy + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a1010';
  ctx.fillRect(cx - 0.5, cy - 1, 1, 3);
}

// ---- Marble Column (capital) ----
function paintColumn(ctx: Ctx, cx: number, cy: number, T: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + T * 0.3, T * 0.22, T * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  // Base
  ctx.fillStyle = '#8880a0';
  ctx.fillRect(cx - T * 0.2, cy + T * 0.15, T * 0.4, T * 0.13);
  ctx.strokeStyle = '#3a3545';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx - T * 0.2, cy + T * 0.15, T * 0.4, T * 0.13);
  // Shaft
  const g = ctx.createLinearGradient(cx - T * 0.15, 0, cx + T * 0.15, 0);
  g.addColorStop(0, '#5a5470');
  g.addColorStop(0.5, '#a8a0c0');
  g.addColorStop(1, '#4a4460');
  ctx.fillStyle = g;
  ctx.fillRect(cx - T * 0.14, cy - T * 0.25, T * 0.28, T * 0.4);
  // Fluting (vertical lines)
  ctx.strokeStyle = 'rgba(40, 35, 55, 0.6)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) {
    const fx = cx - T * 0.14 + (T * 0.28 * i) / 4;
    ctx.beginPath();
    ctx.moveTo(fx, cy - T * 0.25);
    ctx.lineTo(fx, cy + T * 0.15);
    ctx.stroke();
  }
  // Capital (top)
  ctx.fillStyle = '#8880a0';
  ctx.fillRect(cx - T * 0.2, cy - T * 0.32, T * 0.4, T * 0.08);
  ctx.strokeStyle = '#3a3545';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx - T * 0.2, cy - T * 0.32, T * 0.4, T * 0.08);
  // Gold trim on capital
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(cx - T * 0.2, cy - T * 0.28, T * 0.4, 1);
  // Small crack (damaged look)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(cx + T * 0.05, cy - T * 0.2);
  ctx.lineTo(cx + T * 0.08, cy - T * 0.1);
  ctx.stroke();
}

// ---- Void Crystal ----
function paintCrystal(ctx: Ctx, cx: number, cy: number, T: number, age: number): void {
  // Pulsing glow
  const pulse = 0.6 + Math.sin(age * 2) * 0.3;
  const aura = ctx.createRadialGradient(cx, cy, 2, cx, cy, T * 0.4);
  aura.addColorStop(0, `rgba(200, 120, 255, ${0.5 * pulse})`);
  aura.addColorStop(1, 'rgba(200, 120, 255, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy, T * 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Crystal shards — 3 pointing outward
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / 3;
    const tipX = cx + Math.cos(a) * T * 0.3;
    const tipY = cy + Math.sin(a) * T * 0.3;
    const baseA = a + Math.PI / 2;
    const bx1 = cx + Math.cos(a) * T * 0.05 + Math.cos(baseA) * T * 0.08;
    const by1 = cy + Math.sin(a) * T * 0.05 + Math.sin(baseA) * T * 0.08;
    const bx2 = cx + Math.cos(a) * T * 0.05 - Math.cos(baseA) * T * 0.08;
    const by2 = cy + Math.sin(a) * T * 0.05 - Math.sin(baseA) * T * 0.08;
    const g = ctx.createLinearGradient(cx, cy, tipX, tipY);
    g.addColorStop(0, '#c878ff');
    g.addColorStop(1, '#f0c8ff');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx1, by1);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(bx2, by2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f0c8ff';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  // Core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();
}

// ---- Void Totem ----
function paintTotem(ctx: Ctx, cx: number, cy: number, T: number, age: number): void {
  // Pulsing purple glow
  const pulse = 0.5 + Math.sin(age * 1.5) * 0.4;
  const aura = ctx.createRadialGradient(cx, cy, 2, cx, cy, T * 0.35);
  aura.addColorStop(0, `rgba(180, 100, 240, ${0.35 * pulse})`);
  aura.addColorStop(1, 'rgba(180, 100, 240, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy, T * 0.35, 0, Math.PI * 2);
  ctx.fill();
  // Totem body — tall obelisk
  ctx.fillStyle = '#0a0416';
  ctx.beginPath();
  ctx.moveTo(cx - T * 0.14, cy + T * 0.3);
  ctx.lineTo(cx - T * 0.1, cy - T * 0.3);
  ctx.lineTo(cx + T * 0.1, cy - T * 0.3);
  ctx.lineTo(cx + T * 0.14, cy + T * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1a0824';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Glowing rune carvings (vertical)
  ctx.fillStyle = `rgba(220, 150, 255, ${pulse})`;
  ctx.fillRect(cx - 1, cy - T * 0.22, 2, 4);
  ctx.beginPath();
  ctx.arc(cx, cy - T * 0.08, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 2, cy + T * 0.08, 4, 2);
  // Side notches
  ctx.fillStyle = 'rgba(60, 20, 90, 0.7)';
  ctx.fillRect(cx - T * 0.15, cy - T * 0.1, T * 0.03, 3);
  ctx.fillRect(cx + T * 0.12, cy - T * 0.1, T * 0.03, 3);
}

// ---- Stone Ruin (capital/grass) ----
function paintRuin(ctx: Ctx, cx: number, cy: number, T: number): void {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(cx - T * 0.32, cy + T * 0.15, T * 0.7, T * 0.1);
  // Broken wall segment
  ctx.fillStyle = '#7a7080';
  ctx.beginPath();
  ctx.moveTo(cx - T * 0.3, cy + T * 0.25);
  ctx.lineTo(cx - T * 0.3, cy - T * 0.1);
  ctx.lineTo(cx - T * 0.1, cy - T * 0.15);
  ctx.lineTo(cx - T * 0.08, cy - T * 0.25);
  ctx.lineTo(cx + T * 0.05, cy - T * 0.22);
  ctx.lineTo(cx + T * 0.15, cy - T * 0.05);
  ctx.lineTo(cx + T * 0.3, cy);
  ctx.lineTo(cx + T * 0.3, cy + T * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a2530';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Brick lines
  ctx.strokeStyle = 'rgba(40, 35, 50, 0.6)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - T * 0.3, cy + T * 0.05);
  ctx.lineTo(cx + T * 0.3, cy + T * 0.05);
  ctx.moveTo(cx - T * 0.15, cy - T * 0.08);
  ctx.lineTo(cx - T * 0.15, cy + T * 0.05);
  ctx.moveTo(cx + T * 0.1, cy + T * 0.05);
  ctx.lineTo(cx + T * 0.1, cy + T * 0.25);
  ctx.stroke();
  // Moss patches
  ctx.fillStyle = 'rgba(80, 120, 60, 0.5)';
  ctx.beginPath();
  ctx.ellipse(cx - T * 0.2, cy + T * 0.2, 3, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + T * 0.15, cy - T * 0.05, 2.5, 1, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---- Dead Tree (frozen/void) ----
function paintDeadTree(ctx: Ctx, cx: number, cy: number, T: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + T * 0.3, T * 0.18, T * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // Trunk with branches
  ctx.strokeStyle = '#3a2818';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy + T * 0.25);
  ctx.lineTo(cx - 1, cy - T * 0.3);
  ctx.stroke();
  // Branches
  ctx.lineWidth = 1.4;
  const branches = [
    [-0.1, 0.1, -0.3, 0.05],
    [0.05, -0.05, 0.25, -0.15],
    [-0.1, -0.2, -0.3, -0.25],
    [0.02, -0.25, 0.2, -0.3],
  ];
  for (const [x1, y1, x2, y2] of branches) {
    ctx.beginPath();
    ctx.moveTo(cx + x1 * T, cy + y1 * T);
    ctx.lineTo(cx + x2 * T, cy + y2 * T);
    ctx.stroke();
  }
  // Snow caps on branches
  ctx.fillStyle = 'rgba(240, 250, 255, 0.9)';
  for (const [, , x2, y2] of branches) {
    ctx.beginPath();
    ctx.arc(cx + x2 * T, cy + y2 * T, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- Ice Rock (frozen) ----
function paintIceRock(ctx: Ctx, cx: number, cy: number, T: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(cx + 1, cy + T * 0.3, T * 0.3, T * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  // Frozen rock — icy blue
  const g = ctx.createLinearGradient(0, cy - T * 0.3, 0, cy + T * 0.3);
  g.addColorStop(0, '#c8e0ea');
  g.addColorStop(1, '#3a5a6a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - T * 0.3, cy + T * 0.1);
  ctx.lineTo(cx - T * 0.25, cy - T * 0.2);
  ctx.lineTo(cx - T * 0.05, cy - T * 0.28);
  ctx.lineTo(cx + T * 0.25, cy - T * 0.22);
  ctx.lineTo(cx + T * 0.3, cy + T * 0.05);
  ctx.lineTo(cx + T * 0.2, cy + T * 0.25);
  ctx.lineTo(cx - T * 0.25, cy + T * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1a2a35';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Frost patches on surface
  ctx.fillStyle = 'rgba(240, 250, 255, 0.7)';
  ctx.beginPath();
  ctx.ellipse(cx - T * 0.1, cy - T * 0.2, 3, 2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + T * 0.15, cy - T * 0.05, 2, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ice crystal jutting up
  ctx.fillStyle = 'rgba(200, 240, 255, 0.85)';
  ctx.beginPath();
  ctx.moveTo(cx + T * 0.05, cy - T * 0.2);
  ctx.lineTo(cx + T * 0.08, cy - T * 0.38);
  ctx.lineTo(cx + T * 0.12, cy - T * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e0f4ff';
  ctx.lineWidth = 0.6;
  ctx.stroke();
}
