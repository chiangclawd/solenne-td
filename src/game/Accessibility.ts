/**
 * Accessibility helpers (v2.5.1 D2).
 *
 * Three knobs, all live in Settings:
 *   - colorBlindMode: swap red/green palette to yellow/blue (Okabe-Ito
 *     protan-safe — green→blue, red→orange is already safe enough)
 *   - uiScale: multiplier applied to every non-world text draw
 *   - lowAnimation: suppresses particles, weather, screen shake, embers
 *
 * Usage:
 *   - Text rendering paths that accept a size now call `scaleText(size)` first
 *   - Color decisions that meant "green=good / red=bad" call `cbColor(color)`
 *   - Particle/weather spawn loops gate on `save.settings.lowAnimation`
 */
import type { SaveData } from '../storage/SaveData.ts';

/** Shorthand — returns true if the save opted into low-animation mode. */
export function isLowAnimation(save: SaveData): boolean {
  return save.settings.lowAnimation === true;
}

/** UI scale multiplier — clamps to [0.9, 1.5] as a safety rail. */
export function getUiScale(save: SaveData): number {
  const raw = save.settings.uiScale ?? 1.0;
  if (!Number.isFinite(raw)) return 1.0;
  return Math.max(0.9, Math.min(1.5, raw));
}

/**
 * Swap red/green hues in a hex/rgba color string when color-blind mode is on.
 * Implemented as a palette map of the 10-ish colors the game uses for
 * critical signals (HP low, danger flash, completion green, etc). Anything
 * else passes through unchanged.
 *
 * Okabe-Ito:
 *   - red (#ff6b6b, #ff3030, #ff8a8a)  → amber/orange
 *   - green (#6ee17a, #a8f0b5)         → cyan-blue
 */
const CB_MAP: Record<string, string> = {
  // Reds → orange-amber (preserves "hot" connotation for protanopia)
  '#ff6b6b': '#ff9f43',
  '#ff3030': '#e07a30',
  '#ff8a8a': '#ffb37a',
  // Greens → cyan-blue (preserves "cool/safe" connotation)
  '#6ee17a': '#5eb8ff',
  '#a8f0b5': '#a8dcff',
  '#2c5a32': '#1a3a5a',
};

export function cbColor(color: string, save: SaveData): string {
  if (!save.settings.colorBlindMode) return color;
  // Direct hex lookup — most callers pass canonical tokens.
  const low = color.toLowerCase();
  if (CB_MAP[low]) return CB_MAP[low];
  // Fallback: rgba() with the same underlying red token? Skip for now.
  return color;
}
