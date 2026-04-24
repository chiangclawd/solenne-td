/**
 * Procedural hero sprites + HUD helpers.
 *
 * Paints three distinct commanders in world space (shadow, body, weapon,
 * fire-flash), plus faint passive-aura rings and HP/respawn overlays.
 *
 * Scale assumption: world pixels; heroes are roughly 28 px across so they read
 * clearly on a 40 px tile without blocking path/tower placement visuals.
 */

import type { HeroDef, HeroId } from '../game/Heroes.ts';
import type { Hero } from '../game/Hero.ts';

type Ctx = CanvasRenderingContext2D;

const BODY_RADIUS = 12;

// ---------- Public API ----------

export function drawHero(
  ctx: Ctx,
  hero: Hero,
  elapsed: number,
): void {
  const { x, y } = hero;
  const def = hero.def;

  // Passive aura ring (only if hero has one) — uses effective radius (with frontline buff)
  if (def.passive.auraRadius > 0 && hero.alive) {
    drawAuraRing(ctx, x, y, hero.auraRadius(), def.color, elapsed);
  }

  // Active-effect rings (rally / build zone / etc)
  if (hero.alive) {
    if (hero.isEffectActive('rally')) {
      drawPulseRing(ctx, x, y, def.passive.auraRadius || 160, '#ffd166', elapsed, 2.4);
    }
    if (hero.isEffectActive('emergencyBuild')) {
      const r = def.skills.find((s) => s.id === 'emergencyBuild')?.radius ?? 120;
      drawPulseRing(ctx, x, y, r, '#c878ff', elapsed, 2.0);
    }
    if (hero.isEffectActive('piercingShot')) {
      drawPulseRing(ctx, x, y, 22, '#ffe29a', elapsed, 4.0);
    }
  }

  // Shadow (faded when respawning)
  const alpha = hero.alive ? 1 : 0.25;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + BODY_RADIUS * 0.75, BODY_RADIUS * 0.85, BODY_RADIUS * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body (dimmed if dead)
  if (hero.alive) {
    const wobble = Math.sin(elapsed * 3 + hero.tileX) * 0.6;
    paintHero(ctx, def.id, x, y + wobble, hero.facing, hero.fireAnim, def);
  } else {
    // Ghostly silhouette with respawn countdown
    ctx.globalAlpha = 0.3;
    paintHero(ctx, def.id, x, y, hero.facing, 0, def);
  }
  ctx.restore();

  // HP bar (always shown when in battle, hidden during full hp + respawn)
  if (hero.alive) {
    drawHpBar(ctx, x, y - BODY_RADIUS - 10, BODY_RADIUS * 2.2, hero.hp, def.maxHp, def.color);
  } else {
    drawRespawnTimer(ctx, x, y, hero.respawnRemaining, def.respawnSeconds, def.color);
  }
}

// ---------- Cached icons for HUD ----------

const iconCache = new Map<string, HTMLCanvasElement>();

function getCachedHeroIcon(def: HeroDef, sizeCss: number, dpr: number): HTMLCanvasElement {
  const key = `h:${def.id}:${sizeCss}:${dpr}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const px = Math.ceil(sizeCss * dpr);
  const off = document.createElement('canvas');
  off.width = px;
  off.height = px;
  const c = off.getContext('2d')!;
  c.scale(dpr, dpr);
  const cx = sizeCss / 2;
  const cy = sizeCss / 2;
  // Scale hero body to icon size
  const scale = (sizeCss / (BODY_RADIUS * 3));
  c.save();
  c.translate(cx, cy);
  c.scale(scale, scale);
  paintHero(c, def.id, 0, 0, -Math.PI / 2, 0, def);
  c.restore();
  iconCache.set(key, off);
  return off;
}

export function drawHeroIconScreen(
  ctx: Ctx,
  def: HeroDef,
  cssX: number,
  cssY: number,
  cssSize: number,
): void {
  const dpr = window.devicePixelRatio || 1;
  const icon = getCachedHeroIcon(def, cssSize, dpr);
  ctx.drawImage(icon, cssX * dpr, cssY * dpr, cssSize * dpr, cssSize * dpr);
}

// ---------- Internals ----------

function drawAuraRing(ctx: Ctx, x: number, y: number, r: number, color: string, elapsed: number): void {
  const pulse = 0.05 + Math.sin(elapsed * 2) * 0.04;
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, r * 0.4, x, y, r);
  grad.addColorStop(0, hexWithAlpha(color, 0));
  grad.addColorStop(0.7, hexWithAlpha(color, 0.05 + pulse));
  grad.addColorStop(1, hexWithAlpha(color, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = hexWithAlpha(color, 0.18 + pulse);
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPulseRing(ctx: Ctx, x: number, y: number, r: number, color: string, elapsed: number, speed: number): void {
  const t = (elapsed * speed) % 1;
  const rr = r * (0.5 + t * 0.55);
  const alpha = (1 - t) * 0.6;
  ctx.save();
  ctx.strokeStyle = hexWithAlpha(color, alpha);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHpBar(ctx: Ctx, x: number, y: number, w: number, hp: number, max: number, color: string): void {
  const h = 4;
  const pct = Math.max(0, Math.min(1, hp / max));
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#1e2838';
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = hpColor(pct, color);
  ctx.fillRect(x - w / 2, y, w * pct, h);
  ctx.restore();
}

function drawRespawnTimer(ctx: Ctx, x: number, y: number, remaining: number, max: number, color: string): void {
  const r = BODY_RADIUS + 4;
  const pct = max > 0 ? 1 - remaining / max : 1;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.stroke();
  // Seconds text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.ceil(remaining)}`, x, y);
  ctx.restore();
}

// ---------- Hero-specific art ----------

function paintHero(
  ctx: Ctx,
  id: HeroId,
  x: number,
  y: number,
  facing: number,
  fireAnim: number,
  def: HeroDef,
): void {
  switch (id) {
    case 'kieran': paintKieran(ctx, x, y, facing, fireAnim, def); return;
    case 'vasya': paintVasya(ctx, x, y, facing, fireAnim, def); return;
    case 'pip': paintPip(ctx, x, y, facing, fireAnim, def); return;
  }
}

function paintKieran(ctx: Ctx, x: number, y: number, facing: number, fireAnim: number, def: HeroDef): void {
  ctx.save();
  // Cape (draw behind body)
  ctx.fillStyle = '#1f4466';
  ctx.beginPath();
  ctx.moveTo(x - 9, y - 2);
  ctx.lineTo(x - 13, y + 10);
  ctx.lineTo(x + 13, y + 10);
  ctx.lineTo(x + 9, y - 2);
  ctx.closePath();
  ctx.fill();
  // Cape edge
  ctx.strokeStyle = def.accent;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Armor torso (rounded rect)
  const grad = ctx.createLinearGradient(x, y - 6, x, y + 8);
  grad.addColorStop(0, '#5b8fc2');
  grad.addColorStop(1, '#2c5982');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x - 7, y - 4, 14, 12, 3);
  ctx.fill();
  ctx.strokeStyle = '#0d2438';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Chest emblem (star)
  drawMiniStar(ctx, x, y + 2, 2.2, '#ffd166');

  // Head (helmet)
  ctx.fillStyle = '#6ea0c9';
  ctx.beginPath();
  ctx.arc(x, y - 7, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0d2438';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Plume
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.ellipse(x, y - 12.5, 2.2, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sword (facing-rotated from right shoulder)
  ctx.save();
  ctx.translate(x + 5, y);
  ctx.rotate(facing);
  const swordLen = 12 + fireAnim * 3;
  ctx.strokeStyle = '#dfe6ef';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(swordLen, 0);
  ctx.stroke();
  // Crossguard
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, -2);
  ctx.lineTo(2, 2);
  ctx.stroke();
  ctx.restore();

  // Shield on left
  ctx.fillStyle = '#c9a961';
  ctx.strokeStyle = '#6b4f1a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 2);
  ctx.lineTo(x - 12, y + 5);
  ctx.lineTo(x - 6, y + 5);
  ctx.lineTo(x - 8, y - 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function paintVasya(ctx: Ctx, x: number, y: number, facing: number, fireAnim: number, _def: HeroDef): void {
  ctx.save();
  // Tactical vest
  const grad = ctx.createLinearGradient(x, y - 6, x, y + 8);
  grad.addColorStop(0, '#6d5d42');
  grad.addColorStop(1, '#3d3525');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x - 7, y - 4, 14, 12, 2);
  ctx.fill();
  ctx.strokeStyle = '#1a140a';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Ammo pouches
  ctx.fillStyle = '#8d7a52';
  ctx.fillRect(x - 6, y, 3, 3);
  ctx.fillRect(x + 3, y, 3, 3);

  // Arms (simple)
  ctx.strokeStyle = '#4a3e28';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 2);
  ctx.lineTo(x - 9, y + 3);
  ctx.moveTo(x + 6, y - 2);
  ctx.lineTo(x + 9, y + 3);
  ctx.stroke();

  // Head (tactical cap)
  ctx.fillStyle = '#c7a77b';
  ctx.beginPath();
  ctx.arc(x, y - 7, 4.2, 0, Math.PI * 2);
  ctx.fill();
  // Cap brim
  ctx.fillStyle = '#2e261a';
  ctx.beginPath();
  ctx.roundRect(x - 5, y - 11, 10, 3, 1);
  ctx.fill();
  // Visor glint
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(x - 3, y - 7, 6, 1.5);

  // Rifle (rotated)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  const barLen = 14 + fireAnim * 2;
  // Rifle body
  ctx.fillStyle = '#2a2a33';
  ctx.fillRect(3, -1.2, barLen - 3, 2.4);
  // Stock
  ctx.fillStyle = '#5b3a1f';
  ctx.fillRect(0, -1.8, 4, 3.6);
  // Muzzle flash
  if (fireAnim > 0.3) {
    ctx.fillStyle = `rgba(255,220,100,${fireAnim})`;
    ctx.beginPath();
    ctx.arc(barLen, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();
}

function paintPip(ctx: Ctx, x: number, y: number, facing: number, fireAnim: number, def: HeroDef): void {
  ctx.save();
  // Jumpsuit torso (purple)
  const grad = ctx.createLinearGradient(x, y - 6, x, y + 8);
  grad.addColorStop(0, '#8257b8');
  grad.addColorStop(1, '#4a2a7a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x - 7, y - 4, 14, 12, 3);
  ctx.fill();
  ctx.strokeStyle = '#1a0d2a';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Tool belt
  ctx.fillStyle = '#c28a3a';
  ctx.fillRect(x - 7, y + 3, 14, 2);

  // Pouches on belt
  ctx.fillStyle = '#6b4a1a';
  ctx.fillRect(x - 5, y + 4, 2, 2);
  ctx.fillRect(x - 1, y + 4, 2, 2);
  ctx.fillRect(x + 3, y + 4, 2, 2);

  // Head (goggles)
  ctx.fillStyle = '#d9b2ff';
  ctx.beginPath();
  ctx.arc(x, y - 7, 4.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a0d2a';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Goggles
  ctx.fillStyle = '#1a0d2a';
  ctx.fillRect(x - 4, y - 8, 8, 2);
  ctx.fillStyle = def.accent;
  ctx.fillRect(x - 3.5, y - 7.8, 2.5, 1.6);
  ctx.fillRect(x + 1, y - 7.8, 2.5, 1.6);

  // Energy device (rotated w/ facing)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  // Device body
  ctx.fillStyle = '#2e1c4a';
  ctx.fillRect(3, -3, 8, 6);
  ctx.strokeStyle = def.accent;
  ctx.lineWidth = 1;
  ctx.strokeRect(3, -3, 8, 6);
  // Core glow
  const coreAlpha = 0.6 + fireAnim * 0.4;
  ctx.fillStyle = hexWithAlpha(def.accent, coreAlpha);
  ctx.beginPath();
  ctx.arc(7, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Electric arc when firing
  if (fireAnim > 0.3) {
    ctx.strokeStyle = hexWithAlpha(def.accent, fireAnim);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(14, -2);
    ctx.lineTo(17, 1);
    ctx.lineTo(20, -2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

// ---------- Utility ----------

function drawMiniStar(ctx: Ctx, x: number, y: number, r: number, fill: string): void {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * ((Math.PI * 2) / 5);
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    const a2 = a + Math.PI / 5;
    ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function hexWithAlpha(hex: string, alpha: number): string {
  // Accept #rrggbb, return rgba
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function hpColor(pct: number, fallback: string): string {
  if (pct > 0.6) return '#6ee17a';
  if (pct > 0.3) return '#ffd166';
  if (pct > 0) return '#ff6b6b';
  return fallback;
}
