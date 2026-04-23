import type { Path } from './Path.ts';
import type { WorldPoint } from '../engine/Renderer.ts';

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
  /** Visual kind passed to SpritePainter.drawEnemy — no longer tied to AssetName. */
  sprite: string;
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
  readonly sprite: string;
  readonly spriteSize: number;
  readonly damageResist: number;
  readonly onDeathSpawn: readonly OnDeathSpawn[];
  readonly healsNearby: HealAura | null;
  progress: number;
  alive: boolean;
  reachedGoal: boolean;
  rotation: number;
  hitFlash: number;
  /** Seconds since spawn, drives walk wobble and other anims. */
  age: number;
  /** Death fade progress (0..1). 0 = alive, 1 = fully gone. */
  deathAnim: number;
  deathKind: 'killed' | 'leaked' | null;
  /** Whether GameScene has already paid out gold/deducted life for this death. */
  processed: boolean;
  /** Damage accumulated this frame; GameScene reads & resets per tick for floaters. */
  damageTakenThisTick: number;
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
    this.age = Math.random() * 2; // stagger wobble phase across units
    this.deathAnim = 0;
    this.deathKind = null;
    this.processed = false;
    this.damageTakenThisTick = 0;
    this.slowRemaining = 0;
    this.slowFactor = 1;
    this.healTimer = 0;
  }

  takeDamage(amount: number): void {
    const effective = amount * (1 - this.damageResist);
    this.hp -= effective;
    this.hitFlash = 0.12;
    this.damageTakenThisTick += effective;
    if (this.hp <= 0 && this.alive) {
      this.alive = false;
      this.deathKind = 'killed';
    }
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
    // Death fade still animates after alive=false
    if (!this.alive) {
      if (this.deathKind && this.deathAnim < 1) {
        this.deathAnim = Math.min(1, this.deathAnim + dt * 3); // ~0.33s
      }
      return;
    }
    this.age += dt;

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
      this.deathKind = 'leaked';
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
