import type { Enemy } from './Enemy.ts';
import { Projectile } from './Projectile.ts';
import type { ChainSegment } from './Projectile.ts';
import type { AssetName } from '../assets.ts';

export interface TowerLevel {
  cost: number;
  range: number;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
}

export interface TowerConfig {
  id: string;
  name: string;
  levels: readonly TowerLevel[];
  turretSprite: AssetName;
  projectileSprite: AssetName;
  splashRadius?: number;
  slowDuration?: number;
  slowFactor?: number;
  chainCount?: number;
  chainRange?: number;
  pierceResist?: boolean;
}

export class Tower {
  readonly tileX: number;
  readonly tileY: number;
  readonly x: number;
  readonly y: number;
  readonly config: TowerConfig;
  level: number;
  totalInvested: number;
  turretRotation: number;
  /** Seconds since firing, drives recoil animation (decays to 0). */
  fireAnim: number;
  /** Seconds since placement / upgrade, drives pop-in scale. */
  buildAnim: number;
  private cooldown: number;

  constructor(tileX: number, tileY: number, tileSize: number, config: TowerConfig) {
    this.tileX = tileX;
    this.tileY = tileY;
    this.x = tileX * tileSize + tileSize / 2;
    this.y = tileY * tileSize + tileSize / 2;
    this.config = config;
    this.level = 0;
    this.totalInvested = config.levels[0].cost;
    this.cooldown = 0;
    // Stagger initial rotation so multiple towers don't all look alike
    this.turretRotation = Math.random() * Math.PI * 2;
    this.fireAnim = 0;
    this.buildAnim = 1;
    this.idleScanPhase = Math.random() * Math.PI * 2;
  }

  /** Drifts when no target is in range, purely visual flavor. */
  private idleScanPhase: number;

  currentLevel(): TowerLevel {
    return this.config.levels[this.level];
  }

  canUpgrade(): boolean {
    return this.level < this.config.levels.length - 1;
  }

  nextUpgradeCost(): number {
    return this.canUpgrade() ? this.config.levels[this.level + 1].cost : 0;
  }

  upgrade(): void {
    if (!this.canUpgrade()) return;
    this.level++;
    this.totalInvested += this.currentLevel().cost;
    this.buildAnim = 1; // retrigger build anim on upgrade
  }

  sellValue(): number {
    return Math.floor(this.totalInvested * 0.5);
  }

  update(
    dt: number,
    enemies: readonly Enemy[],
    projectiles: Projectile[],
    chainSegments: ChainSegment[],
  ): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.fireAnim > 0) this.fireAnim = Math.max(0, this.fireAnim - dt * 6); // decays in ~0.17s
    if (this.buildAnim > 0) this.buildAnim = Math.max(0, this.buildAnim - dt * 4); // ~0.25s
    const lv = this.currentLevel();

    let target: Enemy | null = null;
    let bestProgress = -Infinity;
    const r2 = lv.range * lv.range;
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
      // Idle: slowly rotate the turret (scanning)
      this.idleScanPhase += dt * 0.4;
      const targetIdle = Math.sin(this.idleScanPhase) * 0.7;
      // Smoothly drift rotation toward idle angle
      const delta = targetIdle - this.turretRotation;
      this.turretRotation += delta * dt * 1.5;
      return;
    }

    if (target) {
      const tp = target.position();
      this.turretRotation = Math.atan2(tp.y - this.y, tp.x - this.x) + Math.PI / 2;

      if (this.cooldown === 0) {
        let damage = lv.damage;
        if (this.config.pierceResist) damage *= 1.3;
        projectiles.push(new Projectile(
          { x: this.x, y: this.y },
          target,
          {
            damage,
            speed: lv.projectileSpeed,
            sprite: this.config.projectileSprite,
            splashRadius: this.config.splashRadius ?? 0,
            slowDuration: this.config.slowDuration ?? 0,
            slowFactor: this.config.slowFactor ?? 1,
            chainCount: this.config.chainCount ?? 0,
            chainRange: this.config.chainRange ?? 0,
            chainSegments: this.config.chainCount ? chainSegments : undefined,
          },
        ));
        this.cooldown = 1 / lv.fireRate;
        this.fireAnim = 1;
      }
    }
  }
}
