import type { Path } from './Path.ts';
import type { WorldPoint } from '../engine/Renderer.ts';
import type { ArmorType } from './ArmorTypes.ts';

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

/**
 * One-shot mid-fight ability that triggers when an enemy's HP drops below a
 * threshold (typically 0.5 = 50%). Used to give story bosses a phase-2
 * behavior shift so the fight isn't just an HP-sponge.
 */
export interface PhaseAbility {
  /** 0..1 — HP fraction at which this triggers. */
  hpThreshold: number;
  /** Instant heal as fraction of maxHp (0.2 = restore 20% max). */
  heal?: number;
  /** Temporary speed multiplier applied when phase fires. */
  speedMul?: number;
  /** Seconds the speedMul persists (default 6). */
  speedDuration?: number;
  /** Temporary extra damageResist (added to base, clamped to 0.85 max). */
  resistBoost?: number;
  /** Seconds the resistBoost persists. */
  resistDuration?: number;
  /** Instantaneous forward teleport along path (world units). */
  teleportWorldUnits?: number;
  /** Minions spawned at the boss's position when phase triggers. */
  spawns?: readonly OnDeathSpawn[];
  /** Short banner text shown at phase-transition (e.g. "激怒") */
  banner?: string;
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
  /** Category used by tower `counters` to grant +40% damage. Default: 'light'. */
  armorType?: ArmorType;
  onDeathSpawn?: readonly OnDeathSpawn[];
  healsNearby?: HealAura;
  /** Mid-fight ability triggered once when HP crosses a threshold. */
  phase2?: PhaseAbility;
}

export class Enemy {
  readonly path: Path;
  readonly hpMax: number;
  hp: number;
  readonly baseSpeed: number;
  readonly radius: number;
  readonly reward: number;
  readonly sprite: string;
  readonly spriteSize: number;
  readonly damageResist: number;
  readonly armorType: ArmorType;
  readonly onDeathSpawn: readonly OnDeathSpawn[];
  readonly healsNearby: HealAura | null;
  readonly phase2: PhaseAbility | null;
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
  /** Flag set once the phase-2 ability has fired. One-shot. */
  phaseTriggered: boolean;
  /** Pulse 0→1 for phase-transition flash effect. Decays each frame. */
  phaseFlash: number;
  /** Queue of spawn requests emitted by phase trigger. GameScene drains this. */
  pendingPhaseSpawns: OnDeathSpawn[];
  /** Whether GameScene has consumed the spawn queue yet. Prevents double-spawn. */
  phaseSpawnsConsumed: boolean;
  private tempSpeedMul: number;
  private tempSpeedRemaining: number;
  private tempResistBoost: number;
  private tempResistRemaining: number;
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
    this.armorType = config.armorType ?? 'light';
    this.onDeathSpawn = config.onDeathSpawn ?? [];
    this.healsNearby = config.healsNearby ?? null;
    this.phase2 = config.phase2 ?? null;
    this.progress = startProgress;
    this.alive = true;
    this.reachedGoal = false;
    this.rotation = 0;
    this.hitFlash = 0;
    this.age = Math.random() * 2;
    this.deathAnim = 0;
    this.deathKind = null;
    this.processed = false;
    this.damageTakenThisTick = 0;
    this.phaseTriggered = false;
    this.phaseFlash = 0;
    this.pendingPhaseSpawns = [];
    this.phaseSpawnsConsumed = false;
    this.tempSpeedMul = 1;
    this.tempSpeedRemaining = 0;
    this.tempResistBoost = 0;
    this.tempResistRemaining = 0;
    this.slowRemaining = 0;
    this.slowFactor = 1;
    this.healTimer = 0;
  }

  /**
   * Apply damage, respecting the enemy's damageResist unless the attacker
   * explicitly pierces armor (AP rounds, holy damage, etc.).
   */
  takeDamage(amount: number, armorPierce = false): void {
    // Effective resist = base + temp boost (from phase 2), clamped.
    const effResist = Math.min(0.85, this.damageResist + this.tempResistBoost);
    const effective = armorPierce ? amount : amount * (1 - effResist);
    this.hp -= effective;
    this.hitFlash = 0.12;
    this.damageTakenThisTick += effective;
    // Trigger phase 2 when HP crosses threshold — one-shot.
    if (!this.phaseTriggered && this.phase2 && this.alive
        && this.hp > 0 && this.hp <= this.hpMax * this.phase2.hpThreshold) {
      this.triggerPhase();
    }
    if (this.hp <= 0 && this.alive) {
      this.alive = false;
      this.deathKind = 'killed';
    }
  }

  /** Apply the phase-2 ability effects. Called exactly once. */
  private triggerPhase(): void {
    if (!this.phase2 || this.phaseTriggered) return;
    this.phaseTriggered = true;
    this.phaseFlash = 1;
    const ab = this.phase2;
    if (ab.heal) {
      this.hp = Math.min(this.hpMax, this.hp + this.hpMax * ab.heal);
    }
    if (ab.speedMul && ab.speedMul !== 1) {
      this.tempSpeedMul = ab.speedMul;
      this.tempSpeedRemaining = ab.speedDuration ?? 6;
    }
    if (ab.resistBoost) {
      this.tempResistBoost = ab.resistBoost;
      this.tempResistRemaining = ab.resistDuration ?? 4;
    }
    if (ab.teleportWorldUnits) {
      this.progress = Math.min(
        this.path.totalLength - 1,
        this.progress + ab.teleportWorldUnits,
      );
    }
    if (ab.spawns) {
      for (const s of ab.spawns) this.pendingPhaseSpawns.push(s);
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
    if (this.phaseFlash > 0) this.phaseFlash = Math.max(0, this.phaseFlash - dt * 0.8);

    // Temp buff timers (phase 2)
    if (this.tempSpeedRemaining > 0) {
      this.tempSpeedRemaining -= dt;
      if (this.tempSpeedRemaining <= 0) { this.tempSpeedRemaining = 0; this.tempSpeedMul = 1; }
    }
    if (this.tempResistRemaining > 0) {
      this.tempResistRemaining -= dt;
      if (this.tempResistRemaining <= 0) { this.tempResistRemaining = 0; this.tempResistBoost = 0; }
    }

    if (this.slowRemaining > 0) {
      this.slowRemaining -= dt;
      if (this.slowRemaining <= 0) {
        this.slowRemaining = 0;
        this.slowFactor = 1;
      }
    }
    let effectiveSpeed = this.slowRemaining > 0 ? this.baseSpeed * this.slowFactor : this.baseSpeed;
    effectiveSpeed *= this.tempSpeedMul;

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
