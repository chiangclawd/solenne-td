import type { TowerConfig, TowerBranch, TowerLevel } from '../game/Tower.ts';
import { TILE_SIZE } from '../config.ts';

const T = TILE_SIZE;

/**
 * v2.3.1 A2 — tower branching.
 *
 * Every tower now has 5 tiers:
 *   Lv1, Lv2          — shared baseLevels[]
 *   Lv3, Lv4, Lv5 × 2 — player picks Branch A or B when upgrading Lv2→Lv3
 *
 * Branch identity is always a clear strategic split:
 *   A = 廣 (AOE / fire-rate / multi-target)
 *   B = 狹 (single-target / armor pierce / precision)
 *
 * Costs are symmetric (same Lv3/4/5 price on A and B) to keep per-gold
 * efficiency roughly equal. Numbers are first-pass; rebalance after playtest.
 */

type RawTowerConfig = Omit<TowerConfig, 'id'>;

// Branch colors (accent tints, also used for UI button fills).
const CA = '#ff9f43';   // Branch A — warm orange (AOE / broad)
const CB = '#5eb8ff';   // Branch B — cool blue  (precision / pierce)

// ------------- helpers ---------------
const lv = (
  cost: number, range: number, damage: number, fireRate: number, speed: number,
  extra: Partial<TowerLevel> = {},
): TowerLevel => ({ cost, range, damage, fireRate, projectileSpeed: speed, ...extra });

const branchA = (name: string, description: string, levels: [TowerLevel, TowerLevel, TowerLevel]): TowerBranch =>
  ({ id: 'A', name, description, color: CA, levels });

const branchB = (name: string, description: string, levels: [TowerLevel, TowerLevel, TowerLevel]): TowerBranch =>
  ({ id: 'B', name, description, color: CB, levels });

// ------------- tower definitions ---------------

const RAW_TOWERS: Record<string, RawTowerConfig> = {
  cannon: {
    name: '加農砲',
    turretSprite: 'turretCannon',
    projectileSprite: 'projectileBullet',
    counters: ['armored'],
    baseLevels: [
      lv(50,  T * 2.5, 18, 2.0, 300),
      lv(70,  T * 2.7, 28, 2.1, 320),
    ],
    branches: {
      A: branchA('破片榴彈', 'AOE 範圍傷害 — 對付雜兵潮', [
        lv(90,  T * 2.7, 35, 1.8, 320, { splashRadius: T * 0.6 }),
        lv(130, T * 2.9, 48, 1.7, 340, { splashRadius: T * 0.8 }),
        lv(180, T * 3.1, 68, 1.6, 360, { splashRadius: T * 1.1 }),
      ]),
      B: branchB('穿甲彈', '無視護甲 — 對付重裝單體', [
        lv(90,  T * 2.7, 42, 2.0, 340, { armorPierce: true }),
        lv(130, T * 2.8, 64, 2.2, 360, { armorPierce: true, counterBonus: 1.6 }),
        lv(180, T * 3.0, 95, 2.4, 380, { armorPierce: true, counterBonus: 1.8 }),
      ]),
    },
  },

  quickShot: {
    name: '速射槍',
    turretSprite: 'turretMG',
    projectileSprite: 'projectileBullet',
    counters: ['light'],
    baseLevels: [
      lv(40, T * 2.0, 8,  4.0, 340),
      lv(55, T * 2.1, 14, 4.5, 360),
    ],
    branches: {
      A: branchA('連射狂潮', '超高射速壓制輕甲', [
        lv(75,  T * 2.2, 18, 6.5, 380),
        lv(105, T * 2.3, 24, 8.0, 400),
        lv(145, T * 2.5, 32, 10.0, 420),
      ]),
      B: branchB('雙管齊發', '每次射擊發射 2-3 發子彈', [
        lv(75,  T * 2.2, 14, 4.5, 380, { multiShot: 2 }),
        lv(105, T * 2.3, 22, 4.8, 400, { multiShot: 2 }),
        lv(145, T * 2.5, 28, 5.0, 420, { multiShot: 3 }),
      ]),
    },
  },

  machineGun: {
    name: '機槍塔',
    turretSprite: 'turretMG',
    projectileSprite: 'projectileBullet',
    counters: ['light', 'flying'],
    baseLevels: [
      lv(85,  T * 2.3, 12, 6.0, 360),
      lv(110, T * 2.4, 18, 7.0, 380),
    ],
    branches: {
      A: branchA('重型機槍', '極致射速 — 對抗空中輕甲', [
        lv(150, T * 2.6, 22, 9.0, 400),
        lv(210, T * 2.7, 30, 11.0, 420),
        lv(280, T * 2.9, 40, 14.0, 440),
      ]),
      B: branchB('散彈重砲', '錐形彈幕多目標壓制', [
        lv(150, T * 2.6, 16, 5.0, 400, { multiShot: 3 }),
        lv(210, T * 2.7, 22, 5.5, 420, { multiShot: 4 }),
        lv(280, T * 2.9, 30, 6.0, 440, { multiShot: 5 }),
      ]),
    },
  },

  sniper: {
    name: '狙擊塔',
    turretSprite: 'turretCannon',
    projectileSprite: 'projectileBullet',
    counters: ['armored', 'ethereal'],
    baseLevels: [
      lv(110, T * 4.5, 70,  0.7, 520),
      lv(145, T * 5.0, 110, 0.8, 560),
    ],
    branches: {
      A: branchA('雙狙擊', '一次發射 2-3 發狙擊彈', [
        lv(195, T * 5.2, 110, 0.85, 600, { multiShot: 2 }),
        lv(270, T * 5.5, 165, 1.0, 640, { multiShot: 2 }),
        lv(360, T * 5.8, 220, 1.1, 680, { multiShot: 3 }),
      ]),
      B: branchB('火力集中', '超高單體傷害穿甲 — boss 殺手', [
        lv(195, T * 5.2, 200, 0.6, 640, { armorPierce: true }),
        lv(270, T * 5.5, 320, 0.7, 680, { armorPierce: true, counterBonus: 1.6 }),
        lv(360, T * 5.8, 480, 0.8, 720, { armorPierce: true, counterBonus: 2.0 }),
      ]),
    },
  },

  missileLauncher: {
    name: '飛彈塔',
    turretSprite: 'turretMissile',
    projectileSprite: 'projectileMissile',
    counters: ['flying', 'armored'],
    baseLevels: [
      lv(130, T * 3.5, 45, 0.9, 220, { splashRadius: T * 0.9 }),
      lv(170, T * 3.7, 70, 1.0, 240, { splashRadius: T * 0.9 }),
    ],
    branches: {
      A: branchA('集束彈', '多枚小型飛彈齊發', [
        lv(230, T * 3.9, 55, 0.9, 260, { splashRadius: T * 0.7, multiShot: 3 }),
        lv(320, T * 4.1, 80, 1.0, 280, { splashRadius: T * 0.8, multiShot: 4 }),
        lv(430, T * 4.3, 115, 1.1, 300, { splashRadius: T * 0.9, multiShot: 5 }),
      ]),
      B: branchB('重磅彈', '單發超大範圍轟擊', [
        lv(230, T * 3.9, 110, 0.85, 260, { splashRadius: T * 1.3 }),
        lv(320, T * 4.1, 170, 0.95, 280, { splashRadius: T * 1.5 }),
        lv(430, T * 4.3, 260, 1.05, 300, { splashRadius: T * 1.8 }),
      ]),
    },
  },

  heavyCannon: {
    name: '重砲',
    turretSprite: 'turretMissile',
    projectileSprite: 'projectileMissile',
    counters: ['armored', 'shielded'],
    baseLevels: [
      lv(160, T * 2.0, 85,  1.0, 280, { splashRadius: T * 1.2 }),
      lv(210, T * 2.1, 130, 1.1, 300, { splashRadius: T * 1.2 }),
    ],
    branches: {
      A: branchA('破壞王', '巨型 AOE 清場', [
        lv(290, T * 2.2, 120, 1.0, 320, { splashRadius: T * 1.4 }),
        lv(400, T * 2.3, 175, 1.1, 340, { splashRadius: T * 1.6 }),
        lv(530, T * 2.4, 260, 1.2, 360, { splashRadius: T * 2.0 }),
      ]),
      B: branchB('攻城槌', '穿甲 — 重裝單體粉碎', [
        lv(290, T * 2.2, 155, 1.0, 320, { armorPierce: true, counterBonus: 1.5 }),
        lv(400, T * 2.3, 235, 1.1, 340, { armorPierce: true, counterBonus: 1.7 }),
        lv(530, T * 2.4, 355, 1.2, 360, { armorPierce: true, counterBonus: 2.0 }),
      ]),
    },
  },

  frostTower: {
    name: '冰霜塔',
    turretSprite: 'turretMG',
    projectileSprite: 'projectileBullet',
    baseLevels: [
      lv(80,  T * 2.2, 4,  2.0, 320, { slowDuration: 1.5, slowFactor: 0.4 }),
      lv(105, T * 2.4, 8,  2.4, 340, { slowDuration: 1.7, slowFactor: 0.35 }),
    ],
    branches: {
      A: branchA('冰霜領域', '大範圍減速光環 — 清場控場', [
        lv(145, T * 2.6, 12, 2.5, 360, { splashRadius: T * 1.4, slowDuration: 2.0, slowFactor: 0.3 }),
        lv(200, T * 2.8, 20, 2.8, 380, { splashRadius: T * 1.8, slowDuration: 2.5, slowFactor: 0.25 }),
        lv(270, T * 3.0, 30, 3.0, 400, { splashRadius: T * 2.2, slowDuration: 3.0, slowFactor: 0.2 }),
      ]),
      B: branchB('冰錐凍結', '單體強凍結 — 重目標定點壓制', [
        lv(145, T * 2.6, 18, 2.2, 380, { slowDuration: 2.5, slowFactor: 0.15 }),
        lv(200, T * 2.8, 32, 2.5, 400, { slowDuration: 3.0, slowFactor: 0.1 }),
        lv(270, T * 3.0, 52, 2.8, 420, { slowDuration: 3.5, slowFactor: 0.05 }),
      ]),
    },
  },

  tesla: {
    name: '特斯拉塔',
    turretSprite: 'turretTesla',
    projectileSprite: 'projectileBullet',
    counters: ['flying', 'shielded'],
    baseLevels: [
      lv(140, T * 2.4, 22, 2.2, 480, { chainCount: 2, chainRange: T * 1.8 }),
      lv(180, T * 2.6, 38, 2.6, 520, { chainCount: 2, chainRange: T * 1.9 }),
    ],
    branches: {
      A: branchA('連鎖風暴', '更多鏈段 — 群體電擊', [
        lv(250, T * 2.8, 45, 2.8, 540, { chainCount: 3, chainRange: T * 2.0 }),
        lv(350, T * 3.0, 65, 3.0, 560, { chainCount: 4, chainRange: T * 2.2 }),
        lv(470, T * 3.2, 95, 3.2, 580, { chainCount: 5, chainRange: T * 2.4 }),
      ]),
      B: branchB('高壓電弧', '極強單體電擊 — boss 殺手', [
        lv(250, T * 2.8, 75, 2.8, 560, { chainCount: 2, chainRange: T * 1.9 }),
        lv(350, T * 3.0, 120, 3.0, 580, { chainCount: 2, chainRange: T * 2.0 }),
        lv(470, T * 3.2, 185, 3.2, 600, { chainCount: 3, chainRange: T * 2.1 }),
      ]),
    },
  },

  lightTower: {
    name: '聖光塔',
    turretSprite: 'turretLight',
    projectileSprite: 'projectileBullet',
    counters: ['ethereal', 'shielded'],
    baseLevels: [
      lv(120, T * 3.2, 28, 1.6, 440, { armorPierce: true }),
      lv(155, T * 3.5, 46, 1.8, 480, { armorPierce: true }),
    ],
    branches: {
      A: branchA('輝耀之光', 'AOE 聖光 — 範圍破邪', [
        lv(215, T * 3.7, 55, 1.8, 500, { armorPierce: true, splashRadius: T * 0.7 }),
        lv(300, T * 4.0, 82, 2.0, 520, { armorPierce: true, splashRadius: T * 1.0 }),
        lv(400, T * 4.2, 120, 2.2, 540, { armorPierce: true, splashRadius: T * 1.3 }),
      ]),
      B: branchB('光束', '單體貫穿超傷害', [
        lv(215, T * 3.7, 85, 1.8, 540, { armorPierce: true }),
        lv(300, T * 4.0, 135, 2.0, 580, { armorPierce: true, counterBonus: 1.6 }),
        lv(400, T * 4.2, 210, 2.2, 620, { armorPierce: true, counterBonus: 1.8 }),
      ]),
    },
  },

  torpedoTower: {
    name: '深海魚雷塔',
    turretSprite: 'turretMissile',
    projectileSprite: 'projectileMissile',
    counters: ['armored', 'shielded'],
    baseLevels: [
      lv(180, T * 2.8, 95,  0.85, 240, { splashRadius: T * 1.5 }),
      lv(230, T * 3.0, 150, 0.95, 260, { splashRadius: T * 1.5 }),
    ],
    branches: {
      A: branchA('水雷陣列', '巨大 AOE — 深水清場', [
        lv(320, T * 3.2, 140, 0.95, 280, { splashRadius: T * 1.8 }),
        lv(450, T * 3.4, 210, 1.05, 300, { splashRadius: T * 2.1 }),
        lv(600, T * 3.6, 310, 1.15, 320, { splashRadius: T * 2.5 }),
      ]),
      B: branchB('魚雷齊發', '多管魚雷 — 線性打擊', [
        lv(320, T * 3.2, 115, 0.85, 280, { splashRadius: T * 1.2, multiShot: 2 }),
        lv(450, T * 3.4, 160, 0.95, 300, { splashRadius: T * 1.3, multiShot: 3 }),
        lv(600, T * 3.6, 215, 1.05, 320, { splashRadius: T * 1.4, multiShot: 4 }),
      ]),
    },
  },
};

export const TOWER_TYPES: Record<string, TowerConfig> = Object.fromEntries(
  Object.entries(RAW_TOWERS).map(([id, cfg]) => [id, { id, ...cfg }]),
);

export const TOWER_ORDER: readonly string[] = [
  'cannon', 'quickShot', 'machineGun', 'frostTower',
  'sniper', 'missileLauncher', 'heavyCannon',
  'tesla', 'lightTower', 'torpedoTower',
];
