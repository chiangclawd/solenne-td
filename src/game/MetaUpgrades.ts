/**
 * Persistent star-powered meta upgrades that apply across all levels.
 *
 * Player earns up to 69 stars total (23 levels × 3). Each upgrade has 3 tiers;
 * maxing every category would cost ~144 stars — creating meaningful specialization.
 */

import type { SaveData } from '../storage/SaveData.ts';
import { totalStars } from '../storage/SaveData.ts';

export interface MetaUpgradeTier {
  starCost: number;
  /** Numeric effect (gold amount / multiplier / etc) */
  value: number;
  /** Human-readable short label shown on card (+20, +10%, -5%) */
  label: string;
}

export interface MetaUpgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  tiers: readonly [MetaUpgradeTier, MetaUpgradeTier, MetaUpgradeTier];
}

export const META_UPGRADES: readonly MetaUpgrade[] = [
  {
    id: 'startGold',
    name: '戰備金庫',
    description: '每關開始額外獲得金幣',
    icon: '💰',
    tiers: [
      { starCost: 3, value: 20, label: '+20' },
      { starCost: 5, value: 45, label: '+45' },
      { starCost: 8, value: 80, label: '+80' },
    ],
  },
  {
    id: 'startLives',
    name: '後備兵源',
    description: '每關起始額外生命',
    icon: '❤',
    tiers: [
      { starCost: 3, value: 2, label: '+2' },
      { starCost: 5, value: 5, label: '+5' },
      { starCost: 8, value: 9, label: '+9' },
    ],
  },
  {
    id: 'towerDamage',
    name: '精銳軍械',
    description: '所有塔傷害提升',
    icon: '⚔',
    tiers: [
      { starCost: 4, value: 0.05, label: '+5%' },
      { starCost: 6, value: 0.12, label: '+12%' },
      { starCost: 10, value: 0.20, label: '+20%' },
    ],
  },
  {
    id: 'towerRange',
    name: '遠眺觀測',
    description: '所有塔射程提升',
    icon: '◉',
    tiers: [
      { starCost: 3, value: 0.05, label: '+5%' },
      { starCost: 5, value: 0.10, label: '+10%' },
      { starCost: 8, value: 0.16, label: '+16%' },
    ],
  },
  {
    id: 'towerFireRate',
    name: '火藥工坊',
    description: '所有塔射速提升',
    icon: '▶',
    tiers: [
      { starCost: 4, value: 0.05, label: '+5%' },
      { starCost: 6, value: 0.10, label: '+10%' },
      { starCost: 10, value: 0.16, label: '+16%' },
    ],
  },
  {
    id: 'killReward',
    name: '戰利收繳',
    description: '敵人金幣獎勵提升',
    icon: '✦',
    tiers: [
      { starCost: 3, value: 0.10, label: '+10%' },
      { starCost: 5, value: 0.20, label: '+20%' },
      { starCost: 8, value: 0.35, label: '+35%' },
    ],
  },
  {
    id: 'sellValue',
    name: '軍需回收',
    description: '塔出售回收率提升',
    icon: '↻',
    tiers: [
      { starCost: 3, value: 0.10, label: '+10%' },
      { starCost: 5, value: 0.20, label: '+20%' },
      { starCost: 8, value: 0.30, label: '+30%' },
    ],
  },
  {
    id: 'towerCost',
    name: '工程效率',
    description: '塔建造花費折扣',
    icon: '🏗',
    tiers: [
      { starCost: 4, value: 0.05, label: '-5%' },
      { starCost: 6, value: 0.10, label: '-10%' },
      { starCost: 10, value: 0.15, label: '-15%' },
    ],
  },
];

/** Current tier (0 = not purchased, 1-3 = purchased tiers) */
export function getTier(save: SaveData, upgradeId: string): number {
  return save.metaUpgrades?.[upgradeId] ?? 0;
}

/** Cumulative stars spent across all upgrades */
export function spentStars(save: SaveData): number {
  let total = 0;
  for (const u of META_UPGRADES) {
    const tier = getTier(save, u.id);
    for (let i = 0; i < tier; i++) total += u.tiers[i].starCost;
  }
  return total;
}

/** Unspent stars available to buy upgrades */
export function availableStars(save: SaveData): number {
  return totalStars(save) - spentStars(save);
}

/** Returns the numeric value of an upgrade at its current tier (0 if not purchased). */
export function upgradeValue(save: SaveData, upgradeId: string): number {
  const tier = getTier(save, upgradeId);
  if (tier === 0) return 0;
  const def = META_UPGRADES.find((u) => u.id === upgradeId);
  if (!def) return 0;
  return def.tiers[tier - 1].value;
}

export interface BuyResult { ok: boolean; reason?: string }

export function tryBuyNextTier(save: SaveData, upgradeId: string): BuyResult {
  const def = META_UPGRADES.find((u) => u.id === upgradeId);
  if (!def) return { ok: false, reason: 'unknown' };
  const tier = getTier(save, upgradeId);
  if (tier >= 3) return { ok: false, reason: 'maxed' };
  const cost = def.tiers[tier].starCost;
  if (availableStars(save) < cost) return { ok: false, reason: 'stars' };
  if (!save.metaUpgrades) save.metaUpgrades = {};
  save.metaUpgrades[upgradeId] = tier + 1;
  return { ok: true };
}

/** Refund all upgrades (frees all stars). */
export function resetAllUpgrades(save: SaveData): void {
  save.metaUpgrades = {};
}
