/**
 * World Map (v2.7.0 D1).
 *
 * Replaces the flat list-style level select as the first stop after
 * "戰役" / "關卡選擇". Shows the 6 worlds of Solenne as a vertical
 * journey of themed cards — each card has a procedural silhouette
 * vista of that biome plus progress numbers and a tap target.
 *
 * Tapping a world card transitions to LevelSelectScene with a
 * worldFilter so the player sees only that world's level grid.
 *
 * Locked worlds: a world unlocks when the player has completed at
 * least 1 level of the previous world (or always for W1).
 */
import { BaseScene } from '../ui/Scene.ts';
import { COLORS } from '../config.ts';
import { MainMenuScene } from './MainMenuScene.ts';
import { LevelSelectScene } from './LevelSelectScene.ts';
import { drawWorldThumbnailScreen } from '../graphics/WorldBackground.ts';
import { drawGoldFrame } from '../graphics/UIPainter.ts';
import { isCompleted } from '../storage/SaveData.ts';
import type { LevelData } from '../game/Level.ts';

interface Rect { x: number; y: number; w: number; h: number }

/** Hand-curated metadata for each world's card. */
const WORLDS: { id: number; name: string; subtitle: string; tagline: string; accent: string }[] = [
  { id: 1, name: '邊境草原',   subtitle: 'Frontier',   tagline: '鐵潮的先鋒在這裡叩門。',           accent: '#6ee17a' },
  { id: 2, name: '工業殘響',   subtitle: 'Industrial', tagline: '鋼鐵與火光，工業城最後的防線。', accent: '#ff9f43' },
  { id: 3, name: '首都廊道',   subtitle: 'Capital',    tagline: '從石燈大街到王座之廳。',           accent: '#5eb8ff' },
  { id: 4, name: '凍原征途',   subtitle: 'Frozen',     tagline: '冰風與極光下的征討。',             accent: '#a8dcff' },
  { id: 5, name: '虛空裂口',   subtitle: 'Void',       tagline: '幽影、分裂、與第一個人。',         accent: '#c878ff' },
  { id: 6, name: '深海餘響',   subtitle: 'Seabed',     tagline: '深淵下方，某物正在甦醒。',         accent: '#6ec8ff' },
];

export class WorldMapScene extends BaseScene {
  private backBtn: Rect | null = null;
  private cardRects: { worldId: number; rect: Rect; unlocked: boolean }[] = [];
  private scrollY = 0;
  private scrollVelocity = 0;
  private isDragging = false;
  private contentHeight = 0;
  private viewportHeight = 0;
  private lastInertiaT = 0;
  private elapsed = 0;

  override onEnter(): void {
    this.ctx.playBgm('menu');
  }

  update(dt: number): void {
    this.elapsed += dt;
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

  private isUnlocked(worldId: number): boolean {
    if (worldId === 1) return true;
    // Unlock when at least one level of the previous world is cleared.
    const prevLevels = this.ctx.levels.filter((l) => l.world === worldId - 1);
    return prevLevels.some((l) => isCompleted(this.ctx.save, l.id));
  }

  private worldStats(worldId: number): { stars: number; maxStars: number; cleared: number; total: number } {
    const levels = this.ctx.levels.filter((l) => l.world === worldId);
    let stars = 0;
    let cleared = 0;
    for (const l of levels) {
      const p = this.ctx.save.levelProgress[l.id];
      if (p?.completed) cleared++;
      stars += p?.bestStars ?? 0;
    }
    return { stars, maxStars: levels.length * 3, cleared, total: levels.length };
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
    r.drawTextScreenCenter('索倫王國 · 世界地圖', vw / 2, 28, '#ffd166', 18, true);

    const contentY = 56;
    const contentH = vh - contentY - 12;
    this.viewportHeight = contentH;
    const dpr = window.devicePixelRatio || 1;
    r.ctx.save();
    r.ctx.beginPath();
    r.ctx.rect(0, contentY * dpr, vw * dpr, contentH * dpr);
    r.ctx.clip();

    this.cardRects = [];
    const cardH = 168;
    const cardGap = 14;
    const cardX = 16;
    const cardW = vw - 32;
    let cy = contentY - this.scrollY + 6;

    for (let i = 0; i < WORLDS.length; i++) {
      const wd = WORLDS[i];
      const unlocked = this.isUnlocked(wd.id);
      const stats = this.worldStats(wd.id);
      const rect: Rect = { x: cardX, y: cy, w: cardW, h: cardH };
      this.cardRects.push({ worldId: wd.id, rect, unlocked });
      // Cull off-screen cards (cheap render perf)
      if (cy + cardH < contentY || cy > contentY + contentH) {
        cy += cardH + cardGap;
        continue;
      }
      this.drawWorldCard(r, rect, wd, unlocked, stats, i);
      cy += cardH + cardGap;
    }

    r.ctx.restore();
    this.contentHeight = (cy + this.scrollY) - contentY;
    this.clampScroll();
  }

  private drawWorldCard(
    r: import('../engine/Renderer.ts').Renderer,
    rect: Rect,
    wd: typeof WORLDS[number],
    unlocked: boolean,
    stats: { stars: number; maxStars: number; cleared: number; total: number },
    seedIdx: number,
  ): void {
    // Card background — clipped silhouette art when unlocked, dim when locked.
    r.drawScreenRoundedRect(rect.x, rect.y, rect.w, rect.h, 12, '#0a1020');
    // Apply rounded clip via path before painting silhouette
    r.ctx.save();
    const dpr = window.devicePixelRatio || 1;
    r.ctx.beginPath();
    const radius = 12 * dpr;
    const rx = rect.x * dpr;
    const ry = rect.y * dpr;
    const rw = rect.w * dpr;
    const rh = rect.h * dpr;
    r.ctx.moveTo(rx + radius, ry);
    r.ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, radius);
    r.ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, radius);
    r.ctx.arcTo(rx, ry + rh, rx, ry, radius);
    r.ctx.arcTo(rx, ry, rx + rw, ry, radius);
    r.ctx.closePath();
    r.ctx.clip();
    if (unlocked) {
      // Render the world's silhouette into the card area
      drawWorldThumbnailScreen(r.ctx, rect.x, rect.y, rect.w, rect.h, wd.id, 1000 + seedIdx * 13);
      // Vignette darkening for legibility
      const vG = r.ctx.createLinearGradient(0, ry, 0, ry + rh);
      vG.addColorStop(0, 'rgba(5,8,16,0.18)');
      vG.addColorStop(0.55, 'rgba(5,8,16,0.45)');
      vG.addColorStop(1, 'rgba(5,8,16,0.85)');
      r.ctx.fillStyle = vG;
      r.ctx.fillRect(rx, ry, rw, rh);
    } else {
      r.ctx.fillStyle = '#0d121e';
      r.ctx.fillRect(rx, ry, rw, rh);
    }
    r.ctx.restore();

    // Gold frame for fully cleared worlds
    if (unlocked && stats.cleared === stats.total && stats.total > 0) {
      const pulse = 0.55 + Math.sin(this.elapsed * 1.8 + seedIdx) * 0.35;
      r.ctx.globalAlpha = pulse;
      drawGoldFrame(r.ctx, rect.x, rect.y, rect.w, rect.h, 12, 1);
      r.ctx.globalAlpha = 1;
    } else if (unlocked) {
      r.drawScreenRoundedRectOutline(rect.x, rect.y, rect.w, rect.h, 12, wd.accent, 1.2);
    }

    if (!unlocked) {
      // Locked overlay
      r.drawTextScreenCenter('🔒', rect.x + rect.w / 2, rect.y + rect.h / 2 - 8, '#7a8a9f', 32, true);
      r.drawTextScreenCenter('完成前一世界至少一關後解鎖', rect.x + rect.w / 2, rect.y + rect.h / 2 + 24, '#7a8a9f', 11, true);
      // Still show world number
      r.drawTextScreen(`W${wd.id} · ${wd.name}`, rect.x + 16, rect.y + 14, '#4a5568', 14, true);
      return;
    }

    // Title block — left aligned
    r.drawTextScreen(`W${wd.id} · ${wd.name}`, rect.x + 16, rect.y + 14, wd.accent, 18, true);
    r.drawTextScreen(wd.subtitle, rect.x + 16, rect.y + 38, '#cbd2de', 11, true);

    // Tagline — bottom-left
    r.drawTextScreen(wd.tagline, rect.x + 16, rect.y + rect.h - 50, '#dde3ec', 12);

    // Stats — bottom-right. Star icons + completion fraction.
    const sx = rect.x + rect.w - 16;
    r.drawTextScreen(`★ ${stats.stars}/${stats.maxStars}`, sx - r.measureTextScreen(`★ ${stats.stars}/${stats.maxStars}`, 14, true), rect.y + rect.h - 46, '#ffd166', 14, true);
    r.drawTextScreen(`${stats.cleared}/${stats.total} 通關`, sx - r.measureTextScreen(`${stats.cleared}/${stats.total} 通關`, 12, true), rect.y + rect.h - 26, COLORS.text, 12);

    // Progress bar at bottom edge
    const pbY = rect.y + rect.h - 8;
    const pbW = rect.w - 32;
    const pbX = rect.x + 16;
    r.drawScreenRoundedRect(pbX, pbY, pbW, 4, 2, 'rgba(255,255,255,0.1)');
    const pct = stats.maxStars > 0 ? stats.stars / stats.maxStars : 0;
    r.drawScreenRoundedRect(pbX, pbY, pbW * pct, 4, 2, wd.accent);
  }

  override onDrag(dy: number): void {
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
      this.ctx.transition(new MainMenuScene(this.ctx));
      return;
    }
    for (const c of this.cardRects) {
      if (!this.inside(screenX, screenY, c.rect)) continue;
      if (!c.unlocked) {
        this.ctx.audio.click();
        return;
      }
      this.ctx.audio.click();
      this.ctx.transition(new LevelSelectScene(this.ctx, c.worldId));
      return;
    }
  }
}

// (Helper kept here for future expansion if a level filter API needs world.)
export type _WorldMapPathExport = LevelData['world'];
