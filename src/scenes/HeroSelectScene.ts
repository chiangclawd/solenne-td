/**
 * Hero selection — shown after the player picks a level but before the match
 * starts. Lets the player pick which commander to deploy, or go in without one.
 *
 * Locked heroes are visible but greyed out with an unlock hint.
 */

import { BaseScene } from '../ui/Scene.ts';
import type { Scene } from '../ui/Scene.ts';
import { LevelSelectScene } from './LevelSelectScene.ts';
import { GameScene } from './GameScene.ts';
import { COLORS } from '../config.ts';
import type { LevelData } from '../game/Level.ts';
import { HEROES, HERO_UNLOCKS, isHeroUnlocked } from '../game/Heroes.ts';
import type { HeroDef, HeroId } from '../game/Heroes.ts';
import { drawHeroIconScreen, drawSkillIconScreen } from '../graphics/HeroPainter.ts';

interface Rect { x: number; y: number; w: number; h: number }

export class HeroSelectScene extends BaseScene {
  private readonly level: LevelData;
  private cards: { rect: Rect; def: HeroDef; unlocked: boolean }[] = [];
  private noneCard: Rect | null = null;
  private confirmBtn: Rect | null = null;
  private backBtn: Rect | null = null;
  private selected: HeroId | null = null;
  private elapsed = 0;

  constructor(
    ctx: ConstructorParameters<typeof BaseScene>[0],
    level: LevelData,
  ) {
    super(ctx);
    this.level = level;
    // Default to last-used hero if still unlocked; else first unlocked
    const saved = ctx.save.selectedHero as HeroId | undefined;
    if (saved && HEROES.some((h) => h.id === saved) && isHeroUnlocked(ctx.save, saved)) {
      this.selected = saved;
    } else {
      this.selected = 'kieran';
    }
  }

  override onEnter(): void {
    this.ctx.playBgm('menu');
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.ctx.renderer.updateShake(dt);
  }

  render(): void {
    const r = this.ctx.renderer;
    r.beginFrame();
    r.beginWorld();
    // Simple dark world backdrop
    r.beginScreen();
    const vw = r.vw();
    const vh = r.vh();
    r.drawScreenVerticalGradient(0, 0, vw, vh, 'rgba(5,8,20,0.95)', 'rgba(5,8,20,0.99)');

    // Header
    const backW = 68, backH = 30;
    this.backBtn = { x: 12, y: 12, w: backW, h: backH };
    r.drawScreenRoundedRect(12, 12, backW, backH, 8, '#22304a');
    r.drawTextScreenCenter('← 返回', 12 + backW / 2, 12 + backH / 2, COLORS.text, 11, true);

    r.drawTextScreenCenter('選擇指揮官', vw / 2, 28, '#ffd166', 20, true);
    r.drawTextScreenCenter(
      `關卡 · ${this.level.name}`,
      vw / 2, 54, COLORS.textDim, 12,
    );

    // Cards — anchor top so the confirm button sits just below the stack
    // on ANY viewport height (was: centered vertically, which produced a big
    // empty gap on taller phones and left 出戰 orphaned at the very bottom).
    this.cards = [];
    const cardW = Math.min(280, vw - 40);
    const cardH = 118;
    const gap = 12;
    const startY = 86;
    const startX = (vw - cardW) / 2;

    for (let i = 0; i < HEROES.length; i++) {
      const def = HEROES[i];
      const cy = startY + i * (cardH + gap);
      const unlocked = isHeroUnlocked(this.ctx.save, def.id);
      const isSelected = unlocked && this.selected === def.id;
      const rect: Rect = { x: startX, y: cy, w: cardW, h: cardH };
      this.cards.push({ rect, def, unlocked });

      // Card background
      const bg = unlocked
        ? (isSelected ? '#2c3f5c' : '#1b2a42')
        : '#0f141e';
      r.drawScreenRoundedRect(rect.x, rect.y, rect.w, rect.h, 10, bg);
      if (isSelected) {
        r.drawScreenRoundedRectOutline(rect.x, rect.y, rect.w, rect.h, 10, def.color, 2);
      } else if (unlocked) {
        r.drawScreenRoundedRectOutline(rect.x, rect.y, rect.w, rect.h, 10, 'rgba(255,255,255,0.08)', 1);
      }

      const iconSize = 68;
      const iconX = rect.x + 10;
      const iconY = rect.y + (rect.h - iconSize) / 2;
      r.drawScreenRoundedRect(iconX, iconY, iconSize, iconSize, 8, '#0d1420');
      if (unlocked) {
        // Hero art in full colour
        drawHeroIconScreen(r.ctx, def, iconX, iconY, iconSize);
      } else {
        // Silhouette: paint the hero then clip-tint to near-black via source-atop
        drawHeroIconScreen(r.ctx, def, iconX, iconY, iconSize);
        r.ctx.save();
        r.ctx.globalCompositeOperation = 'source-atop';
        r.drawScreenRect(iconX, iconY, iconSize, iconSize, 'rgba(10,14,24,0.85)');
        r.ctx.restore();
        // Lock badge in the corner
        r.drawScreenCircle(iconX + iconSize - 12, iconY + iconSize - 12, 10, 'rgba(20,30,50,0.95)');
        r.drawTextScreenCenter('🔒', iconX + iconSize - 12, iconY + iconSize - 12, '#8aa0c0', 11);
      }

      // Text block
      const tx = iconX + iconSize + 14;
      const ty = rect.y + 12;
      if (unlocked) {
        r.drawTextScreen(`${def.name} · ${def.title}`, tx, ty, def.color, 15, true);
        r.drawTextScreen(def.tagline, tx, ty + 22, COLORS.textDim, 11);
        r.drawTextScreen(`◆ ${def.passive.name}`, tx, ty + 42, def.accent, 11, true);
        r.drawTextScreen(def.passive.description, tx, ty + 58, COLORS.text, 10);
        // Skills: custom procedural icons + short names
        let sx = tx;
        const sy = ty + 76;
        for (const skill of def.skills) {
          drawSkillIconScreen(r.ctx, skill.id, sx, sy, 20);
          r.drawTextScreen(skill.name, sx + 22, sy + 4, '#ffd166', 10, true);
          sx += 22 + r.measureTextScreen(skill.name, 10, true) + 10;
        }
      } else {
        const entry = HERO_UNLOCKS.find((u) => u.heroId === def.id);
        const lvIdx = entry ? this.ctx.levels.findIndex((l) => l.id === entry.afterLevelId) + 1 : 0;
        const lv = entry ? this.ctx.levels.find((l) => l.id === entry.afterLevelId) : null;
        // Reveal the title (role) but obscure the name
        r.drawTextScreen(`??? · ${def.title}`, tx, ty, '#5a6b84', 15, true);
        // Tease the class (same tagline — player gets a preview of style)
        r.drawTextScreen(def.tagline, tx, ty + 22, '#4a5568', 11);
        // Unlock hint on its own line
        const hint = entry && lv
          ? `🔒 通關 L${lvIdx} ${lv.name} 解鎖`
          : '🔒 尚未解鎖';
        r.drawTextScreen(hint, tx, ty + 58, '#8aa0c0', 11, true);
        r.drawTextScreen('加入你的指揮序列', tx, ty + 78, '#4a5568', 10);
      }
    }

    // "No hero" option
    const noneY = startY + HEROES.length * (cardH + gap);
    const noneH = 40;
    this.noneCard = { x: startX, y: noneY, w: cardW, h: noneH };
    const noneSelected = this.selected === null;
    r.drawScreenRoundedRect(this.noneCard.x, this.noneCard.y, this.noneCard.w, this.noneCard.h, 8, noneSelected ? '#2c3f5c' : '#131a26');
    if (noneSelected) {
      r.drawScreenRoundedRectOutline(this.noneCard.x, this.noneCard.y, this.noneCard.w, this.noneCard.h, 8, '#9aa5b8', 2);
    }
    r.drawTextScreenCenter(
      '◇ 不帶英雄出戰（純塔防）',
      this.noneCard.x + this.noneCard.w / 2,
      this.noneCard.y + this.noneCard.h / 2,
      noneSelected ? '#fff' : COLORS.textDim,
      12, true,
    );

    // Confirm button — anchored 20px below the "no hero" card so it's always
    // immediately next to the selection UI, not floating at the screen bottom
    // on tall viewports.
    const btnW = 240, btnH = 52;
    const confirmY = noneY + noneH + 20;
    this.confirmBtn = { x: (vw - btnW) / 2, y: confirmY, w: btnW, h: btnH };
    const selDef = this.selected ? HEROES.find((h) => h.id === this.selected) ?? null : null;
    const btnColor = selDef ? selDef.color : '#6ee17a';
    r.drawScreenRoundedRect(this.confirmBtn.x + 2, this.confirmBtn.y + 3, btnW, btnH, 12, 'rgba(0,0,0,0.35)');
    r.drawScreenRoundedRect(this.confirmBtn.x, this.confirmBtn.y, btnW, btnH, 12, btnColor);
    r.drawScreenRoundedRectOutline(this.confirmBtn.x, this.confirmBtn.y, btnW, btnH, 12, '#fff', 1);
    r.drawTextScreenCenter('▶ 出戰', this.confirmBtn.x + btnW / 2, this.confirmBtn.y + btnH / 2, '#0a0f1a', 18, true);

    // Pulse ring on selected card
    if (selDef) {
      const card = this.cards.find((c) => c.def.id === selDef.id);
      if (card) {
        const pulse = 0.4 + Math.sin(this.elapsed * 3) * 0.3;
        r.ctx.save();
        r.ctx.globalAlpha = pulse;
        r.drawScreenRoundedRectOutline(card.rect.x - 2, card.rect.y - 2, card.rect.w + 4, card.rect.h + 4, 12, selDef.accent, 1);
        r.ctx.globalAlpha = 1;
        r.ctx.restore();
      }
    }
  }

  onTap(screenX: number, screenY: number): void {
    if (this.backBtn && this.inside(screenX, screenY, this.backBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new LevelSelectScene(this.ctx));
      return;
    }
    if (this.confirmBtn && this.inside(screenX, screenY, this.confirmBtn)) {
      this.ctx.audio.click();
      if (this.selected) {
        this.ctx.save.selectedHero = this.selected;
        this.ctx.persistSave();
      }
      const next: Scene = new GameScene(this.ctx, this.level, this.selected);
      this.ctx.transition(next);
      return;
    }
    for (const c of this.cards) {
      if (c.unlocked && this.inside(screenX, screenY, c.rect)) {
        this.ctx.audio.click();
        this.selected = c.def.id;
        return;
      }
    }
    if (this.noneCard && this.inside(screenX, screenY, this.noneCard)) {
      this.ctx.audio.click();
      this.selected = null;
      return;
    }
  }
}
