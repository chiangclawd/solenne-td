#!/usr/bin/env node
/**
 * v2.2 Difficulty uplift — tightens the campaign without touching
 * DIFF_MOD (which is a code-side multiplier handled in GameScene.ts).
 *
 * Passes applied to each level JSON:
 *   1. Starting gold: L1–L15 trimmed by 15–25 gold (floor 150).
 *   2. Starting lives: L1–L18 lose 1 life (floor 12 on W1, 10 on W2+).
 *   3. Wave density (L5–L18):
 *        - Non-boss delays × 0.9  (tighter spawn cadence)
 *        - Any wave with ≥ 6 non-boss entries gets +1 filler (alternates
 *          through the existing light-enemy list in that wave).
 *   4. Boss delays untouched — bosses still telegraph.
 *
 * Re-runnable. Reports a per-level diff so rebalance can be audited.
 */
import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'public', 'levels');

const BOSS_KEYWORDS = [
  'boss', 'Boss',
  'finalBoss', 'armoredBoss', 'glacialBoss', 'voidBoss', 'abyssalBoss',
];
const isBoss = (name) =>
  BOSS_KEYWORDS.some((b) => name === b || name.toLowerCase().includes('boss'));

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
const report = [];

for (const f of files) {
  const full = path.join(DIR, f);
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  const idMatch = /level-(\d+)/.exec(f);
  if (!idMatch) continue;
  const levelNum = parseInt(idMatch[1], 10);
  const notes = [];

  // (1) Starting gold nerf on L1–L15
  if (levelNum <= 15 && typeof data.startingGold === 'number') {
    const before = data.startingGold;
    const cut = levelNum <= 5 ? 20 : levelNum <= 10 ? 25 : 15;
    const after = Math.max(150, before - cut);
    if (after !== before) {
      data.startingGold = after;
      notes.push(`gold ${before}→${after}`);
    }
  }

  // (2) Starting lives nerf on L1–L18 (never raise — only trim by 1, respecting
  // a floor so we don't drop below a playable threshold).
  if (levelNum <= 18 && typeof data.startingLives === 'number') {
    const before = data.startingLives;
    const world = data.world ?? 1;
    const floor = world === 1 ? 12 : 10;
    const candidate = before - 1;
    if (candidate >= floor && candidate < before) {
      data.startingLives = candidate;
      notes.push(`lives ${before}→${candidate}`);
    }
  }

  // (3) Wave density on L5–L18
  if (levelNum >= 5 && levelNum <= 18 && Array.isArray(data.waves)) {
    let tightened = 0;
    let filled = 0;
    for (const wave of data.waves) {
      if (!Array.isArray(wave)) continue;

      // 3a — tighten non-boss delays by 10%
      for (const w of wave) {
        if (!w || typeof w.delay !== 'number') continue;
        if (isBoss(w.enemy || '')) continue;
        const b = w.delay;
        const a = Math.round(b * 0.9 * 100) / 100;
        if (a < b) { w.delay = a; tightened++; }
      }

      // 3b — add +1 filler to dense waves
      const nonBoss = wave.filter((w) => !isBoss(w.enemy || ''));
      if (nonBoss.length >= 6) {
        // Pick a light enemy to duplicate — prefer the first non-boss in the wave
        // with the tightest delay so the filler blends into the push.
        const pick = [...nonBoss].sort((a, b) => (a.delay ?? 1) - (b.delay ?? 1))[0];
        if (pick) {
          // Insert after index of pick — keeps the "burst" feeling local
          const insertAt = wave.indexOf(pick) + 1;
          wave.splice(insertAt, 0, { delay: pick.delay, enemy: pick.enemy });
          filled++;
        }
      }
    }
    if (tightened > 0) notes.push(`tightened ${tightened} delays`);
    if (filled > 0) notes.push(`+${filled} filler enemies`);
  }

  if (notes.length > 0) {
    fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n');
    report.push(`${f}: ${notes.join(', ')}`);
  }
}

console.log(report.join('\n'));
console.log(`\n${report.length} level(s) modified.`);
