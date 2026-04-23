/**
 * Progressive tower unlock system.
 *
 * Starters (always available): cannon / quickShot / machineGun / frostTower
 * Locked by default, each unlocks after completing a milestone level:
 *   sniper        → level-02  (first sniper-needing level is L3)
 *   missileLauncher → level-05  (W1 complete)
 *   heavyCannon   → level-08  (mid W2)
 *   tesla         → level-13  (W3 complete, entering frozen W4)
 *   lightTower    → level-18  (W4 complete, entering void W5)
 */

import type { SaveData } from '../storage/SaveData.ts';
import { isCompleted } from '../storage/SaveData.ts';

export interface TowerUnlock {
  towerId: string;
  afterLevelId: string;
  towerName: string;
  tagline: string;
}

/** Starter towers available from game start — no entry here. */
export const STARTER_TOWERS: readonly string[] = [
  'cannon', 'quickShot', 'machineGun', 'frostTower',
];

export const TOWER_UNLOCKS: readonly TowerUnlock[] = [
  {
    towerId: 'sniper',
    afterLevelId: 'level-02',
    towerName: '狙擊塔',
    tagline: '極長射程 · 對 Boss 高效',
  },
  {
    towerId: 'missileLauncher',
    afterLevelId: 'level-05',
    towerName: '飛彈塔',
    tagline: 'AOE 濺射 · 對群敵高效',
  },
  {
    towerId: 'heavyCannon',
    afterLevelId: 'level-08',
    towerName: '重砲',
    tagline: '巨大 AOE · 高傷害短射程',
  },
  {
    towerId: 'tesla',
    afterLevelId: 'level-13',
    towerName: '特斯拉塔',
    tagline: '鏈狀閃電 · 跳擊多目標',
  },
  {
    towerId: 'lightTower',
    afterLevelId: 'level-18',
    towerName: '聖光塔',
    tagline: '對具傷害減免敵人 +30%',
  },
];

export function isTowerUnlocked(save: SaveData, towerId: string): boolean {
  if (STARTER_TOWERS.includes(towerId)) return true;
  const entry = TOWER_UNLOCKS.find((u) => u.towerId === towerId);
  if (!entry) return true; // unknown tower — treat as unlocked to avoid soft-lock
  return isCompleted(save, entry.afterLevelId);
}

/** If completing `levelId` newly unlocks a tower, return that unlock (else null). */
export function unlockTriggeredBy(levelId: string): TowerUnlock | null {
  return TOWER_UNLOCKS.find((u) => u.afterLevelId === levelId) ?? null;
}

/** Hint string shown in Codex for a locked tower. */
export function unlockHint(towerId: string, levels: readonly { id: string; name: string }[]): string {
  const entry = TOWER_UNLOCKS.find((u) => u.towerId === towerId);
  if (!entry) return '已解鎖';
  const lv = levels.find((l) => l.id === entry.afterLevelId);
  const idx = levels.findIndex((l) => l.id === entry.afterLevelId) + 1;
  return lv ? `通關 L${idx} ${lv.name} 解鎖` : `通關 ${entry.afterLevelId} 解鎖`;
}
