#!/usr/bin/env node
/**
 * Expand every level JSON from 3 waves to 6 waves.
 * - Appends 3 "late-game" waves per level with escalating pressure
 * - Per-world enemy pools determine what new waves contain
 * - Starting gold/lives slightly boosted to afford 3 extra waves of towers/upgrades
 */
import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'public', 'levels');

// Enemy pool per world — later worlds include earlier enemies too
const POOLS = {
  1: { light: ['scout', 'soldier', 'runner'], ground: ['tank'], boss: ['boss'], plane: [] },
  2: { light: ['scout', 'soldier', 'runner'], ground: ['tank', 'armored', 'heavyTank'], boss: ['boss', 'armoredBoss'], plane: ['plane'] },
  3: { light: ['scout', 'soldier', 'runner'], ground: ['armored', 'heavyTank'], boss: ['boss', 'armoredBoss', 'finalBoss'], plane: ['plane'] },
  4: { light: ['scout', 'runner', 'frostRaider'], ground: ['iceBeast', 'heavyTank', 'armored'], boss: ['boss', 'glacialBoss', 'armoredBoss'], plane: ['plane'] },
  5: { light: ['runner', 'wraith', 'frostRaider'], ground: ['splitter', 'healer', 'iceBeast', 'heavyTank'], boss: ['boss', 'armoredBoss', 'voidBoss', 'finalBoss'], plane: ['plane'] },
};

/**
 * Build a wave entry with given enemy type and delay.
 */
function entry(enemy, delay) { return { delay, enemy }; }

/**
 * Generate wave 4/5/6 for a level based on world + difficulty index within world.
 * diffIdx: 0..N where 0 is first level in that world (easier extensions), N is last (hardest).
 */
function makeExtensionWaves(worldId, diffIdx) {
  const pool = POOLS[worldId];
  const mult = 1 + diffIdx * 0.12; // 1.00 → 1.48 across 5 levels
  const mulC = (n) => Math.max(1, Math.round(n * mult));

  // WAVE 4 — Reinforcement: larger volume, first mini-boss escalation
  const w4 = [];
  for (let i = 0; i < mulC(5); i++) w4.push(entry(pool.light[i % pool.light.length], 0.45));
  for (let i = 0; i < mulC(3); i++) w4.push(entry(pool.ground[0], 0.7));
  for (let i = 0; i < mulC(2); i++) w4.push(entry(pool.ground[Math.min(1, pool.ground.length - 1)], 0.7));
  if (pool.plane.length) {
    for (let i = 0; i < mulC(2); i++) w4.push(entry(pool.plane[0], 0.8));
  }
  w4.push(entry(pool.boss[0], 1.4));
  if (diffIdx >= 2) w4.push(entry(pool.boss[Math.min(1, pool.boss.length - 1)], 1.4));

  // WAVE 5 — Heavy Assault: aggressive density + double boss
  const w5 = [];
  for (let i = 0; i < mulC(4); i++) w5.push(entry(pool.light[i % pool.light.length], 0.4));
  for (let i = 0; i < mulC(4); i++) w5.push(entry(pool.ground[Math.min(1, pool.ground.length - 1)], 0.6));
  for (let i = 0; i < mulC(3); i++) w5.push(entry(pool.ground[Math.min(2, pool.ground.length - 1)], 0.7));
  if (pool.plane.length) {
    for (let i = 0; i < mulC(3); i++) w5.push(entry(pool.plane[0], 0.7));
  }
  w5.push(entry(pool.boss[0], 1.3));
  w5.push(entry(pool.boss[Math.min(1, pool.boss.length - 1)], 1.5));
  if (diffIdx >= 3) w5.push(entry(pool.boss[Math.min(2, pool.boss.length - 1)], 1.5));

  // WAVE 6 — Final Stand: chaos + apex bosses
  const w6 = [];
  // Heavy boss open
  w6.push(entry(pool.boss[Math.min(1, pool.boss.length - 1)], 1.2));
  if (pool.boss.length >= 3) w6.push(entry(pool.boss[2], 1.4));
  // Swarm chaos
  for (let i = 0; i < mulC(7); i++) w6.push(entry(pool.light[i % pool.light.length], 0.35));
  for (let i = 0; i < mulC(5); i++) w6.push(entry(pool.ground[i % pool.ground.length], 0.55));
  if (pool.plane.length) {
    for (let i = 0; i < mulC(4); i++) w6.push(entry(pool.plane[0], 0.6));
  }
  // Closing apex bosses
  w6.push(entry(pool.boss[Math.min(1, pool.boss.length - 1)], 2.0));
  w6.push(entry(pool.boss[pool.boss.length - 1], 2.2));

  return [w4, w5, w6];
}

// Group levels by world and get index within world
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort();
const levels = files.map(f => ({ f, data: JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) }));
const byWorld = {};
for (const L of levels) {
  (byWorld[L.data.world] = byWorld[L.data.world] || []).push(L);
}

let totalAdded = 0;
let report = [];
for (const worldId of [1, 2, 3, 4, 5]) {
  const lvs = byWorld[worldId] || [];
  lvs.forEach((L, idx) => {
    // If already has 6+ waves, skip
    if (L.data.waves.length >= 6) {
      report.push(`${L.f}: SKIP (${L.data.waves.length} waves already)`);
      return;
    }
    const extras = makeExtensionWaves(worldId, idx);
    const before = L.data.waves.length;
    L.data.waves = [...L.data.waves, ...extras];
    // Small economy boost to afford longer defence
    if (typeof L.data.startingGold === 'number') L.data.startingGold += 40;
    if (typeof L.data.startingLives === 'number') L.data.startingLives += 2;
    fs.writeFileSync(path.join(DIR, L.f), JSON.stringify(L.data, null, 2) + '\n');
    totalAdded += (L.data.waves.length - before);
    report.push(`${L.f}: ${before} → ${L.data.waves.length} waves (gold +40, lives +2)`);
  });
}

console.log(report.join('\n'));
console.log(`\nTotal waves added: ${totalAdded}`);
