import type { EnemyConfig } from '../game/Enemy.ts';
import { TILE_SIZE } from '../config.ts';

const T = TILE_SIZE;

export const ENEMY_TYPES: Record<string, EnemyConfig> = {
  // Light / Infantry
  scout:    { hp: 18,  speed: 170, radius: 8,  reward: 6,  sprite: 'enemySoldier', spriteSize: T * 0.55 },
  soldier:  { hp: 35,  speed: 120, radius: 10, reward: 10, sprite: 'enemySoldier', spriteSize: T * 0.7 },
  runner:   { hp: 55,  speed: 100, radius: 11, reward: 14, sprite: 'enemySoldier', spriteSize: T * 0.78 },

  // Ground / Armored
  tank:       { hp: 90,   speed: 70, radius: 13, reward: 16, sprite: 'enemyTank', spriteSize: T * 0.85 },
  armored:    { hp: 160,  speed: 55, radius: 14, reward: 22, sprite: 'enemyTank', spriteSize: T * 0.95 },
  heavyTank:  { hp: 240,  speed: 45, radius: 15, reward: 30, sprite: 'enemyTank', spriteSize: T * 1.05 },

  // Flying
  plane:    { hp: 80,  speed: 140, radius: 12, reward: 20, sprite: 'enemyPlane', spriteSize: T * 0.9 },

  // Bosses
  boss:        { hp: 320,  speed: 50, radius: 17, reward: 40,  sprite: 'enemyBoss', spriteSize: T * 1.0 },
  armoredBoss: { hp: 520,  speed: 38, radius: 19, reward: 60,  sprite: 'enemyBoss', spriteSize: T * 1.15 },
  finalBoss:   { hp: 900,  speed: 30, radius: 22, reward: 120, sprite: 'enemyBoss', spriteSize: T * 1.3 },

  // World 4 — Frozen Outpost
  iceBeast:    { hp: 200, speed: 60, radius: 14, reward: 28, sprite: 'enemyIce', spriteSize: T * 1.0 },
  frostRaider: { hp: 75,  speed: 135, radius: 11, reward: 20, sprite: 'enemyIce', spriteSize: T * 0.75 },
  glacialBoss: { hp: 780, speed: 32, radius: 21, reward: 110, sprite: 'enemyIce', spriteSize: T * 1.25 },

  // World 5 — Void Fortress
  wraith: {
    hp: 130, speed: 155, radius: 12, reward: 24, sprite: 'enemyWraith', spriteSize: T * 0.85,
    damageResist: 0.35,
  },
  splitter: {
    hp: 260, speed: 70, radius: 15, reward: 34, sprite: 'enemySplitter', spriteSize: T * 1.0,
    onDeathSpawn: [
      { type: 'runner', count: 2, delay: 0.1 },
    ],
  },
  healer: {
    hp: 180, speed: 55, radius: 13, reward: 45, sprite: 'enemyHealer', spriteSize: T * 0.95,
    healsNearby: { amount: 8, interval: 1.2, radius: T * 2.2 },
  },
  voidBoss: {
    hp: 1300, speed: 28, radius: 24, reward: 180, sprite: 'enemyBoss', spriteSize: T * 1.45,
    damageResist: 0.15,
  },
};
