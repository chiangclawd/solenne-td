/**
 * Runtime hero entity. Unlike towers, a hero:
 *   - Has HP and can die (then respawn at deploy tile after a timer)
 *   - Auto-attacks the highest-progress enemy in range
 *   - Has per-skill cooldowns controlled from HUD
 *   - Exposes an `activeEffects` snapshot that GameScene reads to apply buffs
 *
 * We deliberately reuse the existing Projectile pipeline for hero attacks so
 * enemy damage resolution, effects, and chain segments remain a single path.
 */

import type { HeroDef } from './Heroes.ts';
import type { Enemy } from './Enemy.ts';
import { Projectile } from './Projectile.ts';
import type { ChainSegment, ImpactEffect } from './Projectile.ts';
import { counterMultiplier } from './ArmorTypes.ts';

export interface HeroSkillState {
  id: string;
  cooldown: number;
  /** Seconds remaining on the active effect produced by this skill. */
  activeRemaining: number;
}

export interface HeroImpactFx {
  kind: 'heroGrenade' | 'heroFlash' | 'heroBuild' | 'heroRally';
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

/**
 * Frontline tier decided at deploy time — rewards placing the hero close to
 * the path at the cost of higher contact-damage exposure.
 */
export type FrontlineTier = 'front' | 'near' | 'rear';

export interface FrontlineBuff {
  /** Human-readable tier label shown in HUD. */
  tier: FrontlineTier;
  label: string;
  /** Aura / skill-radius multiplier (1.0 = no change). */
  radiusMul: number;
  /** Damage / passive-strength multiplier. */
  strengthMul: number;
}

/** Returns the FrontlineBuff for a given chess-board tile distance to path. */
export function frontlineBuffForTileDist(d: number): FrontlineBuff {
  if (d <= 1) return { tier: 'front', label: '前線部署', radiusMul: 1.25, strengthMul: 1.10 };
  if (d <= 2) return { tier: 'near',  label: '前沿支援', radiusMul: 1.12, strengthMul: 1.05 };
  return { tier: 'rear', label: '後方指揮', radiusMul: 1.00, strengthMul: 1.00 };
}

export class Hero {
  readonly def: HeroDef;
  /** World-space deploy anchor (where the hero stands and respawns). */
  readonly x: number;
  readonly y: number;
  readonly tileX: number;
  readonly tileY: number;
  /** Frontline tier, set once at construction based on distance-to-path. */
  readonly frontline: FrontlineBuff;
  hp: number;
  alive: boolean;
  respawnRemaining: number;
  facing: number;
  /** Decaying animation timer for attack recoil (1 → 0). */
  fireAnim: number;
  /** Cooldown before next auto-attack (s). */
  private attackCooldown: number;
  /** Cooldown before next melee swing (s). */
  private meleeCooldown: number;
  /** Animation timer for melee slash (1 → 0). Renderer draws a slash arc. */
  meleeAnim: number;
  /** World-space coord of the last melee target (drives the slash arc endpoint). */
  meleeTargetX: number;
  meleeTargetY: number;
  readonly skills: HeroSkillState[];

  constructor(
    def: HeroDef,
    tileX: number,
    tileY: number,
    tileSize: number,
    frontline: FrontlineBuff = { tier: 'rear', label: '後方指揮', radiusMul: 1, strengthMul: 1 },
  ) {
    this.def = def;
    this.tileX = tileX;
    this.tileY = tileY;
    this.x = tileX * tileSize + tileSize / 2;
    this.y = tileY * tileSize + tileSize / 2;
    this.frontline = frontline;
    this.hp = def.maxHp;
    this.alive = true;
    this.respawnRemaining = 0;
    this.facing = -Math.PI / 2;
    this.fireAnim = 0;
    this.attackCooldown = 0;
    this.meleeCooldown = 0;
    this.meleeAnim = 0;
    this.meleeTargetX = 0;
    this.meleeTargetY = 0;
    this.skills = def.skills.map((s) => ({
      id: s.id,
      cooldown: 0,
      activeRemaining: 0,
    }));
  }

  /** Effective melee reach in world units. Grows with frontline tier. */
  meleeRange(): number {
    // 1 tile ≈ 40px. Rear heroes still need a small touch reach so they can
    // defend themselves; frontline heroes sweep a wider arc.
    return 36 * this.frontline.radiusMul;
  }

  /** Effective passive aura radius (accounting for frontline buff). */
  auraRadius(): number {
    return this.def.passive.auraRadius * this.frontline.radiusMul;
  }

  position(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** True if a skill with the given id is currently active (effect still running). */
  isEffectActive(skillId: string): boolean {
    const s = this.skills.find((x) => x.id === skillId);
    return !!s && s.activeRemaining > 0;
  }

  skillState(skillId: string): HeroSkillState | null {
    return this.skills.find((x) => x.id === skillId) ?? null;
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    // Royal Ward (Kieran's guardian skill): 80% damage reduction while active
    if (this.isEffectActive('guardian')) amount *= 0.2;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.respawnRemaining = this.def.respawnSeconds;
      // Clear pending actives on death so buffs don't linger
      for (const s of this.skills) s.activeRemaining = 0;
    }
  }

  /** Activate a skill if off-cooldown. Returns true on success. */
  activateSkill(
    skillId: string,
    enemies: readonly Enemy[],
    effects: ImpactEffect[],
    fx: HeroImpactFx[],
  ): boolean {
    if (!this.alive) return false;
    const def = this.def.skills.find((s) => s.id === skillId);
    if (!def) return false;
    const st = this.skills.find((s) => s.id === skillId);
    if (!st || st.cooldown > 0) return false;

    st.cooldown = def.cooldown;
    if (def.duration > 0) st.activeRemaining = def.duration;

    // Apply skill's instantaneous side-effects (damage, slow, FX)
    switch (skillId) {
      case 'rally': {
        fx.push({
          kind: 'heroRally', x: this.x, y: this.y,
          radius: this.def.passive.auraRadius || 160,
          life: 0.9, maxLife: 0.9, color: this.def.color,
        });
        break;
      }
      case 'guardian': {
        // Royal Ward — defensive shield burst + visual ring
        fx.push({
          kind: 'heroRally', x: this.x, y: this.y,
          radius: def.radius ?? 100,
          life: 1.0, maxLife: 1.0, color: '#ffd166',
        });
        break;
      }
      case 'grenade': {
        const r = (def.radius ?? 64) * this.frontline.radiusMul;
        effects.push({
          x: this.x, y: this.y, radius: r,
          life: 0.35, maxLife: 0.35, color: '#ffb347',
        });
        fx.push({
          kind: 'heroGrenade', x: this.x, y: this.y, radius: r,
          life: 0.5, maxLife: 0.5, color: '#ff7a2e',
        });
        const r2 = r * r;
        const dmg = this.def.attackDamage * 4 * this.frontline.strengthMul;
        for (const e of enemies) {
          if (!e.alive) continue;
          const p = e.position();
          if ((p.x - this.x) ** 2 + (p.y - this.y) ** 2 <= r2) {
            // HE grenade: armor pierce
            e.takeDamage(dmg, true);
          }
        }
        break;
      }
      case 'piercingShot': {
        // Pure buff — effect read by auto-attack logic via isEffectActive
        fx.push({
          kind: 'heroRally', x: this.x, y: this.y, radius: 30,
          life: 0.6, maxLife: 0.6, color: this.def.accent,
        });
        break;
      }
      case 'flash': {
        const r = (def.radius ?? 96) * this.frontline.radiusMul;
        fx.push({
          kind: 'heroFlash', x: this.x, y: this.y, radius: r,
          life: 0.6, maxLife: 0.6, color: this.def.color,
        });
        const r2 = r * r;
        for (const e of enemies) {
          if (!e.alive) continue;
          const p = e.position();
          if ((p.x - this.x) ** 2 + (p.y - this.y) ** 2 <= r2) {
            e.applySlow(def.duration, 0.15);
          }
        }
        break;
      }
      case 'emergencyBuild': {
        fx.push({
          kind: 'heroBuild', x: this.x, y: this.y,
          radius: (def.radius ?? 120) * this.frontline.radiusMul,
          life: 0.8, maxLife: 0.8, color: this.def.color,
        });
        break;
      }
    }
    return true;
  }

  update(
    dt: number,
    enemies: readonly Enemy[],
    projectiles: Projectile[],
    chainSegments: ChainSegment[],
  ): void {
    // Tick skill cooldowns + active durations always (even dead) — feels fairer
    for (const s of this.skills) {
      if (s.cooldown > 0) s.cooldown = Math.max(0, s.cooldown - dt);
      if (s.activeRemaining > 0) s.activeRemaining = Math.max(0, s.activeRemaining - dt);
    }

    // Animations decay even while dead so a swing finishes cleanly on KO.
    if (this.fireAnim > 0) this.fireAnim = Math.max(0, this.fireAnim - dt * 6);
    if (this.meleeAnim > 0) this.meleeAnim = Math.max(0, this.meleeAnim - dt * 5);

    if (!this.alive) {
      if (this.respawnRemaining > 0) {
        this.respawnRemaining = Math.max(0, this.respawnRemaining - dt);
        if (this.respawnRemaining === 0) {
          this.alive = true;
          this.hp = this.def.maxHp;
        }
      }
      return;
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);

    // Melee swing — scans for the closest enemy inside meleeRange().
    // Priority over ranged so a hero being swarmed always fights back.
    // Damage is a fraction of attackDamage, armor-pierces (close-quarters),
    // and off-cooldown roughly 2.5×/sec.
    if (this.meleeCooldown <= 0) {
      const mr = this.meleeRange();
      const mr2 = mr * mr;
      let melee: Enemy | null = null;
      let bestD2 = Infinity;
      for (const e of enemies) {
        if (!e.alive) continue;
        const p = e.position();
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > mr2) continue;
        if (d2 < bestD2) { bestD2 = d2; melee = e; }
      }
      if (melee) {
        const mp = melee.position();
        this.facing = Math.atan2(mp.y - this.y, mp.x - this.x);
        // Frontline tier amplifies both reach and strength; piercing shot
        // skill stacks too so an activated hero who melees feels punchy.
        let mdmg = this.def.attackDamage * 0.7 * this.frontline.strengthMul;
        if (this.isEffectActive('piercingShot')) mdmg *= 1.4;
        // Counter bonus applies — a sword-wielder still favors armor vs. light
        mdmg *= counterMultiplier(this.def.counters, melee.armorType);
        melee.takeDamage(mdmg, true);
        this.meleeTargetX = mp.x;
        this.meleeTargetY = mp.y;
        this.meleeAnim = 1;
        this.meleeCooldown = 0.4;
      }
    }

    // Acquire target — highest progress in range
    const r2 = this.def.attackRange * this.def.attackRange;
    let target: Enemy | null = null;
    let best = -Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const p = e.position();
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      if (dx * dx + dy * dy > r2) continue;
      if (e.progress > best) {
        best = e.progress;
        target = e;
      }
    }

    if (!target) return;

    const tp = target.position();
    this.facing = Math.atan2(tp.y - this.y, tp.x - this.x);

    if (this.attackCooldown > 0) return;

    let damage = this.def.attackDamage * this.frontline.strengthMul;
    const piercing = this.isEffectActive('piercingShot');
    if (piercing) damage *= 1.8;
    // Vasya's passive: +5% crit damage average → just scale by 1.05
    if (this.def.id === 'vasya' && !piercing) damage *= 1.05;
    // Armor-type counter bonus (+40% vs favored types)
    damage *= counterMultiplier(this.def.counters, target.armorType);

    projectiles.push(new Projectile(
      { x: this.x, y: this.y },
      target,
      {
        damage,
        speed: 380,
        sprite: 'projectileBullet',
        splashRadius: 0,
        slowDuration: 0,
        slowFactor: 1,
        chainCount: 0,
        chainRange: 0,
        armorPierce: piercing,
      },
    ));
    void chainSegments; // not used for hero attacks currently
    this.attackCooldown = 1 / this.def.attackRate;
    this.fireAnim = 1;
  }
}
