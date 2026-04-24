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

  // Bosses — each visually distinct, all carry armor.
  // Each story boss has a phase-2 ability that fires once at 50% HP,
  // adding mid-fight tension instead of plain HP-sponge mechanics.
  boss: {
    hp: 320, speed: 50, radius: 17, reward: 40, sprite: 'enemyBoss', spriteSize: T * 1.1,
    damageResist: 0.10, armorType: 'armored',
    phase2: {
      hpThreshold: 0.5,
      speedMul: 1.6,      // enrages — charges forward
      speedDuration: 6,
      banner: '激怒 · +60% 速度',
    },
  },
  armoredBoss: {
    hp: 520, speed: 38, radius: 19, reward: 60, sprite: 'enemyArmoredBoss', spriteSize: T * 1.2,
    damageResist: 0.30, armorType: 'armored',
    phase2: {
      hpThreshold: 0.5,
      heal: 0.20,         // instantly recovers 20% max HP
      resistBoost: 0.25,  // briefly near-invincible
      resistDuration: 4,
      banner: '裝甲強化 · 護甲 +25%',
    },
  },
  finalBoss: {
    hp: 900, speed: 30, radius: 22, reward: 120, sprite: 'enemyFinalBoss', spriteSize: T * 1.35,
    damageResist: 0.25, armorType: 'armored',
    phase2: {
      hpThreshold: 0.5,
      teleportWorldUnits: 80, // jumps 2 tiles forward
      speedMul: 1.3,
      speedDuration: 5,
      banner: '瞬移前進 2 格',
    },
  },

  // World 4 — Frozen Outpost
  iceBeast:    { hp: 200, speed: 60, radius: 14, reward: 28, sprite: 'enemyIceBeast',   spriteSize: T * 1.05,
                 damageResist: 0.15, armorType: 'armored' },
  frostRaider: { hp: 75,  speed: 135, radius: 11, reward: 20, sprite: 'enemyFrostRaider', spriteSize: T * 0.78,
                 armorType: 'light' },
  glacialBoss: {
    hp: 780, speed: 32, radius: 21, reward: 110, sprite: 'enemyGlacialBoss', spriteSize: T * 1.3,
    damageResist: 0.25, armorType: 'armored',
    phase2: {
      hpThreshold: 0.5,
      heal: 0.15,
      speedMul: 1.4,
      speedDuration: 6,
      spawns: [{ type: 'frostRaider', count: 3, delay: 0.2 }],
      banner: '冰原怒吼 · 召喚凍原兵',
    },
  },

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
    phase2: {
      hpThreshold: 0.5,
      // Splits reality — spawns 4 ethereal wraiths at its position
      spawns: [{ type: 'wraith', count: 4, delay: 0.25 }],
      resistBoost: 0.15,
      resistDuration: 5,
      banner: '現實裂解 · 召喚幽影',
    },
  },

  // World 6 — Seabed Fissure (abyssal aftermath)
  tentacle: {
    hp: 340, speed: 45, radius: 16, reward: 42, sprite: 'enemyTentacle', spriteSize: T * 1.1,
    damageResist: 0.20, armorType: 'armored',
  },
  swimmerShoal: {
    hp: 20, speed: 180, radius: 7, reward: 4, sprite: 'enemySwimmer', spriteSize: T * 0.5,
    armorType: 'light',
  },
  abyssalBoss: {
    hp: 1500, speed: 30, radius: 25, reward: 220, sprite: 'enemyAbyssalBoss', spriteSize: T * 1.55,
    damageResist: 0.30, armorType: 'shielded',
    onDeathSpawn: [
      { type: 'tentacle', count: 3, delay: 0.15 },
    ],
    phase2: {
      hpThreshold: 0.5,
      heal: 0.15,
      speedMul: 1.3,
      speedDuration: 8,
      // Summons a swarm from the deep
      spawns: [
        { type: 'tentacle', count: 2, delay: 0.3 },
        { type: 'swimmerShoal', count: 6, delay: 0.15 },
      ],
      banner: '深淵咆哮 · 召喚群體',
    },
  },
};
