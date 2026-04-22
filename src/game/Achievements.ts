import type { SaveData } from '../storage/SaveData.ts';
import { totalStars, countCompleted } from '../storage/SaveData.ts';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  check(save: SaveData, ev: AchievementEvent | null): boolean;
}

export type AchievementEvent =
  | { type: 'levelComplete'; levelId: string; stars: number; livesRatio: number }
  | { type: 'towerPlaced'; towerId: string }
  | { type: 'enemyKilled'; count: number }
  | { type: 'waveClear'; wave: number }
  | { type: 'saveTick' };

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first_blood',
    title: '初陣',
    description: '通關第一關。',
    icon: '🎖',
    check: (_s, ev) => ev?.type === 'levelComplete' && ev.levelId === 'level-01',
  },
  {
    id: 'world_1',
    title: '邊境守衛',
    description: '通關世界一全部五關。',
    icon: '🛡',
    check: (s) =>
      ['level-01', 'level-02', 'level-03', 'level-04', 'level-05']
        .every((id) => s.levelProgress[id]?.completed),
  },
  {
    id: 'world_2',
    title: '工業殘響',
    description: '通關世界二全部四關。',
    icon: '⚙',
    check: (s) =>
      ['level-06', 'level-07', 'level-08', 'level-09']
        .every((id) => s.levelProgress[id]?.completed),
  },
  {
    id: 'world_3',
    title: '鐵潮終結',
    description: '通關世界三並結束戰役。',
    icon: '👑',
    check: (s) =>
      ['level-10', 'level-11', 'level-12', 'level-13']
        .every((id) => s.levelProgress[id]?.completed),
  },
  {
    id: 'flawless',
    title: '零失誤',
    description: '任何一關以滿血取得三星。',
    icon: '⭐',
    check: (_s, ev) => ev?.type === 'levelComplete' && ev.stars === 3 && ev.livesRatio >= 1,
  },
  {
    id: 'three_star_world_1',
    title: '完美邊境',
    description: '世界一全部以三星通關。',
    icon: '🌟',
    check: (s) =>
      ['level-01', 'level-02', 'level-03', 'level-04', 'level-05']
        .every((id) => (s.levelProgress[id]?.bestStars ?? 0) >= 3),
  },
  {
    id: 'all_three_stars',
    title: '索倫戰神',
    description: '全 23 關取得三星。',
    icon: '🏆',
    check: (s) => totalStars(s) >= 69,
  },
  {
    id: 'world_4',
    title: '凍原征服者',
    description: '通關世界四全部五關。',
    icon: '❄',
    check: (s) =>
      ['level-14', 'level-15', 'level-16', 'level-17', 'level-18']
        .every((id) => s.levelProgress[id]?.completed),
  },
  {
    id: 'world_5',
    title: '虛空終結',
    description: '通關世界五並打敗第一個人。',
    icon: '✦',
    check: (s) =>
      ['level-19', 'level-20', 'level-21', 'level-22', 'level-23']
        .every((id) => s.levelProgress[id]?.completed),
  },
  {
    id: 'full_campaign',
    title: '索倫史詩',
    description: '通關全 23 關戰役。',
    icon: '📜',
    check: (s) => countCompleted(s) >= 23,
  },
  {
    id: 'hundred_kills',
    title: '百夫斬',
    description: '累計擊殺 100 名敵人。',
    icon: '⚔',
    check: (s) => s.stats.totalKills >= 100,
  },
  {
    id: 'thousand_kills',
    title: '千人斷橋',
    description: '累計擊殺 1000 名敵人。',
    icon: '🗡',
    check: (s) => s.stats.totalKills >= 1000,
  },
  {
    id: 'builder',
    title: '建設大師',
    description: '累計建造 50 座塔。',
    icon: '🏗',
    check: (s) => s.stats.totalTowersBuilt >= 50,
  },
  {
    id: 'miser',
    title: '金幣滿盈',
    description: '累計獲得 5000 金幣。',
    icon: '💰',
    check: (s) => s.stats.totalGoldEarned >= 5000,
  },
  {
    id: 'veteran',
    title: '百戰老兵',
    description: '累計抵禦 100 波敵軍。',
    icon: '🎯',
    check: (s) => s.stats.totalWavesSurvived >= 100,
  },
  {
    id: 'halfway',
    title: '半壁江山',
    description: '通關半數以上關卡（12 關）。',
    icon: '🗺',
    check: (s) => countCompleted(s) >= 12,
  },
  {
    id: 'hard_initiate',
    title: '鐵血入門',
    description: '以困難難度通關任一關。',
    icon: '🔥',
    check: (s) => {
      for (const id in s.levelProgress) {
        const byDiff = s.levelProgress[id].bestStarsByDifficulty;
        if (byDiff && ((byDiff.hard ?? 0) > 0 || (byDiff.heroic ?? 0) > 0)) return true;
      }
      return false;
    },
  },
  {
    id: 'heroic_initiate',
    title: '鐵血英雄',
    description: '以英雄難度通關任一關。',
    icon: '👹',
    check: (s) => {
      for (const id in s.levelProgress) {
        const byDiff = s.levelProgress[id].bestStarsByDifficulty;
        if (byDiff && (byDiff.heroic ?? 0) > 0) return true;
      }
      return false;
    },
  },
];

export interface UnlockedNotice {
  achievement: Achievement;
  time: number;
}

export class AchievementTracker {
  private recentUnlocks: UnlockedNotice[] = [];

  check(save: SaveData, event: AchievementEvent | null): Achievement[] {
    const newly: Achievement[] = [];
    for (const a of ACHIEVEMENTS) {
      if (save.achievements[a.id]) continue;
      if (a.check(save, event)) {
        save.achievements[a.id] = { unlockedAt: Date.now() };
        this.recentUnlocks.push({ achievement: a, time: 3.5 });
        newly.push(a);
      }
    }
    return newly;
  }

  update(dt: number): void {
    for (let i = this.recentUnlocks.length - 1; i >= 0; i--) {
      this.recentUnlocks[i].time -= dt;
      if (this.recentUnlocks[i].time <= 0) this.recentUnlocks.splice(i, 1);
    }
  }

  getToasts(): readonly UnlockedNotice[] {
    return this.recentUnlocks;
  }
}
