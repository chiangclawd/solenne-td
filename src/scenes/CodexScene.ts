import { BaseScene } from '../ui/Scene.ts';
import { MainMenuScene } from './MainMenuScene.ts';
import { TOWER_TYPES, TOWER_ORDER } from '../data/towers.ts';
import { ENEMY_TYPES } from '../data/enemies.ts';
import { ACHIEVEMENTS } from '../game/Achievements.ts';
import { drawTowerIconScreen, drawEnemyIconScreen } from '../graphics/SpritePainter.ts';
import { isTowerUnlocked, unlockHint } from '../game/TowerUnlocks.ts';
import { ARMOR_INFO } from '../game/ArmorTypes.ts';
import { COLORS, TILE_SIZE } from '../config.ts';

interface Rect { x: number; y: number; w: number; h: number }

const T = TILE_SIZE;
type Tab = 'towers' | 'enemies' | 'achievements';

const ENEMY_INFO: { id: string; label: string; desc: string; tier: string }[] = [
  { id: 'scout', label: '偵察兵', desc: '輕裝快速先鋒，HP 低但數量龐大。', tier: '初級' },
  { id: 'soldier', label: '士兵', desc: '標準步兵。中等 HP 與速度。', tier: '初級' },
  { id: 'runner', label: '衝鋒兵', desc: '速度快，HP 高於士兵。', tier: '中級' },
  { id: 'tank', label: '坦克', desc: '緩慢但 HP 高，抗步兵火力。', tier: '中級' },
  { id: 'armored', label: '重裝坦克', desc: '厚重裝甲，需要 AOE 或狙擊。', tier: '中級' },
  { id: 'heavyTank', label: '重戰車', desc: '最硬的地面單位。', tier: '高級' },
  { id: 'plane', label: '戰機', desc: '飛行單位，快速穿越。', tier: '中級' },
  { id: 'frostRaider', label: '凍原突擊兵', desc: '世界 4 · 速度極快的凍原部隊。', tier: '中級' },
  { id: 'iceBeast', label: '冰獸', desc: '世界 4 · 大型冰凍野獸，HP 高。', tier: '高級' },
  { id: 'wraith', label: '幽影', desc: '世界 5 · 半透明，受到 35% 傷害減免。', tier: '高級' },
  { id: 'splitter', label: '分裂者', desc: '世界 5 · 死亡時分裂出 2 個衝鋒兵。', tier: '高級' },
  { id: 'healer', label: '治療者', desc: '世界 5 · 治療周圍敵人。優先擊殺。', tier: '高級' },
  { id: 'boss', label: 'Boss 單位', desc: '世界一 Boss。血厚獎勵高。', tier: 'Boss' },
  { id: 'armoredBoss', label: '重裝 Boss', desc: '世界二 Boss。', tier: 'Boss' },
  { id: 'finalBoss', label: '最終 Boss', desc: '鐵潮首腦。HP 900。', tier: 'Boss' },
  { id: 'glacialBoss', label: '冰原 Boss', desc: '世界 4 Boss · HP 780。', tier: 'Boss' },
  { id: 'voidBoss', label: '虛空 Boss', desc: '世界 5 Boss · HP 1300，15% 傷害減免。', tier: 'Boss' },
  { id: 'tentacle', label: '觸手怪', desc: '世界 6 · 重甲深海爬行者。死了會再生，警覺性高。', tier: '高級' },
  { id: 'swimmerShoal', label: '群游魚', desc: '世界 6 · 極快輕裝。一批十隻像暴雨一樣湧。', tier: '中級' },
  { id: 'abyssalBoss', label: '深淵之主', desc: '世界 6 Boss · HP 1500，死亡時分裂出 3 隻觸手。', tier: 'Boss' },
];

const TOWER_DESC: Record<string, string> = {
  cannon: '戰役最早的友軍 — 火力均衡、價格親民。',
  quickShot: '連射步槍塔。對 HP 低的單位極有效率。',
  machineGun: '重型機槍。DPS 高，需要足夠金幣支撐。',
  sniper: '極長射程、極高爆擊。對重甲 Boss 必備。',
  missileLauncher: '飛彈塔 · AOE 濺射。對密集群敵高效。',
  heavyCannon: '重砲 · AOE 濺射大範圍。近距離強力。',
  frostTower: '冰霜塔 · 附加減速。攻擊力極低但控場必備。',
  tesla: '特斯拉塔 · 鏈狀閃電，擊中後跳至最多 2 個目標（遞減傷害）。',
  lightTower: '聖光塔 · 攻擊無視敵方護甲減免。對幽影與虛空 Boss 必備。',
  torpedoTower: '深海魚雷塔 · 世界 6 解鎖。巨大 AOE，克制重甲與護盾。最強反 Boss 火力。',
};

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
      const towerCardH = 124 + 10;
      for (const id of TOWER_ORDER) {
        const cfg = TOWER_TYPES[id];
        if (!cfg) continue;
        if (y + towerCardH >= viewTop && y <= viewBottom) {
          this.renderTowerCard(r, innerX, y, innerW, id, cfg);
        }
        y += towerCardH;
      }
    } else if (this.tab === 'enemies') {
      const enemyCardH = 96 + 8;
      for (const info of ENEMY_INFO) {
        const cfg = ENEMY_TYPES[info.id];
        if (!cfg) continue;
        if (y + enemyCardH >= viewTop && y <= viewBottom) {
          this.renderEnemyCard(r, innerX, y, innerW, info, cfg);
        }
        y += enemyCardH;
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
    const cardH = 124;
    r.drawScreenRoundedRect(x, y, w, cardH, 8, unlocked ? 'rgba(14,22,40,0.9)' : 'rgba(14,22,40,0.6)');
    r.drawScreenRoundedRectOutline(x, y, w, cardH, 8, unlocked ? '#22304a' : '#3a2a1e', 1);

    const iconSize = 54;
    r.drawScreenRect(x + 10, y + 10, iconSize, iconSize, 'rgba(255,255,255,0.04)');
    if (unlocked) {
      drawTowerIconScreen(r.ctx, id, x + 13, y + 13, iconSize - 6, 0);
    } else {
      // Locked silhouette
      r.ctx.save();
      r.ctx.globalAlpha = 0.3;
      drawTowerIconScreen(r.ctx, id, x + 13, y + 13, iconSize - 6, 0);
      r.ctx.restore();
      r.drawTextScreenCenter('🔒', x + 10 + iconSize / 2, y + 10 + iconSize / 2, '#ffd166', 22, true);
    }

    const titleColor = unlocked ? '#ffd166' : '#7a6548';
    r.drawTextScreen(cfg.name, x + 76, y + 12, titleColor, 14, true);
    if (unlocked) {
      r.drawTextScreen(TOWER_DESC[id] ?? '', x + 76, y + 32, COLORS.text, 10);
      const base = cfg.baseLevels[0];
      // Show Lv1 baseline + both branch max tiers side-by-side so codex
      // makes the A/B strategic split visible.
      r.drawTextScreen(
        `Lv1: ${base.cost}g · DMG ${base.damage} · RNG ${(base.range / T).toFixed(1)}t · ${base.fireRate.toFixed(1)}/s`,
        x + 12, y + 52, COLORS.textDim, 10,
      );
      const brA = cfg.branches.A;
      const brB = cfg.branches.B;
      const maxA = brA.levels[brA.levels.length - 1];
      const maxB = brB.levels[brB.levels.length - 1];
      r.drawTextScreen(`🟠 ${brA.name}`, x + 12, y + 72, brA.color, 11, true);
      r.drawTextScreen(
        `Lv5A: ${maxA.cost}g · DMG ${maxA.damage}${maxA.splashRadius ? ` · AOE ${(maxA.splashRadius/T).toFixed(1)}t` : ''}${maxA.multiShot ? ` · ×${maxA.multiShot}` : ''}`,
        x + 12, y + 86, '#cbd2de', 9,
      );
      r.drawTextScreen(`🔵 ${brB.name}`, x + 12, y + 100, brB.color, 11, true);
      r.drawTextScreen(
        `Lv5B: ${maxB.cost}g · DMG ${maxB.damage}${maxB.armorPierce ? ' · 破甲' : ''}${maxB.splashRadius ? ` · AOE ${(maxB.splashRadius/T).toFixed(1)}t` : ''}`,
        x + 12, y + 114, '#cbd2de', 9,
      );
      // Counters — show on the right side as icons so players learn the type chart
      if (cfg.counters && cfg.counters.length > 0) {
        const counterIcons = cfg.counters.map((t) => ARMOR_INFO[t].icon).join(' ');
        const txt = `克制  ${counterIcons}`;
        const tw = r.measureTextScreen(txt, 10, true);
        r.drawTextScreen(txt, x + w - tw - 12, y + 52, '#ffd166', 10, true);
      }
    } else {
      // Locked: show unlock hint instead of stats
      r.drawTextScreen('未解鎖', x + 76, y + 32, '#ff9f43', 11, true);
      const hint = unlockHint(id, this.ctx.levels);
      // Word-wrap the hint within card width
      const maxW = w - 86;
      const words = hint.split('');
      let line = '';
      const lines: string[] = [];
      for (const ch of words) {
        const test = line + ch;
        if (r.measureTextScreen(test, 10) > maxW) {
          lines.push(line);
          line = ch;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      lines.slice(0, 3).forEach((l, i) => {
        r.drawTextScreen(l, x + 76, y + 52 + i * 14, COLORS.textDim, 10);
      });
    }

    return y + cardH + 10;
  }

  private renderEnemyCard(
    r: import('../engine/Renderer.ts').Renderer,
    x: number, y: number, w: number,
    info: { id: string; label: string; desc: string; tier: string },
    cfg: import('../game/Enemy.ts').EnemyConfig,
  ): number {
    const cardH = 96;
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

    r.drawTextScreen(info.label, x + 70, y + 10, '#ffd166', 13, true);
    r.drawTextScreen(`[${info.tier}]`, x + 70 + r.measureTextScreen(info.label, 13, true) + 8, y + 11, COLORS.textDim, 10);
    r.drawTextScreen(info.desc, x + 70, y + 30, COLORS.text, 10);

    // Stats row
    r.drawTextScreen(
      `HP ${cfg.hp} · 速度 ${cfg.speed} · 獎勵 ${cfg.reward}g`,
      x + 70, y + 52, '#6ec8ff', 10,
    );
    // Armor row — type + resist %
    const resistPct = Math.round((cfg.damageResist ?? 0) * 100);
    const armorLine = resistPct > 0
      ? `${armor.icon} ${armor.label} · 減傷 ${resistPct}%`
      : `${armor.icon} ${armor.label}`;
    r.drawTextScreen(armorLine, x + 70, y + 72, armor.color, 10, true);
    return y + cardH + 8;
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
