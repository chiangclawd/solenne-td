/**
 * Procedural decorative world backgrounds.
 * Each world has a distinct silhouette layer painted before the grass tiles,
 * adding environmental atmosphere (hills, smokestacks, spires, ice, voids).
 */

import { WORLD_WIDTH, WORLD_HEIGHT } from '../config.ts';

type Ctx = CanvasRenderingContext2D;

// Deterministic pseudo-random for consistent decoration per-level
function rand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function drawWorldSilhouette(ctx: Ctx, world: number, seed: number): void {
  const W = WORLD_WIDTH;
  const H = WORLD_HEIGHT;
  ctx.save();
  switch (world) {
    case 1: drawFrontier(ctx, W, H, seed); break;
    case 2: drawIndustrial(ctx, W, H, seed); break;
    case 3: drawCapital(ctx, W, H, seed); break;
    case 4: drawFrozen(ctx, W, H, seed); break;
    case 5: drawVoid(ctx, W, H, seed); break;
    case 6: drawUndersea(ctx, W, H, seed); break;
    default: drawFrontier(ctx, W, H, seed);
  }
  ctx.restore();
}

function drawFrontier(ctx: Ctx, W: number, H: number, seed: number): void {
  // Sky gradient (top 30%)
  const skyG = ctx.createLinearGradient(0, 0, 0, H * 0.35);
  skyG.addColorStop(0, '#1a2b3a');
  skyG.addColorStop(1, '#2a4040');
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, W, H * 0.35);

  const r = rand(seed);
  // Distant hills (silhouette)
  ctx.fillStyle = 'rgba(20, 40, 30, 0.6)';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.35);
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const x = (W * i) / steps;
    const y = H * 0.32 - r() * 30 + Math.sin(i * 0.8) * 15;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H * 0.4);
  ctx.lineTo(W, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fillRect(0, 0, W, 1); // fix path start
  ctx.fill();

  // Watchtowers dotting the skyline
  for (let i = 0; i < 3; i++) {
    const tx = W * (0.2 + i * 0.3) + r() * 20;
    const ty = H * 0.28;
    ctx.fillStyle = 'rgba(50, 40, 30, 0.75)';
    ctx.fillRect(tx - 3, ty, 6, 14);
    ctx.beginPath();
    ctx.moveTo(tx - 6, ty);
    ctx.lineTo(tx, ty - 8);
    ctx.lineTo(tx + 6, ty);
    ctx.closePath();
    ctx.fill();
  }

  // Wheat/grass tufts near ground
  ctx.fillStyle = 'rgba(180, 160, 80, 0.35)';
  for (let i = 0; i < 30; i++) {
    const x = r() * W;
    const y = H * (0.4 + r() * 0.6);
    ctx.fillRect(x, y, 1, 2 + r() * 2);
  }
}

function drawIndustrial(ctx: Ctx, W: number, H: number, seed: number): void {
  // Night red sky
  const skyG = ctx.createLinearGradient(0, 0, 0, H * 0.4);
  skyG.addColorStop(0, '#2a0a08');
  skyG.addColorStop(1, '#3a1810');
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, W, H * 0.4);

  const r = rand(seed);
  // Factory silhouette — rectangular blocks of different heights
  ctx.fillStyle = 'rgba(10, 8, 8, 0.85)';
  let x = 0;
  while (x < W) {
    const bw = 20 + r() * 40;
    const bh = 30 + r() * 80;
    ctx.fillRect(x, H * 0.4 - bh, bw, bh);
    // Windows
    ctx.fillStyle = 'rgba(255, 150, 60, 0.25)';
    for (let j = 0; j < Math.floor(bh / 10); j++) {
      for (let k = 0; k < Math.floor(bw / 10); k++) {
        if (r() < 0.4) ctx.fillRect(x + 2 + k * 10, H * 0.4 - bh + 2 + j * 10, 4, 4);
      }
    }
    ctx.fillStyle = 'rgba(10, 8, 8, 0.85)';
    x += bw;
  }
  // Smokestacks
  for (let i = 0; i < 4; i++) {
    const sx = W * (0.15 + i * 0.25) + r() * 20;
    const sh = 60 + r() * 40;
    ctx.fillStyle = 'rgba(20, 15, 12, 0.9)';
    ctx.fillRect(sx - 4, H * 0.4 - sh, 8, sh);
    // Smoke plume
    ctx.fillStyle = 'rgba(100, 60, 40, 0.35)';
    ctx.beginPath();
    ctx.ellipse(sx, H * 0.4 - sh - 8, 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx - 6, H * 0.4 - sh - 20, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Furnace glow at base
  const glowG = ctx.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H * 0.4, W);
  glowG.addColorStop(0, 'rgba(255, 80, 30, 0.3)');
  glowG.addColorStop(1, 'rgba(255, 80, 30, 0)');
  ctx.fillStyle = glowG;
  ctx.fillRect(0, 0, W, H * 0.5);
}

function drawCapital(ctx: Ctx, W: number, H: number, seed: number): void {
  const skyG = ctx.createLinearGradient(0, 0, 0, H * 0.4);
  skyG.addColorStop(0, '#1a1a30');
  skyG.addColorStop(1, '#2a2040');
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, W, H * 0.4);

  const r = rand(seed);
  // Palace silhouette — central dome with side wings
  ctx.fillStyle = 'rgba(15, 15, 30, 0.9)';
  // Left wing
  ctx.fillRect(W * 0.1, H * 0.3, W * 0.22, H * 0.1);
  // Right wing
  ctx.fillRect(W * 0.68, H * 0.3, W * 0.22, H * 0.1);
  // Main palace
  ctx.fillRect(W * 0.32, H * 0.22, W * 0.36, H * 0.18);
  // Dome
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.22, W * 0.18, Math.PI, 0);
  ctx.fill();
  // Spire
  ctx.fillStyle = '#2a2050';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 3, H * 0.04);
  ctx.lineTo(W / 2, H * 0.01);
  ctx.lineTo(W / 2 + 3, H * 0.04);
  ctx.closePath();
  ctx.fill();

  // Lit windows on palace
  ctx.fillStyle = 'rgba(255, 220, 120, 0.35)';
  for (let i = 0; i < 30; i++) {
    const wx = W * (0.1 + r() * 0.8);
    const wy = H * (0.22 + r() * 0.18);
    ctx.fillRect(wx, wy, 2, 3);
  }
  // Spotlights cutting through haze
  ctx.fillStyle = 'rgba(200, 200, 240, 0.08)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(W * (0.3 + i * 0.2), H * 0.2);
    ctx.lineTo(W * (0.15 + i * 0.3), 0);
    ctx.lineTo(W * (0.45 + i * 0.1), 0);
    ctx.closePath();
    ctx.fill();
  }
}

function drawFrozen(ctx: Ctx, W: number, H: number, seed: number): void {
  const skyG = ctx.createLinearGradient(0, 0, 0, H * 0.4);
  skyG.addColorStop(0, '#1a2028');
  skyG.addColorStop(0.7, '#2a3a4a');
  skyG.addColorStop(1, '#3a5060');
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, W, H * 0.4);

  // Aurora bands
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 3; i++) {
    const g = ctx.createLinearGradient(0, H * (0.05 + i * 0.05), W, H * (0.05 + i * 0.05));
    g.addColorStop(0, 'rgba(140, 220, 180, 0)');
    g.addColorStop(0.5, 'rgba(140, 220, 180, 0.9)');
    g.addColorStop(1, 'rgba(140, 220, 180, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.05 + i * 15);
    for (let x = 0; x <= W; x += 20) {
      ctx.lineTo(x, H * 0.05 + i * 15 + Math.sin(x * 0.05 + i) * 8);
    }
    ctx.lineTo(W, H * 0.08 + i * 15 + 4);
    for (let x = W; x >= 0; x -= 20) {
      ctx.lineTo(x, H * 0.08 + i * 15 + Math.sin(x * 0.05 + i) * 8 + 4);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const r = rand(seed);
  // Glacier silhouette (jagged)
  ctx.fillStyle = 'rgba(40, 70, 90, 0.85)';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.4);
  for (let x = 0; x <= W; x += 12) {
    ctx.lineTo(x, H * 0.4 - 30 - r() * 40);
  }
  ctx.lineTo(W, H * 0.4);
  ctx.closePath();
  ctx.fill();

  // Black obelisks (3)
  for (let i = 0; i < 3; i++) {
    const ox = W * (0.25 + i * 0.25);
    const oy = H * 0.4;
    ctx.fillStyle = '#0a0a14';
    ctx.beginPath();
    ctx.moveTo(ox - 6, oy);
    ctx.lineTo(ox - 2, oy - 60);
    ctx.lineTo(ox + 2, oy - 60);
    ctx.lineTo(ox + 6, oy);
    ctx.closePath();
    ctx.fill();
    // Glowing runes
    ctx.fillStyle = 'rgba(140, 220, 200, 0.6)';
    for (let j = 0; j < 3; j++) {
      ctx.fillRect(ox - 1, oy - 20 - j * 15, 2, 2);
    }
  }
}

function drawVoid(ctx: Ctx, W: number, H: number, seed: number): void {
  const skyG = ctx.createLinearGradient(0, 0, 0, H * 0.4);
  skyG.addColorStop(0, '#100818');
  skyG.addColorStop(1, '#2a0a40');
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, W, H * 0.4);

  const r = rand(seed);
  // Pulsing void lightning
  ctx.strokeStyle = 'rgba(200, 120, 255, 0.3)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const sx = r() * W;
    let cx = sx;
    let cy = 0;
    ctx.moveTo(cx, cy);
    while (cy < H * 0.3) {
      cx += (r() - 0.5) * 20;
      cy += 15 + r() * 10;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  // Onyx fortress silhouette
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(W * 0.1, H * 0.4);
  ctx.lineTo(W * 0.15, H * 0.3);
  ctx.lineTo(W * 0.22, H * 0.32);
  ctx.lineTo(W * 0.28, H * 0.25);
  ctx.lineTo(W * 0.36, H * 0.28);
  ctx.lineTo(W * 0.42, H * 0.18);
  ctx.lineTo(W * 0.5, H * 0.12);
  ctx.lineTo(W * 0.58, H * 0.18);
  ctx.lineTo(W * 0.64, H * 0.28);
  ctx.lineTo(W * 0.72, H * 0.25);
  ctx.lineTo(W * 0.78, H * 0.32);
  ctx.lineTo(W * 0.85, H * 0.3);
  ctx.lineTo(W * 0.9, H * 0.4);
  ctx.closePath();
  ctx.fill();
  // Spire glows
  ctx.fillStyle = 'rgba(200, 120, 255, 0.6)';
  ctx.fillRect(W * 0.499, H * 0.1, 2, 4);
  // Floating void particles
  ctx.fillStyle = 'rgba(200, 120, 255, 0.7)';
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.arc(r() * W, r() * H * 0.4, 0.8 + r() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// World 6 — Seabed Fissure. Abyssal aftermath where the Iron Tide retreated.
// Deep water gradient with god-rays streaming down, distant seamounts,
// foreground kelp forest, drifting particulate + luminous fish flecks.
function drawUndersea(ctx: Ctx, W: number, H: number, seed: number): void {
  // Abyss water gradient — indigo at depth, teal near surface
  const skyG = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  skyG.addColorStop(0, '#0a1a30');
  skyG.addColorStop(0.5, '#0e2840');
  skyG.addColorStop(1, '#184455');
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, W, H * 0.45);

  const r = rand(seed);

  // God-ray shafts streaming from the surface — soft, diagonal
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 4; i++) {
    const rayX = W * (0.15 + i * 0.22 + r() * 0.05);
    const rayW = 20 + r() * 30;
    const rg = ctx.createLinearGradient(rayX, 0, rayX + rayW * 0.4, H * 0.5);
    rg.addColorStop(0, 'rgba(200, 240, 255, 0.55)');
    rg.addColorStop(1, 'rgba(150, 220, 240, 0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(rayX, 0);
    ctx.lineTo(rayX + rayW, 0);
    ctx.lineTo(rayX + rayW + 30, H * 0.5);
    ctx.lineTo(rayX + 10, H * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Distant seamount silhouettes (back layer)
  ctx.fillStyle = 'rgba(10, 25, 40, 0.75)';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.45);
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const x = (W * i) / steps;
    const y = H * 0.4 - r() * 28 - Math.sin(i * 0.7) * 18;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H * 0.45);
  ctx.closePath();
  ctx.fill();

  // Closer ridge silhouette (mid layer, darker)
  ctx.fillStyle = 'rgba(5, 15, 25, 0.85)';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.45);
  for (let i = 0; i <= 10; i++) {
    const x = (W * i) / 10;
    const y = H * 0.42 - r() * 15 - Math.sin(i * 1.2 + 1) * 10;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H * 0.45);
  ctx.closePath();
  ctx.fill();

  // Kelp forest — tall sway of flat dark strokes on left/right edges
  ctx.strokeStyle = 'rgba(15, 55, 40, 0.75)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const side = i < 6 ? 0 : 1;
    const baseX = side === 0 ? r() * W * 0.28 : W * 0.72 + r() * W * 0.28;
    const baseY = H * 0.45;
    const tall = 55 + r() * 50;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    // Two-control-point bezier so it sways
    const cxOff = (r() - 0.5) * 30;
    ctx.quadraticCurveTo(baseX + cxOff, baseY - tall * 0.6, baseX + cxOff * 0.3, baseY - tall);
    ctx.stroke();
  }

  // Luminous plankton / fish flecks — small bright dots in the water column
  for (let i = 0; i < 28; i++) {
    const px = r() * W;
    const py = r() * H * 0.42;
    const glow = 0.35 + r() * 0.5;
    // Outer halo
    ctx.fillStyle = `rgba(120, 240, 220, ${glow * 0.25})`;
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Core
    ctx.fillStyle = `rgba(180, 255, 240, ${glow})`;
    ctx.beginPath();
    ctx.arc(px, py, 0.9 + r() * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Foreground silt drift — subtle pale strokes near the floor
  ctx.strokeStyle = 'rgba(170, 210, 220, 0.12)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 6; i++) {
    const sy = H * (0.3 + r() * 0.15);
    ctx.beginPath();
    ctx.moveTo(0, sy);
    for (let x = 0; x <= W; x += 30) {
      ctx.lineTo(x, sy + Math.sin(x * 0.04 + i) * 3);
    }
    ctx.stroke();
  }
}
