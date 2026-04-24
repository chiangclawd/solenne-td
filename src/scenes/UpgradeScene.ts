import { BaseScene } from '../ui/Scene.ts';
import { MainMenuScene } from './MainMenuScene.ts';
import { COLORS } from '../config.ts';
import {
  META_UPGRADES,
  getTier,
  availableStars,
  spentStars,
  tryBuyNextTier,
  resetAllUpgrades,
} from '../game/MetaUpgrades.ts';
import { totalStars } from '../storage/SaveData.ts';

interface Rect { x: number; y: number; w: number; h: number }
interface CardAction { rect: Rect; upgradeId: string }

export class UpgradeScene extends BaseScene {
  private backBtn: Rect | null = null;
  private resetBtn: Rect | null = null;
  private cardActions: CardAction[] = [];
  private scrollY = 0;
  private scrollVelocity = 0;
  private contentHeight = 0;
  private viewportHeight = 0;
  private isDragging = false;
  private lastInertiaT = 0;
  private elapsed = 0;
  private flashUpgradeId: string | null = null;
  private flashTime = 0;

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
    r.drawTextScreenCenter('星星升級', vw / 2, 28, '#ffd166', 20, true);

    // Star counter
    const avail = availableStars(this.ctx.save);
    const total = totalStars(this.ctx.save);
    const spent = spentStars(this.ctx.save);
    const panelY = 54;
    r.drawScreenRoundedRect(12, panelY, vw - 24, 52, 10, 'rgba(14,22,40,0.9)');
    r.drawScreenRoundedRectOutline(12, panelY, vw - 24, 52, 10, '#ffd166', 1);
    r.drawTextScreen(`可用星星`, 22, panelY + 8, COLORS.textDim, 11);
    r.drawTextScreen(`★ ${avail}`, 22, panelY + 22, '#ffd166', 22, true);
    r.drawTextScreen(`累計 ${total}  ·  已用 ${spent}`, 22, panelY + 46, COLORS.textDim, 10);

    // Reset button
    const rbW = 76, rbH = 32;
    this.resetBtn = { x: vw - rbW - 18, y: panelY + 10, w: rbW, h: rbH };
    r.drawScreenRoundedRect(this.resetBtn.x, this.resetBtn.y, rbW, rbH, 7, '#3a1a22');
    r.drawScreenRoundedRectOutline(this.resetBtn.x, this.resetBtn.y, rbW, rbH, 7, '#ff6b6b', 1);
    r.drawTextScreenCenter('↻ 重置', this.resetBtn.x + rbW / 2, this.resetBtn.y + rbH / 2, '#ff8a8a', 11, true);

    // Cards area (scrollable)
    const contentY = 116;
    const contentH = vh - contentY - 12;
    this.viewportHeight = contentH;
    const dpr = window.devicePixelRatio || 1;
    r.ctx.save();
    r.ctx.beginPath();
    r.ctx.rect(0, contentY * dpr, vw * dpr, contentH * dpr);
    r.ctx.clip();

    this.cardActions = [];
    const cardH = 108;
    const cardGap = 8;
    const cardX = 12;
    const cardW = vw - 24;
    const contentStart = contentY + 8;
    let y = contentStart - this.scrollY;
    const viewTop = contentY;
    const viewBottom = contentY + contentH;

    for (const u of META_UPGRADES) {
      // Cull cards fully offscreen. Still advance y and renderCard when in view.
      if (y + cardH >= viewTop && y <= viewBottom) {
        this.renderCard(r, u, cardX, y, cardW, cardH);
      } else {
        // Still register the action rect so buy button hit-test works if partially shown
        // (but since culled means fully outside, it's safe to skip)
      }
      y += cardH + cardGap;
    }

    this.contentHeight = (y + this.scrollY) - contentStart;
    this.clampScroll();

    r.ctx.restore();

    // Scrollbar indicator
    if (this.contentHeight > this.viewportHeight) {
      const trackH = this.viewportHeight - 16;
      const thumbH = Math.max(36, trackH * (this.viewportHeight / this.contentHeight));
      const thumbY = contentY + 8 + (trackH - thumbH) * (this.scrollY / (this.contentHeight - this.viewportHeight));
      r.drawScreenRoundedRect(vw - 6, contentY + 8, 3, trackH, 1.5, 'rgba(255,255,255,0.05)');
      r.drawScreenRoundedRect(vw - 6, thumbY, 3, thumbH, 1.5, 'rgba(255,215,100,0.5)');
    }
  }

  private renderCard(
    r: import('../engine/Renderer.ts').Renderer,
    u: typeof META_UPGRADES[number],
    x: number, y: number, w: number, h: number,
  ): void {
    const tier = getTier(this.ctx.save, u.id);
    const isFlashing = this.flashUpgradeId === u.id && this.flashTime > 0;
    const flashA = isFlashing ? this.flashTime / 0.6 : 0;

    // Card bg
    const bg = tier >= 3 ? 'rgba(35, 55, 38, 0.9)' : 'rgba(14, 22, 40, 0.9)';
    r.drawScreenRoundedRect(x, y, w, h, 10, bg);
    r.drawScreenRoundedRectOutline(x, y, w, h, 10, tier > 0 ? '#ffd166' : '#22304a', tier > 0 ? 1.5 : 1);
    if (isFlashing) {
      r.ctx.save();
      r.ctx.globalAlpha = flashA * 0.6;
      r.drawScreenRoundedRectOutline(x, y, w, h, 10, '#6ee17a', 2.5);
      r.ctx.restore();
    }

    // Icon
    r.drawTextScreenCenter(u.icon, x + 30, y + 30, tier > 0 ? '#ffd166' : COLORS.textDim, 28, true);

    // Name + desc
    r.drawTextScreen(u.name, x + 60, y + 10, tier >= 3 ? '#6ee17a' : '#ffd166', 15, true);
    r.drawTextScreen(u.description, x + 60, y + 30, COLORS.text, 11);

    // Tier pips (3 dots showing progression)
    for (let i = 0; i < 3; i++) {
      const px = x + 60 + i * 14;
      const py = y + 50;
      if (i < tier) {
        r.drawScreenRoundedRect(px, py, 10, 10, 2, '#ffd166');
      } else {
        r.drawScreenRoundedRectOutline(px, py, 10, 10, 2, '#4a5560', 1);
      }
      // Tier value label
      r.drawTextScreenCenter(u.tiers[i].label, px + 5, py + 22, COLORS.textDim, 9, i < tier);
    }

    // Buy button (bottom right of card)
    const bw = 110, bh = 36;
    const bx = x + w - bw - 10;
    const by = y + h - bh - 8;
    const avail = availableStars(this.ctx.save);
    if (tier >= 3) {
      r.drawScreenRoundedRect(bx, by, bw, bh, 8, '#2a4028');
      r.drawTextScreenCenter('已滿級', bx + bw / 2, by + bh / 2, '#6ee17a', 14, true);
    } else {
      const nextCost = u.tiers[tier].starCost;
      const canAfford = avail >= nextCost;
      r.drawScreenRoundedRect(bx, by, bw, bh, 8, canAfford ? '#2c8cc7' : '#22304a');
      if (canAfford) {
        r.drawScreenRoundedRectOutline(bx, by, bw, bh, 8, '#5eb8ff', 1);
      }
      r.drawTextScreenCenter(
        `升級 ★ ${nextCost}`,
        bx + bw / 2,
        by + bh / 2,
        canAfford ? '#fff' : '#888',
        14,
        true,
      );
      this.cardActions.push({ rect: { x: bx, y: by, w: bw, h: bh }, upgradeId: u.id });
    }
  }

  onTap(screenX: number, screenY: number): void {
    this.scrollVelocity = 0;
    this.isDragging = false;
    // Fixed-position controls fire immediately
    if (this.backBtn && this.inside(screenX, screenY, this.backBtn)) {
      this.ctx.audio.click();
      this.ctx.persistSave();
      this.ctx.transition(new MainMenuScene(this.ctx));
      return;
    }
    if (this.resetBtn && this.inside(screenX, screenY, this.resetBtn)) {
      if (typeof confirm !== 'undefined' && confirm('重置所有升級？已花費的星星會全部退還。')) {
        resetAllUpgrades(this.ctx.save);
        this.ctx.persistSave();
        this.ctx.audio.click();
      }
      return;
    }
    // Scrollable card actions wait for release (to prevent accidental buy during drag)
  }

  override onRelease(screenX: number, screenY: number, _wx: number, _wy: number, didDrag?: boolean): void {
    this.isDragging = false;
    if (didDrag) return;
    for (const a of this.cardActions) {
      if (this.inside(screenX, screenY, a.rect)) {
        const res = tryBuyNextTier(this.ctx.save, a.upgradeId);
        if (res.ok) {
          this.ctx.audio.upgrade();
          this.ctx.persistSave();
          this.flashUpgradeId = a.upgradeId;
          this.flashTime = 0.6;
          this.ctx.achievements.check(this.ctx.save, { type: 'saveTick' });
        } else {
          this.ctx.audio.click();
        }
        return;
      }
    }
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

  override onExit(): void {
    this.ctx.persistSave();
  }
}
