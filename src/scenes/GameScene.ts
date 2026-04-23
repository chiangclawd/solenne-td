import { BaseScene } from '../ui/Scene.ts';
import { LevelSelectScene } from './LevelSelectScene.ts';
import { COLORS, TILE_SIZE, GRID_COLS, GRID_ROWS, WORLD_WIDTH, WORLD_HEIGHT } from '../config.ts';
import { ENEMY_TYPES } from '../data/enemies.ts';
import type { EnemyConfig } from '../game/Enemy.ts';
import { TOWER_TYPES, TOWER_ORDER } from '../data/towers.ts';
import { Path } from '../game/Path.ts';
import { Enemy } from '../game/Enemy.ts';
import { Tower } from '../game/Tower.ts';
import { Projectile } from '../game/Projectile.ts';
import type { ImpactEffect, ChainSegment } from '../game/Projectile.ts';
import { GameState } from '../game/GameState.ts';
import { WaveManager } from '../game/WaveManager.ts';
import type { Wave } from '../game/WaveManager.ts';
import type { LevelData } from '../game/Level.ts';
import { DialogueBox } from '../ui/DialogueBox.ts';
import { recordCompletion, getStars } from '../storage/SaveData.ts';
import type { SceneContext } from './SceneContext.ts';
import type { Difficulty } from '../storage/SaveData.ts';
import { generateEndlessWave } from '../game/WaveGenerator.ts';
import { upgradeValue } from '../game/MetaUpgrades.ts';
import {
  drawTowerBase, drawTowerTurret, drawEnemy, drawProjectile,
  drawTowerIconScreen, drawEnemyIconScreen,
} from '../graphics/SpritePainter.ts';
import { ParticleSystem } from '../graphics/Particles.ts';
import { ScreenParticleSystem } from '../graphics/ScreenParticles.ts';
import { drawGrassTile, drawPathTile, themeForWorld } from '../graphics/UIPainter.ts';
import { drawObstacle } from '../graphics/ObstaclePainter.ts';
import { makeBanner, showBanner, updateBanner, renderBanner } from '../graphics/WaveBanner.ts';
import { Weather } from '../graphics/Weather.ts';

interface Rect { x: number; y: number; w: number; h: number }
interface Floater { x: number; y: number; vx: number; vy: number; text: string; color: string; life: number; maxLife: number; size: number }

const T = TILE_SIZE;
const SPEEDS: readonly number[] = [1, 2, 3];

const DIFF_MOD: Record<Difficulty, { hp: number; speed: number; reward: number; label: string; color: string }> = {
  normal: { hp: 1.0, speed: 1.0, reward: 1.0, label: 'Normal', color: '#6ee17a' },
  hard:   { hp: 1.35, speed: 1.15, reward: 0.9, label: 'Hard',   color: '#ffd166' },
  heroic: { hp: 1.7, speed: 1.3,  reward: 0.75, label: 'Heroic', color: '#ff6b6b' },
};

function bgmForWorld(world: number): import('../engine/AudioManager.ts').BgmTrack {
  if (world === 1) return 'world1';
  if (world === 2) return 'world2';
  if (world === 3) return 'world3';
  if (world === 4) return 'world4';
  return 'world5';
}

export class GameScene extends BaseScene {
  private readonly level: LevelData;
  private readonly path: Path;
  private readonly pathTiles: Set<string>;
  private readonly obstacleTiles: Set<string>;
  private waves: Wave[];
  private readonly isEndless: boolean;
  private readonly availableTowers: string[];
  private readonly state: GameState;
  private readonly waveMgr: WaveManager;
  private readonly enemies: Enemy[] = [];
  private readonly towers: Tower[] = [];
  private readonly projectiles: Projectile[] = [];
  private readonly effects: ImpactEffect[] = [];
  private readonly chainSegments: ChainSegment[] = [];
  private readonly occupiedTiles = new Set<string>();
  private readonly floaters: Floater[] = [];
  private readonly pendingSpawns: { config: EnemyConfig; progress: number; delay: number }[] = [];
  private readonly particles = new ParticleSystem();
  private readonly screenParticles = new ScreenParticleSystem();
  private readonly banner = makeBanner();
  private readonly weather: Weather;
  private bossEntranceFlash = 0;
  private bossSeen = new Set<string>();
  private goldPulse = 0;      // seconds remaining of gold-change pulse
  private lifePulse = 0;      // seconds remaining of life-lost pulse
  private goldPulseSign = 1;  // +1 for gain, -1 for spend
  private lastGold = 0;
  private lastLives = 0;
  private starRain: { x: number; y: number; vy: number; rot: number; vrot: number; life: number; size: number }[] = [];
  private readonly dialogue = new DialogueBox();
  private readonly difficulty: Difficulty;
  private readonly diffMod: typeof DIFF_MOD[Difficulty];
  private readonly metaMod: {
    startGold: number;
    startLives: number;
    damageMul: number;
    rangeMul: number;
    fireRateMul: number;
    killRewardMul: number;
    sellBonus: number;
    costDiscount: number;
  };

  private selectedTowerId: string;
  private selectedExisting: Tower | null = null;
  private paused = false;
  private speedIdx = 0;
  private elapsed = 0;
  private hoverTile: { x: number; y: number } | null = null;

  // Transient UI rects
  private nextWaveBtn: Rect | null = null;
  private towerSelectorRects: { id: string; rect: Rect }[] = [];
  private pauseBtn: Rect | null = null;
  private speedBtn: Rect | null = null;
  private resumeBtn: Rect | null = null;
  private retryBtn: Rect | null = null;
  private backToLevelsBtn: Rect | null = null;
  private nextLevelBtn: Rect | null = null;
  private endRetryBtn: Rect | null = null;
  private endBackBtn: Rect | null = null;
  private upgradeBtn: Rect | null = null;
  private sellBtn: Rect | null = null;
  private closePanelBtn: Rect | null = null;

  constructor(ctx: SceneContext, level: LevelData) {
    super(ctx);
    this.level = level;
    this.isEndless = level.endless === true;
    this.difficulty = ctx.save.settings.difficulty;
    this.diffMod = DIFF_MOD[this.difficulty];
    this.metaMod = {
      startGold: upgradeValue(ctx.save, 'startGold'),
      startLives: upgradeValue(ctx.save, 'startLives'),
      damageMul: 1 + upgradeValue(ctx.save, 'towerDamage'),
      rangeMul: 1 + upgradeValue(ctx.save, 'towerRange'),
      fireRateMul: 1 + upgradeValue(ctx.save, 'towerFireRate'),
      killRewardMul: 1 + upgradeValue(ctx.save, 'killReward'),
      sellBonus: upgradeValue(ctx.save, 'sellValue'),
      costDiscount: upgradeValue(ctx.save, 'towerCost'),
    };
    this.path = new Path(level.path.map((p) => ({ x: p.x * T, y: p.y * T })));
    this.pathTiles = this.path.computeOccupiedTiles(T);
    this.obstacleTiles = new Set<string>();
    for (const ob of level.obstacles ?? []) {
      this.obstacleTiles.add(`${ob.x},${ob.y}`);
    }
    this.waves = level.waves.map((wave) => this.buildWave(wave));
    if (this.isEndless) {
      this.waves.push(this.buildWave(generateEndlessWave(1)));
    }
    const allow = new Set(level.availableTowers);
    this.availableTowers = TOWER_ORDER.filter((id) => allow.has(id));
    if (this.availableTowers.length === 0) throw new Error('No available towers');
    this.selectedTowerId = this.availableTowers[0];
    const boostedGold = level.startingGold + this.metaMod.startGold;
    const boostedLives = level.startingLives + this.metaMod.startLives;
    this.state = new GameState(boostedGold, boostedLives);
    this.waveMgr = new WaveManager(this.waves, this.path);
    this.weather = new Weather(level.world);
  }

  private buildWave(wave: import('../game/Level.ts').WaveData): Wave {
    return wave.map((entry) => {
      const cfg = ENEMY_TYPES[entry.enemy];
      if (!cfg) throw new Error(`Unknown enemy: ${entry.enemy}`);
      const modified: EnemyConfig = {
        ...cfg,
        hp: Math.round(cfg.hp * this.diffMod.hp),
        speed: Math.round(cfg.speed * this.diffMod.speed),
        reward: Math.max(1, Math.round(cfg.reward * this.diffMod.reward)),
      };
      return { delay: entry.delay, enemy: modified };
    });
  }

  override onEnter(): void {
    this.ctx.playBgm(bgmForWorld(this.level.world));
    this.ctx.setSpeed(SPEEDS[this.speedIdx]);
    this.ctx.renderer.setShakeEnabled(this.ctx.save.settings.screenShake);
    if (this.level.intro && this.level.intro.length > 0) {
      this.state.status = 'intro';
      this.dialogue.show(this.level.intro, () => { this.state.status = 'idle'; });
    }
  }

  override onExit(): void {
    this.ctx.setSpeed(1);
  }

  override onHover(_sx: number, _sy: number, worldX: number, worldY: number): void {
    const tx = Math.floor(worldX / T);
    const ty = Math.floor(worldY / T);
    if (tx < 0 || tx >= GRID_COLS || ty < 0 || ty >= GRID_ROWS) {
      this.hoverTile = null;
    } else {
      this.hoverTile = { x: tx, y: ty };
    }
  }

  override onHoverEnd(): void { this.hoverTile = null; }

  private resetLevel(): void {
    this.state.reset();
    this.enemies.length = 0;
    this.towers.length = 0;
    this.projectiles.length = 0;
    this.effects.length = 0;
    this.chainSegments.length = 0;
    this.pendingSpawns.length = 0;
    this.occupiedTiles.clear();
    this.floaters.length = 0;
    this.particles.clear();
    this.screenParticles.clear();
    this.selectedTowerId = this.availableTowers[0];
    this.selectedExisting = null;
    this.paused = false;
    this.speedIdx = 0;
    this.ctx.setSpeed(SPEEDS[this.speedIdx]);
    if (this.isEndless) {
      // Regenerate starting wave
      this.waves.length = 0;
      this.waves.push(this.buildWave(generateEndlessWave(1)));
    }
  }

  private tryStartNextWave(): void {
    if (this.state.status !== 'idle') return;
    if (this.state.waveIndex >= this.waveMgr.totalWaves()) return;
    this.waveMgr.startWave(this.state.waveIndex);
    this.state.status = 'playing';
    this.ctx.audio.waveStart();
    const total = this.isEndless ? '無盡' : `${this.waveMgr.totalWaves()}`;
    const isFinal = !this.isEndless && this.state.waveIndex === this.waveMgr.totalWaves() - 1;
    const accent = isFinal ? '#ff6b6b' : '#ffd166';
    const label = isFinal ? `FINAL WAVE` : `WAVE ${this.state.waveIndex + 1}`;
    showBanner(this.banner, label, `${this.level.name} · ${this.state.waveIndex + 1}/${total}`, accent);
  }

  private spawnStarRain(count: number): void {
    const vw = this.ctx.renderer.vw();
    for (let i = 0; i < count; i++) {
      this.starRain.push({
        x: Math.random() * vw,
        y: -20 - Math.random() * 100,
        vy: 120 + Math.random() * 80,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 4,
        life: 2.5 + Math.random() * 1.5,
        size: 10 + Math.random() * 14,
      });
    }
  }

  private triggerWin(): void {
    const ratio = this.state.lives / this.level.startingLives;
    const stars = ratio >= 1 ? 3 : ratio >= 0.5 ? 2 : 1;
    this.spawnStarRain(60 + stars * 20);
    recordCompletion(this.ctx.save, this.level.id, stars, this.difficulty);
    this.ctx.save.stats.totalWavesSurvived += this.waveMgr.totalWaves();
    this.ctx.persistSave();

    const unlocked = this.ctx.achievements.check(this.ctx.save, {
      type: 'levelComplete', levelId: this.level.id, stars, livesRatio: ratio,
    });
    if (unlocked.length > 0) this.ctx.audio.achievement();
    this.ctx.persistSave();

    this.ctx.audio.victory();
    this.ctx.playBgm('victory');
    if (this.level.outroWin && this.level.outroWin.length > 0) {
      this.state.status = 'outroWin';
      this.dialogue.show(this.level.outroWin, () => { this.state.status = 'won'; });
    } else {
      this.state.status = 'won';
    }
  }

  private triggerLose(): void {
    this.ctx.audio.defeat();
    if (this.isEndless) {
      // Record high score
      const survived = this.state.waveIndex;
      const prev = this.ctx.save.endlessHighScore;
      if (!prev || survived > prev.waves) {
        this.ctx.save.endlessHighScore = {
          waves: survived,
          kills: this.state.kills,
          difficulty: this.difficulty,
          date: Date.now(),
        };
      }
      this.ctx.persistSave();
      this.state.status = 'lost';
      return;
    }
    if (this.level.outroLose && this.level.outroLose.length > 0) {
      this.state.status = 'outroLose';
      this.dialogue.show(this.level.outroLose, () => { this.state.status = 'lost'; });
    } else {
      this.state.status = 'lost';
    }
  }

  private spawnFloater(x: number, y: number, text: string, color: string, size = 12): void {
    this.floaters.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: -35 - Math.random() * 10,
      text, color, life: 1.0, maxLife: 1.0, size,
    });
  }

  private nextLevelOrNull(): LevelData | null {
    const idx = this.ctx.levels.findIndex((l) => l.id === this.level.id);
    if (idx < 0) return null;
    return this.ctx.levels[idx + 1] ?? null;
  }

  override update(dt: number): void {
    this.elapsed += dt;
    this.ctx.renderer.updateShake(dt);
    updateBanner(this.banner, dt);
    if (this.bossEntranceFlash > 0) this.bossEntranceFlash = Math.max(0, this.bossEntranceFlash - dt * 1.5);
    // HUD pulse detection
    if (this.state.gold !== this.lastGold) {
      this.goldPulseSign = this.state.gold > this.lastGold ? 1 : -1;
      this.goldPulse = 0.35;
      this.lastGold = this.state.gold;
    } else if (this.goldPulse > 0) this.goldPulse = Math.max(0, this.goldPulse - dt);
    if (this.state.lives !== this.lastLives) {
      this.lifePulse = 0.5;
      this.lastLives = this.state.lives;
    } else if (this.lifePulse > 0) this.lifePulse = Math.max(0, this.lifePulse - dt);
    // Star rain update
    for (let i = this.starRain.length - 1; i >= 0; i--) {
      const s = this.starRain[i];
      s.y += s.vy * dt;
      s.vy += 120 * dt;
      s.rot += s.vrot * dt;
      s.life -= dt;
      if (s.life <= 0) this.starRain.splice(i, 1);
    }

    if (this.paused) return;

    if (this.state.status === 'playing') {
      this.waveMgr.update(dt, (e) => {
        this.enemies.push(e);
        // Boss entrance effect — triggered first time a boss-tier enemy spawns
        const isBoss = e.sprite === 'enemyBoss' || e.hpMax >= 500;
        if (isBoss && !this.bossSeen.has(e.sprite + e.hpMax)) {
          this.bossSeen.add(e.sprite + e.hpMax);
          this.bossEntranceFlash = 1;
          this.ctx.renderer.shake(0.5, 8);
        }
      });
      // Process pending spawns (from splitters etc.)
      for (let i = this.pendingSpawns.length - 1; i >= 0; i--) {
        this.pendingSpawns[i].delay -= dt;
        if (this.pendingSpawns[i].delay <= 0) {
          const s = this.pendingSpawns[i];
          this.enemies.push(new Enemy(this.path, s.config, s.progress));
          this.pendingSpawns.splice(i, 1);
        }
      }
      for (const e of this.enemies) e.update(dt, this.enemies);
      const projectilesBefore = this.projectiles.length;
      const buffs = {
        damageMul: this.metaMod.damageMul,
        rangeMul: this.metaMod.rangeMul,
        fireRateMul: this.metaMod.fireRateMul,
      };
      for (const t of this.towers) t.update(dt, this.enemies, this.projectiles, this.chainSegments, buffs);
      // Muzzle flash for any tower that fired
      for (let i = projectilesBefore; i < this.projectiles.length; i++) {
        const p = this.projectiles[i];
        // Find tower by proximity (first tower within 1.5 tiles is source)
        let best: typeof this.towers[number] | null = null;
        let bestD = Infinity;
        for (const t of this.towers) {
          const d = Math.hypot(t.x - p.x, t.y - p.y);
          if (d < bestD) { bestD = d; best = t; }
        }
        if (best && bestD < T * 1.5) {
          this.particles.muzzleFlash(best.x, best.y, best.turretRotation);
        }
      }
      const effectsBefore = this.effects.length;
      for (const p of this.projectiles) {
        p.update(dt, this.enemies, this.effects);
        // Missile trail particles (orange projectile)
        if (p.sprite === 'projectileMissile' && p.alive && Math.random() < 0.55) {
          this.particles.missileTrail(p.x, p.y);
        }
      }
      for (let i = effectsBefore; i < this.effects.length; i++) {
        const fx = this.effects[i];
        if (fx.color === '#ff9f43') {
          this.ctx.audio.explosion();
          this.ctx.renderer.shake(0.3, 5);
          this.particles.explosion(fx.x, fx.y, Math.min(1.5, fx.radius / 40));
        } else if (fx.color === '#6ec8ff') {
          this.ctx.audio.frost();
          this.particles.frostBurst(fx.x, fx.y);
        }
      }

      // Emit damage floaters for enemies hit this tick (while still alive)
      for (const e of this.enemies) {
        if (e.alive && e.damageTakenThisTick > 0) {
          const p = e.position();
          const dmg = Math.round(e.damageTakenThisTick);
          // Tier colors by magnitude (relative to enemy HP max)
          const ratio = e.damageTakenThisTick / e.hpMax;
          let color: string, size: number;
          if (ratio >= 0.5) { color = '#ff6b6b'; size = 18; }    // crit
          else if (ratio >= 0.2) { color = '#ff9f43'; size = 15; } // big
          else if (ratio >= 0.05) { color = '#ffd166'; size = 13; } // medium
          else { color = '#e4e9f0'; size = 11; }                   // chip
          this.spawnFloater(p.x + (Math.random() - 0.5) * 6, p.y - e.radius, `-${dmg}`, color, size);
        }
        e.damageTakenThisTick = 0;
      }

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        // Remove only after death fade completes
        if (!e.alive && e.deathAnim >= 1) {
          this.enemies.splice(i, 1);
          continue;
        }
        if (!e.alive && !e.processed) {
          e.processed = true;
          const p = e.position();
          if (e.reachedGoal) {
            this.state.lives--;
            this.spawnFloater(p.x, p.y, '-1 ❤', '#ff6b6b', 14);
            this.ctx.audio.leak();
            this.ctx.renderer.shake(0.2, 4);
          } else {
            const reward = Math.round(e.reward * this.metaMod.killRewardMul);
            this.state.gold += reward;
            this.state.kills++;
            this.ctx.save.stats.totalKills++;
            this.ctx.save.stats.totalGoldEarned += reward;
            this.spawnFloater(p.x, p.y, `+${reward}`, '#ffd166');
            this.ctx.audio.enemyDie();
            this.particles.enemyDeath(p.x, p.y);
            // Gold coins fly to HUD
            const screenPos = this.ctx.renderer.worldToScreenCss(p.x, p.y);
            // HUD gold text is at approximately (35, 20) CSS px from canvas top-left
            const coinCount = e.reward >= 40 ? 5 : e.reward >= 20 ? 4 : 3;
            this.screenParticles.spawnCoins(screenPos.x, screenPos.y, 35, 22, coinCount);
            // Trigger onDeath spawns
            for (const s of e.onDeathSpawn) {
              const cfg = ENEMY_TYPES[s.type];
              if (!cfg) continue;
              const modified: EnemyConfig = {
                ...cfg,
                hp: Math.round(cfg.hp * this.diffMod.hp),
                speed: Math.round(cfg.speed * this.diffMod.speed),
                reward: Math.max(1, Math.round(cfg.reward * this.diffMod.reward)),
              };
              for (let k = 0; k < s.count; k++) {
                this.pendingSpawns.push({
                  config: modified,
                  progress: e.progress,
                  delay: s.delay + k * 0.05,
                });
              }
            }
          }
        }
      }
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        if (!this.projectiles[i].alive) this.projectiles.splice(i, 1);
      }

      if (this.state.lives <= 0) {
        this.state.lives = 0;
        this.triggerLose();
      } else if (!this.waveMgr.isSpawning() && this.enemies.length === 0) {
        if (this.isEndless) {
          // Generate next wave on demand, never ends
          this.state.waveIndex++;
          this.state.status = 'idle';
          this.ctx.save.stats.totalWavesSurvived++;
          if (this.waves.length <= this.state.waveIndex) {
            this.waves.push(this.buildWave(generateEndlessWave(this.state.waveIndex + 1)));
          }
          // Endless reward: small gold bonus per wave cleared
          const bonus = 30 + this.state.waveIndex * 8;
          this.state.gold += bonus;
          this.spawnFloater(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, `波 ${this.state.waveIndex} 清除 +${bonus}g`, '#ffd166', 14);
        } else {
          const isLast = this.state.waveIndex >= this.waveMgr.totalWaves() - 1;
          if (isLast) this.triggerWin();
          else {
            this.state.waveIndex++;
            this.state.status = 'idle';
            this.ctx.save.stats.totalWavesSurvived++;
            const unlocked = this.ctx.achievements.check(this.ctx.save, {
              type: 'waveClear', wave: this.state.waveIndex,
            });
            if (unlocked.length > 0) this.ctx.audio.achievement();
          }
        }
      }
    }

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 12 * dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].life -= dt;
      if (this.effects[i].life <= 0) this.effects.splice(i, 1);
    }
    for (let i = this.chainSegments.length - 1; i >= 0; i--) {
      this.chainSegments[i].life -= dt;
      if (this.chainSegments[i].life <= 0) this.chainSegments.splice(i, 1);
    }
    this.particles.update(dt);
    this.screenParticles.update(dt);
    this.weather.update(dt);
  }

  override render(): void {
    const r = this.ctx.renderer;
    r.beginFrame();
    r.beginWorld();

    // Themed grass tiles (procedural, world-specific palette) + decorations
    const theme = themeForWorld(this.level.world);
    for (let gy = 0; gy < GRID_ROWS; gy++) {
      for (let gx = 0; gx < GRID_COLS; gx++) {
        drawGrassTile(r.ctx, gx * T, gy * T, T, theme);
      }
    }
    // Edge vignette — subtle dark radial mask
    const vg = r.ctx.createRadialGradient(
      WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH * 0.3,
      WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH * 0.7,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    r.ctx.fillStyle = vg;
    r.ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    for (const key of this.pathTiles) {
      const [txs, tys] = key.split(',');
      const tx = Number(txs);
      const ty = Number(tys);
      if (tx < 0 || tx >= GRID_COLS || ty < 0 || ty >= GRID_ROWS) continue;
      drawPathTile(r.ctx, tx * T, ty * T, T, theme);
    }

    // Obstacles (decorative + block tower placement)
    for (const ob of this.level.obstacles ?? []) {
      const cx = ob.x * T + T / 2;
      const cy = ob.y * T + T / 2;
      drawObstacle(r.ctx, ob.kind, cx, cy, T, this.elapsed);
    }

    // Flowing path indicators — dots slide along path showing direction
    const totalLen = this.path.totalLength;
    const dotSpacing = 60; // world px between dots
    const flowSpeed = 40; // world px per second
    const flowOffset = (this.elapsed * flowSpeed) % dotSpacing;
    for (let d = -flowOffset; d < totalLen; d += dotSpacing) {
      if (d < 0) continue;
      const p = this.path.pointAt(d);
      r.ctx.save();
      r.ctx.globalAlpha = 0.5;
      r.ctx.fillStyle = '#ffd166';
      r.ctx.beginPath();
      r.ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      r.ctx.fill();
      r.ctx.globalAlpha = 0.2;
      r.ctx.beginPath();
      r.ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      r.ctx.fill();
      r.ctx.restore();
    }

    for (const t of this.towers) {
      const lv = t.currentLevel();
      const effRange = lv.range * this.metaMod.rangeMul;
      const isSelected = this.selectedExisting === t;
      if (isSelected) {
        const pulse = 0.5 + Math.sin(this.elapsed * 3) * 0.5;
        r.ctx.save();
        r.ctx.globalAlpha = 0.6;
        r.drawCircleOutline(t.x, t.y, effRange, '#ffd166', 2);
        r.ctx.globalAlpha = 0.25 * pulse;
        r.drawCircleOutline(t.x, t.y, effRange + 4 + pulse * 6, '#ffd166', 2);
        r.ctx.restore();
        r.ctx.save();
        r.ctx.globalAlpha = 0.06;
        r.drawCircle(t.x, t.y, effRange, '#ffd166');
        r.ctx.restore();
      } else {
        r.drawCircleOutline(t.x, t.y, effRange, 'rgba(255, 220, 120, 0.14)', 1);
      }
      drawTowerBase(r.ctx, t.x, t.y, T * 0.95);
      drawTowerTurret(r.ctx, t.config.id, t.x, t.y, t.turretRotation, t.level, t.fireAnim, t.buildAnim);
      // Level pips
      for (let i = 0; i <= t.level; i++) {
        r.drawCircle(t.x - 10 + i * 7, t.y + T * 0.4, 2.5, '#ffd166');
      }
    }

    // Placement ghost — hovering a tile with tower selected
    if (this.hoverTile && !this.selectedExisting && this.state.status !== 'won' && this.state.status !== 'lost') {
      const { x: tx, y: ty } = this.hoverTile;
      const key = `${tx},${ty}`;
      const cfg = TOWER_TYPES[this.selectedTowerId];
      const onPath = this.pathTiles.has(key);
      const occupied = this.occupiedTiles.has(key) || this.obstacleTiles.has(key);
      const canAfford = cfg ? this.state.gold >= cfg.levels[0].cost : false;
      const validSpot = !onPath && !occupied && canAfford;
      const cx = tx * T + T / 2;
      const cy = ty * T + T / 2;
      const color = validSpot ? 'rgba(110, 235, 140, 0.35)' : 'rgba(255, 80, 80, 0.3)';
      r.drawRect(tx * T, ty * T, T, T, color);
      const edge = validSpot ? '#6ee17a' : '#ff6b6b';
      r.drawRect(tx * T, ty * T, T, 2, edge);
      r.drawRect(tx * T, (ty + 1) * T - 2, T, 2, edge);
      r.drawRect(tx * T, ty * T, 2, T, edge);
      r.drawRect((tx + 1) * T - 2, ty * T, 2, T, edge);
      if (validSpot && cfg) {
        r.ctx.save();
        r.ctx.globalAlpha = 0.5;
        drawTowerBase(r.ctx, cx, cy, T * 0.95);
        drawTowerTurret(r.ctx, cfg.id, cx, cy, 0, 0, 0, 0);
        r.ctx.restore();
        r.drawCircleOutline(cx, cy, cfg.levels[0].range, 'rgba(110, 235, 140, 0.5)', 1.5);
      }
    }

    for (const e of this.enemies) {
      const p = e.position();
      if (e.alive && e.healsNearby) {
        r.drawCircleOutline(p.x, p.y, e.healsNearby.radius, 'rgba(110, 235, 140, 0.25)', 1);
      }
      drawEnemy(r.ctx, e.sprite, p.x, p.y, e.rotation, e.spriteSize, e.hitFlash, e.age, e.deathAnim);
      if (e.alive) {
        if (e.isSlowed()) {
          r.drawCircleOutline(p.x, p.y, e.radius + 3, 'rgba(110, 200, 255, 0.9)', 1.5);
        }
        if (e.damageResist > 0.2) {
          r.drawCircleOutline(p.x, p.y, e.radius + 1, 'rgba(200, 120, 255, 0.5)', 1);
        }
        const ratio = Math.max(0, e.hp / e.hpMax);
        const bw = e.radius * 2;
        r.drawRect(p.x - e.radius, p.y - e.radius - 8, bw, 3, 'rgba(0,0,0,0.6)');
        const hpColor = ratio > 0.6 ? '#6ee17a' : ratio > 0.3 ? '#ffd166' : '#ff6b6b';
        r.drawRect(p.x - e.radius, p.y - e.radius - 8, bw * ratio, 3, hpColor);
      }
    }

    for (const p of this.projectiles) {
      drawProjectile(r.ctx, p.sprite, p.x, p.y, p.rotation);
    }

    // Particles (world space, on top of projectiles)
    this.particles.render(r.ctx);
    // Weather (ambient, rendered above entities for ember/mist immersion)
    this.weather.render(r.ctx);

    for (const fx of this.effects) {
      const t = 1 - fx.life / fx.maxLife;
      const radius = fx.radius * (0.3 + t * 0.9);
      const alpha = fx.life / fx.maxLife;
      r.ctx.globalAlpha = alpha;
      r.drawCircleOutline(fx.x, fx.y, radius, fx.color, 3);
      r.ctx.globalAlpha = alpha * 0.3;
      r.drawCircle(fx.x, fx.y, radius * 0.6, fx.color);
      r.ctx.globalAlpha = 1;
    }

    // Chain lightning segments — multi-node jagged + glow core + end sparks
    for (const seg of this.chainSegments) {
      const alpha = seg.life / seg.maxLife;
      const dx = seg.x2 - seg.x1;
      const dy = seg.y2 - seg.y1;
      const len = Math.hypot(dx, dy);
      const perp = { x: -dy / len, y: dx / len };
      // Pre-compute 5-node jagged path
      const nodes: { x: number; y: number }[] = [{ x: seg.x1, y: seg.y1 }];
      for (let s = 1; s < 5; s++) {
        const t = s / 5;
        const jx = seg.x1 + dx * t + perp.x * (Math.random() - 0.5) * 14;
        const jy = seg.y1 + dy * t + perp.y * (Math.random() - 0.5) * 14;
        nodes.push({ x: jx, y: jy });
      }
      nodes.push({ x: seg.x2, y: seg.y2 });

      r.ctx.save();
      // Outer glow (blue halo)
      r.ctx.globalCompositeOperation = 'lighter';
      r.ctx.globalAlpha = alpha * 0.35;
      r.ctx.strokeStyle = '#6ec8ff';
      r.ctx.lineWidth = 7;
      r.ctx.lineCap = 'round';
      r.ctx.beginPath();
      r.ctx.moveTo(nodes[0].x, nodes[0].y);
      for (let i = 1; i < nodes.length; i++) r.ctx.lineTo(nodes[i].x, nodes[i].y);
      r.ctx.stroke();
      // Main bolt
      r.ctx.globalAlpha = alpha;
      r.ctx.strokeStyle = '#c8e8ff';
      r.ctx.lineWidth = 3;
      r.ctx.stroke();
      // White core
      r.ctx.strokeStyle = '#ffffff';
      r.ctx.lineWidth = 1.2;
      r.ctx.stroke();
      // Endpoint sparks
      for (const pt of [nodes[0], nodes[nodes.length - 1]]) {
        r.ctx.globalAlpha = alpha * 0.9;
        r.ctx.fillStyle = '#ffffff';
        r.ctx.beginPath();
        r.ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        r.ctx.fill();
      }
      r.ctx.restore();
    }

    for (const f of this.floaters) {
      const t = f.life / f.maxLife;
      const alpha = Math.max(0, Math.min(1, t));
      // Punch-in: scale starts at 1.6 and settles to 1.0
      const punch = 1 + Math.max(0, (1 - t) < 0.2 ? 0 : t * 0.6);
      r.ctx.save();
      r.ctx.globalAlpha = alpha;
      r.ctx.translate(f.x, f.y - 20);
      r.ctx.scale(punch, punch);
      // Dark outline for legibility
      r.ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      r.ctx.lineWidth = 3;
      r.ctx.font = `bold ${f.size}px system-ui, sans-serif`;
      r.ctx.textAlign = 'center';
      r.ctx.textBaseline = 'middle';
      r.ctx.strokeText(f.text, 0, 0);
      r.ctx.fillStyle = f.color;
      r.ctx.fillText(f.text, 0, 0);
      r.ctx.restore();
      r.ctx.globalAlpha = 1;
    }

    r.beginScreen();
    const vw = this.ctx.renderer.vw();
    const vh = this.ctx.renderer.vh();

    const hudVisible = !this.dialogue.isActive();
    this.towerSelectorRects = [];
    this.nextWaveBtn = null;
    this.pauseBtn = null;
    this.speedBtn = null;
    this.resumeBtn = null;
    this.retryBtn = null;
    this.backToLevelsBtn = null;
    this.nextLevelBtn = null;
    this.endRetryBtn = null;
    this.endBackBtn = null;
    this.upgradeBtn = null;
    this.sellBtn = null;
    this.closePanelBtn = null;

    if (hudVisible) {
      this.renderHUD(r, vw);
      this.renderNextWavePreview(r, vw);

      if (this.state.status !== 'won' && this.state.status !== 'lost') {
        if (this.selectedExisting) {
          this.renderUpgradePanel(r, vw, vh);
        } else {
          this.renderTowerSelector(r, vw, vh);
        }
      }

      if (this.state.status === 'idle' && this.state.waveIndex < this.waveMgr.totalWaves() && !this.selectedExisting) {
        const bw = 220, bh = 56;
        // Place above the (now taller) tower selector bar
        const selectorBarH = 94;
        const bx = (vw - bw) / 2, by = vh - selectorBarH - bh - 10;
        this.nextWaveBtn = { x: bx, y: by, w: bw, h: bh };
        const pulse = 0.85 + Math.sin(this.elapsed * 3) * 0.15;
        r.ctx.globalAlpha = pulse;
        r.drawScreenRoundedRect(bx + 2, by + 3, bw, bh, 12, 'rgba(0,0,0,0.35)');
        r.drawScreenRoundedRect(bx, by, bw, bh, 12, '#2c8cc7');
        r.drawScreenRoundedRectOutline(bx, by, bw, bh, 12, '#5eb8ff', 2);
        r.ctx.globalAlpha = 1;
        r.drawTextScreenCenter(`▶ Start Wave ${this.state.waveIndex + 1}`, bx + bw / 2, by + bh / 2, '#fff', 17, true);
      }
    }

    // Boss entrance red flash (fade)
    if (this.bossEntranceFlash > 0) {
      r.ctx.save();
      r.ctx.globalAlpha = this.bossEntranceFlash * 0.35;
      r.drawScreenRect(0, 0, vw, vh, '#ff3030');
      r.ctx.restore();
    }

    // Wave banner overlay
    renderBanner(r.ctx, this.banner, vw, vh);

    // Achievement toasts
    this.renderAchievementToasts(r, vw);

    // Pause overlay
    if (this.paused) this.renderPauseOverlay(r, vw, vh);

    // End overlay
    if (this.state.status === 'won' || this.state.status === 'lost') this.renderEndOverlay(r, vw, vh);

    // Screen-space homing coins (render above HUD so they land on the counter)
    this.screenParticles.render(r.ctx);

    // Star rain (on top of everything)
    if (this.starRain.length > 0) {
      const dpr = window.devicePixelRatio || 1;
      r.ctx.save();
      for (const s of this.starRain) {
        const alpha = Math.max(0, Math.min(1, s.life / 2));
        r.ctx.save();
        r.ctx.globalAlpha = alpha;
        r.ctx.translate(s.x * dpr, s.y * dpr);
        r.ctx.rotate(s.rot);
        r.ctx.fillStyle = '#ffd166';
        r.ctx.shadowColor = '#ffd166';
        r.ctx.shadowBlur = 8 * dpr;
        r.ctx.font = `bold ${s.size * dpr}px system-ui, sans-serif`;
        r.ctx.textAlign = 'center';
        r.ctx.textBaseline = 'middle';
        r.ctx.fillText('★', 0, 0);
        r.ctx.restore();
      }
      r.ctx.restore();
    }

    this.dialogue.render(r);
  }

  private renderHUD(r: import('../engine/Renderer.ts').Renderer, vw: number): void {
    r.drawScreenVerticalGradient(0, 0, vw, 62, 'rgba(8,12,22,0.95)', 'rgba(8,12,22,0.7)');

    const goldPulseScale = this.goldPulse > 0 ? 1 + (this.goldPulse / 0.35) * (this.goldPulseSign > 0 ? 0.25 : 0.15) : 1;
    const goldColor = this.goldPulse > 0 ? (this.goldPulseSign > 0 ? '#fff3a8' : '#ff9f43') : '#ffd166';
    const goldSize = Math.round(17 * goldPulseScale);
    r.drawTextScreen(`💰 ${this.state.gold}`, 12, 12 - (goldSize - 17) / 2, goldColor, goldSize, true);

    const lifePulseScale = this.lifePulse > 0 ? 1 + (this.lifePulse / 0.5) * 0.3 : 1;
    const lifeColor = this.lifePulse > 0 ? '#ffffff' : '#ff8a8a';
    const lifeSize = Math.round(17 * lifePulseScale);
    r.drawTextScreen(`❤ ${this.state.lives}`, 110, 12 - (lifeSize - 17) / 2, lifeColor, lifeSize, true);
    if (this.isEndless) {
      r.drawTextScreen(`⚑ 無盡 ${this.state.waveIndex + 1}`, 184, 12, '#c878ff', 16, true);
    } else {
      const waveDisplay = Math.min(this.state.waveIndex + 1, this.waveMgr.totalWaves());
      r.drawTextScreen(`⚑ ${waveDisplay}/${this.waveMgr.totalWaves()}`, 184, 12, COLORS.text, 16, true);
    }

    // Right side: difficulty, speed, pause
    const rightX = vw - 12;
    const pbW = 40, pbH = 32;
    this.pauseBtn = { x: rightX - pbW, y: 10, w: pbW, h: pbH };
    r.drawScreenRoundedRect(this.pauseBtn.x, this.pauseBtn.y, pbW, pbH, 7, '#22304a');
    r.drawTextScreenCenter('⏸', this.pauseBtn.x + pbW / 2, this.pauseBtn.y + pbH / 2, '#fff', 15, true);

    const sbW = 52;
    this.speedBtn = { x: rightX - pbW - 6 - sbW, y: 10, w: sbW, h: pbH };
    const speed = SPEEDS[this.speedIdx];
    const speedColor = speed === 1 ? '#22304a' : speed === 2 ? '#2c8cc7' : '#c74e2c';
    r.drawScreenRoundedRect(this.speedBtn.x, this.speedBtn.y, sbW, pbH, 7, speedColor);
    r.drawTextScreenCenter(`▶ ${speed}×`, this.speedBtn.x + sbW / 2, this.speedBtn.y + pbH / 2, '#fff', 13, true);

    // Difficulty badge (only if not normal)
    if (this.difficulty !== 'normal') {
      const badgeX = this.speedBtn.x - 6 - 54;
      r.drawScreenRoundedRect(badgeX, 10, 54, pbH, 7, 'rgba(0,0,0,0.35)');
      r.drawScreenRoundedRectOutline(badgeX, 10, 54, pbH, 7, this.diffMod.color, 1);
      r.drawTextScreenCenter(this.diffMod.label, badgeX + 27, 10 + pbH / 2, this.diffMod.color, 11, true);
    }

    r.drawTextScreen(this.level.name, 12, 44, COLORS.text, 12, true);
    if (this.ctx.save.settings.showFps) {
      r.drawTextScreen(`FPS ${this.ctx.getFps()}`, vw - 62, 44, COLORS.textDim, 10);
    }

    let statusText = '';
    if (this.state.status === 'idle') {
      statusText = this.state.waveIndex === 0 ? '準備就緒 — 點擊 Start' : `下波：${this.state.waveIndex + 1} / ${this.waveMgr.totalWaves()}`;
    } else if (this.state.status === 'playing') {
      statusText = this.waveMgr.isSpawning() ? '正在湧入…' : '清除殘敵';
    }
    if (statusText) r.drawTextScreen(statusText, 12, 62, COLORS.textDim, 11);
  }

  private renderNextWavePreview(r: import('../engine/Renderer.ts').Renderer, vw: number): void {
    if (this.state.status !== 'idle') return;
    if (this.state.waveIndex >= this.waveMgr.totalWaves()) return;
    const wave = this.waves[this.state.waveIndex];
    if (!wave || wave.length === 0) return;

    // Count enemies by sprite for compact preview
    const counts = new Map<string, { cfg: EnemyConfig; count: number }>();
    for (const entry of wave) {
      const key = entry.enemy.sprite;
      const existing = counts.get(key);
      if (existing) existing.count++;
      else counts.set(key, { cfg: entry.enemy, count: 1 });
    }

    const groups = Array.from(counts.values());
    const iconSize = 28;
    const itemW = iconSize + 28;
    const panelH = 42;
    const panelW = Math.min(vw - 24, groups.length * itemW + 72);
    const x = (vw - panelW) / 2;
    const y = 84;

    r.drawScreenRoundedRect(x, y, panelW, panelH, 8, 'rgba(8,12,22,0.86)');
    r.drawScreenRoundedRectOutline(x, y, panelW, panelH, 8, '#22304a', 1);
    r.drawTextScreen('下波預覽', x + 10, y + 6, '#ffd166', 10, true);

    const startX = x + 60;
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const ix = startX + i * itemW;
      const iy = y + (panelH - iconSize) / 2;
      drawEnemyIconScreen(r.ctx, g.cfg.sprite, ix, iy, iconSize);
      r.drawTextScreen(`×${g.count}`, ix + iconSize + 2, iy + 8, COLORS.text, 11, true);
    }
  }

  private renderAchievementToasts(r: import('../engine/Renderer.ts').Renderer, vw: number): void {
    const toasts = this.ctx.achievements.getToasts();
    if (toasts.length === 0) return;
    let y = 108;
    for (const t of toasts) {
      const alpha = Math.min(1, t.time / 0.4);
      r.ctx.globalAlpha = alpha;
      const w = 280, h = 52;
      const x = (vw - w) / 2;
      r.drawScreenRoundedRect(x + 2, y + 3, w, h, 10, 'rgba(0,0,0,0.5)');
      r.drawScreenRoundedRect(x, y, w, h, 10, '#1b2e22');
      r.drawScreenRoundedRectOutline(x, y, w, h, 10, '#6ee17a', 2);
      r.drawTextScreenCenter(t.achievement.icon, x + 26, y + h / 2, '#ffd166', 22, true);
      r.drawTextScreen('✦ 成就解鎖', x + 52, y + 8, '#6ee17a', 9, true);
      r.drawTextScreen(t.achievement.title, x + 52, y + 22, '#ffd166', 13, true);
      r.drawTextScreen(t.achievement.description, x + 52, y + 38, COLORS.textDim, 9);
      r.ctx.globalAlpha = 1;
      y += h + 6;
    }
  }

  private renderPauseOverlay(r: import('../engine/Renderer.ts').Renderer, vw: number, vh: number): void {
    r.drawScreenRect(0, 0, vw, vh, 'rgba(5, 8, 16, 0.78)');
    r.drawTextScreenCenter('已暫停', vw / 2, vh / 2 - 130, '#ffd166', 28, true);
    r.drawTextScreenCenter(this.level.name, vw / 2, vh / 2 - 100, COLORS.textDim, 12);

    const bw = 240, bh = 46, gap = 10;
    const cx = (vw - bw) / 2;
    let y = vh / 2 - 40;
    this.resumeBtn = { x: cx, y, w: bw, h: bh };
    r.drawScreenRoundedRect(cx, y, bw, bh, 10, '#2c8cc7');
    r.drawTextScreenCenter('▶ 繼續', cx + bw / 2, y + bh / 2, '#fff', 15, true);

    y += bh + gap;
    this.retryBtn = { x: cx, y, w: bw, h: bh };
    r.drawScreenRoundedRect(cx, y, bw, bh, 10, '#22304a');
    r.drawTextScreenCenter('↻ 重新開始', cx + bw / 2, y + bh / 2, '#fff', 15, true);

    y += bh + gap;
    this.backToLevelsBtn = { x: cx, y, w: bw, h: bh };
    r.drawScreenRoundedRect(cx, y, bw, bh, 10, '#22304a');
    r.drawTextScreenCenter('✕ 返回選單', cx + bw / 2, y + bh / 2, '#fff', 15, true);
  }

  private renderEndOverlay(r: import('../engine/Renderer.ts').Renderer, vw: number, vh: number): void {
    const isWin = this.state.status === 'won';
    r.drawScreenRect(0, 0, vw, vh, 'rgba(5, 8, 16, 0.88)');
    if (this.isEndless) {
      r.drawTextScreenCenter('SURVIVED', vw / 2, vh / 2 - 140, '#c878ff', 36, true);
      r.drawTextScreenCenter(this.level.name, vw / 2, vh / 2 - 100, COLORS.text, 14);
      const survived = this.state.waveIndex;
      r.drawTextScreenCenter(`撐過 ${survived} 波`, vw / 2, vh / 2 - 60, '#ffd166', 22, true);
      r.drawTextScreenCenter(`擊殺 ${this.state.kills}  ·  ${this.diffMod.label}`, vw / 2, vh / 2 - 28, COLORS.text, 12);
      const best = this.ctx.save.endlessHighScore;
      if (best) {
        const isNew = best.waves === survived && best.date > Date.now() - 5000;
        const prefix = isNew ? '✨ 新紀錄 ' : '最佳紀錄 ';
        r.drawTextScreenCenter(`${prefix}${best.waves} 波 (${best.difficulty})`, vw / 2, vh / 2 - 4, isNew ? '#6ee17a' : COLORS.textDim, 12, true);
      }
      const bw = 240, bh = 46, gap = 10;
      const cx = (vw - bw) / 2;
      let y = vh / 2 + 28;
      this.endRetryBtn = { x: cx, y, w: bw, h: bh };
      r.drawScreenRoundedRect(cx, y, bw, bh, 10, '#2c8cc7');
      r.drawScreenRoundedRectOutline(cx, y, bw, bh, 10, '#5eb8ff', 1);
      r.drawTextScreenCenter('↻ 再戰一回', cx + bw / 2, y + bh / 2, '#fff', 14, true);
      y += bh + gap;
      this.endBackBtn = { x: cx, y, w: bw, h: bh };
      r.drawScreenRoundedRect(cx, y, bw, bh, 10, '#22304a');
      r.drawTextScreenCenter('✕ 返回主選單', cx + bw / 2, y + bh / 2, '#fff', 14, true);
      return;
    }
    r.drawTextScreenCenter(isWin ? 'VICTORY' : 'GAME OVER', vw / 2, vh / 2 - 140, isWin ? '#6ee17a' : '#ff6b6b', 38, true);
    r.drawTextScreenCenter(this.level.name, vw / 2, vh / 2 - 100, COLORS.text, 14);

    if (isWin) {
      const stars = getStars(this.ctx.save, this.level.id);
      // Animated stars
      const starSpacing = 48;
      const starCount = 3;
      const startX = vw / 2 - (starSpacing * (starCount - 1)) / 2;
      for (let i = 0; i < starCount; i++) {
        const earned = i < stars;
        const pulse = earned ? (1 + Math.sin(this.elapsed * 4 + i * 0.5) * 0.1) : 1;
        r.drawTextScreenCenter(earned ? '★' : '☆', startX + i * starSpacing, vh / 2 - 60,
          earned ? '#ffd166' : '#4a5568', 36 * pulse, true);
      }
      r.drawTextScreenCenter(
        `擊殺 ${this.state.kills}  ·  剩餘 ${this.state.lives}/${this.level.startingLives}  ·  ${this.diffMod.label}`,
        vw / 2, vh / 2 - 14, COLORS.text, 12,
      );
    } else {
      r.drawTextScreenCenter('基地失守。撤退。', vw / 2, vh / 2 - 48, COLORS.textDim, 14);
    }

    const bw = 240, bh = 46, gap = 10;
    const cx = (vw - bw) / 2;
    let y = vh / 2 + 26;

    const nextLevel = isWin ? this.nextLevelOrNull() : null;
    if (nextLevel) {
      this.nextLevelBtn = { x: cx, y, w: bw, h: bh };
      r.drawScreenRoundedRect(cx, y, bw, bh, 10, '#2c8cc7');
      r.drawScreenRoundedRectOutline(cx, y, bw, bh, 10, '#5eb8ff', 1);
      r.drawTextScreenCenter(`▶ 下一關：${nextLevel.name}`, cx + bw / 2, y + bh / 2, '#fff', 13, true);
      y += bh + gap;
    }

    this.endRetryBtn = { x: cx, y, w: bw, h: bh };
    r.drawScreenRoundedRect(cx, y, bw, bh, 10, '#22304a');
    r.drawTextScreenCenter('↻ 重玩本關', cx + bw / 2, y + bh / 2, '#fff', 14, true);

    y += bh + gap;
    this.endBackBtn = { x: cx, y, w: bw, h: bh };
    r.drawScreenRoundedRect(cx, y, bw, bh, 10, '#22304a');
    r.drawTextScreenCenter('✕ 返回選單', cx + bw / 2, y + bh / 2, '#fff', 14, true);
  }

  private renderTowerSelector(r: import('../engine/Renderer.ts').Renderer, vw: number, vh: number): void {
    const n = this.availableTowers.length;
    // Fit buttons to screen width with 4px gap; cap between 50-72px
    const gap = 4;
    const maxBtn = Math.min(72, Math.floor((vw - 20 - gap * (n - 1)) / n));
    const btnSize = Math.max(50, maxBtn);
    const totalW = btnSize * n + gap * (n - 1);
    const startX = (vw - totalW) / 2;
    const barH = btnSize + 22; // extra vertical room for larger cost label
    const selY = vh - barH;

    r.drawScreenRect(0, selY - 4, vw, barH + 4, 'rgba(8, 12, 22, 0.92)');

    const costBandH = 18;
    const iconArea = btnSize - costBandH - 2;

    for (let i = 0; i < n; i++) {
      const id = this.availableTowers[i];
      const cfg = TOWER_TYPES[id];
      if (!cfg) continue;
      const bx = startX + i * (btnSize + gap);
      const by = selY;
      const rect: Rect = { x: bx, y: by, w: btnSize, h: btnSize + 4 };
      this.towerSelectorRects.push({ id, rect });

      const rawCost = cfg.levels[0].cost;
      const baseCost = Math.round(rawCost * (1 - this.metaMod.costDiscount));
      const affordable = this.state.gold >= baseCost;
      const selected = id === this.selectedTowerId;
      r.drawScreenRoundedRect(bx, by, btnSize, btnSize, 8, affordable ? '#22304a' : '#1a1a22');
      drawTowerIconScreen(r.ctx, id, bx + 4, by + 2, iconArea, 0);
      // Cost band at bottom — darker background for legibility
      r.drawScreenRect(bx + 2, by + btnSize - costBandH, btnSize - 4, costBandH, 'rgba(0,0,0,0.4)');
      r.drawTextScreenCenter(
        `💰${baseCost}`,
        bx + btnSize / 2,
        by + btnSize - costBandH / 2,
        affordable ? '#ffd166' : '#888',
        14,
        true,
      );
      if (selected) r.drawScreenRoundedRectOutline(bx, by, btnSize, btnSize, 8, '#ffd166', 2.5);
      if (!affordable) r.drawScreenRect(bx, by, btnSize, btnSize, 'rgba(8,12,22,0.55)');
    }
  }

  private renderUpgradePanel(r: import('../engine/Renderer.ts').Renderer, vw: number, _vh: number): void {
    const t = this.selectedExisting;
    if (!t) return;
    const vh = this.ctx.renderer.vh();
    const panelH = 128;
    const panelY = vh - panelH - 8;
    r.drawScreenRect(0, panelY, vw, panelH + 8, 'rgba(8, 12, 22, 0.95)');
    r.drawScreenRect(0, panelY, vw, 2, 'rgba(255,215,100,0.4)');

    const lv = t.currentLevel();
    const title = `${t.config.name} · Lv ${t.level + 1}`;
    r.drawTextScreen(title, 16, panelY + 10, '#ffd166', 17, true);
    r.drawTextScreen(
      `DMG ${lv.damage}  ·  RNG ${(lv.range / T).toFixed(1)}t  ·  ${lv.fireRate.toFixed(1)}/s` +
      (t.config.splashRadius ? `  · AOE` : '') +
      (t.config.slowDuration ? `  · SLOW` : ''),
      16, panelY + 36, COLORS.text, 13,
    );

    const bw = (vw - 32 - 16) / 3;
    const bh = 46;
    const by = panelY + 68;
    const padX = 16;

    const canUp = t.canUpgrade();
    const upCost = Math.round(t.nextUpgradeCost() * (1 - this.metaMod.costDiscount));
    const canAfford = canUp && this.state.gold >= upCost;
    this.upgradeBtn = { x: padX, y: by, w: bw, h: bh };
    r.drawScreenRoundedRect(padX, by, bw, bh, 9, canAfford ? '#2c8cc7' : '#22304a');
    if (canUp) {
      r.drawTextScreenCenter(`⬆ 升級`, padX + bw / 2, by + bh / 2 - 8, '#fff', 14, true);
      r.drawTextScreenCenter(`💰${upCost}`, padX + bw / 2, by + bh / 2 + 11, canAfford ? '#ffd166' : '#888', 14, true);
    } else {
      r.drawTextScreenCenter('滿級', padX + bw / 2, by + bh / 2, '#ffd166', 16, true);
    }

    const sellVal = t.sellValue(this.metaMod.sellBonus);
    const sellX = padX + bw + 8;
    this.sellBtn = { x: sellX, y: by, w: bw, h: bh };
    r.drawScreenRoundedRect(sellX, by, bw, bh, 9, '#22304a');
    r.drawTextScreenCenter('出售', sellX + bw / 2, by + bh / 2 - 8, '#fff', 14, true);
    r.drawTextScreenCenter(`+💰${sellVal}`, sellX + bw / 2, by + bh / 2 + 11, '#ffd166', 14, true);

    const closeX = sellX + bw + 8;
    this.closePanelBtn = { x: closeX, y: by, w: bw, h: bh };
    r.drawScreenRoundedRect(closeX, by, bw, bh, 9, '#1a1a22');
    r.drawTextScreenCenter('✕ 關閉', closeX + bw / 2, by + bh / 2, '#fff', 14, true);
  }

  private cycleSpeed(): void {
    this.speedIdx = (this.speedIdx + 1) % SPEEDS.length;
    this.ctx.setSpeed(SPEEDS[this.speedIdx]);
    this.ctx.audio.click();
  }

  override onTap(screenX: number, screenY: number, worldX: number, worldY: number): void {
    if (this.dialogue.isActive()) {
      this.ctx.audio.dialog();
      this.dialogue.advance();
      return;
    }

    if (this.paused) {
      if (this.resumeBtn && this.inside(screenX, screenY, this.resumeBtn)) { this.ctx.audio.click(); this.paused = false; return; }
      if (this.retryBtn && this.inside(screenX, screenY, this.retryBtn)) {
        this.ctx.audio.click();
        this.resetLevel();
        if (this.level.intro && this.level.intro.length > 0) {
          this.state.status = 'intro';
          this.dialogue.show(this.level.intro, () => { this.state.status = 'idle'; });
        }
        return;
      }
      if (this.backToLevelsBtn && this.inside(screenX, screenY, this.backToLevelsBtn)) {
        this.ctx.audio.click();
        this.ctx.transition(new LevelSelectScene(this.ctx));
        return;
      }
      return;
    }

    if (this.state.status === 'won' || this.state.status === 'lost') {
      if (this.nextLevelBtn && this.inside(screenX, screenY, this.nextLevelBtn)) {
        this.ctx.audio.click();
        const next = this.nextLevelOrNull();
        if (next) this.ctx.transition(new GameScene(this.ctx, next));
        return;
      }
      if (this.endRetryBtn && this.inside(screenX, screenY, this.endRetryBtn)) {
        this.ctx.audio.click();
        this.resetLevel();
        if (this.level.intro && this.level.intro.length > 0) {
          this.state.status = 'intro';
          this.dialogue.show(this.level.intro, () => { this.state.status = 'idle'; });
        }
        this.ctx.playBgm(bgmForWorld(this.level.world));
        return;
      }
      if (this.endBackBtn && this.inside(screenX, screenY, this.endBackBtn)) {
        this.ctx.audio.click();
        this.ctx.transition(new LevelSelectScene(this.ctx));
        return;
      }
      return;
    }

    if (this.pauseBtn && this.inside(screenX, screenY, this.pauseBtn)) { this.ctx.audio.click(); this.paused = true; return; }
    if (this.speedBtn && this.inside(screenX, screenY, this.speedBtn)) { this.cycleSpeed(); return; }

    if (this.selectedExisting) {
      if (this.upgradeBtn && this.inside(screenX, screenY, this.upgradeBtn)) {
        const t = this.selectedExisting;
        if (t.canUpgrade()) {
          const cost = Math.round(t.nextUpgradeCost() * (1 - this.metaMod.costDiscount));
          if (this.state.gold >= cost) {
            this.state.gold -= cost;
            t.upgrade();
            this.ctx.audio.upgrade();
          }
        }
        return;
      }
      if (this.sellBtn && this.inside(screenX, screenY, this.sellBtn)) {
        const t = this.selectedExisting;
        this.state.gold += t.sellValue(this.metaMod.sellBonus);
        const idx = this.towers.indexOf(t);
        if (idx >= 0) this.towers.splice(idx, 1);
        this.occupiedTiles.delete(`${t.tileX},${t.tileY}`);
        this.selectedExisting = null;
        this.ctx.audio.sell();
        return;
      }
      if (this.closePanelBtn && this.inside(screenX, screenY, this.closePanelBtn)) {
        this.ctx.audio.click();
        this.selectedExisting = null;
        return;
      }
    } else {
      for (const b of this.towerSelectorRects) {
        if (this.inside(screenX, screenY, b.rect)) {
          this.ctx.audio.click();
          this.selectedTowerId = b.id;
          return;
        }
      }
      if (this.state.status === 'idle' && this.nextWaveBtn && this.inside(screenX, screenY, this.nextWaveBtn)) {
        this.tryStartNextWave();
        return;
      }
    }

    // World tap
    const tx = Math.floor(worldX / T);
    const ty = Math.floor(worldY / T);
    if (tx < 0 || tx >= GRID_COLS || ty < 0 || ty >= GRID_ROWS) {
      this.selectedExisting = null;
      return;
    }
    const key = `${tx},${ty}`;

    const existing = this.towers.find((t) => t.tileX === tx && t.tileY === ty);
    if (existing) {
      this.selectedExisting = this.selectedExisting === existing ? null : existing;
      return;
    }

    if (this.selectedExisting) {
      this.selectedExisting = null;
      return;
    }

    if (this.pathTiles.has(key) || this.occupiedTiles.has(key) || this.obstacleTiles.has(key)) return;
    const cfg = TOWER_TYPES[this.selectedTowerId];
    if (!cfg) return;
    const baseCost = Math.round(cfg.levels[0].cost * (1 - this.metaMod.costDiscount));
    if (this.state.gold < baseCost) return;
    this.state.gold -= baseCost;
    this.towers.push(new Tower(tx, ty, T, cfg));
    this.occupiedTiles.add(key);
    this.ctx.save.stats.totalTowersBuilt++;
    const unlocked = this.ctx.achievements.check(this.ctx.save, { type: 'towerPlaced', towerId: this.selectedTowerId });
    if (unlocked.length > 0) this.ctx.audio.achievement();
    this.ctx.audio.place();
  }
}
