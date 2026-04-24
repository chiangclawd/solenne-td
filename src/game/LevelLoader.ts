import type { LevelData } from './Level.ts';
import { ENEMY_TYPES } from '../data/enemies.ts';
import { TOWER_TYPES } from '../data/towers.ts';

export const LEVEL_IDS = [
  'level-01', 'level-02', 'level-03', 'level-04', 'level-05',
  'level-06', 'level-07', 'level-08', 'level-09', 'level-10',
  'level-11', 'level-12', 'level-13',
  'level-14', 'level-15', 'level-16', 'level-17', 'level-18',
  'level-19', 'level-20', 'level-21', 'level-22', 'level-23',
] as const;
export type LevelId = typeof LEVEL_IDS[number];

export async function loadLevel(id: string): Promise<LevelData> {
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}levels/${id}.json`);
  if (!res.ok) throw new Error(`Level "${id}" failed to load: HTTP ${res.status}`);
  const raw = (await res.json()) as unknown;
  const data = migrate(raw);
  validate(data);
  return data;
}

/**
 * One-time migration for legacy single-path level JSONs: `{path: [...]}` →
 * `{paths: [[...]]}`. Leaves already-migrated levels (with `paths`) alone.
 * This lets us evolve the schema without hand-rewriting every file.
 */
function migrate(raw: unknown): LevelData {
  const obj = (raw && typeof raw === 'object') ? { ...(raw as Record<string, unknown>) } : {};
  if (!obj.paths && Array.isArray(obj.path)) {
    obj.paths = [obj.path];
    delete obj.path;
  }
  return obj as unknown as LevelData;
}

function validate(data: LevelData): void {
  if (typeof data.id !== 'string' || typeof data.name !== 'string') {
    throw new Error('Level missing id/name');
  }
  if (!Array.isArray(data.paths) || data.paths.length === 0) {
    throw new Error('Level needs paths array with at least one path');
  }
  for (let i = 0; i < data.paths.length; i++) {
    const path = data.paths[i];
    if (!Array.isArray(path) || path.length < 2) {
      throw new Error(`Level path[${i}] needs at least 2 points`);
    }
    for (const p of path) {
      if (typeof p.x !== 'number' || typeof p.y !== 'number') {
        throw new Error(`Invalid path[${i}] point (expected {x, y} numbers)`);
      }
    }
  }
  if (!Array.isArray(data.availableTowers) || data.availableTowers.length === 0) {
    throw new Error('Level must list at least one available tower');
  }
  for (const tower of data.availableTowers) {
    if (!TOWER_TYPES[tower]) throw new Error(`Unknown tower type in level: "${tower}"`);
  }
  if (!Array.isArray(data.waves) || data.waves.length === 0) {
    throw new Error('Level must have at least one wave');
  }
  for (const wave of data.waves) {
    for (const entry of wave) {
      if (!ENEMY_TYPES[entry.enemy]) {
        throw new Error(`Unknown enemy type in wave: "${entry.enemy}"`);
      }
      if (typeof entry.delay !== 'number') {
        throw new Error(`Wave entry missing delay for enemy "${entry.enemy}"`);
      }
      if (entry.path !== undefined) {
        if (typeof entry.path !== 'number' || entry.path < 0 || entry.path >= data.paths.length) {
          throw new Error(`Wave entry.path=${entry.path} out of bounds (have ${data.paths.length} paths)`);
        }
      }
    }
  }
}
