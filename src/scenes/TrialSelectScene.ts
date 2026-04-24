/**
 * Trial select scene (v2.6.0 B2).
 *
 * Lists the 6 post-campaign trials. Each trial card shows constraints,
 * reward, and completion status. Tapping a trial loads its JSON and
 * routes to GameScene (skipping HeroSelect if the trial pins a hero).
 *
 * Unlock pattern: trial-01 always available once L28 is cleared; each
 * subsequent trial requires the previous to be cleared.
 */
import { BaseScene } from '../ui/Scene.ts';
import { COLORS } from '../config.ts';
import { TRIAL_IDS, loadTrial } from '../game/TrialLoader.ts';
import type { TrialId } from '../game/TrialLoader.ts';
import type { LevelData } from './../game/Level.ts';
import { MainMenuScene } from './MainMenuScene.ts';
import { HeroSelectScene } from './HeroSelectScene.ts';
import { GameScene } from './GameScene.ts';
import { drawGoldFrame } from '../graphics/UIPainter.ts';
import { isCompleted } from '../storage/SaveData.ts';

interface Rect { x: number; y: number; w: number; h: number }

export class TrialSelectScene extends BaseScene {
  private backBtn: Rect | null = null;
  private trialCards: { id: TrialId; rect: Rect; unlocked: boolean }[] = [];
  private trialMeta: Partial<Record<TrialId, LevelData>> = {};
  private elapsed = 0;
  private loadingError: string | null = null;

  override onEnter(): void {
    this.ctx.playBgm('menu');
    // Lazy-load all trial JSON metadata so we can show name + reward + constraints.
    Promise.all(TRIAL_IDS.map((id) => loadTrial(id).catch((e: Error) => {
      console.warn('Failed to load', id, e);
      this.loadingError = e.message;
      return null;
    }))).then((datas) => {
      for (let i = 0; i < TRIAL_IDS.length; i++) {
        if (datas[i]) this.trialMeta[TRIAL_IDS[i]] = datas[i] as LevelData;
      }
    });
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.ctx.renderer.updateShake(dt);
  }

  /** Trials unlock sequentially. trial-01 is open if campaign L28 is done. */
  private isUnlocked(_id: TrialId, idx: number): boolean {
    if (!isCompleted(this.ctx.save, 'level-28')) return false;
    if (idx === 0) return true;
    const prev = TRIAL_IDS[idx - 1];
    return this.ctx.save.trialProgress?.[prev]?.completed === true;
  }

  render(): void {
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
    r.drawTextScreenCenter('試煉之巔', vw / 2, 28, '#ffd166', 20, true);

    // Bonus stars summary
    const bonus = this.ctx.save.metaStarBonus ?? 0;
    r.drawTextScreenCenter(`已獲得試煉獎勵 ★ ${bonus}`, vw / 2, 52, '#ff9f43', 11, true);

    // Trial cards stacked vertically
    const cardH = 96;
    const cardGap = 10;
    const cardX = 16;
    const cardW = vw - 32;
    let cy = 72;

    this.trialCards = [];
    for (let i = 0; i < TRIAL_IDS.length; i++) {
      const id = TRIAL_IDS[i];
      const unlocked = this.isUnlocked(id, i);
      const meta = this.trialMeta[id];
      const completed = this.ctx.save.trialProgress?.[id]?.completed === true;
      const rect: Rect = { x: cardX, y: cy, w: cardW, h: cardH };
      this.trialCards.push({ id, rect, unlocked });

      const bg = unlocked ? (completed ? '#22304a' : '#1b2a42') : '#0f141e';
      r.drawScreenRoundedRect(cardX, cy, cardW, cardH, 9, bg);
      if (completed) {
        const pulse = 0.4 + Math.sin(this.elapsed * 2 + i) * 0.3;
        r.ctx.globalAlpha = pulse;
        drawGoldFrame(r.ctx, cardX, cy, cardW, cardH, 9, 1);
        r.ctx.globalAlpha = 1;
      }

      // Number badge (top-left)
      r.drawTextScreen(`T${i + 1}`, cardX + 12, cy + 8, unlocked ? '#ffd166' : '#4a5568', 13, true);

      if (unlocked && meta) {
        r.drawTextScreen(meta.name, cardX + 38, cy + 8, COLORS.text, 14, true);
        r.drawTextScreen(meta.flavorText ?? '', cardX + 12, cy + 30, COLORS.textDim, 10);

        const constraintBits: string[] = [];
        if (meta.trial?.forceHero === 'none') constraintBits.push('無英雄');
        else if (meta.trial?.forceHero) constraintBits.push(`只能用 ${meta.trial.forceHero}`);
        if (meta.trial?.forbidUpgrade) constraintBits.push('禁止升級');
        if (meta.trial?.forbidSell) constraintBits.push('禁止出售');
        if (meta.availableTowers && meta.availableTowers.length <= 2) {
          constraintBits.push(`塔限 ${meta.availableTowers.length} 種`);
        }
        if (meta.startingGold && meta.startingGold < 150) constraintBits.push(`起手 ${meta.startingGold} 金`);
        const constraintText = constraintBits.length > 0 ? '⊘ ' + constraintBits.join('  ·  ') : '';
        r.drawTextScreen(constraintText, cardX + 12, cy + 50, '#ff9f43', 9, true);

        // Reward
        const reward = meta.trial?.metaStarReward ?? 0;
        const rewardText = completed ? `已領 ${reward} ★` : `獎勵 ${reward} ★`;
        r.drawTextScreen(rewardText, cardX + 12, cy + 70, completed ? '#6ee17a' : '#ffd166', 11, true);
        if (completed) {
          r.drawTextScreen('✓ 已通過', cardX + cardW - 80, cy + 70, '#6ee17a', 11, true);
        }
      } else if (!unlocked) {
        const reason = !isCompleted(this.ctx.save, 'level-28')
          ? '🔒 通關 L28 後解鎖'
          : `🔒 完成試煉 ${i} 後解鎖`;
        r.drawTextScreenCenter(reason, cardX + cardW / 2, cy + cardH / 2, '#7a8a9f', 12, true);
      } else {
        r.drawTextScreen('載入中…', cardX + 38, cy + cardH / 2 - 6, COLORS.textDim, 12);
      }
      cy += cardH + cardGap;
    }

    if (this.loadingError) {
      r.drawTextScreenCenter(`⚠ ${this.loadingError}`, vw / 2, vh - 24, '#ff8a8a', 10);
    }
  }

  override onTap(screenX: number, screenY: number): void {
    if (this.backBtn && this.inside(screenX, screenY, this.backBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new MainMenuScene(this.ctx));
      return;
    }
    for (const c of this.trialCards) {
      if (!this.inside(screenX, screenY, c.rect)) continue;
      if (!c.unlocked) {
        this.ctx.audio.click();
        return;
      }
      const meta = this.trialMeta[c.id];
      if (!meta) {
        this.ctx.audio.click();
        return;
      }
      this.ctx.audio.click();
      this.startTrial(meta);
      return;
    }
  }

  /**
   * Trial start path:
   *   - forceHero: 'none' → straight to GameScene with no hero
   *   - forceHero: 'kieran'/etc → straight to GameScene pinned to that hero
   *   - undefined            → goes through HeroSelect like a campaign level
   */
  private startTrial(level: LevelData): void {
    const force = level.trial?.forceHero;
    if (force === 'none') {
      this.ctx.transition(new GameScene(this.ctx, level, null));
    } else if (force === 'kieran' || force === 'vasya' || force === 'pip') {
      this.ctx.transition(new GameScene(this.ctx, level, force));
    } else {
      this.ctx.transition(new HeroSelectScene(this.ctx, level));
    }
  }
}
