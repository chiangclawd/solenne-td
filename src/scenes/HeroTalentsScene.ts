/**
 * Hero Talents screen (v2.5 C1).
 *
 * Mirrors UpgradeScene's feel but budget + data are per-hero. Three hero
 * tabs at the top select which tree is visible; each tree shows 5 talents
 * as cards stacked vertically. Tapping a card buys the next tier if the
 * player has enough of that hero's stars.
 */
import { BaseScene } from '../ui/Scene.ts';
import { COLORS } from '../config.ts';
import type { HeroId } from '../game/Heroes.ts';
import { HEROES } from '../game/Heroes.ts';
import {
  HERO_TALENT_TREES,
  getTalentTier,
  heroStarsEarned,
  heroStarsSpent,
  heroStarsAvailable,
  tryBuyNextTier,
} from '../game/HeroTalents.ts';
import type { TalentDef } from '../game/HeroTalents.ts';
import { drawHeroIconScreen } from '../graphics/HeroPainter.ts';

interface Rect { x: number; y: number; w: number; h: number }

export class HeroTalentsScene extends BaseScene {
  private backBtn: Rect | null = null;
  private heroTabs: { id: HeroId; rect: Rect }[] = [];
  private talentCards: { id: string; rect: Rect }[] = [];
  private selectedHero: HeroId = 'kieran';
  private scrollY = 0;
  private scrollVelocity = 0;
  private isDragging = false;
  private contentHeight = 0;
  private viewportHeight = 0;
  private lastInertiaT = 0;
  private elapsed = 0;
  private flashTalent: string | null = null;
  private flashTime = 0;

  constructor(ctx: import('./SceneContext.ts').SceneContext, initialHero?: HeroId) {
    super(ctx);
    if (initialHero) this.selectedHero = initialHero;
    else if (ctx.save.selectedHero && ['kieran', 'vasya', 'pip'].includes(ctx.save.selectedHero)) {
      this.selectedHero = ctx.save.selectedHero as HeroId;
    }
  }

  override onEnter(): void {
    this.ctx.playBgm('menu');
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.ctx.renderer.updateShake(dt);
    if (this.flashTime > 0) this.flashTime = Math.max(0, this.flashTime - dt);
  }

  private stepInertia(): void {
    const now = performance.now();
    const realDt = this.lastInertiaT === 0 ? 0 : (now - this.lastInertiaT) / 1000;
    this.lastInertiaT = now;
    if (realDt <= 0 || realDt > 0.25) return;
    if (this.isDragging) return;
    if (Math.abs(this.scrollVelocity) > 20) {
      this.scrollY += this.scrollVelocity * realDt;
      this.scrollVelocity *= Math.pow(0.012, realDt);
      this.clampScroll();
    } else {
      this.scrollVelocity = 0;
    }
  }

  private clampScroll(): void {
    const max = Math.max(0, this.contentHeight - this.viewportHeight);
    if (this.scrollY < 0) this.scrollY = 0;
    else if (this.scrollY > max) this.scrollY = max;
  }

  render(): void {
    this.stepInertia();
    const r = this.ctx.renderer;
    r.beginFrame();
    r.beginScreen();
    const vw = r.vw();
    const vh = r.vh();
    r.drawScreenVerticalGradient(0, 0, vw, vh, '#0a1020', '#05080f');

    // Header
    const backW = 68, backH = 30;
    this.backBtn = { x: 12, y: 12, w: backW, h: backH };
    r.drawScreenRoundedRect(12, 12, backW, backH, 8, '#22304a');
    r.drawTextScreenCenter('← 返回', 12 + backW / 2, 12 + backH / 2, COLORS.text, 11, true);
    r.drawTextScreenCenter('英雄天賦', vw / 2, 28, '#ffd166', 20, true);

    // Hero tabs
    this.heroTabs = [];
    const tabY = 52;
    const tabH = 48;
    const tabW = (vw - 48) / 3;
    const heroes: HeroId[] = ['kieran', 'vasya', 'pip'];
    for (let i = 0; i < heroes.length; i++) {
      const id = heroes[i];
      const def = HEROES.find((h) => h.id === id)!;
      const isSel = id === this.selectedHero;
      const tx = 16 + i * (tabW + 8);
      const rect: Rect = { x: tx, y: tabY, w: tabW, h: tabH };
      this.heroTabs.push({ id, rect });
      r.drawScreenRoundedRect(tx, tabY, tabW, tabH, 8, isSel ? '#22304a' : '#141a26');
      if (isSel) r.drawScreenRoundedRectOutline(tx, tabY, tabW, tabH, 8, def.color, 2);
      drawHeroIconScreen(r.ctx, def, tx + 4, tabY + 4, 40);
      r.drawTextScreen(def.name, tx + 46, tabY + 10, isSel ? def.color : COLORS.text, 13, true);
      const avail = heroStarsAvailable(this.ctx.save, id);
      const earned = heroStarsEarned(this.ctx.save, id);
      r.drawTextScreen(`★ ${avail} / ${earned}`, tx + 46, tabY + 28, isSel ? '#ffd166' : COLORS.textDim, 10, true);
    }

    // Selected hero's panel
    const selDef = HEROES.find((h) => h.id === this.selectedHero)!;
    const tree = HERO_TALENT_TREES[this.selectedHero];
    const avail = heroStarsAvailable(this.ctx.save, this.selectedHero);
    const spent = heroStarsSpent(this.ctx.save, this.selectedHero);
    const earned = heroStarsEarned(this.ctx.save, this.selectedHero);

    // Star budget box
    const budgetY = tabY + tabH + 8;
    r.drawScreenRoundedRect(16, budgetY, vw - 32, 38, 8, 'rgba(14,22,40,0.9)');
    r.drawScreenRoundedRectOutline(16, budgetY, vw - 32, 38, 8, selDef.color, 1);
    r.drawTextScreen(`${selDef.name}的英雄星`, 24, budgetY + 8, COLORS.textDim, 11);
    r.drawTextScreen(`★ ${avail}`, 24, budgetY + 23, '#ffd166', 16, true);
    r.drawTextScreen(`已用 ${spent}  ·  累計 ${earned}`, vw - 24, budgetY + 23, COLORS.textDim, 10);
    // Right-align the hint
    const hint = '完成關卡累積英雄星';
    r.drawTextScreen(hint, vw - 24 - r.measureTextScreen(hint, 10), budgetY + 8, COLORS.textDim, 10);

    // Talent cards (scrollable area)
    const contentY = budgetY + 46;
    const contentH = vh - contentY - 12;
    this.viewportHeight = contentH;
    const dpr = window.devicePixelRatio || 1;
    r.ctx.save();
    r.ctx.beginPath();
    r.ctx.rect(0, contentY * dpr, vw * dpr, contentH * dpr);
    r.ctx.clip();

    this.talentCards = [];
    const cardH = 80;
    const cardGap = 8;
    const cardX = 16;
    const cardW = vw - 32;
    let cy = contentY - this.scrollY;

    for (const talent of tree.talents) {
      const tier = getTalentTier(this.ctx.save, this.selectedHero, talent.id);
      const isMaxed = tier >= 3;
      const rect: Rect = { x: cardX, y: cy, w: cardW, h: cardH };
      // Cull if off-screen
      if (cy + cardH < contentY || cy > contentY + contentH) {
        cy += cardH + cardGap;
        continue;
      }
      this.talentCards.push({ id: talent.id, rect });
      this.renderTalentCard(r, rect, talent, tier, isMaxed, avail, selDef.color);
      cy += cardH + cardGap;
    }

    r.ctx.restore();

    // Record content height in unscrolled coords so scroll clamp works
    this.contentHeight = (cy + this.scrollY) - contentY;
    this.clampScroll();
  }

  private renderTalentCard(
    r: import('../engine/Renderer.ts').Renderer,
    rect: Rect,
    talent: TalentDef,
    tier: number,
    isMaxed: boolean,
    availStars: number,
    heroColor: string,
  ): void {
    const nextCost = isMaxed ? 0 : talent.tiers[tier].cost;
    const canAfford = !isMaxed && availStars >= nextCost;
    const flashing = this.flashTalent === talent.id && this.flashTime > 0;
    const bgColor = flashing
      ? '#2a3f28'
      : isMaxed ? 'rgba(255,215,102,0.12)' : 'rgba(14,22,40,0.9)';
    r.drawScreenRoundedRect(rect.x, rect.y, rect.w, rect.h, 9, bgColor);
    const borderColor = isMaxed ? '#ffd166' : canAfford ? heroColor : '#2a3548';
    r.drawScreenRoundedRectOutline(rect.x, rect.y, rect.w, rect.h, 9, borderColor, isMaxed || canAfford ? 2 : 1);

    // Left column: icon + name
    r.drawTextScreen(talent.icon, rect.x + 14, rect.y + 22, heroColor, 24, true);
    r.drawTextScreen(talent.name, rect.x + 44, rect.y + 12, '#ffd166', 13, true);
    r.drawTextScreen(talent.description, rect.x + 44, rect.y + 28, COLORS.text, 10);

    // Tier pip row
    const pipY = rect.y + 50;
    const pipW = 42;
    const pipGap = 6;
    for (let i = 0; i < 3; i++) {
      const px = rect.x + 44 + i * (pipW + pipGap);
      const filled = i < tier;
      r.drawScreenRoundedRect(px, pipY, pipW, 14, 3, filled ? '#ffd166' : '#22304a');
      r.drawTextScreenCenter(
        talent.tiers[i].label,
        px + pipW / 2, pipY + 7,
        filled ? '#0a0f1a' : COLORS.textDim, 9, true,
      );
    }

    // Right column: cost + buy indicator
    if (isMaxed) {
      r.drawTextScreen('已滿', rect.x + rect.w - 50, rect.y + 30, '#ffd166', 13, true);
    } else {
      const costText = `★ ${nextCost}`;
      const cw = r.measureTextScreen(costText, 14, true);
      r.drawTextScreen(costText, rect.x + rect.w - 16 - cw, rect.y + 20, canAfford ? '#ffd166' : COLORS.textDim, 14, true);
      r.drawTextScreen(canAfford ? '點擊購買' : '星星不足', rect.x + rect.w - 62, rect.y + 38, canAfford ? '#6ee17a' : '#ff8a8a', 9);
    }
  }

  override onDrag(dy: number, _dx: number, _dt: number): void {
    this.isDragging = true;
    this.scrollY -= dy;
    this.scrollVelocity = -dy * 60;
    this.clampScroll();
  }

  override onRelease(): void {
    this.isDragging = false;
    this.lastInertiaT = performance.now();
  }

  override onTap(screenX: number, screenY: number): void {
    if (this.backBtn && this.inside(screenX, screenY, this.backBtn)) {
      this.ctx.audio.click();
      // Dynamic import to avoid circular — just use window.history-style pattern.
      import('./MainMenuScene.ts').then(({ MainMenuScene }) => {
        this.ctx.transition(new MainMenuScene(this.ctx));
      });
      return;
    }
    for (const tab of this.heroTabs) {
      if (this.inside(screenX, screenY, tab.rect)) {
        this.ctx.audio.click();
        this.selectedHero = tab.id;
        this.scrollY = 0;
        return;
      }
    }
    for (const card of this.talentCards) {
      if (this.inside(screenX, screenY, card.rect)) {
        const result = tryBuyNextTier(this.ctx.save, this.selectedHero, card.id);
        if (result.ok) {
          this.ctx.audio.upgrade();
          this.flashTalent = card.id;
          this.flashTime = 0.5;
          // Check talent-related achievements post-investment.
          const unlocked = this.ctx.achievements.check(this.ctx.save, { type: 'saveTick' });
          if (unlocked.length > 0) this.ctx.audio.achievement();
          this.ctx.persistSave();
        } else {
          this.ctx.audio.click();
        }
        return;
      }
    }
  }

}
