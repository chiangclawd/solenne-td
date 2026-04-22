import { BaseScene } from '../ui/Scene.ts';
import { LevelSelectScene } from './LevelSelectScene.ts';
import { SettingsScene } from './SettingsScene.ts';
import { CodexScene } from './CodexScene.ts';
import { CreditsScene } from './CreditsScene.ts';
import { GameScene } from './GameScene.ts';
import { COLORS, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../config.ts';
import { totalStars, countCompleted } from '../storage/SaveData.ts';
import { ACHIEVEMENTS } from '../game/Achievements.ts';
import { generateEndlessLevel } from '../game/WaveGenerator.ts';

interface Rect { x: number; y: number; w: number; h: number }
interface Ember { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number }

const MAX_TOTAL_STARS = 23 * 3;

export class MainMenuScene extends BaseScene {
  private playBtn: Rect | null = null;
  private levelsBtn: Rect | null = null;
  private endlessBtn: Rect | null = null;
  private codexBtn: Rect | null = null;
  private settingsBtn: Rect | null = null;
  private creditsBtn: Rect | null = null;

  private elapsed = 0;
  private embers: Ember[] = [];
  private emberTimer = 0;
  private titleGlow = 0;

  override onEnter(): void {
    this.ctx.playBgm('menu');
  }

  update(dt: number): void {
    this.elapsed += dt;

    this.emberTimer -= dt;
    while (this.emberTimer <= 0) {
      this.emberTimer += 0.08;
      this.embers.push({
        x: Math.random() * this.ctx.renderer.vw(),
        y: this.ctx.renderer.vh() + 4,
        vx: (Math.random() - 0.5) * 10,
        vy: -20 - Math.random() * 25,
        life: 2.5 + Math.random() * 2.5,
        maxLife: 2.5 + Math.random() * 2.5,
        size: 1.4 + Math.random() * 2.0,
        hue: 30 + Math.random() * 20,
      });
    }

    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.life -= dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx += (Math.random() - 0.5) * 6 * dt;
      if (e.life <= 0) this.embers.splice(i, 1);
    }

    this.titleGlow = 0.5 + Math.sin(this.elapsed * 1.6) * 0.3;
    this.ctx.renderer.updateShake(dt);
  }

  render(): void {
    const r = this.ctx.renderer;
    r.beginFrame();
    r.beginWorld();
    r.drawTileBackground(this.ctx.assets.get('grass'), 0, 0, WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE);

    r.beginScreen();
    const vw = this.ctx.renderer.vw();
    const vh = this.ctx.renderer.vh();

    r.drawScreenVerticalGradient(0, 0, vw, vh, 'rgba(5,8,20,0.7)', 'rgba(5,8,20,0.95)');
    r.drawScreenRadialGradient(vw / 2, vh * 0.3, Math.max(vw, vh) * 0.7,
      'rgba(255, 159, 67, 0.12)', 'rgba(5,8,20,0)');

    // Embers
    for (const e of this.embers) {
      const a = Math.max(0, e.life / e.maxLife);
      r.ctx.globalAlpha = a * 0.9;
      r.drawScreenCircle(e.x, e.y, e.size, `hsl(${e.hue}, 90%, 60%)`);
    }
    r.ctx.globalAlpha = 1;

    // Title
    const titleY = vh * 0.22;
    const scale = 1 + Math.sin(this.elapsed * 1.6) * 0.02;
    const titleSize = Math.round(38 * scale);
    r.ctx.globalAlpha = 0.45 + this.titleGlow * 0.3;
    r.drawTextScreenCenter('索倫的最後防線', vw / 2, titleY + 2, '#ff9f43', titleSize + 2, true);
    r.ctx.globalAlpha = 1;
    r.drawTextScreenCenter('索倫的最後防線', vw / 2, titleY, '#ffd166', titleSize, true);
    r.drawTextScreenCenter('SOLENNE · LAST LINE', vw / 2, titleY + 42, COLORS.textDim, 12, true);

    r.drawTextScreenCenter('當鐵潮湧來，只剩一道防線。', vw / 2, titleY + 78, '#cbd2de', 14);

    // Progress strip
    const stars = totalStars(this.ctx.save);
    const done = countCompleted(this.ctx.save);
    const achCount = Object.keys(this.ctx.save.achievements).length;
    const progressY = titleY + 110;
    r.drawTextScreenCenter(
      `★ ${stars} / ${MAX_TOTAL_STARS}   ·   ${done} / ${this.ctx.levels.length} 關   ·   🏆 ${achCount} / ${ACHIEVEMENTS.length}`,
      vw / 2, progressY, '#ffd166', 12, true,
    );
    const barW = 260, barH = 6;
    const barX = (vw - barW) / 2;
    const barY = progressY + 14;
    r.drawScreenRoundedRect(barX, barY, barW, barH, 3, 'rgba(255,255,255,0.1)');
    const pct = stars / MAX_TOTAL_STARS;
    r.drawScreenRoundedRect(barX, barY, barW * pct, barH, 3, '#ffd166');

    // Buttons
    const bw = 240, bh = 42;
    const gap = 8;
    const baseY = vh * 0.54;
    const cx = (vw - bw) / 2;

    const mkBtn = (label: string, sub: string | null, y: number, primary = false): Rect => {
      const rect: Rect = { x: cx, y, w: bw, h: bh };
      r.drawScreenRoundedRect(cx + 2, y + 3, bw, bh, 10, 'rgba(0,0,0,0.4)');
      r.drawScreenRoundedRect(cx, y, bw, bh, 10, primary ? '#2c8cc7' : '#22304a');
      if (primary) r.drawScreenRoundedRectOutline(cx, y, bw, bh, 10, '#5eb8ff', 1);
      if (sub) {
        r.drawTextScreenCenter(label, cx + bw / 2, y + bh / 2 - 7, '#fff', 15, true);
        r.drawTextScreenCenter(sub, cx + bw / 2, y + bh / 2 + 9, primary ? '#c6e8ff' : COLORS.textDim, 10);
      } else {
        r.drawTextScreenCenter(label, cx + bw / 2, y + bh / 2, '#fff', 15, true);
      }
      return rect;
    };

    const anyProgress = done > 0;
    this.playBtn = mkBtn(
      anyProgress ? '▶ 繼續戰役' : '▶ 開始戰役',
      anyProgress ? `下一關：${this.nextLevelHint()}` : '新遊戲 · 23 關',
      baseY,
      true,
    );
    this.levelsBtn = mkBtn('📖 關卡選擇', '跳轉任何已解鎖關卡', baseY + (bh + gap));
    const hs = this.ctx.save.endlessHighScore;
    this.endlessBtn = mkBtn(
      '◆ 無盡挑戰',
      hs ? `最佳紀錄：${hs.waves} 波 (${hs.difficulty})` : '虛空不會停 · 挑戰高分',
      baseY + (bh + gap) * 2,
    );
    this.codexBtn = mkBtn('🛠 塔百科', '檢視 9 座塔 · 17 種敵人', baseY + (bh + gap) * 3);
    this.settingsBtn = mkBtn('⚙ 設定', '音量 · 難度 · 效果', baseY + (bh + gap) * 4);
    this.creditsBtn = mkBtn('✦ 致謝', '製作團隊 / 資源', baseY + (bh + gap) * 5);

    // Footer
    r.drawTextScreenCenter(
      `v${this.ctx.version}  ·  Made with Claude Code  ·  CC0 art by Kenney.nl`,
      vw / 2, vh - 18, COLORS.textDim, 9,
    );
  }

  private nextLevelHint(): string {
    for (const lv of this.ctx.levels) {
      if (!this.ctx.save.levelProgress[lv.id]?.completed) return lv.name;
    }
    return '全戰役完成！';
  }

  onTap(screenX: number, screenY: number): void {
    if (this.playBtn && this.inside(screenX, screenY, this.playBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new LevelSelectScene(this.ctx));
      return;
    }
    if (this.levelsBtn && this.inside(screenX, screenY, this.levelsBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new LevelSelectScene(this.ctx));
      return;
    }
    if (this.endlessBtn && this.inside(screenX, screenY, this.endlessBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new GameScene(this.ctx, generateEndlessLevel()));
      return;
    }
    if (this.codexBtn && this.inside(screenX, screenY, this.codexBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new CodexScene(this.ctx));
      return;
    }
    if (this.settingsBtn && this.inside(screenX, screenY, this.settingsBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new SettingsScene(this.ctx));
      return;
    }
    if (this.creditsBtn && this.inside(screenX, screenY, this.creditsBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new CreditsScene(this.ctx));
      return;
    }
  }
}
