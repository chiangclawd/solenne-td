/**
 * Hero system — three playable commanders tied to the campaign cast.
 *
 * Each hero has:
 *   - Passive (always active when deployed, e.g. aura buff)
 *   - 1 or 2 active skills on cooldown (activated from HUD icons)
 *   - A deploy footprint (placed on a non-path tile at match start)
 *   - Auto-attack against nearby enemies, plus HP + respawn timer on death
 *
 * Unlocks:
 *   kieran  → always available (starter)
 *   vasya   → after completing level-05 (world 1 finale)
 *   pip     → after completing level-10 (world 2 finale)
 */

import type { SaveData } from '../storage/SaveData.ts';
import { isCompleted } from '../storage/SaveData.ts';
import type { ArmorType } from './ArmorTypes.ts';

export type HeroId = 'kieran' | 'vasya' | 'pip';

export type SkillTargeting = 'self' | 'point' | 'tower';

export interface HeroSkill {
  id: string;
  name: string;
  icon: string;
  description: string;
  cooldown: number;
  /** Seconds the skill effect persists (0 = instantaneous). */
  duration: number;
  targeting: SkillTargeting;
  /** Radius (world units) for point-target skills' area of effect. */
  radius?: number;
}

export interface HeroPassive {
  name: string;
  description: string;
  /** Radius in world units; 0 = no aura (e.g. pure stat). */
  auraRadius: number;
}

export interface HeroDef {
  id: HeroId;
  name: string;
  title: string;
  tagline: string;
  portrait: string;
  /** Palette drives HeroPainter and HUD tinting. */
  color: string;
  accent: string;
  maxHp: number;
  attackDamage: number;
  attackRange: number;
  /** Shots per second. */
  attackRate: number;
  /** Seconds for deathdown respawn. */
  respawnSeconds: number;
  passive: HeroPassive;
  skills: readonly HeroSkill[];
  /** Armor types this hero's auto-attack counters for +40% damage. */
  counters?: readonly ArmorType[];
}

export interface HeroUnlock {
  heroId: HeroId;
  afterLevelId: string;
}

// Tile size = 40 (from config.ts), so 1 tile radius = 40 world units.
const T = 40;

export const HEROES: readonly HeroDef[] = [
  {
    id: 'kieran',
    name: '基蘭',
    title: '指揮官',
    tagline: '指揮光環 · 強化全軍',
    portrait: 'kieran',
    color: '#6ec8ff',
    accent: '#a8e0ff',
    maxHp: 260,
    attackDamage: 14,
    attackRange: T * 2.2,
    attackRate: 1.1,
    respawnSeconds: 15,
    counters: ['armored'],
    passive: {
      name: '戰旗光環',
      description: '範圍內友軍塔 +15% 傷害、+10% 射速',
      auraRadius: T * 3,
    },
    skills: [
      {
        id: 'rally',
        name: '全軍突擊',
        icon: '🚩',
        description: '8 秒內所有塔 +40% 傷害、+25% 射速',
        cooldown: 25,
        duration: 8,
        targeting: 'self',
      },
    ],
  },
  {
    id: 'vasya',
    name: '瓦西亞',
    title: '中士',
    tagline: '前線突擊 · 高爆輸出',
    portrait: 'vasya',
    color: '#ffd166',
    accent: '#ffe29a',
    maxHp: 190,
    attackDamage: 22,
    attackRange: T * 2.6,
    attackRate: 1.6,
    respawnSeconds: 20,
    counters: ['light', 'flying'],
    passive: {
      name: '戰術直覺',
      description: '攻擊敵人時附加 5% 爆擊傷害',
      auraRadius: 0,
    },
    skills: [
      {
        id: 'grenade',
        name: '手雷',
        icon: '💣',
        description: '以自身為中心投擲手雷，造成 80 範圍傷害',
        cooldown: 15,
        duration: 0,
        targeting: 'self',
        radius: T * 1.6,
      },
      {
        id: 'piercingShot',
        name: '穿甲射擊',
        icon: '🎯',
        description: '6 秒內攻擊無視敵方護甲，傷害 +80%',
        cooldown: 30,
        duration: 6,
        targeting: 'self',
      },
    ],
  },
  {
    id: 'pip',
    name: '皮普',
    title: '工程師',
    tagline: '能量控場 · 範圍減速',
    portrait: 'pip',
    color: '#c878ff',
    accent: '#e2b4ff',
    maxHp: 150,
    attackDamage: 10,
    attackRange: T * 2.0,
    attackRate: 1.3,
    respawnSeconds: 30,
    counters: ['shielded'],
    passive: {
      name: '索陽諧振',
      description: '範圍內敵人 -18% 移動速度',
      auraRadius: T * 2.8,
    },
    skills: [
      {
        id: 'flash',
        name: '索陽石閃光',
        icon: '⚡',
        description: '範圍內敵人麻痺 3 秒（減速 85%）',
        cooldown: 18,
        duration: 3,
        targeting: 'self',
        radius: T * 2.4,
      },
      {
        id: 'emergencyBuild',
        name: '緊急工程',
        icon: '🏗',
        description: '10 秒內範圍內塔 +50% 射速',
        cooldown: 40,
        duration: 10,
        targeting: 'self',
        radius: T * 3,
      },
    ],
  },
];

export const HERO_UNLOCKS: readonly HeroUnlock[] = [
  { heroId: 'vasya', afterLevelId: 'level-05' },
  { heroId: 'pip', afterLevelId: 'level-10' },
];

export const STARTER_HERO: HeroId = 'kieran';

export function getHero(id: HeroId): HeroDef {
  const h = HEROES.find((x) => x.id === id);
  if (!h) throw new Error(`Unknown hero: ${id}`);
  return h;
}

export function isHeroUnlocked(save: SaveData, heroId: HeroId): boolean {
  if (heroId === STARTER_HERO) return true;
  const entry = HERO_UNLOCKS.find((u) => u.heroId === heroId);
  if (!entry) return true;
  return isCompleted(save, entry.afterLevelId);
}

/** If completing levelId unlocks a hero for the first time, return that hero def. */
export function heroUnlockTriggeredBy(levelId: string): HeroDef | null {
  const entry = HERO_UNLOCKS.find((u) => u.afterLevelId === levelId);
  if (!entry) return null;
  return HEROES.find((h) => h.id === entry.heroId) ?? null;
}

/** All heroes the player has unlocked, in declaration order. */
export function unlockedHeroes(save: SaveData): readonly HeroDef[] {
  return HEROES.filter((h) => isHeroUnlocked(save, h.id));
}
