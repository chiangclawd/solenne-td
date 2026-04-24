/**
 * Armor-type classification for enemies + tower counters.
 *
 * Two orthogonal mechanics work together:
 *   - damageResist (0..1)  → flat percentage reduction applied to incoming damage
 *   - armorType            → category that certain towers COUNTER for +40% damage
 *
 * Towers list `counters: ArmorType[]`; enemies list `armorType: ArmorType`.
 * When they match, damage is multiplied by COUNTER_BONUS.
 */

export type ArmorType = 'light' | 'armored' | 'flying' | 'ethereal' | 'shielded';

export const COUNTER_BONUS = 1.4;

export interface ArmorTypeInfo {
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const ARMOR_INFO: Record<ArmorType, ArmorTypeInfo> = {
  light: {
    label: '輕裝',
    icon: '🪖',
    color: '#9cb7d9',
    description: '無護甲的步兵單位。火力集中速射最有效。',
  },
  armored: {
    label: '重甲',
    icon: '🛡',
    color: '#c9a961',
    description: '鋼板／厚甲地面單位。需要穿甲或 AOE 爆破。',
  },
  flying: {
    label: '飛行',
    icon: '✈',
    color: '#6ec8ff',
    description: '快速空中單位。飛彈與電擊塔有利。',
  },
  ethereal: {
    label: '幽影',
    icon: '👻',
    color: '#c878ff',
    description: '半實體單位。狙擊與聖光塔能貫穿。',
  },
  shielded: {
    label: '護盾',
    icon: '🔷',
    color: '#5eb8ff',
    description: '帶魔法護盾的高級敵人。電擊與聖光塔最強。',
  },
};

/**
 * Compute the counter multiplier for a given tower vs enemy pairing.
 * Returns 1.0 if no counter, COUNTER_BONUS (default 1.4) if tower counters
 * enemy. A per-tier override (e.g. cannon 穿甲 Lv5 with counterBonus 1.8)
 * replaces the default 1.4 when the tower actually counters the enemy.
 */
export function counterMultiplier(
  towerCounters: readonly ArmorType[] | undefined,
  enemyArmor: ArmorType | undefined,
  overrideBonus?: number,
): number {
  if (!towerCounters || towerCounters.length === 0) return 1;
  if (!enemyArmor) return 1;
  if (!towerCounters.includes(enemyArmor)) return 1;
  return overrideBonus && overrideBonus > 0 ? overrideBonus : COUNTER_BONUS;
}
