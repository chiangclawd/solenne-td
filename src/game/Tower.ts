import type { Enemy } from './Enemy.ts';
import { Projectile } from './Projectile.ts';
import type { ChainSegment } from './Projectile.ts';
import type { AssetName } from '../assets.ts';
import type { ArmorType } from './ArmorTypes.ts';
import { counterMultiplier } from './ArmorTypes.ts';

/**
 * Per-tier tower stats. Anything that affects firing behavior lives here
 * so that branches can diverge (e.g. AOE splash vs. armor-pierce).
 */
export interface TowerLevel {
  cost: number;
  range: number;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  splashRadius?: number;
  slowDuration?: number;
  slowFactor?: number;
  chainCount?: number;
  chainRange?: number;
  /** AP rounds — bypass enemy damageResist entirely. */
  armorPierce?: boolean;
  /** Multiplier on top of base counter bonus (default implicit 1.4). */
  counterBonus?: number;
  /**
   * Projectiles fired per trigger. Each spawns with a small angle offset.
   * Good for "double-tap" (quickShot 雙管) or "shotgun" (machineGun 散彈).
   */
  multiShot?: number;
}

export type BranchId = 'A' | 'B';

export interface TowerBranch {
  id: BranchId;
  name: string;
  description: string;
  /** Accent colour for UI tint + turret visual distinction. */
  color: string;
  /** Exactly 3 entries — Lv3, Lv4, Lv5 on this branch. */
  levels: readonly [TowerLevel, TowerLevel, TowerLevel];
}

export interface TowerConfig {
  id: string;
  name: string;
  description?: string;
  turretSprite: AssetName;
  projectileSprite: AssetName;
  counters?: readonly ArmorType[];
  /** Always 2 entries — Lv1, Lv2 (shared before the branch choice). */
  baseLevels: readonly [TowerLevel, TowerLevel];
  branches: { A: TowerBranch; B: TowerBranch };
}

export interface TowerBuffs {
  damageMul: number;
  rangeMul: number;
  fireRateMul: number;
}

/**
 * Runtime tower instance. The `level` field is 0-based:
 *   0 = Lv1 (baseLevels[0])
 *   1 = Lv2 (baseLevels[1])
 *   2 = Lv3 (branches[branch].levels[0])
 *   3 = Lv4 (branches[branch].levels[1])
 *   4 = Lv5 (branches[branch].levels[2])
 * `branch` is null until the player commits the Lv2 → Lv3 upgrade.
 */
export class Tower {
  readonly tileX: number;
  readonly tileY: number;
  readonly x: number;
  readonly y: number;
  readonly config: TowerConfig;
  level: number;
  branch: BranchId | null;
  totalInvested: number;
  turretRotation: number;
  fireAnim: number;
  buildAnim: number;
  private cooldown: number;
  private idleScanPhase: number;

  constructor(tileX: number, tileY: number, tileSize: number, config: TowerConfig) {
    this.tileX = tileX;
    this.tileY = tileY;
    this.x = tileX * tileSize + tileSize / 2;
    this.y = tileY * tileSize + tileSize / 2;
    this.config = config;
    this.level = 0;
    this.branch = null;
    this.totalInvested = config.baseLevels[0].cost;
    this.cooldown = 0;
    this.turretRotation = Math.random() * Math.PI * 2;
    this.fireAnim = 0;
    this.buildAnim = 1;
    this.idleScanPhase = Math.random() * Math.PI * 2;
  }

  currentLevel(): TowerLevel {
    if (this.level <= 1) return this.config.baseLevels[this.level];
    if (!this.branch) {
      // Shouldn't happen: level >= 2 without a branch means a logic error.
      return this.config.baseLevels[1];
    }
    return this.config.branches[this.branch].levels[this.level - 2];
  }

  canUpgrade(): boolean {
    // Can upgrade if below Lv5 (level index 4).
    return this.level < 4;
  }

  /**
   * True iff the next upgrade requires the player to CHOOSE a branch
   * (Lv2 → Lv3). Used by the UI to draw two buttons instead of one.
   */
  isAtBranchPoint(): boolean {
    return this.level === 1;
  }

  /**
   * Cost of continuing on the current branch. For the branch-point
   * (Lv2→Lv3), returns A's cost since both branches share cost by design;
   * pass the chosen branch to `upgradeToBranch` for actual commit.
   */
  nextUpgradeCost(branch?: BranchId): number {
    if (!this.canUpgrade()) return 0;
    if (this.level === 1) {
      const b = branch ?? 'A';
      return this.config.branches[b].levels[0].cost;
    }
    // On a branch already — must continue with current branch.
    if (!this.branch) return 0;
    return this.config.branches[this.branch].levels[this.level - 1].cost;
  }

  /**
   * Base upgrade — used for Lv1→Lv2. For Lv2→Lv3 the UI calls
   * `upgradeToBranch('A' | 'B')`.
   */
  upgrade(): void {
    if (!this.canUpgrade()) return;
    if (this.level === 1) return; // branch required at branch point
    if (this.level === 0) {
      this.level = 1;
      this.totalInvested += this.config.baseLevels[1].cost;
    } else {
      // Continue on current branch
      if (!this.branch) return;
      this.level++;
      this.totalInvested += this.config.branches[this.branch].levels[this.level - 2].cost;
    }
    this.buildAnim = 1;
  }

  /** Lv2 → Lv3 branch selection. */
  upgradeToBranch(branch: BranchId): void {
    if (this.level !== 1) return;
    this.branch = branch;
    this.level = 2;
    this.totalInvested += this.config.branches[branch].levels[0].cost;
    this.buildAnim = 1;
  }

  sellValue(bonus = 0): number {
    return Math.floor(this.totalInvested * (0.5 + bonus));
  }

  /** Visible range (used by GameScene for rendering range circles). */
  effectiveRange(rangeMul: number = 1): number {
    return this.currentLevel().range * rangeMul;
  }

  update(
    dt: number,
    enemies: readonly Enemy[],
    projectiles: Projectile[],
    chainSegments: ChainSegment[],
    buffs: TowerBuffs = { damageMul: 1, rangeMul: 1, fireRateMul: 1 },
  ): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.fireAnim > 0) this.fireAnim = Math.max(0, this.fireAnim - dt * 6);
    if (this.buildAnim > 0) this.buildAnim = Math.max(0, this.buildAnim - dt * 4);
    const lv = this.currentLevel();

    const effRange = lv.range * buffs.rangeMul;

    let target: Enemy | null = null;
    let bestProgress = -Infinity;
    const r2 = effRange * effRange;
    for (const e of enemies) {
      if (!e.alive) continue;
      const p = e.position();
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      if (dx * dx + dy * dy > r2) continue;
      if (e.progress > bestProgress) {
        bestProgress = e.progress;
        target = e;
      }
    }

    if (!target) {
      this.idleScanPhase += dt * 0.4;
      const targetIdle = Math.sin(this.idleScanPhase) * 0.7;
      const delta = targetIdle - this.turretRotation;
      this.turretRotation += delta * dt * 1.5;
      return;
    }

    const tp = target.position();
    this.turretRotation = Math.atan2(tp.y - this.y, tp.x - this.x) + Math.PI / 2;

    if (this.cooldown === 0) {
      // Apply counter multiplier (with per-tier optional bonus override).
      const counterMul = counterMultiplier(
        this.config.counters,
        target.armorType,
        lv.counterBonus,
      );
      const damage = lv.damage * buffs.damageMul * counterMul;
      const shotCount = Math.max(1, lv.multiShot ?? 1);
      // Multi-shot: spawn N projectiles with a small angular spread so the
      // visual "burst" is readable. All home on the same primary target
      // (homing keeps damage predictable vs scattered misses).
      for (let i = 0; i < shotCount; i++) {
        const spreadRad = shotCount > 1 ? (i - (shotCount - 1) / 2) * 0.08 : 0;
        const dx = tp.x - this.x;
        const dy = tp.y - this.y;
        const baseAng = Math.atan2(dy, dx);
        const ang = baseAng + spreadRad;
        const offsetR = 6; // small barrel offset
        projectiles.push(new Projectile(
          { x: this.x + Math.cos(ang) * offsetR, y: this.y + Math.sin(ang) * offsetR },
          target,
          {
            damage,
            speed: lv.projectileSpeed,
            sprite: this.config.projectileSprite,
            splashRadius: lv.splashRadius ?? 0,
            slowDuration: lv.slowDuration ?? 0,
            slowFactor: lv.slowFactor ?? 1,
            chainCount: lv.chainCount ?? 0,
            chainRange: lv.chainRange ?? 0,
            chainSegments: lv.chainCount ? chainSegments : undefined,
            armorPierce: lv.armorPierce ?? false,
          },
        ));
      }
      this.cooldown = 1 / (lv.fireRate * buffs.fireRateMul);
      this.fireAnim = 1;
    }
  }
}
