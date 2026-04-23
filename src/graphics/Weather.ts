/**
 * Ambient weather particles — world-space, looping, per-world theme.
 * Snow for frozen, embers for industrial, rain for capital, void mist for void, grass wind for frontier.
 * Rendered after world but before HUD.
 */

import { WORLD_WIDTH, WORLD_HEIGHT } from '../config.ts';

type Ctx = CanvasRenderingContext2D;

interface WeatherParticle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  life: number; maxLife: number;
  hue: string;
  kind: 'snow' | 'ember' | 'rain' | 'mist' | 'leaf';
  rot?: number;
  vrot?: number;
}

export class Weather {
  private readonly particles: WeatherParticle[] = [];
  private spawnAccum = 0;
  private readonly world: number;

  constructor(worldId: number) {
    this.world = worldId;
  }

  update(dt: number): void {
    const rate = this.spawnRate();
    this.spawnAccum += dt;
    while (this.spawnAccum > 1 / rate) {
      this.spawnAccum -= 1 / rate;
      this.spawn();
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.kind === 'snow') {
        p.vx += Math.sin(p.life * 2) * 3 * dt;
      }
      if (p.rot !== undefined && p.vrot !== undefined) p.rot += p.vrot * dt;
      if (p.life <= 0 || p.y > WORLD_HEIGHT + 40 || p.x < -20 || p.x > WORLD_WIDTH + 20) {
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnRate(): number {
    switch (this.world) {
      case 1: return 6;   // light wind tufts
      case 2: return 14;  // embers
      case 3: return 20;  // rain
      case 4: return 18;  // snow
      case 5: return 8;   // void mist
      default: return 0;
    }
  }

  private spawn(): void {
    const x = Math.random() * WORLD_WIDTH;
    switch (this.world) {
      case 1:
        this.particles.push({
          x, y: -10,
          vx: 5 + Math.random() * 6,
          vy: 28 + Math.random() * 20,
          size: 2 + Math.random() * 2,
          life: 3 + Math.random() * 2,
          maxLife: 5,
          hue: 'rgba(200, 210, 130, 0.45)',
          kind: 'leaf',
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 3,
        });
        break;
      case 2:
        this.particles.push({
          x: Math.random() * WORLD_WIDTH,
          y: WORLD_HEIGHT + 10,
          vx: (Math.random() - 0.5) * 8,
          vy: -35 - Math.random() * 30,
          size: 1.2 + Math.random() * 1.5,
          life: 2.5 + Math.random() * 1.5,
          maxLife: 4,
          hue: `hsl(${15 + Math.random() * 25}, 90%, 60%)`,
          kind: 'ember',
        });
        break;
      case 3:
        this.particles.push({
          x: x + 30, y: -5,
          vx: -20,
          vy: 220 + Math.random() * 80,
          size: 0.6,
          life: 2,
          maxLife: 2,
          hue: 'rgba(150, 180, 220, 0.6)',
          kind: 'rain',
        });
        break;
      case 4:
        this.particles.push({
          x, y: -10,
          vx: (Math.random() - 0.5) * 10,
          vy: 18 + Math.random() * 12,
          size: 1.5 + Math.random() * 2,
          life: 6,
          maxLife: 6,
          hue: 'rgba(230, 240, 255, 0.8)',
          kind: 'snow',
        });
        break;
      case 5:
        this.particles.push({
          x, y: WORLD_HEIGHT + 10,
          vx: (Math.random() - 0.5) * 4,
          vy: -8 - Math.random() * 8,
          size: 6 + Math.random() * 8,
          life: 5,
          maxLife: 5,
          hue: 'rgba(180, 120, 220, 0.15)',
          kind: 'mist',
        });
        break;
    }
  }

  render(ctx: Ctx): void {
    for (const p of this.particles) {
      const a = Math.min(1, p.life / p.maxLife * 1.5);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.hue;
      switch (p.kind) {
        case 'snow':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'ember': {
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          glow.addColorStop(0, p.hue);
          glow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
          break;
        }
        case 'rain':
          ctx.strokeStyle = p.hue;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + 3, p.y + 14);
          ctx.stroke();
          break;
        case 'mist': {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, p.hue);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'leaf': {
          ctx.translate(p.x, p.y);
          if (p.rot !== undefined) ctx.rotate(p.rot);
          ctx.fillStyle = p.hue;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
      ctx.restore();
    }
  }

  clear(): void { this.particles.length = 0; }
}
