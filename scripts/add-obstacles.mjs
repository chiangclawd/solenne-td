#!/usr/bin/env node
/**
 * Deterministically add obstacles to each level.
 * - Per-world obstacle palette (trees for grass, barrels for industrial, etc.)
 * - Count scales with level world depth
 * - Avoids path tiles + keeps first 2 rows mostly clear (spawn area)
 */
import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'public', 'levels');
const GRID_COLS = 10;
const GRID_ROWS = 15;

const WORLD_OBSTACLES = {
  1: { kinds: ['tree', 'rock', 'ruin'], weights: [0.5, 0.35, 0.15], count: [5, 7] },
  2: { kinds: ['barrel', 'rock', 'ruin'], weights: [0.45, 0.35, 0.2], count: [6, 8] },
  3: { kinds: ['column', 'ruin', 'rock'], weights: [0.45, 0.35, 0.2], count: [7, 9] },
  4: { kinds: ['iceRock', 'deadTree', 'rock'], weights: [0.5, 0.35, 0.15], count: [7, 10] },
  5: { kinds: ['totem', 'crystal', 'rock'], weights: [0.4, 0.4, 0.2], count: [8, 11] },
};

// Seeded random
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pathTilesFromPath(pathArr) {
  const tiles = new Set();
  for (let i = 0; i < pathArr.length - 1; i++) {
    const a = pathArr[i];
    const b = pathArr[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const steps = Math.ceil(Math.hypot(dx, dy) * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = a.x + dx * t;
      const py = a.y + dy * t;
      const tx = Math.floor(px);
      const ty = Math.floor(py);
      // Mark a wider swath around the path so obstacles don't press against it
      for (let dx0 = -1; dx0 <= 1; dx0++) {
        for (let dy0 = -1; dy0 <= 1; dy0++) {
          tiles.add(`${tx + dx0},${ty + dy0}`);
        }
      }
    }
  }
  return tiles;
}

function pickKind(rand, kinds, weights) {
  const r = rand();
  let cum = 0;
  for (let i = 0; i < kinds.length; i++) {
    cum += weights[i];
    if (r < cum) return kinds[i];
  }
  return kinds[kinds.length - 1];
}

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort();
let report = [];
for (const f of files) {
  const p = path.join(DIR, f);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const cfg = WORLD_OBSTACLES[data.world];
  if (!cfg) continue;
  const blocked = pathTilesFromPath(data.path);
  // Seed by level id so obstacles are deterministic per level
  const seed = f.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0);
  const rand = mulberry32(Math.abs(seed));
  const count = cfg.count[0] + Math.floor(rand() * (cfg.count[1] - cfg.count[0] + 1));
  const obstacles = [];
  const used = new Set();
  let guard = 0;
  while (obstacles.length < count && guard < 200) {
    guard++;
    const tx = Math.floor(rand() * GRID_COLS);
    const ty = Math.floor(rand() * GRID_ROWS);
    const key = `${tx},${ty}`;
    if (blocked.has(key)) continue;
    if (used.has(key)) continue;
    // Keep top 1 and bottom 1 row mostly clear of obstacles (for entry/exit feel)
    if (ty < 1 || ty > GRID_ROWS - 2) continue;
    used.add(key);
    obstacles.push({ x: tx, y: ty, kind: pickKind(rand, cfg.kinds, cfg.weights) });
  }
  data.obstacles = obstacles;
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
  report.push(`${f}: +${obstacles.length} obstacles (${cfg.kinds.join('/')})`);
}
console.log(report.join('\n'));
console.log(`\n${files.length} levels updated`);
