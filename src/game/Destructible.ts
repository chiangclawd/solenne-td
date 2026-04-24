/**
 * Runtime representation of a destructible obstacle.
 *
 * Static obstacles block tower placement forever. Destructibles ALSO block
 * placement initially, but tower AOE / hero skills can damage them — and
 * once HP ≤ 0 the tile is freed and the player gets a gold reward.
 *
 * Damage flow: GameScene calls `damageInRadius(x, y, r, dmg)` whenever a
 * splash effect fires (see `Projectile.applyImpact` for where these get
 * queued), which routes through to here.
 */

import type { Obstacle } from './Level.ts';

export class Destructible {
  readonly tileX: number;
  readonly tileY: number;
  readonly kind: string;
  readonly maxHp: number;
  readonly reward: number;
  hp: number;
  /** True after HP hit 0 and break FX spawned. Caller cleans up. */
  destroyed: boolean;
  /** 0-1 hit-flash timer for a white pulse on impact. */
  hitFlash: number;
  /** Seconds since creation — used for subtle idle anim. */
  age: number;

  constructor(ob: Obstacle) {
    this.tileX = ob.x;
    this.tileY = ob.y;
    this.kind = ob.kind;
    this.maxHp = ob.hp ?? 40;
    this.reward = ob.reward ?? 15;
    this.hp = this.maxHp;
    this.destroyed = false;
    this.hitFlash = 0;
    this.age = 0;
  }

  takeDamage(amount: number): void {
    if (this.destroyed) return;
    this.hp -= amount;
    this.hitFlash = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.destroyed = true;
    }
  }

  /** Normalized damage 0-1 (0 = pristine, 1 = destroyed). Drives crack layer opacity. */
  damagePct(): number {
    return 1 - this.hp / this.maxHp;
  }

  update(dt: number): void {
    this.age += dt;
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
  }
}
