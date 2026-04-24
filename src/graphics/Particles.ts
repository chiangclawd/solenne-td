/**
 * Particle system — trails, sparks, smoke, shockwaves.
 * Particles run in world-space; rendered by GameScene after world entities.
 */

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  gravity: number;
  shrink: boolean;
  fade: 'linear' | 'smoke';
  type: 'dot' | 'smoke' | 'spark' | 'ring';
  rotation?: number;
  angVel?: number;
}

export class ParticleSystem {
  private readonly pool: Particle[] = [];
  /**
   * v2.5.1 D2 — when `enabled = false` (set from Settings low-animation
   * mode), all spawn* methods become no-ops. Existing particles still
   * tick out and render until they expire — no visual jank.
   */
  enabled = true;

  update(dt: number): void {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.life -= dt;
      if (p.life <= 0) { this.pool.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      if (p.rotation !== undefined && p.angVel !== undefined) {
        p.rotation += p.angVel * dt;
      }
      // Gentle drag for smoke
      if (p.type === 'smoke') {
        p.vx *= 1 - 0.5 * dt;
        p.vy *= 1 - 0.5 * dt;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      const t = p.life / p.maxLife;
      const alpha = p.fade === 'smoke' ? t * 0.7 : t;
      const size = p.shrink ? p.size * Math.max(0.1, t) : p.size;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const len = size * 3;
        const mag = Math.hypot(p.vx, p.vy) || 1;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / mag) * len, p.y - (p.vy / mag) * len);
        ctx.stroke();
      } else if (p.type === 'smoke') {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * (1 - t) + 4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  count(): number { return this.pool.length; }
  clear(): void { this.pool.length = 0; }

  // ---------- Spawn helpers ----------

  explosion(x: number, y: number, scale: number = 1): void {
    if (!this.enabled) return;
    // Shock ring
    this.pool.push({
      x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4,
      size: 40 * scale, color: 'rgba(255, 200, 120, 0.9)',
      gravity: 0, shrink: false, fade: 'linear', type: 'ring',
    });
    // Sparks
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 160;
      this.pool.push({
        x, y,
        vx: Math.cos(angle) * speed * scale,
        vy: Math.sin(angle) * speed * scale,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 1.5,
        color: ['#ffd166', '#ff9f43', '#ffffff'][i % 3],
        gravity: 80,
        shrink: true,
        fade: 'linear',
        type: 'spark',
      });
    }
    // Smoke puffs
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      this.pool.push({
        x, y,
        vx: Math.cos(angle) * speed * scale,
        vy: Math.sin(angle) * speed * scale - 20,
        life: 0.9 + Math.random() * 0.4,
        maxLife: 1.2,
        size: 8 + Math.random() * 6,
        color: 'rgba(180, 160, 140, 0.6)',
        gravity: -15,
        shrink: false,
        fade: 'smoke',
        type: 'smoke',
      });
    }
  }

  muzzleFlash(x: number, y: number, rotation: number): void {
    if (!this.enabled) return;
    // Tiny burst at muzzle
    for (let i = 0; i < 3; i++) {
      const spread = (Math.random() - 0.5) * 0.4;
      const angle = rotation - Math.PI / 2 + spread;
      const speed = 60 + Math.random() * 80;
      this.pool.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.1 + Math.random() * 0.08,
        maxLife: 0.18,
        size: 1.2,
        color: '#fff8dc',
        gravity: 0,
        shrink: true,
        fade: 'linear',
        type: 'spark',
      });
    }
  }

  impactSparks(x: number, y: number, color: string = '#ffd166'): void {
    if (!this.enabled) return;
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      this.pool.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.15,
        maxLife: 0.35,
        size: 1.2,
        color,
        gravity: 40,
        shrink: true,
        fade: 'linear',
        type: 'spark',
      });
    }
  }

  enemyDeath(x: number, y: number, accent: string = '#ffd166'): void {
    if (!this.enabled) return;
    // Gold coin burst
    for (let i = 0; i < 8; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 50 + Math.random() * 60;
      this.pool.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 2,
        color: accent,
        gravity: 120,
        shrink: false,
        fade: 'linear',
        type: 'dot',
      });
    }
    // A soft smoke
    this.pool.push({
      x, y, vx: 0, vy: -10,
      life: 0.5, maxLife: 0.5,
      size: 14, color: 'rgba(90, 90, 110, 0.6)',
      gravity: -10, shrink: false, fade: 'smoke', type: 'smoke',
    });
  }

  frostBurst(x: number, y: number): void {
    if (!this.enabled) return;
    // Ring
    this.pool.push({
      x, y, vx: 0, vy: 0, life: 0.35, maxLife: 0.35,
      size: 24, color: 'rgba(160, 220, 255, 0.9)',
      gravity: 0, shrink: false, fade: 'linear', type: 'ring',
    });
    // Crystal specks
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 40;
      this.pool.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 1.5,
        color: '#e0f4ff',
        gravity: 20,
        shrink: true,
        fade: 'linear',
        type: 'dot',
      });
    }
  }

  /** Trail dot left by a moving missile */
  missileTrail(x: number, y: number): void {
    if (!this.enabled) return;
    this.pool.push({
      x: x + (Math.random() - 0.5) * 2,
      y: y + (Math.random() - 0.5) * 2,
      vx: 0, vy: 0,
      life: 0.35, maxLife: 0.35,
      size: 3 + Math.random() * 2,
      color: 'rgba(200, 150, 80, 0.7)',
      gravity: -20,
      shrink: false, fade: 'smoke', type: 'smoke',
    });
  }
}
