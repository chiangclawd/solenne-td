#!/usr/bin/env node
/**
 * v2.6.2 — extend wave counts to 6/8/10/12/15 per chapter index.
 *
 * Pattern (5-level chapters W1, W2, W4, W5, W6):
 *   idx 1 → 6 waves   (intro)
 *   idx 2 → 8 waves
 *   idx 3 → 10 waves
 *   idx 4 → 12 waves
 *   idx 5 → 15 waves  (finale)
 *
 * W3 has 3 levels — apply later half of the curve: 8 / 12 / 15.
 *
 * Also enforces a balance rule on EVERY wave (existing + generated):
 * each path must have ≥ 3 enemies. Thin waves get filler light enemies
 * appended to their underrepresented paths.
 *
 * Re-runnable. Generated waves only append to the END of existing waves.
 */
import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'public', 'levels');

const TARGET_BY_CHAPTER = {
  1: [6, 8, 10, 12, 15],
  2: [6, 8, 10, 12, 15],
  3: [8, 12, 15],
  4: [6, 8, 10, 12, 15],
  5: [6, 8, 10, 12, 15],
  6: [6, 8, 10, 12, 15],
};

// Per-world enemy pools used to generate new waves.
const POOLS = {
  1: { light: ['scout', 'soldier', 'runner'], ground: ['tank', 'armored', 'heavyTank'], boss: ['boss', 'armoredBoss'], plane: [] },
  2: { light: ['scout', 'soldier', 'runner'], ground: ['tank', 'armored', 'heavyTank'], boss: ['boss', 'armoredBoss'], plane: ['plane'] },
  3: { light: ['scout', 'soldier', 'runner'], ground: ['armored', 'heavyTank'], boss: ['boss', 'armoredBoss', 'finalBoss'], plane: ['plane'] },
  4: { light: ['scout', 'runner', 'frostRaider'], ground: ['iceBeast', 'heavyTank', 'armored'], boss: ['boss', 'glacialBoss', 'armoredBoss'], plane: ['plane'] },
  5: { light: ['runner', 'wraith', 'frostRaider'], ground: ['splitter', 'healer', 'iceBeast', 'heavyTank'], boss: ['boss', 'armoredBoss', 'voidBoss', 'finalBoss'], plane: ['plane'] },
  6: { light: ['runner', 'wraith', 'swimmerShoal'], ground: ['tentacle', 'splitter', 'heavyTank'], boss: ['boss', 'voidBoss', 'abyssalBoss', 'finalBoss'], plane: ['plane'] },
};

const E = (delay, enemy, pathIdx) => {
  const o = { delay, enemy };
  if (pathIdx !== undefined && pathIdx > 0) o.path = pathIdx;
  return o;
};

/**
 * Generate one wave with given total enemy count, path count, and intensity (0..1).
 * Higher intensity = more bosses + tighter delays + tougher ground units.
 */
function makeWave(world, totalEnemies, pathCount, intensity) {
  const pool = POOLS[world] ?? POOLS[1];
  const wave = [];
  // Boss count grows with intensity
  const bossCount = intensity >= 0.85 ? 3 : intensity >= 0.6 ? 2 : intensity >= 0.35 ? 1 : 0;
  const groundCount = Math.max(2, Math.round(totalEnemies * (0.30 + intensity * 0.20)));
  const planeCount = pool.plane.length > 0 && intensity >= 0.4 ? Math.max(1, Math.round(totalEnemies * 0.15)) : 0;
  const lightCount = Math.max(0, totalEnemies - groundCount - planeCount - bossCount);

  // Distribute lights across all paths (round-robin)
  for (let i = 0; i < lightCount; i++) {
    const enemy = pool.light[i % pool.light.length];
    const delay = 0.5 - intensity * 0.25;  // 0.50 → 0.25
    wave.push(E(roundDelay(delay), enemy, i % pathCount));
  }
  // Ground units biased to path 0
  for (let i = 0; i < groundCount; i++) {
    const enemy = pool.ground[Math.min(i, pool.ground.length - 1)];
    const delay = 0.7 - intensity * 0.25;
    wave.push(E(roundDelay(delay), enemy, i % pathCount));
  }
  // Planes
  for (let i = 0; i < planeCount; i++) {
    const delay = 0.95 - intensity * 0.20;
    wave.push(E(roundDelay(delay), pool.plane[0], (i + 1) % pathCount));
  }
  // Bosses — apex first if highest intensity, otherwise basic boss
  for (let i = 0; i < bossCount; i++) {
    const tier = Math.min(pool.boss.length - 1, Math.floor(intensity * pool.boss.length) - 1 + i);
    const enemy = pool.boss[Math.max(0, tier)];
    const delay = 1.7 - intensity * 0.35;
    wave.push(E(roundDelay(delay), enemy, i % pathCount));
  }
  return wave;
}

const roundDelay = (n) => Math.round(n * 100) / 100;

/**
 * Ensure every path in `wave` has ≥ minPerPath entries by appending
 * light filler enemies to under-represented paths. Mutates `wave`.
 */
function balancePaths(wave, pathCount, world, minPerPath = 3) {
  if (pathCount <= 1) return;
  const pool = POOLS[world] ?? POOLS[1];
  const counts = new Array(pathCount).fill(0);
  for (const e of wave) counts[e.path ?? 0]++;
  for (let p = 0; p < pathCount; p++) {
    while (counts[p] < minPerPath) {
      const filler = pool.light[counts[p] % pool.light.length];
      // Insert filler near the start of the wave so it spawns early
      wave.unshift(E(0.45, filler, p));
      counts[p]++;
    }
  }
}

function chapterIdx(world, levelId, byWorld) {
  return byWorld[world].indexOf(levelId);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
const byWorld = {};
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  (byWorld[d.world] = byWorld[d.world] || []).push(f);
}

const report = [];
for (const f of files) {
  const file = path.join(DIR, f);
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const idx = chapterIdx(d.world, f, byWorld);
  const targetWaves = TARGET_BY_CHAPTER[d.world]?.[idx];
  if (!targetWaves) {
    report.push(`${f}: SKIP (no target for W${d.world} idx ${idx})`);
    continue;
  }
  const before = d.waves.length;
  const pathCount = d.paths.length;
  let added = 0;
  let balanced = 0;

  // 1. Balance every existing wave
  for (const wv of d.waves) {
    const beforeLen = wv.length;
    balancePaths(wv, pathCount, d.world);
    if (wv.length > beforeLen) balanced += wv.length - beforeLen;
  }

  // 2. Append generated waves to reach target
  while (d.waves.length < targetWaves) {
    const waveIdx = d.waves.length; // 0-indexed
    // Intensity scales linearly from current → 1.0 at the last wave
    const intensity = Math.min(1.0, 0.55 + (waveIdx / (targetWaves - 1)) * 0.45);
    const enemyCount = Math.round(10 + waveIdx * 2.2);
    const wave = makeWave(d.world, enemyCount, pathCount, intensity);
    balancePaths(wave, pathCount, d.world);
    d.waves.push(wave);
    added++;
  }

  if (added > 0 || balanced > 0) {
    fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
    report.push(`${f}: ${before} → ${d.waves.length} waves (${added} new, ${balanced} balance fillers)`);
  } else {
    report.push(`${f}: already at ${d.waves.length} waves`);
  }
}

console.log(report.join('\n'));
