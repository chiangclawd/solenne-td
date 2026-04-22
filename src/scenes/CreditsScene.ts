import { BaseScene } from '../ui/Scene.ts';
import { MainMenuScene } from './MainMenuScene.ts';
import { COLORS, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../config.ts';
import { totalStars, countCompleted } from '../storage/SaveData.ts';
import { ACHIEVEMENTS } from '../game/Achievements.ts';

interface Rect { x: number; y: number; w: number; h: number }

interface CreditLine { label: string; value?: string; accent?: boolean }

export class CreditsScene extends BaseScene {
  private backBtn: Rect | null = null;
  private scrollY = 0;
  private elapsed = 0;

  update(dt: number): void {
    this.elapsed += dt;
    this.scrollY += dt * 22;
    this.ctx.renderer.updateShake(dt);
  }

  render(): void {
    const r = this.ctx.renderer;
    r.beginFrame();
    r.beginWorld();
    r.drawTileBackground(this.ctx.assets.get('grass'), 0, 0, WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE);

    r.beginScreen();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    r.drawScreenVerticalGradient(0, 0, vw, vh, 'rgba(5,8,20,0.86)', 'rgba(5,8,20,0.98)');

    const backW = 68, backH = 30;
    this.backBtn = { x: 12, y: 12, w: backW, h: backH };
    r.drawScreenRoundedRect(12, 12, backW, backH, 8, '#22304a');
    r.drawTextScreenCenter('← 返回', 12 + backW / 2, 12 + backH / 2, COLORS.text, 11, true);
    r.drawTextScreenCenter('致謝', vw / 2, 28, '#ffd166', 20, true);

    const lines: CreditLine[] = [
      { label: '索倫的最後防線', accent: true },
      { label: 'Solenne · Last Line', accent: true },
      { label: `版本 ${this.ctx.version}` },
      { label: '' },
      { label: '— 製作 —', accent: true },
      { label: 'Direction / Design', value: 'Claude Code Agent' },
      { label: 'Programming / UI', value: 'TypeScript + HTML5 Canvas' },
      { label: 'Narrative / 劇本', value: 'Agent-Generated' },
      { label: 'Audio Synthesis', value: 'WebAudio Procedural' },
      { label: '' },
      { label: '— 素材 —', accent: true },
      { label: 'Tower Defense Kit', value: 'Kenney.nl (CC0)' },
      { label: 'Font', value: 'System UI' },
      { label: '' },
      { label: '— 角色 —', accent: true },
      { label: '基蘭指揮官', value: '索倫王國防衛軍' },
      { label: '瓦西亞中士', value: '前線偵察' },
      { label: '皮普工程師', value: '火砲設計' },
      { label: '' },
      { label: '— 你的戰績 —', accent: true },
      { label: '通關進度', value: `${countCompleted(this.ctx.save)} / ${this.ctx.levels.length}` },
      { label: '總星等', value: `${totalStars(this.ctx.save)} / ${this.ctx.levels.length * 3}` },
      { label: '成就達成', value: `${Object.keys(this.ctx.save.achievements).length} / ${ACHIEVEMENTS.length}` },
      { label: '累計擊殺', value: `${this.ctx.save.stats.totalKills}` },
      { label: '累計建造', value: `${this.ctx.save.stats.totalTowersBuilt} 塔` },
      { label: '' },
      { label: '— 特別感謝 —', accent: true },
      { label: '所有開源遊戲社群貢獻者。' },
      { label: 'Kenney 提供的美術資源。' },
      { label: '' },
      { label: '謝謝你通關到底。', accent: true },
      { label: '索倫不會忘記這場戰役。', accent: true },
    ];

    const lineHeight = 24;
    const totalHeight = lines.length * lineHeight;
    const startY = vh - (this.scrollY % (totalHeight + vh));
    r.ctx.save();
    for (let i = 0; i < lines.length; i++) {
      const ly = startY + i * lineHeight + 40;
      if (ly < 60 || ly > vh - 20) continue;
      const line = lines[i];
      const alpha = 1;
      r.ctx.globalAlpha = alpha;
      if (line.value) {
        const labelW = r.measureTextScreen(line.label, 13);
        r.drawTextScreenCenter(`${line.label}   ${line.value}`, vw / 2, ly, COLORS.text, 13, line.accent);
        void labelW;
      } else if (line.label) {
        r.drawTextScreenCenter(line.label, vw / 2, ly, line.accent ? '#ffd166' : COLORS.textDim, line.accent ? 16 : 12, line.accent);
      }
    }
    r.ctx.globalAlpha = 1;
    r.ctx.restore();

    // Top/bottom fade
    r.drawScreenVerticalGradient(0, 40, vw, 40, 'rgba(5,8,20,1)', 'rgba(5,8,20,0)');
    r.drawScreenVerticalGradient(0, vh - 60, vw, 60, 'rgba(5,8,20,0)', 'rgba(5,8,20,1)');

    r.drawTextScreenCenter('點擊返回主選單', vw / 2, vh - 24, COLORS.textDim, 10);
  }

  onTap(screenX: number, screenY: number): void {
    if (this.backBtn && this.inside(screenX, screenY, this.backBtn)) {
      this.ctx.audio.click();
      this.ctx.transition(new MainMenuScene(this.ctx));
      return;
    }
    // Tap anywhere else cycles back to main menu
    this.ctx.audio.click();
    this.ctx.transition(new MainMenuScene(this.ctx));
  }
}
