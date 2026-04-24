import { BaseScene } from '../ui/Scene.ts';
import { LevelSelectScene } from './LevelSelectScene.ts';
import { HeroSelectScene } from './HeroSelectScene.ts';
import { SettingsScene } from './SettingsScene.ts';
import { CodexScene } from './CodexScene.ts';
import { CreditsScene } from './CreditsScene.ts';
import { UpgradeScene } from './UpgradeScene.ts';
import { HeroTalentsScene } from './HeroTalentsScene.ts';
import { TrialSelectScene } from './TrialSelectScene.ts';
import { isCompleted } from '../storage/SaveData.ts';
import { COLORS, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, GRID_COLS, GRID_ROWS } from '../config.ts';
import { totalStars, countCompleted } from '../storage/SaveData.ts';
import { ACHIEVEMENTS } from '../game/Achievements.ts';
import { generateEndlessLevel } from '../game/WaveGenerator.ts';
import { availableStars } from '../game/MetaUpgrades.ts';
import { drawGoldFrame, drawGlossButton, drawGlowTitle, drawGrassTile } from '../graphics/UIPainter.ts';
import { drawWorldSilhouette } from '../graphics/WorldBackground.ts';

// Optional hero image — tries WebP → PNG, sequential fallback
const HERO_EXTS = ['webp', 'png'] as const;
let heroState: { extIdx: number; img: HTMLImageElement | null } | null = null;
function tryHero(base: string): HTMLImageElement | null {
  if (!heroState) {
    heroState = { extIdx: 0, img: null };
    heroTryNext(base);
  }
  const st = heroState;
  if (st.img && st.img.complete && st.img.naturalWidth > 0) return st.img;
  return null;
}
function heroTryNext(base: string): void {
  const st = heroState!;
  if (st.extIdx >= HERO_EXTS.length) return;
  const ext = HERO_EXTS[st.extIdx];
  const img = new Image();
  img.onload = () => { st.img = img; };
  img.onerror = () => { st.extIdx++; heroTryNext(base); };
  img.src = `${base}assets/hero.${ext}`;
}

interface Rect { x: number; y: number; w: number; h: number }
interface Ember { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number }

const MAX_TOTAL_STARS = 23 * 3;

export class MainMenuScene extends BaseScene {
  private playBtn: Rect | null = null;
  private levelsBtn: Rect | null = null;
  private endlessBtn: Rect | null = null;
  private upgradeBtn: Rect | null = null;
  private talentsBtn: Rect | null = null;
  private trialsBtn: Rect | null = null;
  private codexBtn: Rect | null = null;
  private settingsBtn: Rect | null = null;
  private creditsBtn: Rect | null = null;

  private elapsed = 0;
  private embers: Ember[] = [];
  private emberTimer = 0;

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

    this.ctx.renderer.updateShake(dt);
  }

  render(): void {
    const r = this.ctx.renderer;
    r.beginFrame();
    r.beginWorld();
    // Try optional hero image; fall back to procedural silhouette
    const base = import.meta.env.BASE_URL;
    const hero = tryHero(base);
    if (hero) {
      r.ctx.drawImage(hero, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    } else {
      drawWorldSilhouette(r.ctx, 1, 42);
      for (let gy = Math.floor(GRID_ROWS * 0.4); gy < GRID_ROWS; gy++) {
        for (let gx = 0; gx < GRID_COLS; gx++) {
          drawGrassTile(r.ctx, gx * TILE_SIZE, gy * TILE_SIZE, TILE_SIZE, 'grass');
        }
      }
    }

    r.beginScreen();
    const vw = this.ctx.renderer.vw();
    const vh = this.ctx.renderer.vh();

    r.drawScreenVerticalGradient(0, 0, vw, vh, 'rgba(5,8,20,0.72)', 'rgba(5,8,20,0.96)');
    r.drawScreenRadialGradient(vw / 2, vh * 0.25, Math.max(vw, vh) * 0.7,
      'rgba(255, 159, 67, 0.18)', 'rgba(5,8,20,0)');

    // Embers
    for (const e of this.embers) {
      const a = Math.max(0, e.life / e.maxLife);
      r.ctx.globalAlpha = a * 0.9;
      r.drawScreenCircle(e.x, e.y, e.size, `hsl(${e.hue}, 90%, 60%)`);
    }
    r.ctx.globalAlpha = 1;

    // Title with glow
    const titleY = vh * 0.22;
    const scale = 1 + Math.sin(this.elapsed * 1.6) * 0.02;
    const titleSize = Math.round(38 * scale);
    drawGlowTitle(r.ctx, '索倫的最後防線', vw / 2, titleY, titleSize);
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
    const bw = 240, bh = 40;
    const gap = 7;
    const baseY = vh * 0.50;
    const cx = (vw - bw) / 2;

    const mkBtn = (label: string, sub: string | null, y: number, primary = false): Rect => {
      const rect: Rect = { x: cx, y, w: bw, h: bh };
      if (primary) {
        drawGlossButton(r.ctx, cx, y, bw, bh, 10, '#2c8cc7', '#5eb8ff');
        drawGoldFrame(r.ctx, cx, y, bw, bh, 10, 1, 'rgba(255, 215, 102, 0.5)');
      } else {
        drawGlossButton(r.ctx, cx, y, bw, bh, 10, '#22304a', '#3a4a66');
      }
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
    const avail = availableStars(this.ctx.save);
    this.upgradeBtn = mkBtn(
      '★ 星星升級',
      avail > 0 ? `可用 ${avail} ★ · 永久強化` : '累積星星解鎖永久加成',
      baseY + (bh + gap) * 3,
    );
    this.talentsBtn = mkBtn(
      '⚔ 英雄天賦',
      '為指揮官投資技能路線',
      baseY + (bh + gap) * 4,
    );
    // Trial mode unlocked once L28 is cleared.
    const trialsUnlocked = isCompleted(this.ctx.save, 'level-28');
    if (trialsUnlocked) {
      const cleared = Object.values(this.ctx.save.trialProgress ?? {}).filter((p) => p.completed).length;
      this.trialsBtn = mkBtn(
        '⊘ 試煉之巔',
        cleared >= 6 ? '六試煉皆通過' : `已通過 ${cleared}/6 試煉`,
        baseY + (bh + gap) * 5,
      );
      this.codexBtn = mkBtn('🛠 塔百科', '9 塔 · 17 敵', baseY + (bh + gap) * 6);
      this.settingsBtn = mkBtn('⚙ 設定', '音量 · 難度 · 效果', baseY + (bh + gap) * 7);
      this.creditsBtn = mkBtn('✦ 致謝', '製作團隊 / 資源', baseY + (bh + gap) * 8);
    } else {
      this.codexBtn = mkBtn('🛠 塔百科', '9 塔 · 17 敵', baseY + (bh + gap) * 5);
      this.settingsBtn = mkBtn('⚙ 設定', '音量 · 難度 · 效果', baseY + (bh + gap) * 6);
      this.creditsBtn = mkBtn('✦ 致謝', '製作團隊 / 資源', baseY + (bh + gap) * 7);
    }

    // iOS "add to home screen" hint — shown only when running in Safari (not
    // already standalone PWA) so players know how to get full-screen mode.
    // Stacked bottom-up with safeBottom offset so nothing clips the home bar.
    const sab = r.safeBottom();
    const isIosSafari = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isIosSafari && !isStandalone) {
      r.drawTextScreenCenter(
        '📱 分享 → 加入主畫面 可全螢幕遊玩',
        vw / 2, vh - 50 - sab, '#6ec8ff', 10, true,
      );
    }

    // Footer — version is now prominent so players can verify they're on the
    // latest deployment after a PWA auto-update. Build date makes it unambiguous
    // even if the semver stayed the same across patch deploys.
    const verLine = `v${this.ctx.version}  ·  build ${this.ctx.buildDate}`;
    r.drawTextScreenCenter(verLine, vw / 2, vh - 32 - sab, '#ffd166', 12, true);
    r.drawTextScreenCenter(
      'Made with Claude Code  ·  CC0 art by Kenney.nl',
      vw / 2, vh - 16 - sab, COLORS.textDim, 9,
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
      // Endless also goes through HeroSelect so player can bring a commander
      this.ctx.transition(new HeroSelectScene(this.ctx, generateEndlessLevel()));
      return;
    }
    if (this.upgradeBtn && this.inside(screenX, screenY, this.upgradeBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new UpgradeScene(this.ctx));
      return;
    }
    if (this.talentsBtn && this.inside(screenX, screenY, this.talentsBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new HeroTalentsScene(this.ctx));
      return;
    }
    if (this.trialsBtn && this.inside(screenX, screenY, this.trialsBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new TrialSelectScene(this.ctx));
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
