import { BaseScene } from '../ui/Scene.ts';
import { MainMenuScene } from './MainMenuScene.ts';
import { TOWER_TYPES, TOWER_ORDER } from '../data/towers.ts';
import { ENEMY_TYPES } from '../data/enemies.ts';
import { ACHIEVEMENTS } from '../game/Achievements.ts';
import { drawTowerIconScreen, drawEnemyIconScreen } from '../graphics/SpritePainter.ts';
import { isTowerUnlocked, unlockHint } from '../game/TowerUnlocks.ts';
import { ARMOR_INFO } from '../game/ArmorTypes.ts';
import { COLORS, TILE_SIZE } from '../config.ts';
import { TOWER_LORE, ENEMY_LORE, HERO_LORE } from '../game/Lore.ts';
import { HEROES } from '../game/Heroes.ts';
import { drawHeroIconScreen } from '../graphics/HeroPainter.ts';

interface Rect { x: number; y: number; w: number; h: number }

const T = TILE_SIZE;
type Tab = 'towers' | 'enemies' | 'heroes' | 'achievements';

// v2.8.0 C2 — fixed enemy display order in the codex, sourced from Lore.
const ENEMY_ORDER: readonly string[] = [
  'scout', 'soldier', 'runner',
  'tank', 'armored', 'heavyTank',
  'plane',
  'frostRaider', 'iceBeast',
  'wraith', 'splitter', 'healer',
  'tentacle', 'swimmerShoal',
  'boss', 'armoredBoss', 'finalBoss',
  'glacialBoss', 'voidBoss', 'abyssalBoss',
];

export class CodexScene extends BaseScene {
  private backBtn: Rect | null = null;
  private tabBtns: { rect: Rect; tab: Tab }[] = [];
  private tab: Tab = 'towers';
  private scrollY = 0;
  private scrollVelocity = 0;
  private contentHeight = 0;
  private viewportHeight = 0;
  private isDragging = false;
  private lastInertiaT = 0;

  update(dt: number): void {
    this.ctx.renderer.updateShake(dt);
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
    const vw = this.ctx.renderer.vw();
    const vh = this.ctx.renderer.vh();
    r.drawScreenVerticalGradient(0, 0, vw, vh, '#0a1020', '#05080f');

    // Header
    const backW = 68, backH = 30;
    this.backBtn = { x: 12, y: 12, w: backW, h: backH };
    r.drawScreenRoundedRect(12, 12, backW, backH, 8, '#22304a');
    r.drawTextScreenCenter('← 返回', 12 + backW / 2, 12 + backH / 2, COLORS.text, 11, true);
    r.drawTextScreenCenter('百科', vw / 2, 28, '#ffd166', 20, true);

    // Tabs
    this.tabBtns = [];
    const tabs: { tab: Tab; label: string }[] = [
      { tab: 'towers', label: '塔' },
      { tab: 'enemies', label: '敵人' },
      { tab: 'heroes', label: '英雄' },
      { tab: 'achievements', label: '成就' },
    ];
    const tabY = 60;
    const tabH = 34;
    const tabW = (vw - 36) / tabs.length;
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      const bx = 12 + i * (tabW + 6);
      const rect: Rect = { x: bx, y: tabY, w: tabW, h: tabH };
      const active = this.tab === t.tab;
      r.drawScreenRoundedRect(bx, tabY, tabW, tabH, 8, active ? '#2c8cc7' : '#22304a');
      r.drawTextScreenCenter(t.label, bx + tabW / 2, tabY + tabH / 2, '#fff', 13, true);
      this.tabBtns.push({ rect, tab: t.tab });
    }

    // Content clipped area
    const contentY = tabY + tabH + 12;
    const contentH = vh - contentY - 12;
    this.viewportHeight = contentH;
    r.drawScreenRoundedRect(12, contentY, vw - 24, contentH, 10, 'rgba(10,16,32,0.6)');

    r.ctx.save();
    const dpr = window.devicePixelRatio || 1;
    r.ctx.beginPath();
    r.ctx.rect(12 * dpr, contentY * dpr, (vw - 24) * dpr, contentH * dpr);
    r.ctx.clip();

    const innerX = 24;
    const innerW = vw - 48;
    const contentStart = contentY + 16;
    let y = contentStart - this.scrollY;
    const viewTop = contentY;
    const viewBottom = contentY + contentH;

    if (this.tab === 'towers') {
      // v2.8.0 — taller tower card to fit lore line
      const towerCardH = 152 + 10;
      for (const id of TOWER_ORDER) {
        const cfg = TOWER_TYPES[id];
        if (!cfg) continue;
        if (y + towerCardH >= viewTop && y <= viewBottom) {
          this.renderTowerCard(r, innerX, y, innerW, id, cfg);
        }
        y += towerCardH;
      }
    } else if (this.tab === 'enemies') {
      // v2.8.0 — taller enemy card to fit lore + counter tip
      const enemyCardH = 130 + 8;
      for (const id of ENEMY_ORDER) {
        const lore = ENEMY_LORE[id];
        const cfg = ENEMY_TYPES[id];
        if (!cfg || !lore) continue;
        if (y + enemyCardH >= viewTop && y <= viewBottom) {
          this.renderEnemyCard(r, innerX, y, innerW, id, lore, cfg);
        }
        y += enemyCardH;
      }
    } else if (this.tab === 'heroes') {
      const heroCardH = 168 + 10;
      for (const def of HEROES) {
        if (y + heroCardH >= viewTop && y <= viewBottom) {
          this.renderHeroCard(r, innerX, y, innerW, def);
        }
        y += heroCardH;
      }
    } else {
      y = this.renderAchievements(r, innerX, y, innerW, viewTop, viewBottom);
    }

    this.contentHeight = (y + this.scrollY) - contentStart;
    this.clampScroll();

    r.ctx.restore();

    // Scrollbar indicator
    if (this.contentHeight > this.viewportHeight) {
      const trackH = this.viewportHeight - 16;
      const thumbH = Math.max(36, trackH * (this.viewportHeight / this.contentHeight));
      const thumbY = contentY + 8 + (trackH - thumbH) * (this.scrollY / (this.contentHeight - this.viewportHeight));
      r.drawScreenRoundedRect(vw - 10, contentY + 8, 3, trackH, 1.5, 'rgba(255,255,255,0.05)');
      r.drawScreenRoundedRect(vw - 10, thumbY, 3, thumbH, 1.5, 'rgba(255,215,100,0.5)');
    }
  }

  private renderTowerCard(
    r: import('../engine/Renderer.ts').Renderer,
    x: number, y: number, w: number,
    id: string, cfg: import('../game/Tower.ts').TowerConfig,
  ): number {
    const unlocked = isTowerUnlocked(this.ctx.save, id);
    const cardH = 152;
    r.drawScreenRoundedRect(x, y, w, cardH, 8, unlocked ? 'rgba(14,22,40,0.9)' : 'rgba(14,22,40,0.6)');
    r.drawScreenRoundedRectOutline(x, y, w, cardH, 8, unlocked ? '#22304a' : '#3a2a1e', 1);

    const iconSize = 54;
    r.drawScreenRect(x + 10, y + 10, iconSize, iconSize, 'rgba(255,255,255,0.04)');
    if (unlocked) {
      drawTowerIconScreen(r.ctx, id, x + 13, y + 13, iconSize - 6, 0);
    } else {
      r.ctx.save();
      r.ctx.globalAlpha = 0.3;
      drawTowerIconScreen(r.ctx, id, x + 13, y + 13, iconSize - 6, 0);
      r.ctx.restore();
      r.drawTextScreenCenter('🔒', x + 10 + iconSize / 2, y + 10 + iconSize / 2, '#ffd166', 22, true);
    }

    const titleColor = unlocked ? '#ffd166' : '#7a6548';
    r.drawTextScreen(cfg.name, x + 76, y + 12, titleColor, 14, true);
    const lore = TOWER_LORE[id];

    if (unlocked) {
      // Tagline (one line bold under name)
      if (lore) r.drawTextScreen(lore.tagline, x + 76, y + 30, '#a8dcff', 11, true);
      // Lore (1-2 line wrap, gray) — uses small font + manual wrap.
      if (lore) this.drawWrappedText(r, lore.lore, x + 76, y + 48, w - 90, 11, COLORS.text, 13);

      // Counters — top right
      if (cfg.counters && cfg.counters.length > 0) {
        const counterIcons = cfg.counters.map((t) => ARMOR_INFO[t].icon).join(' ');
        const txt = `克制 ${counterIcons}`;
        const tw = r.measureTextScreen(txt, 10, true);
        r.drawTextScreen(txt, x + w - tw - 12, y + 12, '#ffd166', 10, true);
      }

      // Stats block (below lore)
      const base = cfg.baseLevels[0];
      r.drawTextScreen(
        `Lv1: ${base.cost}g · DMG ${base.damage} · RNG ${(base.range / T).toFixed(1)}t · ${base.fireRate.toFixed(1)}/s`,
        x + 12, y + 80, COLORS.textDim, 10,
      );
      const brA = cfg.branches.A;
      const brB = cfg.branches.B;
      const maxA = brA.levels[brA.levels.length - 1];
      const maxB = brB.levels[brB.levels.length - 1];
      r.drawTextScreen(`🟠 ${brA.name}`, x + 12, y + 100, brA.color, 11, true);
      r.drawTextScreen(
        `Lv5A: ${maxA.cost}g · DMG ${maxA.damage}${maxA.splashRadius ? ` · AOE ${(maxA.splashRadius/T).toFixed(1)}t` : ''}${maxA.multiShot ? ` · ×${maxA.multiShot}` : ''}`,
        x + 12, y + 114, '#cbd2de', 9,
      );
      r.drawTextScreen(`🔵 ${brB.name}`, x + 12, y + 128, brB.color, 11, true);
      r.drawTextScreen(
        `Lv5B: ${maxB.cost}g · DMG ${maxB.damage}${maxB.armorPierce ? ' · 破甲' : ''}${maxB.splashRadius ? ` · AOE ${(maxB.splashRadius/T).toFixed(1)}t` : ''}`,
        x + 12, y + 142, '#cbd2de', 9,
      );
    } else {
      // Locked: show unlock hint
      r.drawTextScreen('未解鎖', x + 76, y + 32, '#ff9f43', 11, true);
      const hint = unlockHint(id, this.ctx.levels);
      this.drawWrappedText(r, hint, x + 76, y + 52, w - 86, 10, COLORS.textDim, 14, 4);
    }

    return y + cardH + 10;
  }

  /** Generic CJK-aware text wrapper — splits on each character so it works for Chinese. */
  private drawWrappedText(
    r: import('../engine/Renderer.ts').Renderer,
    text: string,
    x: number, y: number,
    maxW: number,
    size: number,
    color: string,
    lineH: number,
    maxLines = 3,
  ): void {
    const lines: string[] = [];
    let line = '';
    for (const ch of text) {
      const test = line + ch;
      if (r.measureTextScreen(test, size) > maxW) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((l, i) => {
      r.drawTextScreen(l, x, y + i * lineH, color, size);
    });
  }

  private renderEnemyCard(
    r: import('../engine/Renderer.ts').Renderer,
    x: number, y: number, w: number,
    id: string,
    lore: import('../game/Lore.ts').EnemyLoreEntry,
    cfg: import('../game/Enemy.ts').EnemyConfig,
  ): number {
    void id;
    const cardH = 130;
    r.drawScreenRoundedRect(x, y, w, cardH, 8, 'rgba(14,22,40,0.9)');
    r.drawScreenRoundedRectOutline(x, y, w, cardH, 8, '#22304a', 1);

    const iconSize = 48;
    r.drawScreenRect(x + 10, y + 10, iconSize, iconSize, 'rgba(255,255,255,0.04)');
    drawEnemyIconScreen(r.ctx, cfg.sprite, x + 13, y + 13, iconSize - 6);

    // Armor-type badge on top-right of icon
    const armorType = cfg.armorType ?? 'light';
    const armor = ARMOR_INFO[armorType];
    r.drawScreenCircle(x + 10 + iconSize - 8, y + 18, 9, armor.color);
    r.drawTextScreenCenter(armor.icon, x + 10 + iconSize - 8, y + 18, '#0a0f1a', 10, true);

    // Title row
    r.drawTextScreen(lore.label, x + 70, y + 10, '#ffd166', 14, true);
    r.drawTextScreen(`[${lore.tier}]`, x + 70 + r.measureTextScreen(lore.label, 14, true) + 8, y + 12, COLORS.textDim, 10);

    // Lore description (2-line wrap)
    this.drawWrappedText(r, lore.desc, x + 70, y + 32, w - 80, 10, COLORS.text, 14, 2);

    // Counter tip — distinct color so players spot it
    r.drawTextScreen(`▸ ${lore.counter}`, x + 12, y + 70, '#6ee17a', 10, true);

    // Stats row
    r.drawTextScreen(
      `HP ${cfg.hp} · 速度 ${cfg.speed} · 獎勵 ${cfg.reward}g`,
      x + 12, y + 92, '#6ec8ff', 10,
    );
    // Armor row — type + resist %
    const resistPct = Math.round((cfg.damageResist ?? 0) * 100);
    const armorLine = resistPct > 0
      ? `${armor.icon} ${armor.label} · 減傷 ${resistPct}%`
      : `${armor.icon} ${armor.label}`;
    r.drawTextScreen(armorLine, x + 12, y + 110, armor.color, 10, true);
    return y + cardH + 8;
  }

  /**
   * v2.8.0 C2 — hero card. Shows portrait, name, taglines, full backstory,
   * personality, combat role, plus skill list with descriptions and
   * cooldown numbers.
   */
  private renderHeroCard(
    r: import('../engine/Renderer.ts').Renderer,
    x: number, y: number, w: number,
    def: import('../game/Heroes.ts').HeroDef,
  ): number {
    const cardH = 168;
    const lore = HERO_LORE[def.id];
    r.drawScreenRoundedRect(x, y, w, cardH, 8, 'rgba(14,22,40,0.9)');
    r.drawScreenRoundedRectOutline(x, y, w, cardH, 8, def.color, 1.5);

    // Portrait (left)
    const iconSize = 64;
    r.drawScreenRect(x + 10, y + 10, iconSize, iconSize, 'rgba(255,255,255,0.04)');
    drawHeroIconScreen(r.ctx, def, x + 12, y + 12, iconSize - 4);

    // Title block
    r.drawTextScreen(`${def.name} · ${def.title}`, x + 84, y + 12, '#ffd166', 16, true);
    r.drawTextScreen(def.tagline, x + 84, y + 32, def.accent, 11, true);

    if (lore) {
      // Personality line below tagline
      r.drawTextScreen(`「${lore.personality}」`, x + 84, y + 50, '#cbd2de', 10);
      // Backstory full-width below portrait
      this.drawWrappedText(r, lore.backstory, x + 12, y + 84, w - 24, 10, COLORS.text, 14, 2);
      // Combat role
      r.drawTextScreen(`▸ ${lore.combat}`, x + 12, y + 124, '#a8dcff', 10, true);
    }

    // Stats footer
    r.drawTextScreen(
      `HP ${def.maxHp}  ·  DMG ${def.attackDamage}  ·  RNG ${(def.attackRange / T).toFixed(1)}t  ·  ${def.attackRate.toFixed(1)}/s`,
      x + 12, y + cardH - 18, COLORS.textDim, 10,
    );
    return y + cardH + 10;
  }

  private renderAchievements(
    r: import('../engine/Renderer.ts').Renderer,
    x: number, y: number, w: number,
    viewTop = -Infinity, viewBottom = Infinity,
  ): number {
    const cardH = 60;
    const stride = cardH + 6;
    for (const a of ACHIEVEMENTS) {
      // Cull offscreen
      if (y + cardH >= viewTop && y <= viewBottom) {
        const unlocked = !!this.ctx.save.achievements[a.id];
        r.drawScreenRoundedRect(x, y, w, cardH, 8, unlocked ? 'rgba(35,55,38,0.9)' : 'rgba(14,22,40,0.7)');
        r.drawScreenRoundedRectOutline(x, y, w, cardH, 8, unlocked ? '#6ee17a' : '#22304a', 1);
        r.drawTextScreenCenter(a.icon, x + 26, y + cardH / 2, unlocked ? '#ffd166' : '#4a5568', 22, true);
        r.drawTextScreen(a.title, x + 60, y + 10, unlocked ? '#ffd166' : COLORS.textDim, 13, true);
        r.drawTextScreen(a.description, x + 60, y + 32, unlocked ? COLORS.text : COLORS.textDim, 10);
        if (unlocked) {
          r.drawTextScreen('✓', x + w - 26, y + 22, '#6ee17a', 18, true);
        } else {
          r.drawTextScreen('🔒', x + w - 30, y + 22, COLORS.textDim, 14);
        }
      }
      y += stride;
    }
    return y;
  }

  onTap(screenX: number, screenY: number): void {
    this.scrollVelocity = 0;
    this.isDragging = false;
    if (this.backBtn && this.inside(screenX, screenY, this.backBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new MainMenuScene(this.ctx));
      return;
    }
    for (const b of this.tabBtns) {
      if (this.inside(screenX, screenY, b.rect)) {
        this.ctx.audio.click();
        this.tab = b.tab;
        this.scrollY = 0;
        this.scrollVelocity = 0;
        return;
      }
    }
    // Card area: drag to scroll, nothing selectable here
  }

  override onRelease(): void {
    this.isDragging = false;
  }

  override onDrag(dy: number, _dx: number, dt: number): void {
    this.isDragging = true;
    this.scrollY -= dy;
    const instant = dt > 0 ? -dy / dt : 0;
    this.scrollVelocity = this.scrollVelocity * 0.4 + instant * 0.6;
    if (this.scrollVelocity > 3500) this.scrollVelocity = 3500;
    else if (this.scrollVelocity < -3500) this.scrollVelocity = -3500;
    this.clampScroll();
  }

  override onWheel(deltaY: number): void {
    this.scrollY += deltaY * 0.5;
    this.scrollVelocity = 0;
    this.clampScroll();
  }
}
