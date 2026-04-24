export type Difficulty = 'normal' | 'hard' | 'heroic';

/** Tuple of which challenge stars the player has ever earned. */
export type ChallengeFlags = readonly [boolean, boolean, boolean];

export interface LevelProgress {
  bestStars: number;
  completed: boolean;
  bestStarsByDifficulty?: Partial<Record<Difficulty, number>>;
  /**
   * v2.3 A1: which of the 3 challenge stars has ever been earned on any run.
   * Independent from bestStars (which just counts true flags). Accumulates
   * across runs so players can earn stars one at a time.
   */
  challengeFlags?: ChallengeFlags;
  /** Per-difficulty challenge flags so each difficulty's 3 stars track separately. */
  challengeFlagsByDifficulty?: Partial<Record<Difficulty, ChallengeFlags>>;
}

export interface Settings {
  masterVolume: number;
  sfxVolume: number;
  bgmVolume: number;
  muted: boolean;
  difficulty: Difficulty;
  showFps: boolean;
  screenShake: boolean;
  /** v2.5.1 D2 — swap red/green damage/health hues to blue/yellow. */
  colorBlindMode?: boolean;
  /** v2.5.1 D2 — UI text scale multiplier (1.0 default, 1.2 for larger). */
  uiScale?: number;
  /** v2.5.1 D2 — disable particles, weather, screen shake, ember fx. */
  lowAnimation?: boolean;
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
  /**
   * v2.5 C1 — per-hero talent tree tiers. Shape: heroTalents[heroId][talentId] = tier (0..3).
   * Stars budget is derived from heroLevelWins[hero].length, spent on tier unlocks.
   */
  heroTalents?: Record<string, Record<string, number>>;
  /**
   * v2.6.0 B2 — trial completion tracking. Map of trial id → simple completion record.
   * Each trial only counts once for meta-star reward purposes (no double-dipping).
   */
  trialProgress?: Record<string, { completed: boolean; bestStars: number; firstClear?: number }>;
  /**
   * v2.6.0 B2 — bonus meta stars earned from clearing trials. Added to
   * the campaign-derived totalStars when computing availableStars.
   */
  metaStarBonus?: number;
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
    colorBlindMode: false,
    uiScale: 1.0,
    lowAnimation: false,
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
  // v2.3 A1 — backfill challengeFlags for levels completed before the new
  // system shipped. Trust old bestStars (if 3, assume flawless; else star 1 only).
  // This preserves the old "I got 3 stars on L1" feeling — no regression.
  for (const id in levelProgress) {
    const p = levelProgress[id];
    if (p.completed && !p.challengeFlags) {
      const fallbackFlags: ChallengeFlags = p.bestStars >= 3
        ? [true, true, true]
        : p.bestStars >= 2
          ? [true, true, false]
          : [true, false, false];
      p.challengeFlags = fallbackFlags;
    }
  }
  const out: SaveData = { version: 2, levelProgress, settings, achievements, stats };
  if (parsed.endlessHighScore) out.endlessHighScore = parsed.endlessHighScore;
  if (parsed.metaUpgrades) out.metaUpgrades = parsed.metaUpgrades;
  if (typeof parsed.selectedHero === 'string') out.selectedHero = parsed.selectedHero;
  if (parsed.heroLevelWins) out.heroLevelWins = parsed.heroLevelWins;
  if (parsed.heroTalents) out.heroTalents = parsed.heroTalents;
  if (parsed.trialProgress) out.trialProgress = parsed.trialProgress;
  if (typeof parsed.metaStarBonus === 'number') out.metaStarBonus = parsed.metaStarBonus;
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
  /** v2.3 A1: per-star boolean flags from this run; accumulates across runs. */
  newFlags?: ChallengeFlags,
): void {
  const existing = save.levelProgress[levelId];
  const prevBest = existing?.bestStars ?? 0;
  const byDiff = { ...(existing?.bestStarsByDifficulty ?? {}) };
  byDiff[difficulty] = Math.max(byDiff[difficulty] ?? 0, stars);

  // Accumulate star flags — once earned, kept forever. Separate tracking per
  // difficulty so higher-diff runs don't auto-credit easy-diff challenges.
  const prevFlags = existing?.challengeFlags ?? [false, false, false];
  const mergedAllDiff: ChallengeFlags = newFlags
    ? [
        prevFlags[0] || newFlags[0],
        prevFlags[1] || newFlags[1],
        prevFlags[2] || newFlags[2],
      ]
    : prevFlags;
  const flagsByDiff = { ...(existing?.challengeFlagsByDifficulty ?? {}) };
  if (newFlags) {
    const prevDiffFlags = flagsByDiff[difficulty] ?? [false, false, false];
    flagsByDiff[difficulty] = [
      prevDiffFlags[0] || newFlags[0],
      prevDiffFlags[1] || newFlags[1],
      prevDiffFlags[2] || newFlags[2],
    ];
  }

  save.levelProgress[levelId] = {
    bestStars: Math.max(prevBest, stars),
    completed: true,
    bestStarsByDifficulty: byDiff,
    challengeFlags: mergedAllDiff,
    challengeFlagsByDifficulty: flagsByDiff,
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
  // v2.6.0 B2 — trial bonus stars (granted on first clear of each trial).
  s += save.metaStarBonus ?? 0;
  return s;
}

export function countCompleted(save: SaveData): number {
  let c = 0;
  for (const k in save.levelProgress) if (save.levelProgress[k].completed) c++;
  return c;
}
