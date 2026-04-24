/**
 * Hero Talent Trees (v2.5 C1).
 *
 * Each of the 3 heroes has 5 talents, each 3 tiers deep. A player earns
 * "英雄星" (hero stars) by completing distinct levels with a given hero
 * — derived from the existing `heroLevelWins` save field. Max 28 stars
 * per hero. Per-tier costs are 1/2/3 so maxing ONE hero costs 30 stars
 * (roughly one full campaign run with that hero).
 *
 * Talents apply as FLAT multipliers on hero stats at construction time.
 * HeroDef itself is never mutated (it's a shared const).
 */
import type { HeroId } from './Heroes.ts';
import type { SaveData } from '../storage/SaveData.ts';

export type TalentEffectKind =
  | 'attackDamage'    // hero auto-attack + melee (additive multiplier)
  | 'attackRate'      // shots per second
  | 'attackRange'
  | 'maxHp'
  | 'auraRadius'      // passive aura
  | 'skillRadius'     // all skill AOE radii
  | 'skillDuration'   // all skill active durations
  | 'skillDamage';    // grenade base-damage multiplier

export interface TalentTier {
  /** Hero stars required to unlock this tier (additive, not cumulative). */
  cost: number;
  /** Additive value at this tier. Multiplier = 1 + sum of unlocked tiers' values. */
  value: number;
  /** Short label shown in UI ('+10%', '+0.2s', etc). */
  label: string;
}

export interface TalentDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  effect: TalentEffectKind;
  /** Exactly 3 tiers. */
  tiers: readonly [TalentTier, TalentTier, TalentTier];
}

export interface HeroTalentTree {
  hero: HeroId;
  talents: readonly TalentDef[];
}

// ---------- Tier cost table (shared across all talents) ----------
const C = (cost: number, value: number, label: string): TalentTier => ({ cost, value, label });

// ---------- Kieran (前線指揮) ----------
const KIERAN_TALENTS: TalentDef[] = [
  {
    id: 'kieran.aura',
    name: '光環擴展',
    icon: '◎',
    description: '戰旗光環範圍提升，影響更多友軍塔。',
    effect: 'auraRadius',
    tiers: [C(1, 0.10, '+10%'), C(2, 0.22, '+22%'), C(3, 0.35, '+35%')],
  },
  {
    id: 'kieran.damage',
    name: '王者威能',
    icon: '⚔',
    description: '親自作戰傷害提升。',
    effect: 'attackDamage',
    tiers: [C(1, 0.10, '+10%'), C(2, 0.22, '+22%'), C(3, 0.35, '+35%')],
  },
  {
    id: 'kieran.hp',
    name: '盾牌強化',
    icon: '♥',
    description: '最大生命值提升，前線更耐戰。',
    effect: 'maxHp',
    tiers: [C(1, 0.15, '+15%'), C(2, 0.30, '+30%'), C(3, 0.50, '+50%')],
  },
  {
    id: 'kieran.skillDur',
    name: '整軍令',
    icon: '⏱',
    description: 'Rally / Royal Ward 持續時間延長。',
    effect: 'skillDuration',
    tiers: [C(1, 0.20, '+20%'), C(2, 0.40, '+40%'), C(3, 0.60, '+60%')],
  },
  {
    id: 'kieran.skillRadius',
    name: '皇家守護',
    icon: '✦',
    description: '技能覆蓋範圍擴大。',
    effect: 'skillRadius',
    tiers: [C(1, 0.15, '+15%'), C(2, 0.30, '+30%'), C(3, 0.50, '+50%')],
  },
];

// ---------- Vasya (精準射手) ----------
const VASYA_TALENTS: TalentDef[] = [
  {
    id: 'vasya.damage',
    name: '精準射擊',
    icon: '◎',
    description: '每一發更致命。',
    effect: 'attackDamage',
    tiers: [C(1, 0.12, '+12%'), C(2, 0.25, '+25%'), C(3, 0.40, '+40%')],
  },
  {
    id: 'vasya.rate',
    name: '快速換彈',
    icon: '⚡',
    description: '射速提升，壓制力更強。',
    effect: 'attackRate',
    tiers: [C(1, 0.15, '+15%'), C(2, 0.28, '+28%'), C(3, 0.45, '+45%')],
  },
  {
    id: 'vasya.range',
    name: '戰術視野',
    icon: '◈',
    description: '射程擴展，後方狙擊更安全。',
    effect: 'attackRange',
    tiers: [C(1, 0.10, '+10%'), C(2, 0.20, '+20%'), C(3, 0.35, '+35%')],
  },
  {
    id: 'vasya.skillDur',
    name: '穿甲精通',
    icon: '⏱',
    description: '穿甲彈持續更久。',
    effect: 'skillDuration',
    tiers: [C(1, 0.25, '+25%'), C(2, 0.50, '+50%'), C(3, 0.80, '+80%')],
  },
  {
    id: 'vasya.hp',
    name: '戰地老兵',
    icon: '♥',
    description: '生命上限提升，遭遇戰更耐打。',
    effect: 'maxHp',
    tiers: [C(1, 0.10, '+10%'), C(2, 0.22, '+22%'), C(3, 0.35, '+35%')],
  },
];

// ---------- Pip (工程師) ----------
const PIP_TALENTS: TalentDef[] = [
  {
    id: 'pip.skillRadius',
    name: '強化手榴彈',
    icon: '◎',
    description: '手榴彈 / 閃光彈 / 緊急建造 範圍擴大。',
    effect: 'skillRadius',
    tiers: [C(1, 0.15, '+15%'), C(2, 0.30, '+30%'), C(3, 0.50, '+50%')],
  },
  {
    id: 'pip.skillDamage',
    name: '能量電池',
    icon: '⚡',
    description: '手榴彈傷害大幅提升。',
    effect: 'skillDamage',
    tiers: [C(1, 0.20, '+20%'), C(2, 0.45, '+45%'), C(3, 0.75, '+75%')],
  },
  {
    id: 'pip.skillDur',
    name: '閃光彈精通',
    icon: '⏱',
    description: '閃光彈減速效果持續更久。',
    effect: 'skillDuration',
    tiers: [C(1, 0.25, '+25%'), C(2, 0.50, '+50%'), C(3, 0.80, '+80%')],
  },
  {
    id: 'pip.damage',
    name: '手感精進',
    icon: '⚔',
    description: '電磁步槍平射傷害提升。',
    effect: 'attackDamage',
    tiers: [C(1, 0.10, '+10%'), C(2, 0.20, '+20%'), C(3, 0.32, '+32%')],
  },
  {
    id: 'pip.hp',
    name: '機械之心',
    icon: '♥',
    description: '生命上限提升。',
    effect: 'maxHp',
    tiers: [C(1, 0.15, '+15%'), C(2, 0.30, '+30%'), C(3, 0.50, '+50%')],
  },
];

export const HERO_TALENT_TREES: Record<HeroId, HeroTalentTree> = {
  kieran: { hero: 'kieran', talents: KIERAN_TALENTS },
  vasya:  { hero: 'vasya',  talents: VASYA_TALENTS },
  pip:    { hero: 'pip',    talents: PIP_TALENTS },
};

// ---------- Save helpers ----------

/** Current tier of a talent on a hero (0..3). */
export function getTalentTier(save: SaveData, hero: HeroId, talentId: string): number {
  return save.heroTalents?.[hero]?.[talentId] ?? 0;
}

/** Stars earned by a hero = distinct levels completed with them. */
export function heroStarsEarned(save: SaveData, hero: HeroId): number {
  return save.heroLevelWins?.[hero]?.length ?? 0;
}

/** Stars already spent on a hero's talents. */
export function heroStarsSpent(save: SaveData, hero: HeroId): number {
  const tree = HERO_TALENT_TREES[hero];
  let total = 0;
  for (const t of tree.talents) {
    const tier = getTalentTier(save, hero, t.id);
    for (let i = 0; i < tier; i++) total += t.tiers[i].cost;
  }
  return total;
}

export function heroStarsAvailable(save: SaveData, hero: HeroId): number {
  return heroStarsEarned(save, hero) - heroStarsSpent(save, hero);
}

/** Sum of value effects for a single talent at its current tier. */
export function talentValue(save: SaveData, hero: HeroId, talentId: string): number {
  const tree = HERO_TALENT_TREES[hero];
  const def = tree.talents.find((t) => t.id === talentId);
  if (!def) return 0;
  const tier = getTalentTier(save, hero, talentId);
  let total = 0;
  for (let i = 0; i < tier; i++) total += def.tiers[i].value;
  return total;
}

export interface BuyTalentResult {
  ok: boolean;
  reason?: 'maxed' | 'stars' | 'unknown';
}

export function tryBuyNextTier(
  save: SaveData,
  hero: HeroId,
  talentId: string,
): BuyTalentResult {
  const tree = HERO_TALENT_TREES[hero];
  const def = tree.talents.find((t) => t.id === talentId);
  if (!def) return { ok: false, reason: 'unknown' };
  const tier = getTalentTier(save, hero, talentId);
  if (tier >= 3) return { ok: false, reason: 'maxed' };
  const cost = def.tiers[tier].cost;
  if (heroStarsAvailable(save, hero) < cost) return { ok: false, reason: 'stars' };
  if (!save.heroTalents) save.heroTalents = { kieran: {}, vasya: {}, pip: {} };
  if (!save.heroTalents[hero]) save.heroTalents[hero] = {};
  save.heroTalents[hero][talentId] = tier + 1;
  return { ok: true };
}

// ---------- Runtime application ----------

/**
 * Flat multipliers applied at Hero construction. Defaults to 1 for every
 * effect when hero has no investment. Precomputed once per level start so
 * Hero.update() doesn't hit the save layer on every frame.
 */
export interface HeroTalentMods {
  damageMul: number;
  rateMul: number;
  rangeMul: number;
  hpMul: number;
  auraRadiusMul: number;
  skillRadiusMul: number;
  skillDurationMul: number;
  skillDamageMul: number;
}

const DEFAULT_MODS: HeroTalentMods = {
  damageMul: 1, rateMul: 1, rangeMul: 1, hpMul: 1,
  auraRadiusMul: 1, skillRadiusMul: 1, skillDurationMul: 1, skillDamageMul: 1,
};

/**
 * Resolve talents for a given hero into a flat multipliers object. Returns
 * DEFAULT_MODS if hero is null.
 */
export function resolveTalentMods(save: SaveData, hero: HeroId | null): HeroTalentMods {
  if (!hero) return { ...DEFAULT_MODS };
  const tree = HERO_TALENT_TREES[hero];
  const mods: HeroTalentMods = { ...DEFAULT_MODS };
  for (const t of tree.talents) {
    const v = talentValue(save, hero, t.id);
    if (v === 0) continue;
    switch (t.effect) {
      case 'attackDamage':   mods.damageMul += v; break;
      case 'attackRate':     mods.rateMul += v; break;
      case 'attackRange':    mods.rangeMul += v; break;
      case 'maxHp':          mods.hpMul += v; break;
      case 'auraRadius':     mods.auraRadiusMul += v; break;
      case 'skillRadius':    mods.skillRadiusMul += v; break;
      case 'skillDuration':  mods.skillDurationMul += v; break;
      case 'skillDamage':    mods.skillDamageMul += v; break;
    }
  }
  return mods;
}
