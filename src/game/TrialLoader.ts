/**
 * Trial loader (v2.6.0 B2). Trials live under `/public/trials/` and use the
 * same LevelData schema as campaign levels — they just have a `trial: {...}`
 * block. This is a thin wrapper around fetch + the shared level validator.
 */
import type { LevelData } from './Level.ts';
import { ENEMY_TYPES } from '../data/enemies.ts';
import { TOWER_TYPES } from '../data/towers.ts';

export const TRIAL_IDS = [
  'trial-01', 'trial-02', 'trial-03',
  'trial-04', 'trial-05', 'trial-06',
] as const;
export type TrialId = typeof TRIAL_IDS[number];

export async function loadTrial(id: TrialId): Promise<LevelData> {
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}trials/${id}.json`);
  if (!res.ok) throw new Error(`Trial "${id}" failed to load: HTTP ${res.status}`);
  const raw = (await res.json()) as LevelData;
  validateTrial(raw);
  return raw;
}

function validateTrial(data: LevelData): void {
  if (typeof data.id !== 'string' || typeof data.name !== 'string') {
    throw new Error('Trial missing id/name');
  }
  if (!Array.isArray(data.paths) || data.paths.length === 0) {
    throw new Error('Trial needs paths array');
  }
  if (!Array.isArray(data.availableTowers)) {
    throw new Error('Trial needs availableTowers');
  }
  for (const t of data.availableTowers) {
    if (!TOWER_TYPES[t]) throw new Error(`Trial unknown tower: ${t}`);
  }
  for (const w of data.waves ?? []) {
    for (const e of w) {
      if (!ENEMY_TYPES[e.enemy]) throw new Error(`Trial unknown enemy: ${e.enemy}`);
    }
  }
  if (!data.trial) {
    throw new Error('Trial JSON missing required `trial` metadata block');
  }
}

export async function loadAllTrials(): Promise<LevelData[]> {
  const results = await Promise.all(TRIAL_IDS.map((id) => loadTrial(id)));
  return results;
}
