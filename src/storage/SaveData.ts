export type Difficulty = 'normal' | 'hard' | 'heroic';

export interface LevelProgress {
  bestStars: number;
  completed: boolean;
  bestStarsByDifficulty?: Partial<Record<Difficulty, number>>;
}

export interface Settings {
  masterVolume: number;
  sfxVolume: number;
  bgmVolume: number;
  muted: boolean;
  difficulty: Difficulty;
  showFps: boolean;
  screenShake: boolean;
}

export interface GlobalStats {
  totalKills: number;
  totalGoldEarned: number;
  totalTowersBuilt: number;
  totalWavesSurvived: number;
  totalPlayMs: number;
  levelsCompleted: number;
}

export interface EndlessScore {
  waves: number;
  kills: number;
  difficulty: Difficulty;
  date: number;
}

export interface SaveData {
  version: 2;
  levelProgress: Record<string, LevelProgress>;
  settings: Settings;
  achievements: Record<string, { unlockedAt: number }>;
  stats: GlobalStats;
  endlessHighScore?: EndlessScore;
  /** Meta-progression: map of upgrade id → current tier (0-3). */
  metaUpgrades?: Record<string, number>;
  /** Last hero the player selected (UI default on next level start). */
  selectedHero?: string;
  /** Map of hero id → list of levels cleared WITH that hero. Used by achievements. */
  heroLevelWins?: Record<string, string[]>;
}

const SAVE_KEY = 'td-solenne-save-v1';

export function defaultSettings(): Settings {
  return {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    bgmVolume: 0.5,
    muted: false,
    difficulty: 'normal',
    showFps: false,
    screenShake: true,
  };
}

export function defaultStats(): GlobalStats {
  return {
    totalKills: 0,
    totalGoldEarned: 0,
    totalTowersBuilt: 0,
    totalWavesSurvived: 0,
    totalPlayMs: 0,
    levelsCompleted: 0,
  };
}

export function defaultSave(): SaveData {
  return {
    version: 2,
    levelProgress: {},
    settings: defaultSettings(),
    achievements: {},
    stats: defaultStats(),
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData> & { version?: number };
    if (!parsed || typeof parsed !== 'object') return defaultSave();
    return migrate(parsed);
  } catch {
    return defaultSave();
  }
}

function migrate(parsed: Partial<SaveData> & { version?: number }): SaveData {
  const base = defaultSave();
  const levelProgress = (parsed.levelProgress ?? {}) as Record<string, LevelProgress>;
  const settings = { ...base.settings, ...(parsed.settings ?? {}) };
  const stats = { ...base.stats, ...(parsed.stats ?? {}) };
  const achievements = (parsed.achievements ?? {}) as Record<string, { unlockedAt: number }>;
  const out: SaveData = { version: 2, levelProgress, settings, achievements, stats };
  if (parsed.endlessHighScore) out.endlessHighScore = parsed.endlessHighScore;
  if (parsed.metaUpgrades) out.metaUpgrades = parsed.metaUpgrades;
  if (typeof parsed.selectedHero === 'string') out.selectedHero = parsed.selectedHero;
  if (parsed.heroLevelWins) out.heroLevelWins = parsed.heroLevelWins;
  return out;
}

export function persistSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* localStorage unavailable; ignore */
  }
}

export function recordCompletion(
  save: SaveData,
  levelId: string,
  stars: number,
  difficulty: Difficulty = 'normal',
): void {
  const existing = save.levelProgress[levelId];
  const prevBest = existing?.bestStars ?? 0;
  const byDiff = { ...(existing?.bestStarsByDifficulty ?? {}) };
  byDiff[difficulty] = Math.max(byDiff[difficulty] ?? 0, stars);
  save.levelProgress[levelId] = {
    bestStars: Math.max(prevBest, stars),
    completed: true,
    bestStarsByDifficulty: byDiff,
  };
  if (!existing?.completed) save.stats.levelsCompleted++;
}

export function getStars(save: SaveData, levelId: string): number {
  return save.levelProgress[levelId]?.bestStars ?? 0;
}

export function getStarsFor(save: SaveData, levelId: string, difficulty: Difficulty): number {
  return save.levelProgress[levelId]?.bestStarsByDifficulty?.[difficulty] ?? 0;
}

export function isCompleted(save: SaveData, levelId: string): boolean {
  return save.levelProgress[levelId]?.completed ?? false;
}

export function isUnlocked(save: SaveData, levels: readonly { id: string }[], levelId: string): boolean {
  const idx = levels.findIndex((l) => l.id === levelId);
  if (idx < 0) return false;
  if (idx === 0) return true;
  const prev = levels[idx - 1];
  return isCompleted(save, prev.id);
}

export function totalStars(save: SaveData): number {
  let s = 0;
  for (const k in save.levelProgress) s += save.levelProgress[k].bestStars;
  return s;
}

export function countCompleted(save: SaveData): number {
  let c = 0;
  for (const k in save.levelProgress) if (save.levelProgress[k].completed) c++;
  return c;
}
