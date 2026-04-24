import type { EnemyConfig } from '../game/Enemy.ts';
import { TILE_SIZE } from '../config.ts';

const T = TILE_SIZE;

export const ENEMY_TYPES: Record<string, EnemyConfig> = {
  // Light / Infantry — each has distinct sprite. No armor.
  scout:    { hp: 18,  speed: 170, radius: 8,  reward: 6,  sprite: 'enemyScout',   spriteSize: T * 0.55,
              armorType: 'light' },
  soldier:  { hp: 35,  speed: 120, radius: 10, reward: 10, sprite: 'enemySoldier', spriteSize: T * 0.72,
              armorType: 'light' },
  runner:   { hp: 55,  speed: 100, radius: 11, reward: 14, sprite: 'enemyRunner',  spriteSize: T * 0.78,
              armorType: 'light' },

  // Ground / Armored — damage reduction scales with tier
  tank:       { hp: 90,   speed: 70, radius: 13, reward: 16, sprite: 'enemyTank',       spriteSize: T * 0.88,
                damageResist: 0.10, armorType: 'armored' },
  armored:    { hp: 160,  speed: 55, radius: 14, reward: 22, sprite: 'enemyArmored',    spriteSize: T * 0.98,
                damageResist: 0.25, armorType: 'armored' },
  heavyTank:  { hp: 240,  speed: 45, radius: 15, reward: 30, sprite: 'enemyHeavyTank',  spriteSize: T * 1.1,
                damageResist: 0.30, armorType: 'armored' },

  // Flying — no armor, counter by missile / tesla / machineGun
  plane:    { hp: 80,  speed: 140, radius: 12, reward: 20, sprite: 'enemyPlane', spriteSize: T * 0.95,
              armorType: 'flying' },

  // Bosses — each visually distinct, all carry armor
  boss:        { hp: 320,  speed: 50, radius: 17, reward: 40,  sprite: 'enemyBoss',         spriteSize: T * 1.1,
                 damageResist: 0.10, armorType: 'armored' },
  armoredBoss: { hp: 520,  speed: 38, radius: 19, reward: 60,  sprite: 'enemyArmoredBoss',  spriteSize: T * 1.2,
                 damageResist: 0.30, armorType: 'armored' },
  finalBoss:   { hp: 900,  speed: 30, radius: 22, reward: 120, sprite: 'enemyFinalBoss',    spriteSize: T * 1.35,
                 damageResist: 0.25, armorType: 'armored' },

  // World 4 — Frozen Outpost
  iceBeast:    { hp: 200, speed: 60, radius: 14, reward: 28, sprite: 'enemyIceBeast',   spriteSize: T * 1.05,
                 damageResist: 0.15, armorType: 'armored' },
  frostRaider: { hp: 75,  speed: 135, radius: 11, reward: 20, sprite: 'enemyFrostRaider', spriteSize: T * 0.78,
                 armorType: 'light' },
  glacialBoss: { hp: 780, speed: 32, radius: 21, reward: 110, sprite: 'enemyGlacialBoss', spriteSize: T * 1.3,
                 damageResist: 0.25, armorType: 'armored' },

  // World 5 — Void Fortress (ethereal / shielded specials)
  wraith: {
    hp: 130, speed: 155, radius: 12, reward: 24, sprite: 'enemyWraith', spriteSize: T * 0.88,
    damageResist: 0.35, armorType: 'ethereal',
  },
  splitter: {
    hp: 260, speed: 70, radius: 15, reward: 34, sprite: 'enemySplitter', spriteSize: T * 1.02,
    armorType: 'light',
    onDeathSpawn: [
      { type: 'runner', count: 2, delay: 0.1 },
    ],
  },
  healer: {
    hp: 180, speed: 55, radius: 13, reward: 45, sprite: 'enemyHealer', spriteSize: T * 0.98,
    damageResist: 0.10, armorType: 'shielded',
    healsNearby: { amount: 8, interval: 1.2, radius: T * 2.2 },
  },
  voidBoss: {
    hp: 1300, speed: 28, radius: 24, reward: 180, sprite: 'enemyVoidBoss', spriteSize: T * 1.5,
    damageResist: 0.25, armorType: 'shielded',
  },
};
