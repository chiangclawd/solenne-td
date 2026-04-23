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
  fireAnim: number = 0,
  buildAnim: number = 0,
): void {
  ctx.save();
  ctx.translate(x, y);

  // Build pop-in: overshoot 1.2x then settle
  if (buildAnim > 0) {
    const scale = 1 + Math.sin(buildAnim * Math.PI) * 0.22;
    ctx.scale(scale, scale);
  }

  ctx.rotate(rotation);

  // Fire recoil: barrel pulled back along its own axis (-Y local)
  if (fireAnim > 0) {
    const recoil = -fireAnim * 3;
    ctx.translate(0, recoil);
  }

  // Muzzle flash glow at tip when freshly fired
  if (fireAnim > 0.4) {
    const flashAlpha = (fireAnim - 0.4) * 1.6;
    ctx.save();
    ctx.globalAlpha = Math.min(1, flashAlpha);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, -18, 1, 0, -18, 10);
    g.addColorStop(0, '#fff8dc');
    g.addColorStop(0.4, '#ffd166');
    g.addColorStop(1, 'rgba(255, 180, 60, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -18, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

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

/**
 * Shared helper — domed body used only as a supporting visual element, not as
 * the primary silhouette. Individual paint functions define their own shapes.
 */
function paintDome(ctx: Ctx, bodyColor: string, highlight: string, radius: number): void {
  const g = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.2, 0, 0, radius);
  g.addColorStop(0, highlight);
  g.addColorStop(1, bodyColor);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/**
 * 加農砲 — 輪式野戰砲 (field cannon on wheeled carriage).
 * Silhouette: rectangular body with visible wheels on each side, thick central barrel.
 */
function paintCannon(ctx: Ctx, level: number): void {
  const s = 1 + level * 0.08;
  // Wheels (dark brown circles at sides)
  ctx.fillStyle = '#2a1a0e';
  ctx.beginPath();
  ctx.arc(-9 * s, 4 * s, 5 * s, 0, Math.PI * 2);
  ctx.arc(9 * s, 4 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3820';
  ctx.beginPath();
  ctx.arc(-9 * s, 4 * s, 3 * s, 0, Math.PI * 2);
  ctx.arc(9 * s, 4 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  // Wooden carriage frame (rectangular olive body)
  const g = ctx.createLinearGradient(0, -4, 0, 10);
  g.addColorStop(0, '#8a7a3a');
  g.addColorStop(1, '#4a3820');
  ctx.fillStyle = g;
  ctx.fillRect(-11 * s, -2 * s, 22 * s, 10 * s);
  ctx.strokeStyle = '#1a1008';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-11 * s, -2 * s, 22 * s, 10 * s);
  // Breech block (rear)
  ctx.fillStyle = '#3a2818';
  ctx.fillRect(-5 * s, 2 * s, 10 * s, 6 * s);
  // Thick single barrel pointing up
  const bw = 6 * s;
  const bh = 18 * s;
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(-bw / 2, -bh, bw, bh);
  // Barrel highlight stripe
  ctx.fillStyle = '#4a3a28';
  ctx.fillRect(-bw / 2 + 0.8, -bh, bw * 0.3, bh);
  // Reinforcing gold band
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-bw / 2 - 1, -bh + 5, bw + 2, 1.5);
  // Muzzle ring
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-bw / 2 - 1, -bh - 2, bw + 2, 2);
}

/**
 * 速射槍 — 輕型戰術步槍 (tactical carbine).
 * Silhouette: small rectangular receiver + long thin barrel + front sight post + tactical rail.
 */
function paintQuickShot(ctx: Ctx, level: number): void {
  const s = 1 + level * 0.08;
  // Rear stock (rounded rectangle)
  ctx.fillStyle = '#3a5a2a';
  ctx.beginPath();
  ctx.roundRect(-4 * s, 2 * s, 8 * s, 10 * s, 2);
  ctx.fill();
  // Receiver body (compact rectangle)
  const g = ctx.createLinearGradient(0, -4, 0, 4);
  g.addColorStop(0, '#6a9a4a');
  g.addColorStop(1, '#2a4a1a');
  ctx.fillStyle = g;
  ctx.fillRect(-5 * s, -5 * s, 10 * s, 10 * s);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-5 * s, -5 * s, 10 * s, 10 * s);
  // Tactical rail slits on top (dark lines)
  ctx.strokeStyle = '#0a0a0a';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-4 * s, -3 * s + i * 3);
    ctx.lineTo(4 * s, -3 * s + i * 3);
    ctx.stroke();
  }
  // Long thin barrel
  ctx.fillStyle = '#111';
  ctx.fillRect(-1.5 * s, -20 * s, 3 * s, 15 * s);
  // Front sight post
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-1 * s, -13 * s, 2 * s, 2 * s);
  // Muzzle brake
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(-2.5 * s, -21 * s, 5 * s, 2 * s);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-1, -22 * s, 2, 1.5);
}

/**
 * 機槍塔 — 加特林旋轉機槍 (gatling gun).
 * Silhouette: cylindrical housing + 6 rotating barrels visible as dots arranged in ring + muzzle fan.
 */
function paintMachineGun(ctx: Ctx, level: number): void {
  const s = 1 + level * 0.08;
  // Back housing (hex)
  ctx.fillStyle = '#4a4a4a';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6 + Math.PI / 6;
    const px = Math.cos(a) * 10 * s;
    const py = Math.sin(a) * 10 * s + 2 * s;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Central barrel cluster — 6 barrels arranged in a circle pointing forward
  // Viewed from above, they appear as a cluster of dots extending forward
  const clusterY = -4 * s; // forward offset
  const clusterR = 3.5 * s;
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(0, clusterY, clusterR + 1, 0, Math.PI * 2);
  ctx.fill();
  // 6 barrel holes arranged in ring
  ctx.fillStyle = '#2a2a2a';
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    const bx = Math.cos(a) * 2.2 * s;
    const by = clusterY + Math.sin(a) * 2.2 * s;
    ctx.beginPath();
    ctx.arc(bx, by, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // Central pin
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(0, clusterY, 0.8 * s, 0, Math.PI * 2);
  ctx.fill();
  // Long barrel protrusion (2 visible main barrels out of cluster)
  ctx.fillStyle = '#111';
  ctx.fillRect(-1 * s, -18 * s, 2 * s, 14 * s);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-1.5, -19 * s, 3, 1.5);
}

/**
 * 狙擊塔 — 長距離狙擊槍 (long-range sniper with bipod + scope).
 * Silhouette: extremely long thin barrel + big scope + bipod legs at front.
 */
function paintSniper(ctx: Ctx, level: number): void {
  const s = 1 + level * 0.08;
  // Rear stock
  ctx.fillStyle = '#5a2028';
  ctx.beginPath();
  ctx.roundRect(-3 * s, 2 * s, 6 * s, 10 * s, 2);
  ctx.fill();
  // Receiver (small)
  ctx.fillStyle = '#2a0e14';
  ctx.fillRect(-4 * s, -3 * s, 8 * s, 7 * s);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-4 * s, -3 * s, 8 * s, 7 * s);
  // HUGE scope (prominent circle on top)
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.ellipse(0, -4 * s, 3.5 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c85050';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Scope lens (red glint)
  ctx.fillStyle = '#ff4040';
  ctx.beginPath();
  ctx.arc(0, -4 * s, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(-0.5, -5 * s, 1, 1);
  // Extra long thin barrel
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(-1 * s, -26 * s, 2 * s, 17 * s);
  // Bipod legs at the front (V shape)
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -21 * s);
  ctx.lineTo(-5 * s, -14 * s);
  ctx.moveTo(0, -21 * s);
  ctx.lineTo(5 * s, -14 * s);
  ctx.stroke();
  // Muzzle brake
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(-2 * s, -27 * s, 4 * s, 2);
  // Laser sight dot
  ctx.fillStyle = '#ff4040';
  ctx.fillRect(-0.5, -28 * s, 1, 1.5);
}

/**
 * 飛彈塔 — 多管火箭發射器 (6-cell MLRS honeycomb).
 * Silhouette: hexagonal array of 6 missile tubes, exhaust vents at rear.
 */
function paintMissile(ctx: Ctx, level: number): void {
  const s = 1 + level * 0.08;
  // Base platform
  ctx.fillStyle = '#4a2818';
  ctx.beginPath();
  ctx.roundRect(-11 * s, -3 * s, 22 * s, 12 * s, 3);
  ctx.fill();
  ctx.strokeStyle = '#1a0a05';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Exhaust vents at rear (3 dark slits)
  ctx.fillStyle = '#111';
  for (let i = -1; i <= 1; i++) {
    ctx.fillRect(i * 5 * s - 1.5, 6 * s, 3, 3 * s);
  }
  // Hex array of 6 missile tubes (viewed from above, pointing up)
  const tubeR = 2.2 * s;
  const positions: [number, number][] = [
    [-5 * s, -8 * s], [0, -10 * s], [5 * s, -8 * s],
    [-5 * s, -4 * s], [0, -6 * s], [5 * s, -4 * s],
  ];
  for (const [px, py] of positions) {
    // Outer tube ring (dark)
    ctx.fillStyle = '#1a0a05';
    ctx.beginPath();
    ctx.arc(px, py, tubeR + 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Red missile tip (visible inside tube)
    ctx.fillStyle = '#c84020';
    ctx.beginPath();
    ctx.arc(px, py, tubeR * 0.7, 0, Math.PI * 2);
    ctx.fill();
    // Tip highlight
    ctx.fillStyle = '#ff8a60';
    ctx.beginPath();
    ctx.arc(px, py - 0.5, tubeR * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Center yellow trigger/guidance dot
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-1, -7 * s, 2, 2);
}

/**
 * 重砲 — 攻城臼砲 (siege mortar with massive stubby barrel).
 * Silhouette: wide square base + huge thick short barrel, angled rivets.
 */
function paintHeavyCannon(ctx: Ctx, level: number): void {
  const s = 1 + level * 0.1;
  // Square base plate with rivets in corners
  const g = ctx.createLinearGradient(0, -4, 0, 10);
  g.addColorStop(0, '#3a3a3a');
  g.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = g;
  ctx.fillRect(-13 * s, -3 * s, 26 * s, 12 * s);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-13 * s, -3 * s, 26 * s, 12 * s);
  // Corner rivets (gold)
  ctx.fillStyle = '#ffd166';
  for (const [px, py] of [[-11, -1], [11, -1], [-11, 7], [11, 7]]) {
    ctx.beginPath();
    ctx.arc(px * s, py * s, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // MASSIVE thick stubby barrel (trapezoid wider at back)
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.moveTo(-7 * s, -3 * s);
  ctx.lineTo(7 * s, -3 * s);
  ctx.lineTo(6 * s, -15 * s);
  ctx.lineTo(-6 * s, -15 * s);
  ctx.closePath();
  ctx.fill();
  // Barrel highlight
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath();
  ctx.moveTo(-7 * s, -3 * s);
  ctx.lineTo(-4 * s, -3 * s);
  ctx.lineTo(-3.5 * s, -15 * s);
  ctx.lineTo(-6 * s, -15 * s);
  ctx.closePath();
  ctx.fill();
  // Hot orange muzzle (glowing)
  const muz = ctx.createLinearGradient(0, -17 * s, 0, -13 * s);
  muz.addColorStop(0, '#ff4020');
  muz.addColorStop(1, '#ff9f43');
  ctx.fillStyle = muz;
  ctx.fillRect(-6 * s, -17 * s, 12 * s, 2.5);
  // Center reinforcing band
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-7 * s, -9 * s, 14 * s, 1);
}

/**
 * 冰霜塔 — 冰晶群 (no gun at all — pure ice crystal cluster).
 * Silhouette: 3 tall ice spikes forming a triangle, glowing blue core.
 */
function paintFrost(ctx: Ctx, level: number): void {
  const s = 1 + level * 0.08;
  // Glowing blue aura
  const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 14 * s);
  aura.addColorStop(0, 'rgba(140, 220, 255, 0.7)');
  aura.addColorStop(1, 'rgba(140, 220, 255, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 14 * s, 0, Math.PI * 2);
  ctx.fill();
  // Three ice spikes forming a triangle (no dome!)
  const spikeAngles = [-Math.PI / 2, -Math.PI / 2 + (Math.PI * 2) / 3, -Math.PI / 2 + 2 * (Math.PI * 2) / 3];
  for (const angle of spikeAngles) {
    const tipX = Math.cos(angle) * 15 * s;
    const tipY = Math.sin(angle) * 15 * s;
    const baseA = angle + Math.PI / 2;
    const bx1 = Math.cos(angle) * 4 * s + Math.cos(baseA) * 3 * s;
    const by1 = Math.sin(angle) * 4 * s + Math.sin(baseA) * 3 * s;
    const bx2 = Math.cos(angle) * 4 * s - Math.cos(baseA) * 3 * s;
    const by2 = Math.sin(angle) * 4 * s - Math.sin(baseA) * 3 * s;
    const g = ctx.createLinearGradient(0, 0, tipX, tipY);
    g.addColorStop(0, '#6eb8ff');
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx1, by1);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(bx2, by2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e0f4ff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Glowing center orb
  const core = ctx.createRadialGradient(0, 0, 1, 0, 0, 5 * s);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.4, '#a8d8ff');
  core.addColorStop(1, '#2e6a9a');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, 5 * s, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 特斯拉塔 — 電磁線圈 (visible copper coil + large orb + electric arcs).
 * Silhouette: tall stacked coil with orb on top, lightning bolts around.
 */
function paintTesla(ctx: Ctx, level: number): void {
  const s = 1 + level * 0.08;
  // Base plate
  paintDome(ctx, '#2a1848', '#6840c8', 8 * s);
  // Tall copper coil body (stacked rings)
  const coilX = 0;
  const coilBottom = -2 * s;
  const coilTop = -14 * s;
  const coilWidth = 5 * s;
  ctx.fillStyle = '#c88030';
  ctx.fillRect(coilX - coilWidth / 2, coilTop, coilWidth, coilBottom - coilTop);
  // Coil wire wrap (horizontal stripes)
  ctx.strokeStyle = '#8a4818';
  ctx.lineWidth = 0.8;
  for (let y = coilTop; y <= coilBottom; y += 1.2) {
    ctx.beginPath();
    ctx.moveTo(coilX - coilWidth / 2, y);
    ctx.lineTo(coilX + coilWidth / 2, y);
    ctx.stroke();
  }
  // Wire highlight (one brighter stripe)
  ctx.fillStyle = '#ffb060';
  ctx.fillRect(coilX - coilWidth / 2, coilTop, 1, coilBottom - coilTop);
  // Top sphere (large, glowing)
  const orbX = 0;
  const orbY = -17 * s;
  const orbR = 4 * s;
  const orbG = ctx.createRadialGradient(orbX - 1, orbY - 1, 0.5, orbX, orbY, orbR);
  orbG.addColorStop(0, '#ffffff');
  orbG.addColorStop(0.3, '#c8e8ff');
  orbG.addColorStop(1, '#3a7ac8');
  ctx.fillStyle = orbG;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.6;
  ctx.stroke();
  // Electric arcs radiating from orb (pseudo-random zigzags)
  ctx.strokeStyle = 'rgba(200, 230, 255, 0.9)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  const arcs: [number, number][][] = [
    [[0, -17], [-5, -19], [-6, -14], [-8, -13]],
    [[0, -17], [5, -19], [6, -14], [8, -13]],
    [[0, -17], [0, -22]],
  ];
  for (const pts of arcs) {
    ctx.beginPath();
    pts.forEach(([px, py], i) => {
      const x = px * s;
      const y = py * s;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

/**
 * 聖光塔 — 太陽徽章 (sunburst halo + eye symbol, no barrel).
 * Silhouette: 8 long rays + central luminous disk + eye in middle.
 */
function paintLight(ctx: Ctx, level: number): void {
  const s = 1 + level * 0.08;
  // Outer halo glow
  const halo = ctx.createRadialGradient(0, 0, 3 * s, 0, 0, 18 * s);
  halo.addColorStop(0, 'rgba(255, 240, 180, 0.6)');
  halo.addColorStop(1, 'rgba(255, 200, 80, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 18 * s, 0, Math.PI * 2);
  ctx.fill();
  // 8 pointed rays
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    const inner = 7 * s;
    const outer = 16 * s;
    const perp = a + Math.PI / 2;
    const width = 1.8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner + Math.cos(perp) * width, Math.sin(a) * inner + Math.sin(perp) * width);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.lineTo(Math.cos(a) * inner - Math.cos(perp) * width, Math.sin(a) * inner - Math.sin(perp) * width);
    ctx.closePath();
    ctx.fill();
  }
  // Central gold disk
  const disk = ctx.createRadialGradient(-2, -2, 1, 0, 0, 7 * s);
  disk.addColorStop(0, '#fffcd0');
  disk.addColorStop(0.5, '#ffd166');
  disk.addColorStop(1, '#c8a058');
  ctx.fillStyle = disk;
  ctx.beginPath();
  ctx.arc(0, 0, 7 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a6018';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Eye of providence — white sclera + dark pupil
  ctx.fillStyle = '#fffcd0';
  ctx.beginPath();
  ctx.ellipse(0, 0, 4 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2818';
  ctx.beginPath();
  ctx.arc(0, 0, 1.8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-0.5, -0.5, 0.6, 0, Math.PI * 2);
  ctx.fill();
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
  age: number = 0,
  deathAnim: number = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Walk wobble (small vertical + rotational sway). Ignored for flying/boss-heavy units.
  const wobbleSpeed = 8 + (type === 'enemyWraith' ? 4 : 0); // wraith floats faster
  const wobbleMag = type === 'enemyBoss' || type === 'enemyIce' ? 0.02 : 0.05;
  const bob = Math.sin(age * wobbleSpeed) * size * wobbleMag;
  ctx.translate(0, bob);
  if (type !== 'enemyPlane' && type !== 'enemyBoss') {
    const sway = Math.sin(age * wobbleSpeed + Math.PI / 2) * 0.03;
    ctx.rotate(sway);
  }

  // Death fade + shrink
  if (deathAnim > 0) {
    const scale = 1 - deathAnim * 0.6;
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, 1 - deathAnim);
  }

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
