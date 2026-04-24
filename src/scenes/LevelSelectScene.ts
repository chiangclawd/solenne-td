import { BaseScene } from '../ui/Scene.ts';
import { MainMenuScene } from './MainMenuScene.ts';
import { GameScene } from './GameScene.ts';
import { HeroSelectScene } from './HeroSelectScene.ts';
import { SettingsScene } from './SettingsScene.ts';
import { getStars, isUnlocked, totalStars, countCompleted } from '../storage/SaveData.ts';
import { COLORS } from '../config.ts';
import { drawGoldFrame } from '../graphics/UIPainter.ts';

// Lazy-load world cover banner with sequential WebP → PNG fallback.
interface CoverState { extIdx: number; img: HTMLImageElement | null }
const COVER_EXTS = ['webp', 'png'] as const;
const coverCache = new Map<number, CoverState>();
function getCover(worldId: number, base: string): HTMLImageElement | null {
  let st = coverCache.get(worldId);
  if (!st) {
    st = { extIdx: 0, img: null };
    coverCache.set(worldId, st);
    coverTryNext(worldId, base, st);
  }
  if (st.img && st.img.complete && st.img.naturalWidth > 0) return st.img;
  return null;
}
function coverTryNext(worldId: number, base: string, st: CoverState): void {
  if (st.extIdx >= COVER_EXTS.length) return;
  const ext = COVER_EXTS[st.extIdx];
  const img = new Image();
  img.onload = () => { st.img = img; };
  img.onerror = () => { st.extIdx++; coverTryNext(worldId, base, st); };
  img.src = `${base}assets/covers/world${worldId}.${ext}`;
}
import type { LevelData } from '../game/Level.ts';

interface Rect { x: number; y: number; w: number; h: number }

const WORLD_NAMES: Record<number, { name: string; sub: string; color: string }> = {
  1: { name: '邊境戰役', sub: 'Frontier', color: '#6ee17a' },
  2: { name: '工業心臟', sub: 'Industrial Heart', color: '#ffd166' },
  3: { name: '首都保衛', sub: 'Capital Stand', color: '#ff6b6b' },
  4: { name: '凍原前哨', sub: 'Frozen Outpost', color: '#6ec8ff' },
  5: { name: '虛空要塞', sub: 'Void Fortress', color: '#c878ff' },
};

const DIFF_LABEL: Record<string, string> = {
  normal: 'Normal',
  hard: 'Hard',
  heroic: 'Heroic',
};
const DIFF_COLOR: Record<string, string> = {
  normal: '#6ee17a',
  hard: '#ffd166',
  heroic: '#ff6b6b',
};

export class LevelSelectScene extends BaseScene {
  private cards: { rect: Rect; level: LevelData; unlocked: boolean }[] = [];
  private backBtn: Rect | null = null;
  private settingsBtn: Rect | null = null;
  private elapsed = 0;
  private scrollY = 0;
  private contentHeight = 0;
  private viewportHeight = 0;
  /** Vertical scroll momentum (CSS px/s) — updated on drag, decayed on each render. */
  private scrollVelocity = 0;
  /** True while a finger/mouse drag is in progress — disables inertia. */
  private isDragging = false;
  /** performance.now() at last inertia step — used for rAF-rate inertia updates. */
  private lastInertiaT = 0;

  override onEnter(): void {
    this.ctx.playBgm('menu');
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.ctx.renderer.updateShake(dt);
  }

  /**
   * Apply scroll inertia using wall-clock delta so it runs at full rAF rate
   * (120Hz on ProMotion displays) rather than being locked to 60Hz fixed-dt.
   * Called from render() before drawing.
   */
  private stepInertia(): void {
    const now = performance.now();
    const realDt = this.lastInertiaT === 0 ? 0 : (now - this.lastInertiaT) / 1000;
    this.lastInertiaT = now;
    if (realDt <= 0 || realDt > 0.25) return; // skip absurd dt (tab-switch, etc.)
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
    // Inertia integration first so scrollY reflects latest physics this frame
    this.stepInertia();

    const r = this.ctx.renderer;
    r.beginFrame();
    // Skip world-tile background — a near-opaque gradient overlays it anyway.
    // Drawing 150 grass tiles per frame was a significant mobile perf hit.
    r.beginScreen();
    const vw = this.ctx.renderer.vw();
    const vh = this.ctx.renderer.vh();
    r.drawScreenVerticalGradient(0, 0, vw, vh, 'rgba(5,8,20,0.92)', 'rgba(5,8,20,0.98)');

    // Header
    const backW = 68, backH = 30;
    this.backBtn = { x: 12, y: 12, w: backW, h: backH };
    r.drawScreenRoundedRect(12, 12, backW, backH, 8, '#22304a');
    r.drawTextScreenCenter('← 返回', 12 + backW / 2, 12 + backH / 2, COLORS.text, 11, true);

    const sbW = 40, sbH = 30;
    this.settingsBtn = { x: vw - sbW - 12, y: 12, w: sbW, h: sbH };
    r.drawScreenRoundedRect(this.settingsBtn.x, this.settingsBtn.y, sbW, sbH, 8, '#22304a');
    r.drawTextScreenCenter('⚙', this.settingsBtn.x + sbW / 2, this.settingsBtn.y + sbH / 2, '#fff', 15, true);

    r.drawTextScreenCenter('戰役選擇', vw / 2, 28, '#ffd166', 20, true);

    // Meta progress bar
    const diff = this.ctx.save.settings.difficulty;
    const totalS = totalStars(this.ctx.save);
    const completed = countCompleted(this.ctx.save);
    const panelY = 54;
    r.drawScreenRoundedRect(12, panelY, vw - 24, 46, 8, 'rgba(14,22,40,0.88)');

    r.drawTextScreen(
      `🏅 ${totalS} / ${this.ctx.levels.length * 3}  ·  ✓ ${completed} / ${this.ctx.levels.length}`,
      24, panelY + 8, '#ffd166', 12, true,
    );
    const diffX = vw - 140;
    r.drawScreenRoundedRect(diffX, panelY + 8, 116, 26, 6, 'rgba(0,0,0,0.35)');
    r.drawScreenRoundedRectOutline(diffX, panelY + 8, 116, 26, 6, DIFF_COLOR[diff], 1);
    r.drawTextScreenCenter(`◆ ${DIFF_LABEL[diff]}`, diffX + 58, panelY + 8 + 13, DIFF_COLOR[diff], 11, true);

    // Progress bar
    const pct = totalS / (this.ctx.levels.length * 3);
    r.drawScreenRoundedRect(24, panelY + 30, vw - 48, 6, 3, 'rgba(255,255,255,0.08)');
    r.drawScreenRoundedRect(24, panelY + 30, (vw - 48) * pct, 6, 3, '#ffd166');

    // Level cards — scrollable region below the fixed header/progress bar
    this.cards = [];

    const cardW = 82, cardH = 102, gap = 8;
    const cols = 4;
    const rowWidth = cardW * cols + gap * (cols - 1);
    const startX = (vw - rowWidth) / 2;

    const contentTop = panelY + 62;        // where scrollable content begins
    const footerH = 20;
    const contentBottom = vh - footerH;
    this.viewportHeight = contentBottom - contentTop;

    // Clip to scrollable area so overflow is hidden
    const dpr = window.devicePixelRatio || 1;
    r.ctx.save();
    r.ctx.beginPath();
    r.ctx.rect(0, contentTop * dpr, vw * dpr, this.viewportHeight * dpr);
    r.ctx.clip();

    let y = contentTop - this.scrollY;
    const worlds = [1, 2, 3, 4, 5];
    const base = import.meta.env.BASE_URL;
    // Viewport-culling Y bounds (in CSS coord; same space as running y cursor)
    const viewTop = contentTop;
    const viewBottom = contentTop + this.viewportHeight;
    for (const worldIdx of worlds) {
      const w = WORLD_NAMES[worldIdx];
      const cover = getCover(worldIdx, base);
      if (cover) {
        const bannerH = 54;
        // Skip draw if banner is entirely outside viewport
        if (y + bannerH >= viewTop && y <= viewBottom) {
          r.ctx.save();
          r.ctx.beginPath();
          r.ctx.roundRect(startX * dpr, y * dpr, rowWidth * dpr, bannerH * dpr, 6 * dpr);
          r.ctx.clip();
          r.ctx.drawImage(cover, startX * dpr, y * dpr, rowWidth * dpr, bannerH * dpr);
          const grad = r.ctx.createLinearGradient(startX * dpr, 0, (startX + rowWidth) * dpr, 0);
          grad.addColorStop(0, 'rgba(5,8,20,0.85)');
          grad.addColorStop(0.5, 'rgba(5,8,20,0.35)');
          grad.addColorStop(1, 'rgba(5,8,20,0.1)');
          r.ctx.fillStyle = grad;
          r.ctx.fillRect(startX * dpr, y * dpr, rowWidth * dpr, bannerH * dpr);
          r.ctx.restore();
          r.drawTextScreen(w.name, startX + 10, y + 10, w.color, 16, true);
          r.drawTextScreen(w.sub, startX + 10, y + 30, COLORS.textDim, 10);
        }
        y += bannerH + 8;
      } else {
        if (y + 22 >= viewTop && y <= viewBottom) {
          r.drawTextScreen(`${w.name}`, startX, y, w.color, 13, true);
          r.drawTextScreen(`· ${w.sub}`, startX + r.measureTextScreen(w.name, 13, true) + 6, y + 2, COLORS.textDim, 10);
        }
        y += 22;
      }

      const worldLevels = this.ctx.levels.filter((l) => l.world === worldIdx);
      for (let i = 0; i < worldLevels.length; i++) {
        const level = worldLevels[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = startX + col * (cardW + gap);
        const cy = y + row * (cardH + gap);
        const rect: Rect = { x: cx, y: cy, w: cardW, h: cardH };
        const unlocked = isUnlocked(this.ctx.save, this.ctx.levels, level.id);
        const stars = getStars(this.ctx.save, level.id);
        // Always push card rect (for tap hit-testing) even when culled
        this.cards.push({ rect, level, unlocked });

        // Cull: skip rendering if card is entirely above viewport or below
        if (cy + cardH < viewTop || cy > viewBottom) continue;

        const bg = unlocked ? (stars > 0 ? '#24354a' : '#1b2a42') : '#0f141e';
        r.drawScreenRoundedRect(cx, cy, cardW, cardH, 8, bg);
        if (unlocked && stars === 3) {
          const pulse = 0.5 + Math.sin(this.elapsed * 2 + i) * 0.4;
          r.ctx.globalAlpha = pulse;
          drawGoldFrame(r.ctx, cx, cy, cardW, cardH, 8, 1);
          r.ctx.globalAlpha = 1;
        }

        if (unlocked) {
          const idx = this.ctx.levels.findIndex((l) => l.id === level.id) + 1;
          r.drawTextScreen(`L${idx}`, cx + 8, cy + 6, '#9aa5b8', 10, true);
          r.drawTextScreenCenter(level.name, cx + cardW / 2, cy + cardH / 2 - 6, COLORS.text, 13, true);
          const starText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
          r.drawTextScreenCenter(starText, cx + cardW / 2, cy + cardH - 22, stars > 0 ? '#ffd166' : '#4a5568', 14, true);
          const progress = this.ctx.save.levelProgress[level.id];
          if (progress?.bestStarsByDifficulty?.heroic) {
            r.drawTextScreen('H', cx + cardW - 14, cy + 6, DIFF_COLOR.heroic, 10, true);
          } else if (progress?.bestStarsByDifficulty?.hard) {
            r.drawTextScreen('h', cx + cardW - 14, cy + 6, DIFF_COLOR.hard, 10, true);
          }
        } else {
          r.drawTextScreen(`L${this.ctx.levels.findIndex((l) => l.id === level.id) + 1}`, cx + 8, cy + 6, '#4a5568', 10, true);
          r.drawTextScreenCenter('🔒', cx + cardW / 2, cy + cardH / 2, '#4a5568', 22);
        }
      }
      const rowCount = Math.max(1, Math.ceil(worldLevels.length / cols));
      y += rowCount * (cardH + gap) + 12;
    }

    // Record full content height (in unscrolled coords) for clamp
    this.contentHeight = (y + this.scrollY) - contentTop;
    this.clampScroll();

    r.ctx.restore();

    // Scrollbar (only if content overflows)
    if (this.contentHeight > this.viewportHeight) {
      const trackH = this.viewportHeight - 16;
      const thumbH = Math.max(36, trackH * (this.viewportHeight / this.contentHeight));
      const thumbY = contentTop + 8 + (trackH - thumbH) * (this.scrollY / (this.contentHeight - this.viewportHeight));
      r.drawScreenRoundedRect(vw - 6, contentTop + 8, 3, trackH, 1.5, 'rgba(255,255,255,0.05)');
      r.drawScreenRoundedRect(vw - 6, thumbY, 3, thumbH, 1.5, 'rgba(255,215,100,0.5)');
    }

    // Footer hint (fixed)
    r.drawTextScreenCenter('點擊右上 ⚙ 切換難度 · 上下滑動捲動', vw / 2, vh - 16, COLORS.textDim, 9);
  }

  /**
   * Press begin — stop momentum, record the pressed target. Actual navigation
   * fires on pointerup (in onRelease) only if the pointer didn't drag.
   */
  onTap(screenX: number, screenY: number): void {
    this.scrollVelocity = 0;
    this.isDragging = false;
    // Fixed-position controls (header) fire immediately since they don't scroll
    if (this.backBtn && this.inside(screenX, screenY, this.backBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new MainMenuScene(this.ctx));
      return;
    }
    if (this.settingsBtn && this.inside(screenX, screenY, this.settingsBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new SettingsScene(this.ctx));
      return;
    }
  }

  override onRelease(screenX: number, screenY: number, _wx: number, _wy: number, didDrag?: boolean): void {
    this.isDragging = false;
    if (didDrag) return;
    for (const c of this.cards) {
      if (c.unlocked && this.inside(screenX, screenY, c.rect)) {
        this.ctx.audio.click();
        if (c.level.endless === true) {
          this.ctx.transition(new GameScene(this.ctx, c.level, null));
        } else {
          this.ctx.transition(new HeroSelectScene(this.ctx, c.level));
        }
        return;
      }
    }
  }

  override onDrag(dy: number, _dx: number, dt: number): void {
    this.isDragging = true;
    this.scrollY -= dy;
    // Low-pass filter + real timing for stable, natural inertia
    const instant = dt > 0 ? -dy / dt : 0;
    this.scrollVelocity = this.scrollVelocity * 0.4 + instant * 0.6;
    // Cap to avoid absurd velocity from a single large delta
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
