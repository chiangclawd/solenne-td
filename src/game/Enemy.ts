import type { Path } from './Path.ts';
import type { WorldPoint } from '../engine/Renderer.ts';
import type { AssetName } from '../assets.ts';

export interface OnDeathSpawn {
  type: string;
  count: number;
  delay: number;
}

export interface HealAura {
  amount: number;
  interval: number;
  radius: number;
}

export interface EnemyConfig {
  hp: number;
  speed: number;
  radius: number;
  reward: number;
  sprite: AssetName;
  spriteSize: number;
  damageResist?: number;
  onDeathSpawn?: readonly OnDeathSpawn[];
  healsNearby?: HealAura;
}

export class Enemy {
  private readonly path: Path;
  readonly hpMax: number;
  hp: number;
  readonly baseSpeed: number;
  readonly radius: number;
  readonly reward: number;
  readonly sprite: AssetName;
  readonly spriteSize: number;
  readonly damageResist: number;
  readonly onDeathSpawn: readonly OnDeathSpawn[];
  readonly healsNearby: HealAura | null;
  progress: number;
  alive: boolean;
  reachedGoal: boolean;
  rotation: number;
  hitFlash: number;
  private slowRemaining: number;
  private slowFactor: number;
  private healTimer: number;

  constructor(path: Path, config: EnemyConfig, startProgress = 0) {
    this.path = path;
    this.hpMax = config.hp;
    this.hp = config.hp;
    this.baseSpeed = config.speed;
    this.radius = config.radius;
    this.reward = config.reward;
    this.sprite = config.sprite;
    this.spriteSize = config.spriteSize;
    this.damageResist = config.damageResist ?? 0;
    this.onDeathSpawn = config.onDeathSpawn ?? [];
    this.healsNearby = config.healsNearby ?? null;
    this.progress = startProgress;
    this.alive = true;
    this.reachedGoal = false;
    this.rotation = 0;
    this.hitFlash = 0;
    this.slowRemaining = 0;
    this.slowFactor = 1;
    this.healTimer = 0;
  }

  takeDamage(amount: number): void {
    const effective = amount * (1 - this.damageResist);
    this.hp -= effective;
    this.hitFlash = 0.12;
    if (this.hp <= 0) this.alive = false;
  }

  applySlow(duration: number, factor: number): void {
    if (duration <= 0 || factor >= 1) return;
    if (duration > this.slowRemaining || factor < this.slowFactor) {
      this.slowRemaining = Math.max(this.slowRemaining, duration);
      this.slowFactor = Math.min(this.slowFactor, factor);
    }
  }

  isSlowed(): boolean {
    return this.slowRemaining > 0;
  }

  update(dt: number, nearby?: readonly Enemy[]): void {
    if (!this.alive) return;

    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (this.slowRemaining > 0) {
      this.slowRemaining -= dt;
      if (this.slowRemaining <= 0) {
        this.slowRemaining = 0;
        this.slowFactor = 1;
      }
    }
    const effectiveSpeed = this.slowRemaining > 0 ? this.baseSpeed * this.slowFactor : this.baseSpeed;

    // Heal aura
    if (this.healsNearby && nearby) {
      this.healTimer -= dt;
      if (this.healTimer <= 0) {
        this.healTimer = this.healsNearby.interval;
        const p = this.position();
        const r2 = this.healsNearby.radius * this.healsNearby.radius;
        for (const e of nearby) {
          if (e === this || !e.alive) continue;
          const ep = e.position();
          const d2 = (ep.x - p.x) ** 2 + (ep.y - p.y) ** 2;
          if (d2 <= r2) {
            e.hp = Math.min(e.hpMax, e.hp + this.healsNearby.amount);
          }
        }
      }
    }

    const prev = this.path.pointAt(this.progress);
    this.progress += effectiveSpeed * dt;
    if (this.progress >= this.path.totalLength) {
      this.alive = false;
      this.reachedGoal = true;
      return;
    }
    const now = this.path.pointAt(this.progress);
    const dx = now.x - prev.x;
    const dy = now.y - prev.y;
    if (dx !== 0 || dy !== 0) {
      this.rotation = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  position(): WorldPoint {
    return this.path.pointAt(this.progress);
  }
}
