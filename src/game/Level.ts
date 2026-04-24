export interface TileCoord {
  x: number;
  y: number;
}

export interface WaveEntryData {
  delay: number;
  enemy: string;
  /** Which path index this enemy spawns on. Defaults to 0 (first path). */
  path?: number;
}

export type WaveData = readonly WaveEntryData[];

export interface DialogueLineData {
  speaker: string;
  text: string;
  color?: string;
  portrait?: string;
}

export interface Obstacle {
  x: number;
  y: number;
  /** 'tree' | 'rock' | 'barrel' | 'column' | 'crystal' | 'totem' | 'ruin' — kind of decoration. */
  kind: string;
  /**
   * Optional — if truthy, this obstacle can be broken by tower AOE / hero
   * skills. Destroying it frees the tile and drops gold.
   */
  destructible?: boolean;
  /** Custom HP (default 40). */
  hp?: number;
  /** Gold dropped on destruction (default 15). */
  reward?: number;
}

import type { LevelChallenges } from './Challenges.ts';

/**
 * v2.6.0 B2 — trial-mode metadata. Present iff this level is a post-campaign
 * trial. The trial otherwise reuses the full LevelData schema, so most
 * constraints are expressed via `availableTowers`, `startingGold`, custom
 * `waves`, etc. The trial block adds:
 *
 *   - `forceHero`: skip HeroSelect and pin the player to this hero (or none)
 *   - `forbidUpgrade`/`forbidSell`: disable those buttons in the upgrade panel
 *   - `metaStarReward`: meta stars granted on first completion
 *
 * Unlock order is enforced by trialProgress + the trial-select UI; the JSON
 * doesn't need a dependency field.
 */
export interface TrialMeta {
  /** 'none' = play with no hero. HeroId = pin to that hero. undefined = let player choose. */
  forceHero?: 'kieran' | 'vasya' | 'pip' | 'none';
  forbidUpgrade?: boolean;
  forbidSell?: boolean;
  /** Meta stars granted on first completion. Stored in save.metaStarBonus. */
  metaStarReward: number;
}

export interface LevelData {
  id: string;
  name: string;
  world: number;
  flavorText?: string;
  /**
   * One or more enemy paths. Each path is a list of tile waypoints. Enemies
   * are assigned a path via their wave entry's `path` field (default 0).
   * Single-path levels just have `paths.length === 1`.
   */
  paths: readonly (readonly TileCoord[])[];
  startingGold: number;
  startingLives: number;
  availableTowers: readonly string[];
  waves: readonly WaveData[];
  intro?: readonly DialogueLineData[];
  outroWin?: readonly DialogueLineData[];
  outroLose?: readonly DialogueLineData[];
  endless?: boolean;
  coverImage?: string;
  obstacles?: readonly Obstacle[];
  /**
   * Optional per-level star 2 / star 3 challenges (v2.3 A1). Star 1 is
   * always "complete the level" and has no spec. If this field is absent,
   * the loader falls back to the legacy livesRatio → stars mapping.
   */
  challenges?: LevelChallenges;
  /**
   * v2.6.0 B2 — trial metadata. Present iff this level is a post-campaign
   * trial; loader exposes it via `loadTrial()` so the main level list stays
   * clean.
   */
  trial?: TrialMeta;
}
