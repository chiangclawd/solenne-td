/**
 * Procedurally-drawn sprites. Each function draws a tower/enemy/projectile at
 * the given world coords using Canvas 2D primitives — metal gradients,
 * shadows, glow halos. Replaces static Kenney bitmaps for a consistent
 * polished-indie look.
 *
 * All functions receive the raw CanvasRenderingContext2D (already in world
 * transform) and the world-space center (x, y) + size.
 */

import { TILE_SIZE } from '../config.ts';

const T = TILE_SIZE;

type Ctx = CanvasRenderingContext2D;

// ---------- Cached sprite renderer (for UI icons) ----------
// Renders a tower/enemy to an offscreen canvas once, then drawImage to a target.

const spriteCache = new Map<string, HTMLCanvasElement>();

function getCachedTowerIcon(id: string, level: number, sizeCss: number, dpr: number): HTMLCanvasElement {
  const key = `t:${id}:${level}:${sizeCss}:${dpr}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const pxSize = Math.ceil(sizeCss * dpr);
  const off = document.createElement('canvas');
  off.width = pxSize;
  off.height = pxSize;
  const c = off.getContext('2d')!;
  c.scale(dpr, dpr);
  const cx = sizeCss / 2;
  const cy = sizeCss / 2;
  // Base
  drawTowerBase(c, cx, cy, sizeCss * 0.95);
  // Turret (no rotation for icon)
  drawTowerTurret(c, id, cx, cy, 0, level);
  spriteCache.set(key, off);
  return off;
}

export function drawTowerIconScreen(
  ctx: Ctx,
  id: string,
  cssX: number,
  cssY: number,
  cssSize: number,
  level = 0,
): void {
  const dpr = window.devicePixelRatio || 1;
  const icon = getCachedTowerIcon(id, level, cssSize, dpr);
  ctx.drawImage(icon, cssX * dpr, cssY * dpr, cssSize * dpr, cssSize * dpr);
}

function getCachedEnemyIcon(sprite: string, sizeCss: number, dpr: number): HTMLCanvasElement {
  const key = `e:${sprite}:${sizeCss}:${dpr}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const pxSize = Math.ceil(sizeCss * dpr);
  const off = document.createElement('canvas');
  off.width = pxSize;
  off.height = pxSize;
  const c = off.getContext('2d')!;
  c.scale(dpr, dpr);
  const cx = sizeCss / 2;
  const cy = sizeCss / 2;
  drawEnemy(c, sprite, cx, cy, 0, sizeCss * 0.9, 0);
  spriteCache.set(key, off);
  return off;
}

export function drawEnemyIconScreen(
  ctx: Ctx,
  sprite: string,
  cssX: number,
  cssY: number,
  cssSize: number,
): void {
  const dpr = window.devicePixelRatio || 1;
  const icon = getCachedEnemyIcon(sprite, cssSize, dpr);
  ctx.drawImage(icon, cssX * dpr, cssY * dpr, cssSize * dpr, cssSize * dpr);
}

// ---------- Tower Base ----------

export function drawTowerBase(ctx: Ctx, x: number, y: number, size: number = T * 0.95): void {
  const r = size / 2;
  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.55, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer stone ring — radial gradient
  const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.2, x, y, r);
  g.addColorStop(0, '#b8a07a');
  g.addColorStop(0.5, '#7a6a52');
  g.addColorStop(1, '#3d3628');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Inner metal plate
  const g2 = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r * 0.7);
  g2.addColorStop(0, '#4a5668');
  g2.addColorStop(1, '#1e2838');
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Highlight ring
  ctx.strokeStyle = 'rgba(255, 215, 120, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
  ctx.stroke();

  // Rivets
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6 + Math.PI / 6;
    const rx = x + Math.cos(a) * r * 0.82;
    const ry = y + Math.sin(a) * r * 0.82;
    ctx.beginPath();
    ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- Towers (rotation in radians, 0 = barrel points +Y) ----------

export function drawTowerTurret(
  ctx: Ctx,
  type: string,
  x: number,
  y: number,
  rotation: number,
  level: number, // 0, 1, 2
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  switch (type) {
    case 'cannon': paintCannon(ctx, level); break;
    case 'quickShot': paintQuickShot(ctx, level); break;
    case 'machineGun': paintMachineGun(ctx, level); break;
    case 'sniper': paintSniper(ctx, level); break;
    case 'missileLauncher': paintMissile(ctx, level); break;
    case 'heavyCannon': paintHeavyCannon(ctx, level); break;
    case 'frostTower': paintFrost(ctx, level); break;
    case 'tesla': paintTesla(ctx, level); break;
    case 'lightTower': paintLight(ctx, level); break;
    default: paintCannon(ctx, level);
  }
  ctx.restore();
}

function paintTurretBody(ctx: Ctx, bodyColor: string, highlight: string, radius: number): void {
  // Dome body
  const g = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.2, 0, 0, radius);
  g.addColorStop(0, highlight);
  g.addColorStop(1, bodyColor);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  // Rim
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function paintCannon(ctx: Ctx, level: number): void {
  const scale = 1 + level * 0.08;
  paintTurretBody(ctx, '#8a5a3a', '#c9955e', 11 * scale);
  // Barrel pointing up
  const bw = 5 * scale;
  const bh = 16 * scale;
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(-bw / 2, -bh, bw, bh);
  // Barrel highlight
  ctx.fillStyle = '#5a4028';
  ctx.fillRect(-bw / 2, -bh, bw * 0.35, bh);
  // Muzzle
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-bw / 2 - 1, -bh - 2, bw + 2, 2);
}

function paintQuickShot(ctx: Ctx, level: number): void {
  const scale = 1 + level * 0.08;
  paintTurretBody(ctx, '#2a6a3a', '#4ecb7a', 10 * scale);
  const bw = 3 * scale;
  const bh = 18 * scale;
  ctx.fillStyle = '#1a1a20';
  ctx.fillRect(-bw / 2, -bh, bw, bh);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-1, -bh - 1, 2, 2);
}

function paintMachineGun(ctx: Ctx, level: number): void {
  const scale = 1 + level * 0.08;
  paintTurretBody(ctx, '#1f4a68', '#3a7a9c', 11 * scale);
  // Twin barrels
  ctx.fillStyle = '#111';
  ctx.fillRect(-5 * scale, -17 * scale, 3 * scale, 17 * scale);
  ctx.fillRect(2 * scale, -17 * scale, 3 * scale, 17 * scale);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-5 * scale, -18 * scale, 3 * scale, 2);
  ctx.fillRect(2 * scale, -18 * scale, 3 * scale, 2);
}

function paintSniper(ctx: Ctx, level: number): void {
  const scale = 1 + level * 0.08;
  paintTurretBody(ctx, '#3a2028', '#7a3848', 10 * scale);
  // Long thin barrel
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(-1.5 * scale, -22 * scale, 3 * scale, 22 * scale);
  // Scope
  ctx.fillStyle = '#c85050';
  ctx.beginPath();
  ctx.arc(0, -10 * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();
  // Laser dot
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-1, -24 * scale, 2, 2);
}

function paintMissile(ctx: Ctx, level: number): void {
  const scale = 1 + level * 0.08;
  paintTurretBody(ctx, '#4a2818', '#9c5a38', 12 * scale);
  // Missile cluster — 3 tubes
  for (let i = -1; i <= 1; i++) {
    ctx.fillStyle = '#1a1012';
    ctx.fillRect(i * 4 * scale - 1.5, -14 * scale, 3, 12 * scale);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(i * 4 * scale - 1.5, -14 * scale, 3, 2);
  }
}

function paintHeavyCannon(ctx: Ctx, level: number): void {
  const scale = 1 + level * 0.1;
  paintTurretBody(ctx, '#2a2a2a', '#5a5a60', 13 * scale);
  // Thick short barrel
  ctx.fillStyle = '#111';
  ctx.fillRect(-5 * scale, -14 * scale, 10 * scale, 14 * scale);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(-5 * scale, -14 * scale, 10 * scale * 0.3, 14 * scale);
  ctx.fillStyle = '#ff9f43';
  ctx.fillRect(-5 * scale, -16 * scale, 10 * scale, 2);
}

function paintFrost(ctx: Ctx, level: number): void {
  const scale = 1 + level * 0.08;
  // Icy body
  const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, 11 * scale);
  g.addColorStop(0, '#e0f4ff');
  g.addColorStop(1, '#2e6a9a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 11 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Crystal spike up
  ctx.fillStyle = '#9ecbff';
  ctx.beginPath();
  ctx.moveTo(-4 * scale, -4);
  ctx.lineTo(0, -18 * scale);
  ctx.lineTo(4 * scale, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e0f4ff';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function paintTesla(ctx: Ctx, level: number): void {
  const scale = 1 + level * 0.08;
  paintTurretBody(ctx, '#2a1848', '#6840c8', 11 * scale);
  // Coil rings
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, -4 - i * 4 * scale, 4 - i * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Top ball
  const topG = ctx.createRadialGradient(-1, -16 * scale, 1, 0, -14 * scale, 4);
  topG.addColorStop(0, '#ffffff');
  topG.addColorStop(1, '#9ecbff');
  ctx.fillStyle = topG;
  ctx.beginPath();
  ctx.arc(0, -14 * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function paintLight(ctx: Ctx, level: number): void {
  const scale = 1 + level * 0.08;
  paintTurretBody(ctx, '#c8a058', '#ffe9a8', 11 * scale);
  // Sun rays
  ctx.strokeStyle = 'rgba(255, 230, 150, 0.75)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    const x1 = Math.cos(a) * 8 * scale;
    const y1 = Math.sin(a) * 8 * scale;
    const x2 = Math.cos(a) * 13 * scale;
    const y2 = Math.sin(a) * 13 * scale;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // Barrel
  ctx.fillStyle = '#fff8dc';
  ctx.fillRect(-2 * scale, -12 * scale, 4 * scale, 12 * scale);
}

// ---------- Enemies ----------

export function drawEnemy(
  ctx: Ctx,
  type: string,
  x: number,
  y: number,
  rotation: number,
  size: number,
  hitFlash: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  switch (type) {
    case 'enemySoldier': paintSoldier(ctx, size); break;
    case 'enemyTank': paintTank(ctx, size); break;
    case 'enemyPlane': paintPlane(ctx, size); break;
    case 'enemyBoss': paintBoss(ctx, size); break;
    case 'enemyIce': paintIce(ctx, size); break;
    case 'enemyWraith': paintWraith(ctx, size); break;
    case 'enemySplitter': paintSplitter(ctx, size); break;
    case 'enemyHealer': paintHealer(ctx, size); break;
    default: paintSoldier(ctx, size);
  }

  if (hitFlash > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.7, hitFlash * 4)})`;
    ctx.fillRect(-size, -size, size * 2, size * 2);
  }
  ctx.restore();
}

function paintSoldier(ctx: Ctx, size: number): void {
  const s = size / 40;
  // Body
  ctx.fillStyle = '#8a4838';
  ctx.beginPath();
  ctx.ellipse(0, 2 * s, 8 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Helmet
  ctx.fillStyle = '#3a2418';
  ctx.beginPath();
  ctx.arc(0, -6 * s, 6 * s, 0, Math.PI * 2);
  ctx.fill();
  // Rifle
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-1 * s, -10 * s, 2 * s, 14 * s);
  // Face
  ctx.fillStyle = '#e8c098';
  ctx.beginPath();
  ctx.arc(0, -3 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();
}

function paintTank(ctx: Ctx, size: number): void {
  const s = size / 40;
  // Tracks
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-12 * s, -8 * s, 4 * s, 16 * s);
  ctx.fillRect(8 * s, -8 * s, 4 * s, 16 * s);
  // Hull
  const g = ctx.createLinearGradient(0, -6 * s, 0, 8 * s);
  g.addColorStop(0, '#5a5a3a');
  g.addColorStop(1, '#2a2a18');
  ctx.fillStyle = g;
  ctx.fillRect(-10 * s, -6 * s, 20 * s, 14 * s);
  // Turret
  ctx.fillStyle = '#3a3a28';
  ctx.beginPath();
  ctx.arc(0, -1 * s, 6 * s, 0, Math.PI * 2);
  ctx.fill();
  // Barrel
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-1.5 * s, -15 * s, 3 * s, 14 * s);
  // Rivets
  ctx.fillStyle = '#8a8a6a';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(i * 6 * s, 5 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintPlane(ctx: Ctx, size: number): void {
  const s = size / 40;
  // Body
  const g = ctx.createLinearGradient(0, -8 * s, 0, 8 * s);
  g.addColorStop(0, '#4a6a8a');
  g.addColorStop(1, '#1a2a3a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 5 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wings
  ctx.beginPath();
  ctx.moveTo(-14 * s, 2 * s);
  ctx.lineTo(14 * s, 2 * s);
  ctx.lineTo(10 * s, 5 * s);
  ctx.lineTo(-10 * s, 5 * s);
  ctx.closePath();
  ctx.fill();
  // Tail
  ctx.beginPath();
  ctx.moveTo(-4 * s, 10 * s);
  ctx.lineTo(4 * s, 10 * s);
  ctx.lineTo(2 * s, 14 * s);
  ctx.lineTo(-2 * s, 14 * s);
  ctx.closePath();
  ctx.fill();
  // Cockpit
  ctx.fillStyle = 'rgba(110, 200, 255, 0.6)';
  ctx.beginPath();
  ctx.ellipse(0, -6 * s, 2 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function paintBoss(ctx: Ctx, size: number): void {
  const s = size / 40;
  // Outer aura
  const aura = ctx.createRadialGradient(0, 0, 2 * s, 0, 0, 20 * s);
  aura.addColorStop(0, 'rgba(200, 40, 40, 0.5)');
  aura.addColorStop(1, 'rgba(200, 40, 40, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 20 * s, 0, Math.PI * 2);
  ctx.fill();
  // Main body
  const g = ctx.createRadialGradient(-3 * s, -3 * s, 2, 0, 0, 14 * s);
  g.addColorStop(0, '#5a3028');
  g.addColorStop(1, '#1a0a0a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 14 * s, 0, Math.PI * 2);
  ctx.fill();
  // Spikes (3 up)
  ctx.fillStyle = '#3a1a18';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 5 * s - 2, -10 * s);
    ctx.lineTo(i * 5 * s, -18 * s);
    ctx.lineTo(i * 5 * s + 2, -10 * s);
    ctx.closePath();
    ctx.fill();
  }
  // Eye
  ctx.fillStyle = '#ff3030';
  ctx.beginPath();
  ctx.arc(0, -2 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(0, -2 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
}

function paintIce(ctx: Ctx, size: number): void {
  const s = size / 40;
  // Crystalline body
  const g = ctx.createRadialGradient(-3 * s, -3 * s, 2, 0, 0, 13 * s);
  g.addColorStop(0, '#e0f8ff');
  g.addColorStop(1, '#2a6890');
  ctx.fillStyle = g;
  ctx.beginPath();
  // Hexagonal ice shape
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    const x = Math.cos(a) * 13 * s;
    const y = Math.sin(a) * 13 * s;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Glowing center
  ctx.fillStyle = 'rgba(160, 240, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(0, 0, 4 * s, 0, Math.PI * 2);
  ctx.fill();
}

function paintWraith(ctx: Ctx, size: number): void {
  const s = size / 40;
  // Translucent body (ghost-like)
  ctx.globalAlpha = 0.7;
  const g = ctx.createRadialGradient(0, -2 * s, 2, 0, 0, 12 * s);
  g.addColorStop(0, 'rgba(200, 120, 255, 0.9)');
  g.addColorStop(1, 'rgba(60, 20, 90, 0.1)');
  ctx.fillStyle = g;
  ctx.beginPath();
  // Tapered shape
  ctx.moveTo(0, -13 * s);
  ctx.bezierCurveTo(10 * s, -8 * s, 10 * s, 6 * s, 6 * s, 10 * s);
  ctx.lineTo(-6 * s, 10 * s);
  ctx.bezierCurveTo(-10 * s, 6 * s, -10 * s, -8 * s, 0, -13 * s);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-3 * s, -5 * s, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3 * s, -5 * s, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c878ff';
  ctx.beginPath();
  ctx.arc(-3 * s, -5 * s, 0.7 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3 * s, -5 * s, 0.7 * s, 0, Math.PI * 2);
  ctx.fill();
}

function paintSplitter(ctx: Ctx, size: number): void {
  const s = size / 40;
  // Cracked shell
  const g = ctx.createRadialGradient(-3 * s, -3 * s, 2, 0, 0, 13 * s);
  g.addColorStop(0, '#9a6a2a');
  g.addColorStop(1, '#3a2410');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 13 * s, 0, Math.PI * 2);
  ctx.fill();
  // Crack lines
  ctx.strokeStyle = '#ffb040';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-8 * s, -4 * s); ctx.lineTo(-2 * s, 0); ctx.lineTo(4 * s, -6 * s);
  ctx.moveTo(-6 * s, 4 * s); ctx.lineTo(0, 6 * s); ctx.lineTo(6 * s, 2 * s);
  ctx.moveTo(2 * s, 8 * s); ctx.lineTo(7 * s, 11 * s);
  ctx.stroke();
  // Eye
  ctx.fillStyle = '#ffb040';
  ctx.beginPath();
  ctx.arc(0, 0, 3 * s, 0, Math.PI * 2);
  ctx.fill();
}

function paintHealer(ctx: Ctx, size: number): void {
  const s = size / 40;
  // Soft cloak
  const g = ctx.createRadialGradient(0, -2 * s, 2, 0, 2 * s, 13 * s);
  g.addColorStop(0, '#f0f8e8');
  g.addColorStop(1, '#5a8a4a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -12 * s);
  ctx.bezierCurveTo(9 * s, -8 * s, 10 * s, 8 * s, 7 * s, 12 * s);
  ctx.lineTo(-7 * s, 12 * s);
  ctx.bezierCurveTo(-10 * s, 8 * s, -9 * s, -8 * s, 0, -12 * s);
  ctx.closePath();
  ctx.fill();
  // Cross symbol (healing)
  ctx.strokeStyle = '#6ee17a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-4 * s, 0); ctx.lineTo(4 * s, 0);
  ctx.moveTo(0, -4 * s); ctx.lineTo(0, 4 * s);
  ctx.stroke();
  // Glowing halo
  ctx.strokeStyle = 'rgba(110, 235, 140, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -10 * s, 5 * s, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------- Projectiles ----------

export function drawProjectile(
  ctx: Ctx,
  type: string,
  x: number,
  y: number,
  rotation: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  if (type === 'projectileMissile') {
    // Missile with flame trail
    ctx.fillStyle = '#8a4038';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(3, -2);
    ctx.lineTo(3, 4);
    ctx.lineTo(-3, 4);
    ctx.lineTo(-3, -2);
    ctx.closePath();
    ctx.fill();
    // Fins
    ctx.fillStyle = '#5a2018';
    ctx.beginPath();
    ctx.moveTo(-3, 4);
    ctx.lineTo(-6, 7);
    ctx.lineTo(-3, 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, 4);
    ctx.lineTo(6, 7);
    ctx.lineTo(3, 2);
    ctx.closePath();
    ctx.fill();
    // Flame
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.moveTo(-2, 4);
    ctx.lineTo(0, 10 + Math.random() * 3);
    ctx.lineTo(2, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe8a0';
    ctx.beginPath();
    ctx.moveTo(-1, 4);
    ctx.lineTo(0, 7);
    ctx.lineTo(1, 4);
    ctx.closePath();
    ctx.fill();
  } else {
    // Bullet — glowing pill
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 4);
    glow.addColorStop(0, '#fffcd0');
    glow.addColorStop(0.5, '#ffd166');
    glow.addColorStop(1, 'rgba(255, 180, 60, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffcd0';
    ctx.fillRect(-1, -3, 2, 5);
  }
  ctx.restore();
}
