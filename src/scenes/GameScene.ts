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
import {
  drawTowerBase, drawTowerTurret, drawEnemy, drawProjectile,
  drawTowerIconScreen, drawEnemyIconScreen,
} from '../graphics/SpritePainter.ts';

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
  private readonly dialogue = new DialogueBox();
  private readonly difficulty: Difficulty;
  private readonly diffMod: typeof DIFF_MOD[Difficulty];

  private selectedTowerId: string;
  private selectedExisting: Tower | null = null;
  private paused = false;
  private speedIdx = 0;
  private elapsed = 0;

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
    this.path = new Path(level.path.map((p) => ({ x: p.x * T, y: p.y * T })));
    this.pathTiles = this.path.computeOccupiedTiles(T);
    this.waves = level.waves.map((wave) => this.buildWave(wave));
    if (this.isEndless) {
      this.waves.push(this.buildWave(generateEndlessWave(1)));
    }
    const allow = new Set(level.availableTowers);
    this.availableTowers = TOWER_ORDER.filter((id) => allow.has(id));
    if (this.availableTowers.length === 0) throw new Error('No available towers');
    this.selectedTowerId = this.availableTowers[0];
    this.state = new GameState(level.startingGold, level.startingLives);
    this.waveMgr = new WaveManager(this.waves, this.path);
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
  }

  private triggerWin(): void {
    const ratio = this.state.lives / this.level.startingLives;
    const stars = ratio >= 1 ? 3 : ratio >= 0.5 ? 2 : 1;
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

    if (this.paused) return;

    if (this.state.status === 'playing') {
      this.waveMgr.update(dt, (e) => this.enemies.push(e));
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
      for (const t of this.towers) t.update(dt, this.enemies, this.projectiles, this.chainSegments);
      const effectsBefore = this.effects.length;
      for (const p of this.projectiles) p.update(dt, this.enemies, this.effects);
      for (let i = effectsBefore; i < this.effects.length; i++) {
        const fx = this.effects[i];
        if (fx.color === '#ff9f43') { this.ctx.audio.explosion(); this.ctx.renderer.shake(0.3, 5); }
        else if (fx.color === '#6ec8ff') this.ctx.audio.frost();
      }

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (!e.alive) {
          const p = e.position();
          if (e.reachedGoal) {
            this.state.lives--;
            this.spawnFloater(p.x, p.y, '-1 ❤', '#ff6b6b', 14);
            this.ctx.audio.leak();
            this.ctx.renderer.shake(0.2, 4);
          } else {
            this.state.gold += e.reward;
            this.state.kills++;
            this.ctx.save.stats.totalKills++;
            this.ctx.save.stats.totalGoldEarned += e.reward;
            this.spawnFloater(p.x, p.y, `+${e.reward}`, '#ffd166');
            this.ctx.audio.enemyDie();
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
          this.enemies.splice(i, 1);
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
  }

  override render(): void {
    const r = this.ctx.renderer;
    r.beginFrame();
    r.beginWorld();

    r.drawTileBackground(this.ctx.assets.get('grass'), 0, 0, WORLD_WIDTH, WORLD_HEIGHT, T);

    const pathImg = this.ctx.assets.get('path');
    for (const key of this.pathTiles) {
      const [txs, tys] = key.split(',');
      const tx = Number(txs);
      const ty = Number(tys);
      if (tx < 0 || tx >= GRID_COLS || ty < 0 || ty >= GRID_ROWS) continue;
      r.drawSprite(pathImg, tx * T + T / 2, ty * T + T / 2, T, T);
    }

    for (const t of this.towers) {
      const lv = t.currentLevel();
      const isSelected = this.selectedExisting === t;
      r.drawCircleOutline(
        t.x, t.y, lv.range,
        isSelected ? 'rgba(255, 220, 120, 0.42)' : 'rgba(255, 220, 120, 0.14)',
        isSelected ? 2 : 1,
      );
      drawTowerBase(r.ctx, t.x, t.y, T * 0.95);
      drawTowerTurret(r.ctx, t.config.id, t.x, t.y, t.turretRotation, t.level);
      // Level pips
      for (let i = 0; i <= t.level; i++) {
        r.drawCircle(t.x - 10 + i * 7, t.y + T * 0.4, 2.5, '#ffd166');
      }
    }

    for (const e of this.enemies) {
      const p = e.position();
      if (e.healsNearby) {
        r.drawCircleOutline(p.x, p.y, e.healsNearby.radius, 'rgba(110, 235, 140, 0.25)', 1);
      }
      drawEnemy(r.ctx, e.sprite, p.x, p.y, e.rotation, e.spriteSize, e.hitFlash);
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

    for (const p of this.projectiles) {
      drawProjectile(r.ctx, p.sprite, p.x, p.y, p.rotation);
    }

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

    // Chain lightning segments
    for (const seg of this.chainSegments) {
      const alpha = seg.life / seg.maxLife;
      r.ctx.save();
      r.ctx.globalAlpha = alpha;
      r.ctx.strokeStyle = '#9ecbff';
      r.ctx.lineWidth = 2;
      r.ctx.beginPath();
      r.ctx.moveTo(seg.x1, seg.y1);
      // Jagged midpoint for lightning feel
      const mx = (seg.x1 + seg.x2) / 2 + (Math.random() - 0.5) * 10;
      const my = (seg.y1 + seg.y2) / 2 + (Math.random() - 0.5) * 10;
      r.ctx.lineTo(mx, my);
      r.ctx.lineTo(seg.x2, seg.y2);
      r.ctx.stroke();
      r.ctx.globalAlpha = alpha * 0.4;
      r.ctx.strokeStyle = '#ffffff';
      r.ctx.lineWidth = 4;
      r.ctx.stroke();
      r.ctx.restore();
    }

    for (const f of this.floaters) {
      const alpha = Math.max(0, Math.min(1, f.life / f.maxLife));
      r.ctx.globalAlpha = alpha;
      r.drawTextWorld(f.text, f.x - 8, f.y - 20, f.color, f.size, true);
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
        const bx = (vw - bw) / 2, by = vh - 64 - bh - 14;
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

    // Achievement toasts
    this.renderAchievementToasts(r, vw);

    // Pause overlay
    if (this.paused) this.renderPauseOverlay(r, vw, vh);

    // End overlay
    if (this.state.status === 'won' || this.state.status === 'lost') this.renderEndOverlay(r, vw, vh);

    this.dialogue.render(r);
  }

  private renderHUD(r: import('../engine/Renderer.ts').Renderer, vw: number): void {
    r.drawScreenVerticalGradient(0, 0, vw, 62, 'rgba(8,12,22,0.95)', 'rgba(8,12,22,0.7)');

    r.drawTextScreen(`💰 ${this.state.gold}`, 12, 12, '#ffd166', 17, true);
    r.drawTextScreen(`❤ ${this.state.lives}`, 110, 12, '#ff8a8a', 17, true);
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
    const btnSize = 46, gap = 3;
    const n = this.availableTowers.length;
    const totalW = btnSize * n + gap * (n - 1);
    const startX = (vw - totalW) / 2;
    const selY = vh - 64;

    r.drawScreenRect(0, selY - 8, vw, btnSize + 16, 'rgba(8, 12, 22, 0.9)');

    for (let i = 0; i < n; i++) {
      const id = this.availableTowers[i];
      const cfg = TOWER_TYPES[id];
      if (!cfg) continue;
      const bx = startX + i * (btnSize + gap);
      const by = selY;
      const rect: Rect = { x: bx, y: by, w: btnSize, h: btnSize };
      this.towerSelectorRects.push({ id, rect });

      const baseCost = cfg.levels[0].cost;
      const affordable = this.state.gold >= baseCost;
      const selected = id === this.selectedTowerId;
      r.drawScreenRoundedRect(bx, by, btnSize, btnSize, 7, affordable ? '#22304a' : '#1a1a22');
      drawTowerIconScreen(r.ctx, id, bx + 5, by + 3, btnSize - 10, 0);
      r.drawTextScreenCenter(`${baseCost}`, bx + btnSize / 2, by + btnSize - 7, affordable ? '#ffd166' : '#666', 9, true);
      if (selected) r.drawScreenRoundedRectOutline(bx, by, btnSize, btnSize, 7, '#ffd166', 2);
      if (!affordable) r.drawScreenRect(bx, by, btnSize, btnSize, 'rgba(8,12,22,0.55)');
    }
  }

  private renderUpgradePanel(r: import('../engine/Renderer.ts').Renderer, vw: number, _vh: number): void {
    const t = this.selectedExisting;
    if (!t) return;
    const vh = this.ctx.renderer.vh();
    const panelH = 108;
    const panelY = vh - panelH - 8;
    r.drawScreenRect(0, panelY, vw, panelH + 8, 'rgba(8, 12, 22, 0.94)');
    r.drawScreenRect(0, panelY, vw, 1, 'rgba(255,215,100,0.3)');

    const lv = t.currentLevel();
    const title = `${t.config.name} · Lv ${t.level + 1}`;
    r.drawTextScreen(title, 14, panelY + 10, '#ffd166', 14, true);
    r.drawTextScreen(
      `DMG ${lv.damage}  RNG ${(lv.range / T).toFixed(1)}t  ${lv.fireRate.toFixed(1)}/s` +
      (t.config.splashRadius ? `  AOE` : '') +
      (t.config.slowDuration ? `  SLOW` : ''),
      14, panelY + 32, COLORS.text, 11,
    );

    const bw = (vw - 32 - 16) / 3;
    const bh = 38;
    const by = panelY + 58;
    const padX = 14;

    const canUp = t.canUpgrade();
    const upCost = t.nextUpgradeCost();
    const canAfford = canUp && this.state.gold >= upCost;
    this.upgradeBtn = { x: padX, y: by, w: bw, h: bh };
    r.drawScreenRoundedRect(padX, by, bw, bh, 8, canAfford ? '#2c8cc7' : '#22304a');
    if (canUp) {
      r.drawTextScreenCenter(`⬆ Upgrade`, padX + bw / 2, by + bh / 2 - 5, '#fff', 11, true);
      r.drawTextScreenCenter(`${upCost}g`, padX + bw / 2, by + bh / 2 + 9, canAfford ? '#ffd166' : '#666', 11, true);
    } else {
      r.drawTextScreenCenter('MAX LEVEL', padX + bw / 2, by + bh / 2, '#ffd166', 11, true);
    }

    const sellVal = t.sellValue();
    const sellX = padX + bw + 8;
    this.sellBtn = { x: sellX, y: by, w: bw, h: bh };
    r.drawScreenRoundedRect(sellX, by, bw, bh, 8, '#22304a');
    r.drawTextScreenCenter('💰 Sell', sellX + bw / 2, by + bh / 2 - 5, '#fff', 11, true);
    r.drawTextScreenCenter(`+${sellVal}g`, sellX + bw / 2, by + bh / 2 + 9, '#ffd166', 11, true);

    const closeX = sellX + bw + 8;
    this.closePanelBtn = { x: closeX, y: by, w: bw, h: bh };
    r.drawScreenRoundedRect(closeX, by, bw, bh, 8, '#1a1a22');
    r.drawTextScreenCenter('✕ 關閉', closeX + bw / 2, by + bh / 2, '#fff', 12, true);
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
          const cost = t.nextUpgradeCost();
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
        this.state.gold += t.sellValue();
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

    if (this.pathTiles.has(key) || this.occupiedTiles.has(key)) return;
    const cfg = TOWER_TYPES[this.selectedTowerId];
    if (!cfg) return;
    const baseCost = cfg.levels[0].cost;
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
