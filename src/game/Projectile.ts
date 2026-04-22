import type { Enemy } from './Enemy.ts';
import type { WorldPoint } from '../engine/Renderer.ts';
import type { AssetName } from '../assets.ts';

export interface ImpactEffect {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface ChainSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
}

export interface ProjectileOptions {
  damage: number;
  speed: number;
  sprite: AssetName;
  splashRadius?: number;
  slowDuration?: number;
  slowFactor?: number;
  chainCount?: number;
  chainRange?: number;
  chainSegments?: ChainSegment[];
}

export class Projectile {
  x: number;
  y: number;
  private readonly target: Enemy;
  readonly damage: number;
  readonly speed: number;
  readonly sprite: AssetName;
  readonly splashRadius: number;
  readonly slowDuration: number;
  readonly slowFactor: number;
  readonly chainCount: number;
  readonly chainRange: number;
  private readonly chainSegments: ChainSegment[] | null;
  alive: boolean;
  rotation: number;

  constructor(start: WorldPoint, target: Enemy, opts: ProjectileOptions) {
    this.x = start.x;
    this.y = start.y;
    this.target = target;
    this.damage = opts.damage;
    this.speed = opts.speed;
    this.sprite = opts.sprite;
    this.splashRadius = opts.splashRadius ?? 0;
    this.slowDuration = opts.slowDuration ?? 0;
    this.slowFactor = opts.slowFactor ?? 1;
    this.chainCount = opts.chainCount ?? 0;
    this.chainRange = opts.chainRange ?? 0;
    this.chainSegments = opts.chainSegments ?? null;
    this.alive = true;
    this.rotation = 0;
  }

  update(dt: number, enemies: readonly Enemy[], effects: ImpactEffect[]): void {
    if (!this.alive) return;
    if (!this.target.alive) {
      this.alive = false;
      return;
    }
    const tp = this.target.position();
    const dx = tp.x - this.x;
    const dy = tp.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    this.rotation = Math.atan2(dy, dx) + Math.PI / 2;

    if (dist <= step || dist <= this.target.radius) {
      this.applyImpact(enemies, effects);
      this.alive = false;
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }

  private applyImpact(enemies: readonly Enemy[], effects: ImpactEffect[]): void {
    if (this.splashRadius > 0) {
      for (const e of enemies) {
        if (!e.alive) continue;
        const p = e.position();
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        if (d <= this.splashRadius + e.radius) {
          e.takeDamage(this.damage);
          if (this.slowDuration > 0) e.applySlow(this.slowDuration, this.slowFactor);
        }
      }
      effects.push({
        x: this.x, y: this.y,
        radius: this.splashRadius,
        life: 0.35, maxLife: 0.35,
        color: '#ff9f43',
      });
      return;
    }

    // Single-target + optional chain
    this.target.takeDamage(this.damage);
    if (this.slowDuration > 0) {
      this.target.applySlow(this.slowDuration, this.slowFactor);
      effects.push({
        x: this.target.position().x,
        y: this.target.position().y,
        radius: this.target.radius + 4,
        life: 0.25, maxLife: 0.25,
        color: '#6ec8ff',
      });
    }

    if (this.chainCount > 0 && this.chainSegments) {
      const hit = new Set<Enemy>([this.target]);
      let from = this.target;
      let dmg = this.damage * 0.7;
      for (let i = 0; i < this.chainCount; i++) {
        const fromPos = from.position();
        const r2 = this.chainRange * this.chainRange;
        let best: Enemy | null = null;
        let bestDist = Infinity;
        for (const e of enemies) {
          if (!e.alive || hit.has(e)) continue;
          const p = e.position();
          const d2 = (p.x - fromPos.x) ** 2 + (p.y - fromPos.y) ** 2;
          if (d2 <= r2 && d2 < bestDist) { best = e; bestDist = d2; }
        }
        if (!best) break;
        const bp = best.position();
        this.chainSegments.push({
          x1: fromPos.x, y1: fromPos.y,
          x2: bp.x, y2: bp.y,
          life: 0.18, maxLife: 0.18,
        });
        best.takeDamage(dmg);
        hit.add(best);
        from = best;
        dmg *= 0.8;
      }
    }
  }
}
