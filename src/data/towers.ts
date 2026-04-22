import type { TowerConfig } from '../game/Tower.ts';
import { TILE_SIZE } from '../config.ts';

const T = TILE_SIZE;

type RawTowerConfig = Omit<TowerConfig, 'id'>;

const RAW_TOWERS: Record<string, RawTowerConfig> = {
  cannon: {
    name: '加農砲',
    turretSprite: 'turretCannon',
    projectileSprite: 'projectileBullet',
    levels: [
      { cost: 50,  range: T * 2.5, damage: 18,  fireRate: 2.0, projectileSpeed: 300 },
      { cost: 60,  range: T * 2.7, damage: 30,  fireRate: 2.4, projectileSpeed: 320 },
      { cost: 85,  range: T * 2.9, damage: 50,  fireRate: 2.8, projectileSpeed: 340 },
    ],
  },
  quickShot: {
    name: '速射槍',
    turretSprite: 'turretMG',
    projectileSprite: 'projectileBullet',
    levels: [
      { cost: 40,  range: T * 2.0, damage: 8,   fireRate: 4.0, projectileSpeed: 340 },
      { cost: 50,  range: T * 2.1, damage: 14,  fireRate: 4.5, projectileSpeed: 360 },
      { cost: 70,  range: T * 2.3, damage: 22,  fireRate: 5.5, projectileSpeed: 380 },
    ],
  },
  machineGun: {
    name: '機槍塔',
    turretSprite: 'turretMG',
    projectileSprite: 'projectileBullet',
    levels: [
      { cost: 85,  range: T * 2.3, damage: 12,  fireRate: 6.0, projectileSpeed: 360 },
      { cost: 100, range: T * 2.4, damage: 18,  fireRate: 7.0, projectileSpeed: 380 },
      { cost: 130, range: T * 2.6, damage: 26,  fireRate: 8.0, projectileSpeed: 400 },
    ],
  },
  sniper: {
    name: '狙擊塔',
    turretSprite: 'turretCannon',
    projectileSprite: 'projectileBullet',
    levels: [
      { cost: 110, range: T * 4.5, damage: 70,  fireRate: 0.7, projectileSpeed: 520 },
      { cost: 130, range: T * 5.0, damage: 110, fireRate: 0.8, projectileSpeed: 560 },
      { cost: 175, range: T * 5.5, damage: 175, fireRate: 1.0, projectileSpeed: 600 },
    ],
  },
  missileLauncher: {
    name: '飛彈塔 (AOE)',
    turretSprite: 'turretMissile',
    projectileSprite: 'projectileMissile',
    splashRadius: T * 0.9,
    levels: [
      { cost: 130, range: T * 3.5, damage: 45,  fireRate: 0.9, projectileSpeed: 220 },
      { cost: 160, range: T * 3.7, damage: 70,  fireRate: 1.0, projectileSpeed: 240 },
      { cost: 210, range: T * 4.0, damage: 110, fireRate: 1.2, projectileSpeed: 260 },
    ],
  },
  heavyCannon: {
    name: '重砲 (AOE)',
    turretSprite: 'turretMissile',
    projectileSprite: 'projectileMissile',
    splashRadius: T * 1.2,
    levels: [
      { cost: 160, range: T * 2.0, damage: 85,  fireRate: 1.0, projectileSpeed: 280 },
      { cost: 200, range: T * 2.1, damage: 130, fireRate: 1.1, projectileSpeed: 300 },
      { cost: 260, range: T * 2.3, damage: 200, fireRate: 1.3, projectileSpeed: 320 },
    ],
  },
  frostTower: {
    name: '冰霜塔 (減速)',
    turretSprite: 'turretMG',
    projectileSprite: 'projectileBullet',
    slowDuration: 1.5,
    slowFactor: 0.4,
    levels: [
      { cost: 80,  range: T * 2.2, damage: 4,   fireRate: 2.0, projectileSpeed: 320 },
      { cost: 100, range: T * 2.4, damage: 8,   fireRate: 2.4, projectileSpeed: 340 },
      { cost: 140, range: T * 2.6, damage: 14,  fireRate: 3.0, projectileSpeed: 360 },
    ],
  },
  tesla: {
    name: '特斯拉塔 (鏈狀)',
    turretSprite: 'turretTesla',
    projectileSprite: 'projectileBullet',
    chainCount: 2,
    chainRange: T * 1.8,
    levels: [
      { cost: 140, range: T * 2.4, damage: 22, fireRate: 2.2, projectileSpeed: 480 },
      { cost: 180, range: T * 2.6, damage: 38, fireRate: 2.6, projectileSpeed: 520 },
      { cost: 240, range: T * 2.8, damage: 60, fireRate: 3.0, projectileSpeed: 560 },
    ],
  },
  lightTower: {
    name: '聖光塔',
    turretSprite: 'turretLight',
    projectileSprite: 'projectileBullet',
    pierceResist: true,
    levels: [
      { cost: 120, range: T * 3.2, damage: 28, fireRate: 1.6, projectileSpeed: 440 },
      { cost: 150, range: T * 3.5, damage: 46, fireRate: 1.8, projectileSpeed: 480 },
      { cost: 200, range: T * 3.8, damage: 72, fireRate: 2.0, projectileSpeed: 520 },
    ],
  },
};

export const TOWER_TYPES: Record<string, TowerConfig> = Object.fromEntries(
  Object.entries(RAW_TOWERS).map(([id, cfg]) => [id, { id, ...cfg }]),
);

export const TOWER_ORDER: readonly string[] = [
  'cannon', 'quickShot', 'machineGun', 'frostTower',
  'sniper', 'missileLauncher', 'heavyCannon',
  'tesla', 'lightTower',
];
