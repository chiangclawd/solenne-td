import { BaseScene } from '../ui/Scene.ts';
import { MainMenuScene } from './MainMenuScene.ts';
import { GameScene } from './GameScene.ts';
import { SettingsScene } from './SettingsScene.ts';
import { getStars, isUnlocked, totalStars, countCompleted } from '../storage/SaveData.ts';
import { COLORS, TILE_SIZE, GRID_COLS, GRID_ROWS, WORLD_WIDTH, WORLD_HEIGHT } from '../config.ts';
import { drawGrassTile, drawGoldFrame } from '../graphics/UIPainter.ts';

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
    for (let gy = 0; gy < GRID_ROWS; gy++) {
      for (let gx = 0; gx < GRID_COLS; gx++) {
        drawGrassTile(r.ctx, gx * TILE_SIZE, gy * TILE_SIZE, TILE_SIZE, 'grass');
      }
    }
    void WORLD_WIDTH; void WORLD_HEIGHT;

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

    // Level cards
    this.cards = [];

    const cardW = 82, cardH = 102, gap = 8;
    const cols = 4;
    const rowWidth = cardW * cols + gap * (cols - 1);
    const startX = (vw - rowWidth) / 2;

    let y = panelY + 62;
    const worlds = [1, 2, 3, 4, 5];
    const base = import.meta.env.BASE_URL;
    for (const worldIdx of worlds) {
      const w = WORLD_NAMES[worldIdx];
      // Optional cover banner (loaded from public/assets/covers/worldN.png if user provides)
      const cover = getCover(worldIdx, base);
      if (cover) {
        const bannerH = 54;
        const dpr = window.devicePixelRatio || 1;
        r.ctx.save();
        r.ctx.beginPath();
        r.ctx.roundRect(startX * dpr, y * dpr, rowWidth * dpr, bannerH * dpr, 6 * dpr);
        r.ctx.clip();
        r.ctx.drawImage(cover, startX * dpr, y * dpr, rowWidth * dpr, bannerH * dpr);
        // Dark left-to-right fade for text contrast
        const grad = r.ctx.createLinearGradient(startX * dpr, 0, (startX + rowWidth) * dpr, 0);
        grad.addColorStop(0, 'rgba(5,8,20,0.85)');
        grad.addColorStop(0.5, 'rgba(5,8,20,0.35)');
        grad.addColorStop(1, 'rgba(5,8,20,0.1)');
        r.ctx.fillStyle = grad;
        r.ctx.fillRect(startX * dpr, y * dpr, rowWidth * dpr, bannerH * dpr);
        r.ctx.restore();
        r.drawTextScreen(w.name, startX + 10, y + 10, w.color, 16, true);
        r.drawTextScreen(w.sub, startX + 10, y + 30, COLORS.textDim, 10);
        y += bannerH + 8;
      } else {
        r.drawTextScreen(`${w.name}`, startX, y, w.color, 13, true);
        r.drawTextScreen(`· ${w.sub}`, startX + r.measureTextScreen(w.name, 13, true) + 6, y + 2, COLORS.textDim, 10);
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
        this.cards.push({ rect, level, unlocked });

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

    // Footer hint
    r.drawTextScreenCenter('點擊右上 ⚙ 切換難度', vw / 2, vh - 16, COLORS.textDim, 9);
  }

  onTap(screenX: number, screenY: number): void {
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
    for (const c of this.cards) {
      if (c.unlocked && this.inside(screenX, screenY, c.rect)) {
        this.ctx.audio.click();
        this.ctx.transition(new GameScene(this.ctx, c.level));
        return;
      }
    }
  }
}
