/**
 * Procedural hero sprites + HUD helpers + skill icon library.
 *
 * Paints three distinct commanders in world space (shadow, body, weapon,
 * fire-flash), plus passive-aura rings, HP/respawn overlays, and a custom
 * procedural skill-icon set that replaces the (OS-variable) emoji icons.
 *
 * Scale assumption: world pixels; heroes are roughly 30 px tall so they read
 * clearly on a 40 px tile. HUD icons scale the same paint up to ~48 px.
 */

import type { HeroDef, HeroId } from '../game/Heroes.ts';
import type { Hero } from '../game/Hero.ts';

type Ctx = CanvasRenderingContext2D;

const BODY_RADIUS = 14;

// ---------- Public API ----------

export function drawHero(
  ctx: Ctx,
  hero: Hero,
  elapsed: number,
): void {
  const { x, y } = hero;
  const def = hero.def;

  // Passive aura ring
  if (def.passive.auraRadius > 0 && hero.alive) {
    drawAuraRing(ctx, x, y, hero.auraRadius(), def.color, elapsed);
  }

  // Active-effect rings
  if (hero.alive) {
    if (hero.isEffectActive('rally')) {
      drawPulseRing(ctx, x, y, def.passive.auraRadius || 160, '#ffd166', elapsed, 2.4);
    }
    if (hero.isEffectActive('guardian')) {
      // Defensive shield shimmer — two bright rings
      const r = def.skills.find((s) => s.id === 'guardian')?.radius ?? 100;
      drawPulseRing(ctx, x, y, r, '#ffd166', elapsed, 1.6);
      drawPulseRing(ctx, x, y, r * 0.6, '#ffe29a', elapsed + 0.3, 1.6);
    }
    if (hero.isEffectActive('emergencyBuild')) {
      const r = def.skills.find((s) => s.id === 'emergencyBuild')?.radius ?? 120;
      drawPulseRing(ctx, x, y, r, '#c878ff', elapsed, 2.0);
    }
    if (hero.isEffectActive('piercingShot')) {
      drawPulseRing(ctx, x, y, 22, '#ffe29a', elapsed, 4.0);
    }
  }

  // Shadow
  const alpha = hero.alive ? 1 : 0.25;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y + BODY_RADIUS * 0.82, BODY_RADIUS * 0.95, BODY_RADIUS * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  if (hero.alive) {
    // Idle breathing bob + cape/plume sway
    const bob = Math.sin(elapsed * 2.4 + hero.tileX) * 0.7;
    paintHero(ctx, def.id, x, y + bob, hero.facing, hero.fireAnim, def, elapsed);
  } else {
    ctx.globalAlpha = 0.3;
    paintHero(ctx, def.id, x, y, hero.facing, 0, def, elapsed);
  }
  ctx.restore();

  if (hero.alive) {
    drawHpBar(ctx, x, y - BODY_RADIUS - 10, BODY_RADIUS * 2.2, hero.hp, def.maxHp, def.color);
  } else {
    drawRespawnTimer(ctx, x, y, hero.respawnRemaining, def.respawnSeconds, def.color);
  }
}

// ---------- Cached hero-body icons (HUD) ----------

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
  // Fit body+head (from y-16 to y+10 range = 26 units) into icon with margin
  const scale = (sizeCss * 0.9) / 30;
  c.save();
  c.translate(cx, cy + sizeCss * 0.04);
  c.scale(scale, scale);
  paintHero(c, def.id, 0, 0, -Math.PI / 2, 0, def, 0);
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

// ---------- Skill icon library (replaces OS emoji) ----------
//
// These icons have time-based animation (flag wave, gear rotation, spark
// flicker) so they are painted LIVE every frame — no caching. Cost is ~0.1ms
// per icon, negligible for the 1-2 icons visible in the HUD.

/**
 * Draw a custom procedural skill icon into a screen-space box of the given
 * CSS size. Replaces OS emoji for consistent cross-platform look + hero-
 * themed colour palettes + subtle idle animation.
 */
export function drawSkillIconScreen(
  ctx: Ctx,
  skillId: string,
  cssX: number,
  cssY: number,
  cssSize: number,
): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.translate(cssX * dpr, cssY * dpr);
  ctx.scale(dpr, dpr);
  paintSkillIcon(ctx, skillId, cssSize);
  ctx.restore();
}

function paintSkillIcon(ctx: Ctx, skillId: string, size: number): void {
  const cx = size / 2;
  const cy = size / 2;
  switch (skillId) {
    case 'rally':           paintIconRally(ctx, cx, cy, size); return;
    case 'guardian':        paintIconGuardian(ctx, cx, cy, size); return;
    case 'grenade':         paintIconGrenade(ctx, cx, cy, size); return;
    case 'piercingShot':    paintIconPiercingShot(ctx, cx, cy, size); return;
    case 'flash':           paintIconFlash(ctx, cx, cy, size); return;
    case 'emergencyBuild':  paintIconEmergencyBuild(ctx, cx, cy, size); return;
    default: {
      // Generic fallback — star
      ctx.fillStyle = '#ffd166';
      drawMiniStar(ctx, cx, cy, size * 0.3, '#ffd166');
    }
  }
}

// ---------- Internals: rings / bars / timers ----------

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
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.ceil(remaining)}`, x, y);
  ctx.restore();
}

// ---------- Hero paint dispatch ----------

function paintHero(
  ctx: Ctx,
  id: HeroId,
  x: number, y: number,
  facing: number, fireAnim: number,
  def: HeroDef,
  elapsed: number,
): void {
  switch (id) {
    case 'kieran': paintKieran(ctx, x, y, facing, fireAnim, def, elapsed); return;
    case 'vasya':  paintVasya(ctx, x, y, facing, fireAnim, def, elapsed); return;
    case 'pip':    paintPip(ctx, x, y, facing, fireAnim, def, elapsed); return;
  }
}

// ---------- Kieran: royal commander ----------

function paintKieran(ctx: Ctx, x: number, y: number, facing: number, fireAnim: number, _def: HeroDef, elapsed: number): void {
  const plumeWave = Math.sin(elapsed * 2.8) * 1.2;
  ctx.save();

  // CAPE — deep indigo, two-tone drape
  {
    ctx.fillStyle = '#1a2f55';
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 3);
    ctx.quadraticCurveTo(x - 14, y + 3, x - 13, y + 11);
    ctx.lineTo(x + 13, y + 11);
    ctx.quadraticCurveTo(x + 14, y + 3, x + 10, y - 3);
    ctx.closePath();
    ctx.fill();
    // inner fold (darker seam)
    ctx.fillStyle = '#0f1f3d';
    ctx.beginPath();
    ctx.moveTo(x, y - 2);
    ctx.quadraticCurveTo(x + 2, y + 5, x + 1, y + 11);
    ctx.lineTo(x - 1, y + 11);
    ctx.quadraticCurveTo(x - 2, y + 5, x, y - 2);
    ctx.closePath();
    ctx.fill();
    // gold edge trim
    ctx.strokeStyle = '#e9b659';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 3);
    ctx.quadraticCurveTo(x - 14, y + 3, x - 13, y + 11);
    ctx.moveTo(x + 10, y - 3);
    ctx.quadraticCurveTo(x + 14, y + 3, x + 13, y + 11);
    ctx.stroke();
  }

  // TORSO — blue plate armor with gold chest band
  {
    const grad = ctx.createLinearGradient(x, y - 6, x, y + 8);
    grad.addColorStop(0, '#6fa5d5');
    grad.addColorStop(0.5, '#3d73a8');
    grad.addColorStop(1, '#244967');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x - 8, y - 5, 16, 13, 3);
    ctx.fill();
    ctx.strokeStyle = '#0b1a2e';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Gold chest band
    ctx.fillStyle = '#d5a33d';
    ctx.fillRect(x - 7, y - 1, 14, 2);
    ctx.fillStyle = '#f4c667';
    ctx.fillRect(x - 7, y - 1, 14, 0.8);
    // Shoulder pauldrons
    ctx.fillStyle = '#4b7ea8';
    ctx.beginPath(); ctx.arc(x - 8, y - 4, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 8, y - 4, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0b1a2e';
    ctx.stroke();
    // Chest star
    drawMiniStar(ctx, x, y + 4, 2.2, '#ffd166');
  }

  // HELMET with cheek guards + nose piece
  {
    ctx.fillStyle = '#6ea0c9';
    ctx.beginPath();
    ctx.arc(x, y - 8, 5, 0, Math.PI * 2);
    ctx.fill();
    // cheek guards
    ctx.fillStyle = '#4a7aa1';
    ctx.beginPath();
    ctx.arc(x - 3.8, y - 7, 2.2, 0, Math.PI * 2);
    ctx.arc(x + 3.8, y - 7, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // helmet outline
    ctx.strokeStyle = '#0b1a2e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y - 8, 5, 0, Math.PI * 2);
    ctx.stroke();
    // gold trim along top
    ctx.strokeStyle = '#e9b659';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y - 8, 5, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
    // nose guard
    ctx.fillStyle = '#5a88b0';
    ctx.fillRect(x - 0.9, y - 8, 1.8, 5);
    // face shadow slit
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x - 3, y - 6.3, 6, 1.2);
  }

  // PLUME — tall red crest with swaying motion
  {
    ctx.save();
    ctx.translate(x, y - 13);
    ctx.rotate(plumeWave * 0.12);
    const grad = ctx.createLinearGradient(0, 0, 0, -7);
    grad.addColorStop(0, '#cc3d3d');
    grad.addColorStop(1, '#ff8a8a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.quadraticCurveTo(-3, -5, -1, -8);
    ctx.quadraticCurveTo(1, -10, 2, -7);
    ctx.quadraticCurveTo(3, -3, 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7a1a1a';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
  }

  // SWORD — rotated with facing
  {
    ctx.save();
    ctx.translate(x + 6, y - 1);
    ctx.rotate(facing);
    const swordLen = 13 + fireAnim * 3;
    // Blade
    const bladeGrad = ctx.createLinearGradient(0, -1.2, 0, 1.2);
    bladeGrad.addColorStop(0, '#f0f4f9');
    bladeGrad.addColorStop(0.5, '#c7d2e0');
    bladeGrad.addColorStop(1, '#8c98a8');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(2, -1.3);
    ctx.lineTo(swordLen - 1, -0.4);
    ctx.lineTo(swordLen, 0);
    ctx.lineTo(swordLen - 1, 0.4);
    ctx.lineTo(2, 1.3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3a4658';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // Gold crossguard
    ctx.fillStyle = '#e9b659';
    ctx.fillRect(1, -2.2, 2.2, 4.4);
    ctx.strokeStyle = '#7a5a16';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(1, -2.2, 2.2, 4.4);
    // Pommel
    ctx.fillStyle = '#e9b659';
    ctx.beginPath(); ctx.arc(0, 0, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a5a16';
    ctx.stroke();
    ctx.restore();
  }

  // SHIELD — round tower shield with emblem on left arm
  {
    ctx.fillStyle = '#c9a961';
    ctx.strokeStyle = '#7a5a16';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x - 10, y + 1, 3.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // inner ring
    ctx.strokeStyle = '#a07d2d';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(x - 10, y + 1, 2.2, 3.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    // central boss
    ctx.fillStyle = '#3d73a8';
    ctx.beginPath(); ctx.arc(x - 10, y + 1, 1, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}

// ---------- Vasya: tactical sergeant ----------

function paintVasya(ctx: Ctx, x: number, y: number, facing: number, fireAnim: number, _def: HeroDef, elapsed: number): void {
  const breath = Math.sin(elapsed * 2.4) * 0.3;
  ctx.save();

  // BODY PANTS (background legs)
  ctx.fillStyle = '#2e2818';
  ctx.fillRect(x - 5, y + 6, 10, 6);
  // Boots
  ctx.fillStyle = '#1a140a';
  ctx.fillRect(x - 5, y + 10, 4, 2);
  ctx.fillRect(x + 1, y + 10, 4, 2);

  // VEST — olive/khaki with molle straps
  {
    const grad = ctx.createLinearGradient(x, y - 6, x, y + 8);
    grad.addColorStop(0, '#7d6c4a');
    grad.addColorStop(1, '#3e351e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x - 8, y - 4, 16, 13, 2);
    ctx.fill();
    ctx.strokeStyle = '#1a140a';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Molle vertical strap
    ctx.strokeStyle = '#5a4f33';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 8);
    ctx.stroke();
    // ammo pouches (3 across)
    ctx.fillStyle = '#a2885a';
    ctx.fillRect(x - 6, y + 1, 3, 3);
    ctx.fillRect(x - 1.5, y + 1, 3, 3);
    ctx.fillRect(x + 3, y + 1, 3, 3);
    ctx.strokeStyle = '#2e261a';
    ctx.strokeRect(x - 6, y + 1, 3, 3);
    ctx.strokeRect(x - 1.5, y + 1, 3, 3);
    ctx.strokeRect(x + 3, y + 1, 3, 3);
  }

  // PAULDRONS (grey)
  ctx.fillStyle = '#4a4538';
  ctx.beginPath(); ctx.arc(x - 8, y - 3, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 8, y - 3, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a140a'; ctx.lineWidth = 0.5;
  ctx.stroke();

  // COMBAT HELMET with visor
  {
    ctx.fillStyle = '#45402f';
    ctx.beginPath();
    ctx.arc(x, y - 8 + breath, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a140a';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Tan strap under chin
    ctx.fillStyle = '#7d6c4a';
    ctx.fillRect(x - 4, y - 5 + breath, 8, 1.5);
    // Dark visor shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 4, y - 9 + breath, 8, 2);
    // Visor glint (yellow amber tint)
    ctx.fillStyle = '#ffcc66';
    ctx.fillRect(x - 3.5, y - 8.5 + breath, 3, 1.2);
    ctx.fillStyle = '#ffe29a';
    ctx.fillRect(x + 0.5, y - 8.5 + breath, 3, 1.2);
    // small rivets
    ctx.fillStyle = '#2a2218';
    ctx.fillRect(x - 4.5, y - 10.5 + breath, 1, 1);
    ctx.fillRect(x + 3.5, y - 10.5 + breath, 1, 1);
  }

  // KNIFE on thigh (decorative)
  ctx.fillStyle = '#666';
  ctx.fillRect(x - 4, y + 7, 1.2, 3);
  ctx.fillStyle = '#2a1e10';
  ctx.fillRect(x - 4.5, y + 6.5, 2, 1);

  // RIFLE — with scope, stock, magazine
  {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(facing);
    const barLen = 15 + fireAnim * 2;
    // Main rifle body
    ctx.fillStyle = '#24232a';
    ctx.fillRect(3, -1.4, barLen - 3, 2.8);
    // Upper rail with scope
    ctx.fillStyle = '#3d3c48';
    ctx.fillRect(4, -2.3, 4, 1);
    ctx.fillStyle = '#1a1a22';
    ctx.beginPath(); ctx.arc(5.5, -2.8, 1.1, 0, Math.PI * 2); ctx.fill();
    // Magazine (below)
    ctx.fillStyle = '#24232a';
    ctx.fillRect(5, 1.4, 2.4, 3);
    ctx.fillStyle = '#0d0d12';
    ctx.fillRect(5.3, 1.4, 1.8, 3);
    // Stock (wooden)
    const stockGrad = ctx.createLinearGradient(0, -1.8, 0, 1.8);
    stockGrad.addColorStop(0, '#7d5227');
    stockGrad.addColorStop(1, '#3d2814');
    ctx.fillStyle = stockGrad;
    ctx.fillRect(-1, -2, 4, 4);
    ctx.strokeStyle = '#1f1407';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-1, -2, 4, 4);
    // Muzzle
    ctx.fillStyle = '#0d0d12';
    ctx.fillRect(barLen - 1, -1.1, 1, 2.2);
    // Muzzle flash
    if (fireAnim > 0.3) {
      const flashGrad = ctx.createRadialGradient(barLen + 1, 0, 0, barLen + 1, 0, 4.5);
      flashGrad.addColorStop(0, `rgba(255,255,200,${fireAnim})`);
      flashGrad.addColorStop(0.5, `rgba(255,180,60,${fireAnim * 0.8})`);
      flashGrad.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = flashGrad;
      ctx.beginPath(); ctx.arc(barLen + 1, 0, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

// ---------- Pip: arcane engineer ----------

function paintPip(ctx: Ctx, x: number, y: number, facing: number, fireAnim: number, def: HeroDef, elapsed: number): void {
  const corePulse = 0.7 + Math.sin(elapsed * 5) * 0.3;
  const goggleFlicker = 0.8 + Math.sin(elapsed * 11) * 0.2;
  ctx.save();

  // BACKPACK sticking up behind shoulder
  {
    ctx.fillStyle = '#2a1840';
    ctx.fillRect(x - 3, y - 9, 6, 5);
    ctx.strokeStyle = '#0d0520';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(x - 3, y - 9, 6, 5);
    // antenna
    ctx.strokeStyle = '#c0a0ff';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 9);
    ctx.lineTo(x + 3, y - 13);
    ctx.stroke();
    // antenna tip glow
    ctx.fillStyle = hexWithAlpha(def.accent, corePulse);
    ctx.beginPath(); ctx.arc(x + 3, y - 13, 0.8, 0, Math.PI * 2); ctx.fill();
  }

  // VEST / jumpsuit
  {
    const grad = ctx.createLinearGradient(x, y - 6, x, y + 8);
    grad.addColorStop(0, '#8c5ec9');
    grad.addColorStop(1, '#3e2069');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x - 8, y - 4, 16, 13, 3);
    ctx.fill();
    ctx.strokeStyle = '#150a2e';
    ctx.lineWidth = 1;
    ctx.stroke();
    // zipper
    ctx.strokeStyle = '#e0c8ff';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3);
    ctx.stroke();
    // Chest indicator gem (corePulse)
    ctx.fillStyle = hexWithAlpha(def.accent, corePulse);
    ctx.beginPath(); ctx.arc(x, y - 1, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.3;
    ctx.stroke();
  }

  // TOOL BELT with loops
  ctx.fillStyle = '#c28a3a';
  ctx.fillRect(x - 8, y + 4, 16, 2);
  ctx.fillStyle = '#8a5f20';
  ctx.fillRect(x - 8, y + 5.3, 16, 0.7);
  // Tool loops / pouches
  ctx.fillStyle = '#5e3d16';
  ctx.fillRect(x - 6, y + 6, 2, 2.5);
  ctx.fillRect(x - 1, y + 6, 2, 2.5);
  ctx.fillRect(x + 4, y + 6, 2, 2.5);
  // Hanging wrench on belt (left)
  ctx.fillStyle = '#7a7a8a';
  ctx.fillRect(x - 3.5, y + 5.5, 0.8, 3);
  ctx.beginPath(); ctx.arc(x - 3.1, y + 5.4, 0.9, 0, Math.PI * 2); ctx.fill();

  // HEAD
  {
    ctx.fillStyle = '#e2beff';
    ctx.beginPath();
    ctx.arc(x, y - 8, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#150a2e';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Hair tuft on top
    ctx.fillStyle = '#6b4298';
    ctx.beginPath();
    ctx.ellipse(x, y - 12, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // GOGGLES — wide with glowing lenses
  {
    // Strap
    ctx.fillStyle = '#2a1840';
    ctx.fillRect(x - 5, y - 9, 10, 2.2);
    // Frames
    ctx.fillStyle = '#3a2055';
    ctx.beginPath(); ctx.arc(x - 2.4, y - 8.2, 1.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2.4, y - 8.2, 1.9, 0, Math.PI * 2); ctx.fill();
    // Glowing lenses
    const lensColor = hexWithAlpha(def.accent, goggleFlicker);
    ctx.fillStyle = lensColor;
    ctx.beginPath(); ctx.arc(x - 2.4, y - 8.2, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2.4, y - 8.2, 1.4, 0, Math.PI * 2); ctx.fill();
    // Inner glint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x - 2.9, y - 8.7, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 1.9, y - 8.7, 0.5, 0, Math.PI * 2); ctx.fill();
  }

  // ENERGY STAFF — rotated with facing
  {
    ctx.save();
    ctx.translate(x, y - 1);
    ctx.rotate(facing);
    // Shaft
    ctx.fillStyle = '#4a3066';
    ctx.fillRect(2, -0.8, 11, 1.6);
    ctx.strokeStyle = '#150a2e';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(2, -0.8, 11, 1.6);
    // Binding wraps
    ctx.fillStyle = '#e9b659';
    ctx.fillRect(5, -1, 0.8, 2);
    ctx.fillRect(8, -1, 0.8, 2);
    // Crystal head
    const crystalGrad = ctx.createRadialGradient(14, 0, 0, 14, 0, 4);
    crystalGrad.addColorStop(0, hexWithAlpha(def.accent, 1));
    crystalGrad.addColorStop(0.5, def.color);
    crystalGrad.addColorStop(1, '#3a1860');
    ctx.fillStyle = crystalGrad;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(14.5, -2.8);
    ctx.lineTo(17, 0);
    ctx.lineTo(14.5, 2.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#150a2e';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // Crystal glow
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = hexWithAlpha(def.accent, corePulse * 0.4);
    ctx.beginPath(); ctx.arc(14.5, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // Firing arcs
    if (fireAnim > 0.2) {
      ctx.strokeStyle = hexWithAlpha(def.accent, fireAnim);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(17, 0);
      ctx.lineTo(19, -2.5);
      ctx.lineTo(22, 1);
      ctx.lineTo(25, -1.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

// ---------- Skill icon paints ----------

function paintIconRally(ctx: Ctx, cx: number, cy: number, size: number): void {
  const s = size / 48;
  const poleX = cx - 10 * s;
  const flagWave = Math.sin(Date.now() * 0.004) * 1.2; // slow flutter
  ctx.save();
  // Background plate (soft blue gradient for theme)
  ctx.fillStyle = 'rgba(110,200,255,0.08)';
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2); ctx.fill();

  // Pole
  const poleGrad = ctx.createLinearGradient(poleX, 0, poleX + 2 * s, 0);
  poleGrad.addColorStop(0, '#8897a8');
  poleGrad.addColorStop(0.5, '#c0cbd8');
  poleGrad.addColorStop(1, '#6c7a8c');
  ctx.fillStyle = poleGrad;
  ctx.fillRect(poleX, cy - 16 * s, 2 * s, 32 * s);
  // Pole top finial (gold)
  ctx.fillStyle = '#e9b659';
  ctx.beginPath(); ctx.arc(poleX + 1 * s, cy - 17 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f4c667';
  ctx.beginPath(); ctx.arc(poleX + 0.6 * s, cy - 17.4 * s, 0.7 * s, 0, Math.PI * 2); ctx.fill();

  // Flag — blue triangular pennant with two-tone drape
  const fx = poleX + 2 * s;
  const fy = cy - 14 * s;
  const fwEnd = flagWave * s;
  ctx.fillStyle = '#3d73a8';
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx + 18 * s + fwEnd, fy + 6 * s + fwEnd * 0.5);
  ctx.lineTo(fx, fy + 12 * s);
  ctx.closePath();
  ctx.fill();
  // Flag gradient highlight
  ctx.fillStyle = 'rgba(110,200,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx + 16 * s + fwEnd, fy + 5 * s + fwEnd * 0.5);
  ctx.lineTo(fx, fy + 6 * s);
  ctx.closePath();
  ctx.fill();
  // Flag outline
  ctx.strokeStyle = '#0b1a2e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx + 18 * s + fwEnd, fy + 6 * s + fwEnd * 0.5);
  ctx.lineTo(fx, fy + 12 * s);
  ctx.closePath();
  ctx.stroke();
  // Gold star emblem on flag
  drawMiniStar(ctx, fx + 6 * s, fy + 6 * s, 2.5 * s, '#ffd166');
  ctx.restore();
}

function paintIconGuardian(ctx: Ctx, cx: number, cy: number, size: number): void {
  const s = size / 48;
  const glow = 0.6 + Math.sin(Date.now() * 0.005) * 0.3;
  ctx.save();
  // Background wash
  ctx.fillStyle = 'rgba(110,200,255,0.1)';
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2); ctx.fill();

  // Outer glow (light blue halo)
  ctx.globalCompositeOperation = 'lighter';
  const haloGrad = ctx.createRadialGradient(cx, cy, 2 * s, cx, cy, 17 * s);
  haloGrad.addColorStop(0, `rgba(110,200,255,${glow * 0.5})`);
  haloGrad.addColorStop(1, 'rgba(110,200,255,0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath(); ctx.arc(cx, cy, 17 * s, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Shield body (heater shape)
  const shieldGrad = ctx.createLinearGradient(cx, cy - 15 * s, cx, cy + 15 * s);
  shieldGrad.addColorStop(0, '#6fa5d5');
  shieldGrad.addColorStop(0.5, '#3d73a8');
  shieldGrad.addColorStop(1, '#1a3d6b');
  ctx.fillStyle = shieldGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 11 * s, cy - 12 * s);
  ctx.lineTo(cx + 11 * s, cy - 12 * s);
  ctx.lineTo(cx + 11 * s, cy + 2 * s);
  ctx.quadraticCurveTo(cx + 11 * s, cy + 12 * s, cx, cy + 14 * s);
  ctx.quadraticCurveTo(cx - 11 * s, cy + 12 * s, cx - 11 * s, cy + 2 * s);
  ctx.closePath();
  ctx.fill();
  // Gold rim
  ctx.strokeStyle = '#e9b659';
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();
  // Inner darker rim
  ctx.strokeStyle = '#0b1a2e';
  ctx.lineWidth = 0.5 * s;
  ctx.stroke();

  // Shield highlight on upper-left
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(cx - 9 * s, cy - 10 * s);
  ctx.lineTo(cx - 1 * s, cy - 10 * s);
  ctx.lineTo(cx - 5 * s, cy);
  ctx.lineTo(cx - 9 * s, cy - 4 * s);
  ctx.closePath();
  ctx.fill();

  // Central cross / emblem (gold)
  ctx.fillStyle = '#f4c667';
  ctx.fillRect(cx - 1.2 * s, cy - 6 * s, 2.4 * s, 11 * s);
  ctx.fillRect(cx - 5 * s, cy - 1.5 * s, 10 * s, 2.4 * s);
  // Cross outline
  ctx.strokeStyle = '#7a5a16';
  ctx.lineWidth = 0.5 * s;
  ctx.strokeRect(cx - 1.2 * s, cy - 6 * s, 2.4 * s, 11 * s);
  ctx.strokeRect(cx - 5 * s, cy - 1.5 * s, 10 * s, 2.4 * s);
  // Center boss
  ctx.fillStyle = '#e9b659';
  ctx.beginPath(); ctx.arc(cx, cy - 0.3 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function paintIconGrenade(ctx: Ctx, cx: number, cy: number, size: number): void {
  const s = size / 48;
  const sparkFlicker = 0.7 + Math.sin(Date.now() * 0.02) * 0.3;
  ctx.save();
  // Background
  ctx.fillStyle = 'rgba(255,150,80,0.1)';
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2); ctx.fill();

  // Grenade body — olive sphere
  const gradBody = ctx.createRadialGradient(cx - 3 * s, cy - 2 * s, 2 * s, cx, cy + 2 * s, 12 * s);
  gradBody.addColorStop(0, '#6d7a4f');
  gradBody.addColorStop(1, '#2a321a');
  ctx.fillStyle = gradBody;
  ctx.beginPath();
  ctx.arc(cx, cy + 2 * s, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#181d0c';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Pineapple ridges (horizontal grooves)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.8;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2 * s + i * 3 * s, 10.5 * s, 1.2 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Vertical grooves
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(cx + i * 3 * s, cy + 2 * s, 1.2 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Top fuse cap (metal)
  ctx.fillStyle = '#6c7a8c';
  ctx.fillRect(cx - 3 * s, cy - 10 * s, 6 * s, 2.5 * s);
  ctx.strokeStyle = '#3a4658';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(cx - 3 * s, cy - 10 * s, 6 * s, 2.5 * s);
  // Pin ring (yellow)
  ctx.strokeStyle = '#e9b659';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.arc(cx + 5.5 * s, cy - 9 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.stroke();

  // Spark / flame on top (animated flicker)
  ctx.globalCompositeOperation = 'lighter';
  const sparkGrad = ctx.createRadialGradient(cx, cy - 13 * s, 0, cx, cy - 13 * s, 5 * s);
  sparkGrad.addColorStop(0, `rgba(255,240,180,${sparkFlicker})`);
  sparkGrad.addColorStop(0.5, `rgba(255,170,60,${sparkFlicker * 0.6})`);
  sparkGrad.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = sparkGrad;
  ctx.beginPath(); ctx.arc(cx, cy - 13 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
  // Central spark
  ctx.fillStyle = `rgba(255,255,220,${sparkFlicker})`;
  ctx.beginPath(); ctx.arc(cx, cy - 13 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function paintIconPiercingShot(ctx: Ctx, cx: number, cy: number, size: number): void {
  const s = size / 48;
  ctx.save();
  // Background
  ctx.fillStyle = 'rgba(255,209,102,0.1)';
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2); ctx.fill();

  // Outer ring
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2 * s;
  ctx.beginPath(); ctx.arc(cx, cy, 13 * s, 0, Math.PI * 2); ctx.stroke();
  // Mid ring
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = '#f4c667';
  ctx.beginPath(); ctx.arc(cx, cy, 8.5 * s, 0, Math.PI * 2); ctx.stroke();
  // Inner ring
  ctx.strokeStyle = '#ff8a8a';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath(); ctx.arc(cx, cy, 4 * s, 0, Math.PI * 2); ctx.stroke();

  // Crosshair lines (interrupted near center for readability)
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 16 * s, cy); ctx.lineTo(cx - 5.5 * s, cy);
  ctx.moveTo(cx + 5.5 * s, cy); ctx.lineTo(cx + 16 * s, cy);
  ctx.moveTo(cx, cy - 16 * s); ctx.lineTo(cx, cy - 5.5 * s);
  ctx.moveTo(cx, cy + 5.5 * s); ctx.lineTo(cx, cy + 16 * s);
  ctx.stroke();

  // Arrow/bullet piercing — diagonal through
  const pulse = (Date.now() % 1500) / 1500;
  const bulletProgress = pulse * 24 * s - 12 * s;
  ctx.save();
  ctx.translate(cx + bulletProgress * 0.707, cy - bulletProgress * 0.707);
  ctx.rotate(-Math.PI / 4);
  const bullGrad = ctx.createLinearGradient(-4 * s, 0, 4 * s, 0);
  bullGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
  bullGrad.addColorStop(0.5, '#ffd166');
  bullGrad.addColorStop(1, '#fff6cc');
  ctx.fillStyle = bullGrad;
  ctx.beginPath();
  ctx.moveTo(-4 * s, -0.9 * s);
  ctx.lineTo(3 * s, -0.9 * s);
  ctx.lineTo(4 * s, 0);
  ctx.lineTo(3 * s, 0.9 * s);
  ctx.lineTo(-4 * s, 0.9 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Center dot
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath(); ctx.arc(cx, cy, 1.4 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function paintIconFlash(ctx: Ctx, cx: number, cy: number, size: number): void {
  const s = size / 48;
  const glow = 0.7 + Math.sin(Date.now() * 0.006) * 0.3;
  ctx.save();
  // Background
  ctx.fillStyle = 'rgba(200,120,255,0.1)';
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2); ctx.fill();

  // Outer glow
  ctx.globalCompositeOperation = 'lighter';
  const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18 * s);
  outerGlow.addColorStop(0, `rgba(200,120,255,${glow * 0.5})`);
  outerGlow.addColorStop(1, 'rgba(200,120,255,0)');
  ctx.fillStyle = outerGlow;
  ctx.beginPath(); ctx.arc(cx, cy, 18 * s, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Diamond crystal (purple)
  const diamondGrad = ctx.createLinearGradient(cx, cy - 13 * s, cx, cy + 13 * s);
  diamondGrad.addColorStop(0, '#e2beff');
  diamondGrad.addColorStop(0.5, '#c878ff');
  diamondGrad.addColorStop(1, '#5a2a92');
  ctx.fillStyle = diamondGrad;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 14 * s);
  ctx.lineTo(cx + 9 * s, cy);
  ctx.lineTo(cx, cy + 14 * s);
  ctx.lineTo(cx - 9 * s, cy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a1540';
  ctx.lineWidth = 1 * s;
  ctx.stroke();
  // Inner facet highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 11 * s);
  ctx.lineTo(cx + 4 * s, cy - 2 * s);
  ctx.lineTo(cx, cy + 2 * s);
  ctx.lineTo(cx - 4 * s, cy - 2 * s);
  ctx.closePath();
  ctx.fill();

  // Lightning bolt inside
  ctx.fillStyle = '#fff6cc';
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 0.5 * s;
  ctx.beginPath();
  ctx.moveTo(cx + 1 * s, cy - 7 * s);
  ctx.lineTo(cx - 2.5 * s, cy + 0.5 * s);
  ctx.lineTo(cx - 0.5 * s, cy + 0.5 * s);
  ctx.lineTo(cx - 2 * s, cy + 6 * s);
  ctx.lineTo(cx + 2.5 * s, cy - 0.5 * s);
  ctx.lineTo(cx + 0.5 * s, cy - 0.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Corner sparks
  const sparkPos = [
    [cx, cy - 16 * s], [cx + 12 * s, cy], [cx, cy + 16 * s], [cx - 12 * s, cy],
  ];
  ctx.globalCompositeOperation = 'lighter';
  for (const [px, py] of sparkPos) {
    const sg = ctx.createRadialGradient(px, py, 0, px, py, 2 * s);
    sg.addColorStop(0, `rgba(255,230,255,${glow})`);
    sg.addColorStop(1, 'rgba(200,120,255,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(px, py, 2 * s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function paintIconEmergencyBuild(ctx: Ctx, cx: number, cy: number, size: number): void {
  const s = size / 48;
  const rot = (Date.now() * 0.0008) % (Math.PI * 2);
  ctx.save();
  // Background
  ctx.fillStyle = 'rgba(200,120,255,0.08)';
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2); ctx.fill();

  // Background glow
  ctx.globalCompositeOperation = 'lighter';
  const gloW = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16 * s);
  gloW.addColorStop(0, 'rgba(200,120,255,0.3)');
  gloW.addColorStop(1, 'rgba(200,120,255,0)');
  ctx.fillStyle = gloW;
  ctx.beginPath(); ctx.arc(cx, cy, 16 * s, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Gear (back) — slowly rotates
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  const gearGrad = ctx.createRadialGradient(0, 0, 2 * s, 0, 0, 11 * s);
  gearGrad.addColorStop(0, '#bac3d0');
  gearGrad.addColorStop(1, '#5a6578');
  ctx.fillStyle = gearGrad;
  ctx.beginPath();
  const teeth = 10;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const a2 = ((i + 0.5) / teeth) * Math.PI * 2;
    const rOut = 11 * s;
    const rIn = 8 * s;
    ctx.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
    ctx.lineTo(Math.cos(a + Math.PI / teeth / 2) * rOut, Math.sin(a + Math.PI / teeth / 2) * rOut);
    ctx.lineTo(Math.cos(a2) * rIn, Math.sin(a2) * rIn);
    ctx.lineTo(Math.cos(a2 + Math.PI / teeth / 2) * rIn, Math.sin(a2 + Math.PI / teeth / 2) * rIn);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3a4658';
  ctx.lineWidth = 0.6;
  ctx.stroke();
  // Inner hole
  ctx.fillStyle = '#2a3244';
  ctx.beginPath(); ctx.arc(0, 0, 3 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Wrench (front) — diagonal
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 4);
  const wrenchGrad = ctx.createLinearGradient(-10 * s, 0, 10 * s, 0);
  wrenchGrad.addColorStop(0, '#e9b659');
  wrenchGrad.addColorStop(0.5, '#f4c667');
  wrenchGrad.addColorStop(1, '#a07d2d');
  ctx.fillStyle = wrenchGrad;
  // Handle
  ctx.fillRect(-2 * s, -10 * s, 4 * s, 14 * s);
  // Top jaw
  ctx.beginPath();
  ctx.moveTo(-5 * s, -14 * s);
  ctx.lineTo(5 * s, -14 * s);
  ctx.lineTo(5 * s, -8 * s);
  ctx.lineTo(2 * s, -10 * s);
  ctx.lineTo(-2 * s, -10 * s);
  ctx.lineTo(-5 * s, -8 * s);
  ctx.closePath();
  ctx.fill();
  // Bottom jaw
  ctx.beginPath();
  ctx.moveTo(-5 * s, 10 * s);
  ctx.lineTo(-2 * s, 8 * s);
  ctx.lineTo(2 * s, 8 * s);
  ctx.lineTo(5 * s, 10 * s);
  ctx.lineTo(5 * s, 14 * s);
  ctx.lineTo(-5 * s, 14 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6b4f1a';
  ctx.lineWidth = 0.7 * s;
  ctx.stroke();
  // Bolt
  ctx.fillStyle = '#6b4f1a';
  ctx.beginPath(); ctx.arc(0, 0, 1.8 * s, 0, Math.PI * 2); ctx.fill();
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
