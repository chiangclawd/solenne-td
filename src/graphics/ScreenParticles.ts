/**
 * Screen-space particle system for UI-anchored effects.
 * Main use: gold coins flying from enemy death location to HUD gold counter.
 * Coords are CSS pixels (pre-DPR multiply).
 */

type Ctx = CanvasRenderingContext2D;

export interface HomingCoin {
  x: number; y: number;         // current CSS pos
  vx: number; vy: number;        // current velocity (for launch arc)
  targetX: number; targetY: number;
  life: number; maxLife: number; // seconds until arrival
  size: number;
  born: number;                  // elapsed when spawned (for launch phase)
}

export class ScreenParticleSystem {
  private readonly coins: HomingCoin[] = [];
  /** v2.5.1 D2 — short-circuit spawns when low-animation mode is on. */
  enabled = true;

  spawnCoins(startX: number, startY: number, targetX: number, targetY: number, count: number): void {
    if (!this.enabled) return;
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const launchSpeed = 40 + Math.random() * 60;
      this.coins.push({
        x: startX + (Math.random() - 0.5) * 12,
        y: startY + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * launchSpeed,
        vy: Math.sin(angle) * launchSpeed,
        targetX,
        targetY,
        life: 0.65 + Math.random() * 0.25,
        maxLife: 0.9,
        size: 4.5 + Math.random() * 1.5,
        born: 0,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.born += dt;
      c.life -= dt;
      if (c.life <= 0) { this.coins.splice(i, 1); continue; }

      // Launch phase (first 0.2s) — ballistic with gravity
      // Home phase (rest) — lerp velocity toward (target - current) / remainingLife
      if (c.born < 0.2) {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vy += 220 * dt; // gravity
      } else {
        // Homing
        const dx = c.targetX - c.x;
        const dy = c.targetY - c.y;
        const accel = 1200;
        const dampen = 0.9;
        c.vx = c.vx * dampen + dx * accel * dt / Math.max(0.2, c.life);
        c.vy = c.vy * dampen + dy * accel * dt / Math.max(0.2, c.life);
        // Limit max speed
        const speed = Math.hypot(c.vx, c.vy);
        const maxSpeed = 900;
        if (speed > maxSpeed) {
          c.vx *= maxSpeed / speed;
          c.vy *= maxSpeed / speed;
        }
        c.x += c.vx * dt;
        c.y += c.vy * dt;
      }
    }
  }

  render(ctx: Ctx): void {
    if (this.coins.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    for (const c of this.coins) {
      const progress = 1 - c.life / c.maxLife;
      const size = c.size * (1 - progress * 0.2);
      // Outer glow
      ctx.globalAlpha = 0.5;
      const g = ctx.createRadialGradient(c.x * dpr, c.y * dpr, 1, c.x * dpr, c.y * dpr, size * 2 * dpr);
      g.addColorStop(0, '#fff3a8');
      g.addColorStop(0.5, '#ffd166');
      g.addColorStop(1, 'rgba(255, 180, 60, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x * dpr, c.y * dpr, size * 2 * dpr, 0, Math.PI * 2);
      ctx.fill();
      // Coin body (tilt by flipping width via sin)
      ctx.globalAlpha = 1;
      const tilt = Math.abs(Math.sin(c.born * 12));
      ctx.fillStyle = '#ffd166';
      ctx.strokeStyle = '#8a6018';
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.ellipse(c.x * dpr, c.y * dpr, size * dpr, size * tilt * dpr, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  clear(): void { this.coins.length = 0; }
  count(): number { return this.coins.length; }
}
