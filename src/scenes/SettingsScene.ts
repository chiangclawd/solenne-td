import { BaseScene } from '../ui/Scene.ts';
import { MainMenuScene } from './MainMenuScene.ts';
import { COLORS } from '../config.ts';
import type { Difficulty } from '../storage/SaveData.ts';

interface Rect { x: number; y: number; w: number; h: number }
interface Slider { rect: Rect; value: number; label: string; key: 'masterVolume' | 'sfxVolume' | 'bgmVolume' }

const DIFF_INFO: Record<Difficulty, { label: string; blurb: string; color: string }> = {
  normal: { label: 'Normal · 標準',  blurb: '原設計平衡。適合首次通關。',         color: '#6ee17a' },
  hard:   { label: 'Hard · 困難',    blurb: '敵人 +35% HP / +15% 速度，金幣 -10%。', color: '#ffd166' },
  heroic: { label: 'Heroic · 英雄',  blurb: '敵人 +70% HP / +30% 速度，金幣 -25%。', color: '#ff6b6b' },
};

export class SettingsScene extends BaseScene {
  private backBtn: Rect | null = null;
  private resetBtn: Rect | null = null;
  private sliders: Slider[] = [];
  private muteBtn: Rect | null = null;
  private shakeBtn: Rect | null = null;
  private fpsBtn: Rect | null = null;
  private colorBlindBtn: Rect | null = null;
  private lowAnimBtn: Rect | null = null;
  private uiScaleBtns: { rect: Rect; scale: number }[] = [];
  private replayIntroBtn: Rect | null = null;
  private replayOutroBtn: Rect | null = null;
  private diffBtns: { rect: Rect; diff: Difficulty }[] = [];

  update(_dt: number): void {
    this.ctx.renderer.updateShake(_dt);
  }

  render(): void {
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
    r.drawTextScreenCenter('設定', vw / 2, 28, '#ffd166', 20, true);

    const panelX = 24;
    const panelW = vw - 48;
    let y = 66;

    // Volume section
    r.drawTextScreen('🔊 音訊', panelX, y, '#ffd166', 13, true);
    y += 22;

    const labels: { key: Slider['key']; label: string }[] = [
      { key: 'masterVolume', label: '主音量' },
      { key: 'bgmVolume', label: '背景音樂' },
      { key: 'sfxVolume', label: '音效' },
    ];
    this.sliders = [];
    for (const { key, label } of labels) {
      const sliderY = y + 18;
      r.drawTextScreen(label, panelX, y, COLORS.text, 12);
      const value = this.ctx.save.settings[key];
      r.drawTextScreen(`${Math.round(value * 100)}%`, panelX + panelW - 40, y, '#ffd166', 12, true);

      const rect: Rect = { x: panelX, y: sliderY, w: panelW, h: 22 };
      // Track
      r.drawScreenRoundedRect(panelX, sliderY + 8, panelW, 6, 3, '#22304a');
      // Fill
      r.drawScreenRoundedRect(panelX, sliderY + 8, panelW * value, 6, 3, '#5eb8ff');
      // Knob
      r.drawScreenCircle(panelX + panelW * value, sliderY + 11, 9, '#ffd166');
      r.drawScreenCircle(panelX + panelW * value, sliderY + 11, 6, '#1a2a44');
      this.sliders.push({ rect, value, label, key });
      y += 46;
    }

    // Toggles
    y += 8;
    const mkToggle = (label: string, on: boolean, rectOut: (rr: Rect) => void): void => {
      const tw = (panelW - 20) / 2;
      const rect: Rect = { x: panelX, y, w: panelW, h: 40 };
      r.drawScreenRoundedRect(panelX, y, panelW, 40, 8, '#0f1a30');
      r.drawTextScreen(label, panelX + 12, y + 14, COLORS.text, 12);
      const knobW = 52, knobH = 26;
      const kx = panelX + panelW - knobW - 10;
      const ky = y + 7;
      r.drawScreenRoundedRect(kx, ky, knobW, knobH, 13, on ? '#2c8cc7' : '#22304a');
      const dotX = on ? kx + knobW - 13 : kx + 13;
      r.drawScreenCircle(dotX, ky + knobH / 2, 10, '#fff');
      rectOut(rect);
      // unused ref silence
      void tw;
    };
    mkToggle(`靜音${this.ctx.save.settings.muted ? '（開）' : '（關）'}`, this.ctx.save.settings.muted, (rr) => { this.muteBtn = rr; });
    y += 48;
    mkToggle(`震屏效果${this.ctx.save.settings.screenShake ? '（開）' : '（關）'}`, this.ctx.save.settings.screenShake, (rr) => { this.shakeBtn = rr; });
    y += 48;
    mkToggle(`顯示 FPS${this.ctx.save.settings.showFps ? '（開）' : '（關）'}`, this.ctx.save.settings.showFps, (rr) => { this.fpsBtn = rr; });
    y += 56;

    // v2.5.1 D2 — Accessibility section
    r.drawTextScreen('♿ 無障礙', panelX, y, '#ffd166', 13, true);
    y += 22;
    mkToggle(
      `色盲模式${this.ctx.save.settings.colorBlindMode ? '（開）' : '（關）'}`,
      this.ctx.save.settings.colorBlindMode === true,
      (rr) => { this.colorBlindBtn = rr; },
    );
    y += 48;
    mkToggle(
      `低動畫（關閉粒子 / 天氣 / 震屏）${this.ctx.save.settings.lowAnimation ? '（開）' : '（關）'}`,
      this.ctx.save.settings.lowAnimation === true,
      (rr) => { this.lowAnimBtn = rr; },
    );
    y += 48;
    // UI scale picker — 3 buttons: 1.0 / 1.2 / 1.4
    r.drawTextScreen('字級', panelX, y + 8, COLORS.text, 12);
    const scaleOptions = [1.0, 1.2, 1.4];
    const currentScale = this.ctx.save.settings.uiScale ?? 1.0;
    const sbW = 52, sbH = 30;
    this.uiScaleBtns = [];
    for (let i = 0; i < scaleOptions.length; i++) {
      const bx = panelX + panelW - (3 - i) * (sbW + 6);
      const sel = Math.abs(currentScale - scaleOptions[i]) < 0.01;
      const rect: Rect = { x: bx, y: y + 2, w: sbW, h: sbH };
      r.drawScreenRoundedRect(bx, y + 2, sbW, sbH, 7, sel ? '#2c8cc7' : '#22304a');
      if (sel) r.drawScreenRoundedRectOutline(bx, y + 2, sbW, sbH, 7, '#5eb8ff', 1);
      r.drawTextScreenCenter(`${Math.round(scaleOptions[i] * 100)}%`, bx + sbW / 2, y + 2 + sbH / 2, '#fff', 11, true);
      this.uiScaleBtns.push({ rect, scale: scaleOptions[i] });
    }
    y += 44;

    // v2.6.1 D3 — replay cinematic buttons
    r.drawTextScreen('🎬 回顧動畫', panelX, y, '#ffd166', 13, true);
    y += 22;
    const cbBtnW = (panelW - 8) / 2;
    const cbBtnH = 36;
    this.replayIntroBtn = { x: panelX, y, w: cbBtnW, h: cbBtnH };
    r.drawScreenRoundedRect(panelX, y, cbBtnW, cbBtnH, 7, '#22304a');
    r.drawTextScreenCenter('▶ 開場', panelX + cbBtnW / 2, y + cbBtnH / 2, COLORS.text, 12, true);
    const cbX2 = panelX + cbBtnW + 8;
    const outroSeen = this.ctx.save.seenOutro === true;
    this.replayOutroBtn = outroSeen ? { x: cbX2, y, w: cbBtnW, h: cbBtnH } : null;
    r.drawScreenRoundedRect(cbX2, y, cbBtnW, cbBtnH, 7, outroSeen ? '#22304a' : '#0f141e');
    r.drawTextScreenCenter(
      outroSeen ? '▶ 結局' : '🔒 通關 L28 解鎖',
      cbX2 + cbBtnW / 2, y + cbBtnH / 2,
      outroSeen ? COLORS.text : '#7a8a9f', 11, true,
    );
    y += cbBtnH + 14;

    // Difficulty
    r.drawTextScreen('◆ 難度', panelX, y, '#ffd166', 13, true);
    y += 22;
    this.diffBtns = [];
    const diffs: Difficulty[] = ['normal', 'hard', 'heroic'];
    const dbW = (panelW - 16) / 3;
    for (let i = 0; i < diffs.length; i++) {
      const d = diffs[i];
      const info = DIFF_INFO[d];
      const bx = panelX + i * (dbW + 8);
      const selected = this.ctx.save.settings.difficulty === d;
      const rect: Rect = { x: bx, y, w: dbW, h: 60 };
      r.drawScreenRoundedRect(bx, y, dbW, 60, 8, selected ? '#2c3e5f' : '#0f1a30');
      if (selected) r.drawScreenRoundedRectOutline(bx, y, dbW, 60, 8, info.color, 2);
      r.drawTextScreenCenter(info.label, bx + dbW / 2, y + 16, info.color, 12, true);
      this.diffBtns.push({ rect, diff: d });
    }
    y += 68;
    r.drawTextScreen(DIFF_INFO[this.ctx.save.settings.difficulty].blurb, panelX, y, COLORS.textDim, 11);
    y += 28;

    // Reset button
    const rbw = 180, rbh = 38;
    this.resetBtn = { x: (vw - rbw) / 2, y: vh - rbh - 28, w: rbw, h: rbh };
    r.drawScreenRoundedRect(this.resetBtn.x, this.resetBtn.y, rbw, rbh, 8, '#3a1a22');
    r.drawScreenRoundedRectOutline(this.resetBtn.x, this.resetBtn.y, rbw, rbh, 8, '#ff6b6b', 1);
    r.drawTextScreenCenter('⚠ 重置進度', this.resetBtn.x + rbw / 2, this.resetBtn.y + rbh / 2, '#ff8a8a', 12, true);
  }

  onTap(screenX: number, screenY: number): void {
    if (this.backBtn && this.inside(screenX, screenY, this.backBtn)) {
      this.ctx.audio.click();
      this.ctx.persistSave();
      this.ctx.transition(new MainMenuScene(this.ctx));
      return;
    }

    // Sliders — tap to set position
    for (const s of this.sliders) {
      if (this.inside(screenX, screenY, s.rect)) {
        const ratio = Math.max(0, Math.min(1, (screenX - s.rect.x) / s.rect.w));
        this.ctx.save.settings[s.key] = Math.round(ratio * 100) / 100;
        this.ctx.applyAudioSettings();
        this.ctx.audio.click();
        return;
      }
    }

    if (this.muteBtn && this.inside(screenX, screenY, this.muteBtn)) {
      this.ctx.save.settings.muted = !this.ctx.save.settings.muted;
      this.ctx.applyAudioSettings();
      this.ctx.audio.click();
      return;
    }
    if (this.shakeBtn && this.inside(screenX, screenY, this.shakeBtn)) {
      this.ctx.save.settings.screenShake = !this.ctx.save.settings.screenShake;
      this.ctx.applyAudioSettings();
      this.ctx.audio.click();
      return;
    }
    if (this.fpsBtn && this.inside(screenX, screenY, this.fpsBtn)) {
      this.ctx.save.settings.showFps = !this.ctx.save.settings.showFps;
      this.ctx.audio.click();
      return;
    }
    if (this.colorBlindBtn && this.inside(screenX, screenY, this.colorBlindBtn)) {
      this.ctx.save.settings.colorBlindMode = !this.ctx.save.settings.colorBlindMode;
      this.ctx.applyAudioSettings();
      this.ctx.audio.click();
      return;
    }
    if (this.lowAnimBtn && this.inside(screenX, screenY, this.lowAnimBtn)) {
      this.ctx.save.settings.lowAnimation = !this.ctx.save.settings.lowAnimation;
      this.ctx.applyAudioSettings();
      this.ctx.audio.click();
      return;
    }
    for (const sb of this.uiScaleBtns) {
      if (this.inside(screenX, screenY, sb.rect)) {
        this.ctx.save.settings.uiScale = sb.scale;
        this.ctx.applyAudioSettings();
        this.ctx.audio.click();
        return;
      }
    }
    if (this.replayIntroBtn && this.inside(screenX, screenY, this.replayIntroBtn)) {
      this.ctx.audio.click();
      import('./CinematicScene.ts').then(({ CinematicScene }) => {
        this.ctx.transition(new CinematicScene(this.ctx, 'opening', () => new SettingsScene(this.ctx)));
      });
      return;
    }
    if (this.replayOutroBtn && this.inside(screenX, screenY, this.replayOutroBtn)) {
      this.ctx.audio.click();
      import('./CinematicScene.ts').then(({ CinematicScene }) => {
        this.ctx.transition(new CinematicScene(this.ctx, 'ending', () => new SettingsScene(this.ctx)));
      });
      return;
    }

    for (const b of this.diffBtns) {
      if (this.inside(screenX, screenY, b.rect)) {
        this.ctx.save.settings.difficulty = b.diff;
        this.ctx.audio.click();
        return;
      }
    }

    if (this.resetBtn && this.inside(screenX, screenY, this.resetBtn)) {
      if (typeof confirm !== 'undefined' && confirm('確定要重置所有進度？此操作無法復原。')) {
        this.ctx.save.levelProgress = {};
        this.ctx.save.achievements = {};
        this.ctx.save.stats = {
          totalKills: 0,
          totalGoldEarned: 0,
          totalTowersBuilt: 0,
          totalWavesSurvived: 0,
          totalPlayMs: 0,
          levelsCompleted: 0,
        };
        this.ctx.persistSave();
      }
      this.ctx.audio.click();
      return;
    }
  }

  override onExit(): void {
    this.ctx.persistSave();
  }
}
