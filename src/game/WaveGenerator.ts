import type { WaveData } from './Level.ts';

interface EnemyPoolEntry {
  id: string;
  cost: number;
  minWave: number;
}

// Threat cost per enemy. Used by budget algorithm.
const POOL: readonly EnemyPoolEntry[] = [
  { id: 'scout', cost: 8, minWave: 1 },
  { id: 'soldier', cost: 15, minWave: 1 },
  { id: 'runner', cost: 22, minWave: 2 },
  { id: 'tank', cost: 32, minWave: 3 },
  { id: 'armored', cost: 55, minWave: 5 },
  { id: 'plane', cost: 30, minWave: 4 },
  { id: 'heavyTank', cost: 85, minWave: 7 },
  { id: 'frostRaider', cost: 26, minWave: 6 },
  { id: 'iceBeast', cost: 70, minWave: 9 },
  { id: 'wraith', cost: 45, minWave: 10 },
  { id: 'splitter', cost: 90, minWave: 12 },
  { id: 'healer', cost: 65, minWave: 14 },
  { id: 'boss', cost: 110, minWave: 5 },
  { id: 'armoredBoss', cost: 180, minWave: 10 },
  { id: 'glacialBoss', cost: 260, minWave: 15 },
  { id: 'voidBoss', cost: 400, minWave: 20 },
  { id: 'finalBoss', cost: 320, minWave: 17 },
];

export function generateEndlessWave(waveNumber: number): WaveData {
  // Budget grows linearly. Wave 1 ≈ 120, Wave 30 ≈ ~2000
  const budget = 100 + waveNumber * 60 + Math.floor(waveNumber * waveNumber * 1.8);
  const available = POOL.filter((e) => waveNumber >= e.minWave);
  const entries: { delay: number; enemy: string }[] = [];

  let remaining = budget;
  let guard = 0;
  while (remaining > 0 && guard < 60) {
    guard++;
    // Pick a random entry we can afford — bias toward tier-appropriate ones
    const affordable = available.filter((e) => e.cost <= remaining + 20);
    if (affordable.length === 0) break;
    // Weight: prefer higher-tier for later waves
    const weights = affordable.map((e) => {
      const tierFit = 1 - Math.abs(e.minWave - waveNumber) / 20;
      return Math.max(0.1, tierFit);
    });
    const sumW = weights.reduce((a, b) => a + b, 0);
    let pick = Math.random() * sumW;
    let chosen = affordable[0];
    for (let i = 0; i < affordable.length; i++) {
      pick -= weights[i];
      if (pick <= 0) { chosen = affordable[i]; break; }
    }
    const burstCount = chosen.cost > 200 ? 1 : chosen.cost > 80 ? 2 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 3);
    const delay = chosen.cost > 200 ? 1.5 : chosen.cost > 80 ? 0.7 + Math.random() * 0.3 : 0.4 + Math.random() * 0.3;
    for (let i = 0; i < burstCount && remaining >= chosen.cost; i++) {
      entries.push({ delay, enemy: chosen.id });
      remaining -= chosen.cost;
    }
  }

  // Shuffle entries slightly to mix enemy types but keep structure
  for (let i = entries.length - 1; i > 1; i--) {
    if (Math.random() < 0.35) {
      const j = Math.floor(Math.random() * i);
      const tmp = entries[i]; entries[i] = entries[j]; entries[j] = tmp;
    }
  }

  return entries;
}

export function generateEndlessLevel(): import('./Level.ts').LevelData {
  return {
    id: 'endless',
    name: '無盡挑戰',
    world: 0,
    flavorText: '虛空不會停。你能守多久？',
    endless: true,
    paths: [
      [
        { x: -0.5, y: 2 },
        { x: 5, y: 2 },
        { x: 5, y: 5 },
        { x: 2, y: 5 },
        { x: 2, y: 8 },
        { x: 8, y: 8 },
        { x: 8, y: 11 },
        { x: 3, y: 11 },
        { x: 3, y: 13 },
        { x: 9, y: 13 },
        { x: 9, y: 15.5 },
      ],
    ],
    startingGold: 280,
    startingLives: 15,
    availableTowers: [
      'cannon', 'quickShot', 'machineGun', 'frostTower',
      'sniper', 'missileLauncher', 'heavyCannon',
      'tesla', 'lightTower',
    ],
    waves: [],
    intro: [
      { speaker: '旁白', text: '虛空沒有邊界。你守住的每一波，都會讓下一波更強。', color: '#c878ff' },
      { speaker: '基蘭指揮官', text: '別追高分。活下來就是贏。', color: '#5eb8ff' },
    ],
  };
}
