import type { EnemyConfig } from '../game/Enemy.ts';
import { TILE_SIZE } from '../config.ts';

const T = TILE_SIZE;

export const ENEMY_TYPES: Record<string, EnemyConfig> = {
  // Light / Infantry — each has distinct sprite
  scout:    { hp: 18,  speed: 170, radius: 8,  reward: 6,  sprite: 'enemyScout',   spriteSize: T * 0.55 },
  soldier:  { hp: 35,  speed: 120, radius: 10, reward: 10, sprite: 'enemySoldier', spriteSize: T * 0.72 },
  runner:   { hp: 55,  speed: 100, radius: 11, reward: 14, sprite: 'enemyRunner',  spriteSize: T * 0.78 },

  // Ground / Armored
  tank:       { hp: 90,   speed: 70, radius: 13, reward: 16, sprite: 'enemyTank',       spriteSize: T * 0.88 },
  armored:    { hp: 160,  speed: 55, radius: 14, reward: 22, sprite: 'enemyArmored',    spriteSize: T * 0.98 },
  heavyTank:  { hp: 240,  speed: 45, radius: 15, reward: 30, sprite: 'enemyHeavyTank',  spriteSize: T * 1.1 },

  // Flying
  plane:    { hp: 80,  speed: 140, radius: 12, reward: 20, sprite: 'enemyPlane', spriteSize: T * 0.95 },

  // Bosses — each visually distinct
  boss:        { hp: 320,  speed: 50, radius: 17, reward: 40,  sprite: 'enemyBoss',         spriteSize: T * 1.1 },
  armoredBoss: { hp: 520,  speed: 38, radius: 19, reward: 60,  sprite: 'enemyArmoredBoss',  spriteSize: T * 1.2 },
  finalBoss:   { hp: 900,  speed: 30, radius: 22, reward: 120, sprite: 'enemyFinalBoss',    spriteSize: T * 1.35 },

  // World 4 — Frozen Outpost
  iceBeast:    { hp: 200, speed: 60, radius: 14, reward: 28, sprite: 'enemyIceBeast',   spriteSize: T * 1.05 },
  frostRaider: { hp: 75,  speed: 135, radius: 11, reward: 20, sprite: 'enemyFrostRaider', spriteSize: T * 0.78 },
  glacialBoss: { hp: 780, speed: 32, radius: 21, reward: 110, sprite: 'enemyGlacialBoss', spriteSize: T * 1.3 },

  // World 5 — Void Fortress
  wraith: {
    hp: 130, speed: 155, radius: 12, reward: 24, sprite: 'enemyWraith', spriteSize: T * 0.88,
    damageResist: 0.35,
  },
  splitter: {
    hp: 260, speed: 70, radius: 15, reward: 34, sprite: 'enemySplitter', spriteSize: T * 1.02,
    onDeathSpawn: [
      { type: 'runner', count: 2, delay: 0.1 },
    ],
  },
  healer: {
    hp: 180, speed: 55, radius: 13, reward: 45, sprite: 'enemyHealer', spriteSize: T * 0.98,
    healsNearby: { amount: 8, interval: 1.2, radius: T * 2.2 },
  },
  voidBoss: {
    hp: 1300, speed: 28, radius: 24, reward: 180, sprite: 'enemyVoidBoss', spriteSize: T * 1.5,
    damageResist: 0.15,
  },
};
