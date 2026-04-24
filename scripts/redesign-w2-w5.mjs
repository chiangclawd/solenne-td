#!/usr/bin/env node
/**
 * v2.2.3 Chapter redesign — W2 (L6–L10), W3 (L11–L13), W4 (L14–L18),
 * W5 (L19–L23). Each level gets a structural strategic hook (multi-path,
 * destructible economy, or battlefield split) beyond just path-shape change.
 *
 * Preserves intro/outroWin/outroLose/name/flavor/availableTowers from each
 * existing JSON. Replaces paths, obstacles, startingGold, startingLives,
 * waves per the DESIGNS table below.
 *
 * Re-runnable. Running again applies the latest DESIGNS.
 */
import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'public', 'levels');

// Short helpers so the DESIGNS table stays legible.
const p = (x, y) => ({ x, y });
const path1 = (...pts) => pts;

// Wave entry constructors — concise per-enemy builders.
const S  = (delay, path = 0) => ({ delay, enemy: 'scout', path });
const SO = (delay, path = 0) => ({ delay, enemy: 'soldier', path });
const R  = (delay, path = 0) => ({ delay, enemy: 'runner', path });
const T  = (delay, path = 0) => ({ delay, enemy: 'tank', path });
const A  = (delay, path = 0) => ({ delay, enemy: 'armored', path });
const HT = (delay, path = 0) => ({ delay, enemy: 'heavyTank', path });
const PL = (delay, path = 0) => ({ delay, enemy: 'plane', path });
const B  = (delay, path = 0) => ({ delay, enemy: 'boss', path });
const AB = (delay, path = 0) => ({ delay, enemy: 'armoredBoss', path });
const FB = (delay, path = 0) => ({ delay, enemy: 'finalBoss', path });
const FR = (delay, path = 0) => ({ delay, enemy: 'frostRaider', path });
const IB = (delay, path = 0) => ({ delay, enemy: 'iceBeast', path });
const GB = (delay, path = 0) => ({ delay, enemy: 'glacialBoss', path });
const WR = (delay, path = 0) => ({ delay, enemy: 'wraith', path });
const SP = (delay, path = 0) => ({ delay, enemy: 'splitter', path });
const HL = (delay, path = 0) => ({ delay, enemy: 'healer', path });
const VB = (delay, path = 0) => ({ delay, enemy: 'voidBoss', path });

// Destructible obstacle quick-builder (kind + hp + reward)
const Destr = (x, y, kind, hp, reward) => ({ x, y, kind, destructible: true, hp, reward });
const Ob = (x, y, kind) => ({ x, y, kind });

// Strip path 0 tagging from single-path wave entries to keep JSON compact.
function cleanPaths(waves, pathCount) {
  return waves.map(w => w.map(e => {
    if (pathCount <= 1 && e.path === 0) {
      const { path: _, ...rest } = e;
      return rest;
    }
    return e;
  }));
}

const DESIGNS = {
  // ========== World 2 — Industrial (L6–L10) ==========
  // Theme: factories, pipes, fuel depots, planes joining infantry.
  // Design axis escalation: destructibles → multi-path → central depot →
  // converging paths → mining battlefield.

  // L6 鍛鐵城郊 — Industrial entry. Single winding path, destructible
  // barrel cluster on outside bend to teach economy at a slower pace.
  // Plane intro (1 in wave 3, 2 in wave 5).
  'level-06': {
    startingGold: 180, startingLives: 13,
    paths: [path1(p(2, -0.5), p(2, 4), p(8, 4), p(8, 9), p(3, 9), p(3, 13), p(8, 13), p(8, 15.5))],
    waves: [
      [SO(0.7), SO(0.7), SO(0.7), SO(0.7), SO(0.7), SO(0.7), T(0.9), T(0.9), T(0.9)],
      [S(0.5), S(0.5), S(0.5), R(0.5), R(0.5), R(0.5), T(0.8), T(0.8), A(0.85), A(0.85)],
      [R(0.45), R(0.45), SO(0.45), SO(0.45), T(0.7), T(0.7), A(0.8), A(0.8), HT(0.85), PL(1.1), B(1.5)],
      [S(0.4), SO(0.4), R(0.4), SO(0.4), S(0.4), T(0.6), T(0.6), A(0.7), A(0.7), HT(0.85), HT(0.85), B(1.4)],
      [S(0.35), R(0.35), SO(0.35), S(0.35), R(0.35), T(0.55), T(0.55), A(0.6), A(0.6), HT(0.75), HT(0.75), PL(1.1), PL(1.1), B(1.4), B(1.5)],
      [B(1.0), S(0.3), SO(0.3), R(0.3), S(0.3), SO(0.3), R(0.3), S(0.3), T(0.5), T(0.5), A(0.55), A(0.55), HT(0.65), HT(0.65), PL(1.0), PL(1.0), B(1.8), AB(2.1)],
    ],
    obstacles: [
      Destr(5, 2, 'barrel', 32, 10), Destr(6, 2, 'barrel', 32, 10),
      Destr(5, 6, 'barrel', 32, 10), Destr(1, 6, 'ruin', 40, 14),
      Destr(5, 11, 'ruin', 40, 14),
      Ob(0, 0, 'rock'), Ob(9, 0, 'rock'), Ob(0, 14, 'ruin'),
    ],
  },

  // L7 鐵軌之夜 — keep dual-path heritage. Fresh path shapes so both
  // lanes force different tower choices.
  //   path 0 (west, slow heavy — armored train track)
  //   path 1 (east express — scout rush lane)
  // Destructibles between tracks give cross-fire opportunity.
  'level-07': {
    startingGold: 195, startingLives: 12,
    paths: [
      path1(p(2, -0.5), p(2, 3), p(2, 8), p(5, 8), p(5, 12), p(2, 12), p(2, 15.5)),
      path1(p(8, -0.5), p(8, 12), p(5, 12), p(5, 15.5)),
    ],
    waves: [
      [SO(0.7, 0), SO(0.7, 0), SO(0.7, 0), SO(0.7, 0), SO(0.7, 0),
       S(0.4, 1), S(0.4, 1), S(0.4, 1), S(0.4, 1)],
      [T(0.8, 0), T(0.8, 0), T(0.8, 0), T(0.8, 0),
       R(0.4, 1), R(0.4, 1), R(0.4, 1), R(0.4, 1), S(0.4, 1), S(0.4, 1)],
      [A(0.7, 0), A(0.7, 0), HT(0.85, 0), HT(0.85, 0),
       R(0.35, 1), R(0.35, 1), R(0.35, 1), R(0.35, 1), S(0.35, 1), SO(0.45, 1),
       PL(1.1, 1), B(1.5, 0)],
      [T(0.55, 0), T(0.55, 0), A(0.7, 0), A(0.7, 0), HT(0.8, 0), HT(0.8, 0),
       S(0.3, 1), S(0.3, 1), R(0.3, 1), R(0.3, 1), R(0.3, 1), S(0.3, 1),
       PL(1.0, 1), B(1.4, 0)],
      [A(0.6, 0), A(0.6, 0), HT(0.7, 0), HT(0.7, 0), HT(0.7, 0),
       R(0.28, 1), R(0.28, 1), S(0.28, 1), R(0.28, 1), S(0.28, 1), R(0.28, 1),
       PL(0.9, 1), PL(0.9, 1), B(1.3, 0), B(1.5, 1)],
      [AB(1.0, 0), PL(0.9, 1),
       HT(0.5, 0), HT(0.5, 0), A(0.5, 0), A(0.5, 0), A(0.5, 0),
       S(0.25, 1), R(0.25, 1), S(0.25, 1), R(0.25, 1), S(0.25, 1), R(0.25, 1), S(0.25, 1), R(0.25, 1),
       PL(0.9, 1), PL(0.9, 1), B(1.8, 0), AB(2.0, 1)],
    ],
    obstacles: [
      Destr(4, 5, 'barrel', 32, 10), Destr(5, 5, 'rock', 45, 14), Destr(6, 5, 'barrel', 32, 10),
      Destr(4, 10, 'ruin', 38, 12), Destr(6, 10, 'ruin', 38, 12),
      Ob(0, 1, 'rock'), Ob(9, 1, 'tree'), Ob(0, 14, 'ruin'), Ob(9, 14, 'rock'),
    ],
  },

  // L8 南境煉油廠 — Fuel depot centerpiece. Single looping path around a
  // 6-barrel cluster in the middle. Breaking = big gold (~60) + prime angles.
  // Wave spike: plane waves + armored heavies force anti-air + armor mix.
  'level-08': {
    startingGold: 200, startingLives: 12,
    paths: [path1(p(1, -0.5), p(1, 3), p(9, 3), p(9, 12), p(1, 12), p(1, 15.5))],
    waves: [
      [S(0.55), S(0.55), S(0.55), SO(0.55), SO(0.55), R(0.55), R(0.55),
       T(0.7), T(0.7), PL(1.0)],
      [R(0.5), R(0.5), R(0.5), R(0.5), SO(0.5), SO(0.5),
       T(0.65), T(0.65), A(0.75), A(0.75), PL(0.9)],
      [S(0.45), S(0.45), SO(0.45), R(0.45), R(0.45), T(0.6), T(0.6),
       A(0.7), A(0.7), HT(0.8), HT(0.8), PL(1.0), B(1.4)],
      [R(0.4), R(0.4), R(0.4), SO(0.4), S(0.4),
       A(0.55), A(0.55), A(0.55), HT(0.7), HT(0.7), PL(0.9), PL(0.9), B(1.3), B(1.5)],
      [B(1.0),
       S(0.35), R(0.35), S(0.35), R(0.35), S(0.35), SO(0.35),
       A(0.5), A(0.5), HT(0.6), HT(0.6), HT(0.6), PL(0.85), PL(0.85), PL(0.85),
       B(1.6), AB(1.8)],
      [AB(0.9),
       R(0.3), S(0.3), R(0.3), SO(0.3), S(0.3), R(0.3), SO(0.3), S(0.3),
       A(0.45), A(0.45), HT(0.55), HT(0.55), HT(0.55), HT(0.55),
       PL(0.8), PL(0.8), PL(0.8), B(1.8), AB(2.1)],
    ],
    obstacles: [
      Destr(4, 6, 'barrel', 30, 10), Destr(5, 6, 'barrel', 30, 10), Destr(6, 6, 'barrel', 30, 10),
      Destr(4, 9, 'barrel', 30, 10), Destr(5, 9, 'barrel', 30, 10), Destr(6, 9, 'barrel', 30, 10),
      Destr(5, 7, 'ruin', 45, 16),
      Ob(0, 6, 'rock'), Ob(9, 6, 'rock'), Ob(0, 10, 'ruin'),
    ],
  },

  // L9 港灣運河 — NEW multi-path. Canal side (slow) + dock side (fast),
  // converging at port chokepoint. Barrel clusters frame the choke.
  'level-09': {
    startingGold: 200, startingLives: 11,
    paths: [
      path1(p(1, -0.5), p(1, 5), p(4, 5), p(4, 10), p(5, 10), p(5, 15.5)),
      path1(p(9, -0.5), p(9, 10), p(5, 10), p(5, 15.5)),
    ],
    waves: [
      [T(0.75, 0), T(0.75, 0), T(0.75, 0), T(0.75, 0),
       S(0.4, 1), S(0.4, 1), S(0.4, 1), S(0.4, 1), S(0.4, 1), S(0.4, 1)],
      [A(0.7, 0), A(0.7, 0), HT(0.85, 0),
       R(0.38, 1), R(0.38, 1), R(0.38, 1), R(0.38, 1), S(0.38, 1), S(0.38, 1), SO(0.5, 1)],
      [HT(0.7, 0), HT(0.7, 0), A(0.7, 0), A(0.7, 0),
       R(0.32, 1), R(0.32, 1), R(0.32, 1), S(0.32, 1), S(0.32, 1), S(0.32, 1),
       PL(1.0, 1), B(1.5, 0)],
      [A(0.55, 0), A(0.55, 0), HT(0.7, 0), HT(0.7, 0), HT(0.7, 0),
       S(0.28, 1), R(0.28, 1), S(0.28, 1), R(0.28, 1), S(0.28, 1),
       PL(0.9, 1), PL(0.9, 1), B(1.3, 0)],
      [AB(0.9, 0),
       HT(0.5, 0), HT(0.5, 0), A(0.5, 0), A(0.5, 0),
       R(0.26, 1), S(0.26, 1), R(0.26, 1), S(0.26, 1), R(0.26, 1), S(0.26, 1),
       PL(0.85, 1), PL(0.85, 1), B(1.7, 1)],
      [AB(0.9, 0), B(1.0, 1),
       HT(0.45, 0), HT(0.45, 0), A(0.45, 0), A(0.45, 0), A(0.45, 0),
       R(0.22, 1), S(0.22, 1), R(0.22, 1), S(0.22, 1), R(0.22, 1), S(0.22, 1), R(0.22, 1), S(0.22, 1),
       PL(0.8, 1), PL(0.8, 1), PL(0.8, 1),
       B(1.8, 0), AB(2.0, 1)],
    ],
    obstacles: [
      Destr(3, 2, 'barrel', 32, 10), Destr(7, 2, 'barrel', 32, 10),
      Destr(5, 8, 'ruin', 42, 14), Destr(3, 12, 'barrel', 32, 10), Destr(7, 12, 'barrel', 32, 10),
      Ob(0, 1, 'rock'), Ob(9, 3, 'rock'), Ob(0, 13, 'ruin'),
    ],
  },

  // L10 索陽石礦坑 — W2 finale. Serpentine single path with two horizontal
  // destructible rock walls splitting the map into terraces. W1 L4 style but
  // harder: more HP per rock, higher reward, planes force anti-air tiering.
  'level-10': {
    startingGold: 220, startingLives: 11,
    paths: [path1(p(5, -0.5), p(5, 2), p(9, 2), p(9, 7), p(0, 7), p(0, 12), p(9, 12), p(9, 15.5))],
    waves: [
      [SO(0.55), SO(0.55), SO(0.55), R(0.55), R(0.55),
       T(0.75), T(0.75), A(0.85), A(0.85), PL(1.0)],
      [R(0.45), R(0.45), R(0.45), S(0.45), S(0.45), S(0.45),
       T(0.65), T(0.65), A(0.75), A(0.75), HT(0.85)],
      [S(0.4), R(0.4), S(0.4), R(0.4), SO(0.4),
       T(0.55), T(0.55), A(0.65), A(0.65), HT(0.75), HT(0.75),
       PL(0.95), B(1.4)],
      [R(0.35), S(0.35), R(0.35), SO(0.35), S(0.35),
       A(0.5), A(0.5), A(0.5), HT(0.6), HT(0.6), HT(0.6),
       PL(0.9), PL(0.9), B(1.3), B(1.5)],
      [B(1.0),
       S(0.3), R(0.3), SO(0.3), S(0.3), R(0.3), SO(0.3), S(0.3),
       A(0.45), A(0.45), HT(0.55), HT(0.55), HT(0.55),
       PL(0.85), PL(0.85), PL(0.85), B(1.5), AB(1.8)],
      [AB(0.9), B(1.1),
       R(0.28), S(0.28), R(0.28), SO(0.28), R(0.28), S(0.28), R(0.28), S(0.28),
       A(0.4), A(0.4), HT(0.5), HT(0.5), HT(0.5), HT(0.5),
       PL(0.75), PL(0.75), PL(0.75), B(1.8), AB(2.1)],
    ],
    obstacles: [
      // Upper terrace wall y=5 (gap at x=9 where path passes)
      Destr(1, 5, 'rock', 45, 14), Destr(2, 5, 'rock', 45, 14), Destr(4, 5, 'ruin', 38, 12),
      Destr(6, 5, 'ruin', 38, 12), Destr(7, 5, 'rock', 45, 14),
      // Lower terrace wall y=10 (gap at x=0 where path passes)
      Destr(2, 10, 'barrel', 30, 10), Destr(4, 10, 'rock', 45, 14), Destr(5, 10, 'ruin', 38, 12),
      Destr(7, 10, 'barrel', 30, 10), Destr(8, 10, 'rock', 45, 14),
      Ob(2, 0, 'tree'), Ob(7, 14, 'rock'),
    ],
  },

  // ========== World 3 — Capital (L11–L13) ==========
  // Theme: palace, columns, marble. Ceremonial width.

  // L11 石燈大街 — grand boulevard. TWO entries converge at the palace
  // plaza, then single exit. Column obstacles (non-destructible) force
  // tower placement on sidewalks. Central ruin destructibles open the plaza.
  'level-11': {
    startingGold: 210, startingLives: 11,
    paths: [
      path1(p(1, -0.5), p(1, 5), p(5, 5), p(5, 10), p(5, 15.5)),
      path1(p(9, -0.5), p(9, 5), p(5, 5), p(5, 10), p(5, 15.5)),
    ],
    waves: [
      [S(0.45, 0), S(0.45, 0), SO(0.55, 0), SO(0.55, 0), R(0.5, 0),
       S(0.4, 1), S(0.4, 1), R(0.4, 1), R(0.4, 1), SO(0.5, 1),
       T(0.8, 0), T(0.8, 0)],
      [T(0.7, 0), T(0.7, 0), A(0.8, 0), A(0.8, 0), HT(0.9, 0),
       R(0.35, 1), R(0.35, 1), R(0.35, 1), S(0.35, 1), S(0.35, 1)],
      [HT(0.65, 0), HT(0.65, 0), A(0.7, 0), A(0.7, 0),
       S(0.3, 1), R(0.3, 1), S(0.3, 1), R(0.3, 1), S(0.3, 1), SO(0.4, 1),
       PL(1.0, 1), B(1.4, 0)],
      [A(0.55, 0), A(0.55, 0), HT(0.65, 0), HT(0.65, 0), HT(0.65, 0),
       R(0.3, 1), R(0.3, 1), S(0.3, 1), S(0.3, 1), R(0.3, 1),
       PL(0.9, 1), B(1.3, 0), B(1.5, 1)],
      [AB(1.0, 0),
       HT(0.5, 0), HT(0.5, 0), A(0.5, 0), A(0.5, 0),
       S(0.28, 1), R(0.28, 1), S(0.28, 1), R(0.28, 1), S(0.28, 1), R(0.28, 1),
       PL(0.85, 1), PL(0.85, 1), B(1.7, 1)],
      [AB(0.9, 0), B(1.1, 1),
       HT(0.45, 0), HT(0.45, 0), A(0.45, 0), A(0.45, 0), A(0.45, 0),
       R(0.25, 1), S(0.25, 1), R(0.25, 1), S(0.25, 1), R(0.25, 1), S(0.25, 1), R(0.25, 1),
       PL(0.8, 1), PL(0.8, 1), B(1.8, 0), AB(2.1, 1)],
    ],
    obstacles: [
      Destr(3, 3, 'ruin', 45, 14), Destr(7, 3, 'ruin', 45, 14),
      Destr(4, 8, 'rock', 50, 16), Destr(6, 8, 'rock', 50, 16),
      Ob(3, 12, 'column'), Ob(7, 12, 'column'),
      Ob(0, 8, 'column'), Ob(9, 8, 'column'),
    ],
  },

  // L12 王宮階梯 — narrow ceremonial ascent. Single-path stairs with two
  // column walls flanking. Sniper paradise (long range) but corridor limits
  // ground tower options. Wave: armoredBoss multi-phase pressure.
  'level-12': {
    startingGold: 220, startingLives: 11,
    paths: [path1(p(1, -0.5), p(1, 5), p(4, 5), p(4, 10), p(7, 10), p(7, 14), p(4, 14), p(4, 15.5))],
    waves: [
      [SO(0.55), SO(0.55), R(0.55), R(0.55), R(0.55),
       T(0.75), T(0.75), A(0.85), A(0.85)],
      [R(0.45), R(0.45), R(0.45), S(0.45), S(0.45), S(0.45),
       T(0.65), A(0.75), A(0.75), HT(0.85), HT(0.85)],
      [S(0.4), R(0.4), SO(0.4), R(0.4), S(0.4),
       A(0.6), A(0.6), A(0.6), HT(0.7), HT(0.7), HT(0.7),
       PL(0.95), B(1.4), B(1.6)],
      [A(0.5), A(0.5), A(0.5), HT(0.6), HT(0.6), HT(0.6), HT(0.6),
       R(0.3), R(0.3), S(0.3), S(0.3),
       PL(0.85), PL(0.85), B(1.3), AB(1.5)],
      [B(1.0), AB(1.2),
       R(0.3), S(0.3), R(0.3), SO(0.3), R(0.3), S(0.3),
       A(0.5), A(0.5), HT(0.55), HT(0.55), HT(0.55),
       PL(0.8), PL(0.8), PL(0.8), B(1.6), AB(1.8)],
      [AB(0.9), AB(1.1),
       R(0.28), S(0.28), R(0.28), SO(0.28), R(0.28), S(0.28), R(0.28), S(0.28),
       A(0.42), A(0.42), HT(0.5), HT(0.5), HT(0.5), HT(0.5),
       PL(0.75), PL(0.75), PL(0.75), B(1.8), AB(2.0), AB(2.2)],
    ],
    obstacles: [
      Ob(2, 2, 'column'), Ob(2, 4, 'column'), Ob(2, 7, 'column'),
      Ob(6, 5, 'column'), Ob(6, 8, 'column'),
      Destr(5, 3, 'ruin', 40, 12), Destr(5, 12, 'ruin', 40, 12),
      Destr(3, 8, 'rock', 50, 16),
      Ob(8, 2, 'column'), Ob(8, 13, 'column'),
    ],
  },

  // L13 王座之廳 — 3-path throne room assault. finalBoss finale.
  // Three entries (top-left, top-center, top-right) converge at middle
  // altar, single vertical corridor exits. Central destructible altar
  // cluster tests if players can break under pressure.
  'level-13': {
    startingGold: 260, startingLives: 11,
    paths: [
      path1(p(1, -0.5), p(1, 4), p(5, 4), p(5, 9), p(5, 15.5)),
      path1(p(5, -0.5), p(5, 4), p(5, 9), p(5, 15.5)),
      path1(p(9, -0.5), p(9, 4), p(5, 4), p(5, 9), p(5, 15.5)),
    ],
    waves: [
      [T(0.7, 0), T(0.7, 0), A(0.85, 0),
       SO(0.5, 1), SO(0.5, 1), R(0.5, 1), R(0.5, 1),
       S(0.45, 2), S(0.45, 2), S(0.45, 2), S(0.45, 2)],
      [A(0.65, 0), A(0.65, 0), HT(0.8, 0),
       R(0.4, 1), R(0.4, 1), SO(0.4, 1), SO(0.4, 1),
       S(0.35, 2), S(0.35, 2), R(0.35, 2), R(0.35, 2),
       PL(1.0, 1)],
      [HT(0.6, 0), HT(0.6, 0), A(0.6, 0), A(0.6, 0),
       SO(0.35, 1), R(0.35, 1), SO(0.35, 1), R(0.35, 1),
       S(0.3, 2), R(0.3, 2), S(0.3, 2), R(0.3, 2),
       PL(0.9, 1), PL(0.9, 1), B(1.4, 0)],
      [A(0.5, 0), A(0.5, 0), HT(0.55, 0), HT(0.55, 0), HT(0.55, 0),
       R(0.32, 1), R(0.32, 1), R(0.32, 1), SO(0.32, 1),
       S(0.3, 2), R(0.3, 2), S(0.3, 2), R(0.3, 2), S(0.3, 2),
       PL(0.8, 1), B(1.3, 0), B(1.5, 2)],
      [AB(1.0, 0), B(1.1, 2),
       HT(0.45, 0), HT(0.45, 0), A(0.45, 0), A(0.45, 0),
       R(0.3, 1), SO(0.3, 1), R(0.3, 1), SO(0.3, 1), R(0.3, 1),
       S(0.26, 2), R(0.26, 2), S(0.26, 2), R(0.26, 2), S(0.26, 2),
       PL(0.75, 1), PL(0.75, 1), B(1.6, 0), AB(1.8, 2)],
      [FB(1.0, 1), AB(1.2, 0), AB(1.4, 2),
       HT(0.4, 0), HT(0.4, 0), A(0.4, 0), A(0.4, 0),
       R(0.26, 1), R(0.26, 1), SO(0.26, 1), R(0.26, 1),
       S(0.22, 2), R(0.22, 2), S(0.22, 2), R(0.22, 2), S(0.22, 2), R(0.22, 2), S(0.22, 2),
       PL(0.7, 1), PL(0.7, 1), PL(0.7, 1),
       B(1.8, 0), B(2.0, 2), AB(2.2, 1)],
    ],
    obstacles: [
      Destr(4, 6, 'ruin', 50, 18), Destr(5, 6, 'rock', 55, 20), Destr(6, 6, 'ruin', 50, 18),
      Destr(4, 8, 'ruin', 50, 18), Destr(6, 8, 'ruin', 50, 18),
      Ob(3, 2, 'column'), Ob(7, 2, 'column'),
      Ob(2, 11, 'column'), Ob(8, 11, 'column'),
    ],
  },

  // ========== World 4 — Frozen (L14–L18) ==========
  // Theme: ice, frost, frostRaider scouts, iceBeast heavies, glacialBoss.

  // L14 凍原邊緣 — 2-path tundra entry. North plains (frostRaider scouts)
  // and south pass (iceBeast heavies). Ice pillar obstacles.
  'level-14': {
    startingGold: 215, startingLives: 13,
    paths: [
      path1(p(1, -0.5), p(1, 4), p(5, 4), p(5, 10), p(1, 10), p(1, 15.5)),
      path1(p(9, -0.5), p(9, 10), p(5, 10), p(5, 12), p(1, 12), p(1, 15.5)),
    ],
    waves: [
      [IB(0.9, 0), IB(0.9, 0), IB(0.9, 0),
       FR(0.4, 1), FR(0.4, 1), FR(0.4, 1), FR(0.4, 1), FR(0.4, 1)],
      [IB(0.8, 0), IB(0.8, 0), T(0.8, 0), T(0.8, 0),
       FR(0.35, 1), FR(0.35, 1), FR(0.35, 1), S(0.35, 1), S(0.35, 1)],
      [IB(0.75, 0), IB(0.75, 0), A(0.7, 0), A(0.7, 0),
       FR(0.32, 1), FR(0.32, 1), FR(0.32, 1), S(0.32, 1), R(0.32, 1),
       B(1.4, 0)],
      [A(0.55, 0), A(0.55, 0), IB(0.7, 0), IB(0.7, 0), HT(0.8, 0),
       FR(0.28, 1), FR(0.28, 1), S(0.28, 1), FR(0.28, 1), S(0.28, 1), R(0.28, 1),
       PL(1.0, 1), B(1.3, 0)],
      [B(1.0, 0),
       IB(0.5, 0), IB(0.5, 0), A(0.55, 0), A(0.55, 0), HT(0.65, 0),
       FR(0.25, 1), FR(0.25, 1), S(0.25, 1), FR(0.25, 1), S(0.25, 1), R(0.25, 1), FR(0.25, 1),
       PL(0.85, 1), B(1.5, 1)],
      [B(0.9, 0), AB(1.1, 0),
       IB(0.45, 0), IB(0.45, 0), IB(0.45, 0), A(0.5, 0), HT(0.6, 0), HT(0.6, 0),
       FR(0.22, 1), FR(0.22, 1), S(0.22, 1), FR(0.22, 1), S(0.22, 1), R(0.22, 1), FR(0.22, 1), S(0.22, 1),
       PL(0.75, 1), PL(0.75, 1), B(1.7, 1), B(1.9, 0)],
    ],
    obstacles: [
      Destr(3, 2, 'iceRock', 40, 12), Destr(7, 2, 'iceRock', 40, 12),
      Destr(3, 7, 'iceRock', 40, 12), Destr(7, 7, 'iceRock', 40, 12),
      Destr(5, 13, 'iceRock', 40, 12),
      Ob(0, 0, 'deadTree'), Ob(9, 0, 'deadTree'), Ob(5, 8, 'rock'),
    ],
  },

  // L15 冰裂谷地 — central crevasse. Single path with ice-wall destructibles
  // forming a corridor; breaking opens cross-fire positions.
  'level-15': {
    startingGold: 210, startingLives: 12,
    paths: [path1(p(5, -0.5), p(5, 2), p(1, 2), p(1, 8), p(8, 8), p(8, 13), p(2, 13), p(2, 15.5))],
    waves: [
      [FR(0.5), FR(0.5), FR(0.5), FR(0.5), FR(0.5), FR(0.5),
       IB(0.8), IB(0.8), T(0.8)],
      [FR(0.4), FR(0.4), S(0.4), S(0.4), R(0.4), R(0.4),
       IB(0.7), IB(0.7), A(0.8), A(0.8)],
      [R(0.38), R(0.38), FR(0.38), FR(0.38), S(0.38),
       IB(0.6), IB(0.6), A(0.65), A(0.65), HT(0.75), B(1.4)],
      [FR(0.32), FR(0.32), R(0.32), FR(0.32), S(0.32), R(0.32),
       IB(0.55), A(0.6), A(0.6), HT(0.7), HT(0.7), PL(0.95), B(1.3), B(1.5)],
      [AB(1.0),
       FR(0.28), FR(0.28), FR(0.28), S(0.28), R(0.28), FR(0.28), S(0.28),
       A(0.5), A(0.5), HT(0.6), HT(0.6), HT(0.6), PL(0.85), PL(0.85),
       B(1.6), AB(1.8)],
      [AB(0.9), GB(1.2),
       FR(0.24), FR(0.24), S(0.24), FR(0.24), R(0.24), FR(0.24), S(0.24), FR(0.24),
       A(0.45), A(0.45), HT(0.55), HT(0.55), HT(0.55), HT(0.55),
       PL(0.8), PL(0.8), PL(0.8), B(1.8), AB(2.1)],
    ],
    obstacles: [
      Destr(3, 5, 'iceRock', 45, 14), Destr(4, 5, 'iceRock', 45, 14),
      Destr(6, 5, 'iceRock', 45, 14), Destr(7, 5, 'iceRock', 45, 14),
      Destr(3, 10, 'iceRock', 45, 14), Destr(5, 10, 'iceRock', 45, 14), Destr(7, 10, 'iceRock', 45, 14),
      Ob(0, 5, 'deadTree'), Ob(9, 5, 'deadTree'), Ob(0, 13, 'rock'),
    ],
  },

  // L16 冰封哨塔 — central ice citadel (W1 L3 style). Heavy destructibles.
  'level-16': {
    startingGold: 235, startingLives: 11,
    paths: [path1(p(1, -0.5), p(1, 3), p(8, 3), p(8, 12), p(1, 12), p(1, 15.5))],
    waves: [
      [FR(0.45), FR(0.45), FR(0.45), FR(0.45), S(0.45), S(0.45),
       IB(0.7), IB(0.7), IB(0.7), T(0.8)],
      [IB(0.65), IB(0.65), IB(0.65), A(0.7), A(0.7), HT(0.8),
       FR(0.38), FR(0.38), FR(0.38), R(0.38)],
      [FR(0.35), FR(0.35), R(0.35), S(0.35), FR(0.35),
       IB(0.55), IB(0.55), A(0.6), A(0.6), HT(0.7), HT(0.7),
       PL(0.95), B(1.4)],
      [IB(0.5), IB(0.5), A(0.55), A(0.55), HT(0.65), HT(0.65), HT(0.65),
       FR(0.3), FR(0.3), R(0.3), S(0.3), R(0.3), PL(0.85), B(1.3), AB(1.5)],
      [AB(1.0), B(1.1),
       IB(0.45), IB(0.45), IB(0.45), A(0.5), A(0.5), HT(0.6), HT(0.6),
       FR(0.28), FR(0.28), R(0.28), S(0.28), FR(0.28), PL(0.8), PL(0.8),
       B(1.6), AB(1.8)],
      [GB(1.0), AB(1.2),
       IB(0.4), IB(0.4), IB(0.4), A(0.45), A(0.45), HT(0.55), HT(0.55), HT(0.55),
       FR(0.25), FR(0.25), R(0.25), FR(0.25), S(0.25), FR(0.25), R(0.25),
       PL(0.75), PL(0.75), PL(0.75), B(1.8), AB(2.1)],
    ],
    obstacles: [
      Destr(3, 5, 'iceRock', 42, 14), Destr(4, 5, 'iceRock', 42, 14),
      Destr(6, 5, 'iceRock', 42, 14), Destr(3, 8, 'iceRock', 42, 14),
      Destr(5, 8, 'rock', 55, 18), Destr(6, 8, 'iceRock', 42, 14),
      Destr(4, 10, 'iceRock', 42, 14), Destr(5, 10, 'iceRock', 42, 14),
      Ob(0, 6, 'deadTree'), Ob(9, 9, 'deadTree'),
    ],
  },

  // L17 極光裂口 — dual-path crevasse under aurora, convergence chokepoint.
  'level-17': {
    startingGold: 235, startingLives: 11,
    paths: [
      path1(p(2, -0.5), p(2, 6), p(5, 6), p(5, 11), p(5, 15.5)),
      path1(p(8, -0.5), p(8, 6), p(5, 6), p(5, 11), p(5, 15.5)),
    ],
    waves: [
      [IB(0.7, 0), IB(0.7, 0), IB(0.7, 0), A(0.8, 0),
       FR(0.35, 1), FR(0.35, 1), FR(0.35, 1), FR(0.35, 1), S(0.4, 1), S(0.4, 1)],
      [IB(0.6, 0), IB(0.6, 0), A(0.65, 0), A(0.65, 0), HT(0.8, 0),
       FR(0.3, 1), FR(0.3, 1), FR(0.3, 1), R(0.3, 1), R(0.3, 1), S(0.3, 1)],
      [IB(0.55, 0), IB(0.55, 0), A(0.6, 0), A(0.6, 0), HT(0.7, 0),
       FR(0.28, 1), FR(0.28, 1), R(0.28, 1), FR(0.28, 1), S(0.28, 1),
       PL(0.9, 1), B(1.4, 0)],
      [A(0.5, 0), A(0.5, 0), HT(0.6, 0), HT(0.6, 0), HT(0.6, 0),
       FR(0.26, 1), FR(0.26, 1), R(0.26, 1), S(0.26, 1), FR(0.26, 1), R(0.26, 1),
       PL(0.8, 1), PL(0.8, 1), B(1.3, 0), B(1.5, 1)],
      [AB(1.0, 0),
       IB(0.45, 0), IB(0.45, 0), A(0.5, 0), A(0.5, 0), HT(0.55, 0),
       FR(0.24, 1), FR(0.24, 1), R(0.24, 1), S(0.24, 1), FR(0.24, 1), R(0.24, 1),
       PL(0.75, 1), B(1.7, 1), AB(1.9, 0)],
      [GB(1.0, 0), AB(1.2, 1),
       IB(0.4, 0), IB(0.4, 0), A(0.45, 0), A(0.45, 0), HT(0.5, 0), HT(0.5, 0),
       FR(0.22, 1), FR(0.22, 1), R(0.22, 1), S(0.22, 1), FR(0.22, 1), R(0.22, 1), S(0.22, 1), FR(0.22, 1),
       PL(0.7, 1), PL(0.7, 1), B(1.8, 0), AB(2.0, 1)],
    ],
    obstacles: [
      Destr(4, 3, 'iceRock', 45, 14), Destr(6, 3, 'iceRock', 45, 14),
      Destr(4, 9, 'iceRock', 45, 14), Destr(6, 9, 'iceRock', 45, 14),
      Destr(5, 13, 'rock', 50, 16),
      Ob(0, 3, 'deadTree'), Ob(9, 3, 'deadTree'), Ob(0, 12, 'rock'),
    ],
  },

  // L18 冰原核心 — W4 finale. 3-path converge on glacialBoss arena.
  'level-18': {
    startingGold: 260, startingLives: 12,
    paths: [
      path1(p(1, -0.5), p(1, 5), p(5, 5), p(5, 10), p(5, 15.5)),
      path1(p(5, -0.5), p(5, 5), p(5, 10), p(5, 15.5)),
      path1(p(9, -0.5), p(9, 5), p(5, 5), p(5, 10), p(5, 15.5)),
    ],
    waves: [
      [IB(0.7, 0), IB(0.7, 0), A(0.8, 0),
       T(0.55, 1), T(0.55, 1), T(0.55, 1), A(0.7, 1),
       FR(0.35, 2), FR(0.35, 2), FR(0.35, 2), FR(0.35, 2)],
      [IB(0.6, 0), A(0.65, 0), HT(0.75, 0),
       A(0.5, 1), A(0.5, 1), HT(0.6, 1), HT(0.6, 1),
       FR(0.3, 2), FR(0.3, 2), FR(0.3, 2), S(0.3, 2), R(0.3, 2)],
      [IB(0.55, 0), A(0.6, 0), HT(0.65, 0), HT(0.65, 0),
       HT(0.5, 1), HT(0.5, 1), A(0.55, 1), A(0.55, 1),
       FR(0.28, 2), FR(0.28, 2), R(0.28, 2), S(0.28, 2),
       PL(1.0, 2), B(1.4, 1)],
      [A(0.5, 0), A(0.5, 0), HT(0.6, 0), HT(0.6, 0),
       HT(0.45, 1), HT(0.45, 1), A(0.5, 1), IB(0.6, 1),
       FR(0.26, 2), FR(0.26, 2), R(0.26, 2), S(0.26, 2), FR(0.26, 2),
       PL(0.85, 2), B(1.3, 0), B(1.5, 2)],
      [AB(1.0, 1), B(1.2, 0),
       IB(0.45, 0), A(0.5, 0), HT(0.55, 0), HT(0.55, 0),
       HT(0.4, 1), HT(0.4, 1), A(0.45, 1),
       FR(0.24, 2), FR(0.24, 2), R(0.24, 2), FR(0.24, 2), S(0.24, 2), FR(0.24, 2),
       PL(0.8, 2), PL(0.8, 2), B(1.6, 2), AB(1.8, 0)],
      [GB(1.0, 1), AB(1.2, 0), AB(1.4, 2),
       IB(0.4, 0), A(0.45, 0), A(0.45, 0), HT(0.5, 0), HT(0.5, 0),
       HT(0.38, 1), HT(0.38, 1), A(0.42, 1), A(0.42, 1),
       FR(0.22, 2), FR(0.22, 2), R(0.22, 2), S(0.22, 2), FR(0.22, 2), R(0.22, 2), FR(0.22, 2), S(0.22, 2),
       PL(0.7, 2), PL(0.7, 2), PL(0.7, 2),
       B(1.8, 0), AB(2.0, 1), B(2.2, 2)],
    ],
    obstacles: [
      Destr(3, 3, 'iceRock', 42, 14), Destr(7, 3, 'iceRock', 42, 14),
      Destr(4, 7, 'iceRock', 42, 14), Destr(6, 7, 'iceRock', 42, 14),
      Destr(5, 8, 'rock', 55, 18),
      Destr(3, 12, 'iceRock', 42, 14), Destr(7, 12, 'iceRock', 42, 14),
      Ob(0, 0, 'deadTree'), Ob(9, 0, 'deadTree'), Ob(5, 14, 'rock'),
    ],
  },

  // ========== World 5 — Void (L19–L23) ==========
  // Theme: ethereal wraiths, splitters, healers, voidBoss. Crystal/totem art.

  // L19 虛空門前 — wraith intro. Ethereal enemies demand sniper (ethereal
  // counter) or long-range pierce. Single path with crystal obstacles.
  'level-19': {
    startingGold: 260, startingLives: 13,
    paths: [path1(p(2, -0.5), p(2, 4), p(7, 4), p(7, 9), p(2, 9), p(2, 13), p(7, 13), p(7, 15.5))],
    waves: [
      [SO(0.55), R(0.55), R(0.55), R(0.55),
       WR(0.7), WR(0.7), WR(0.7),
       T(0.9), A(0.9)],
      [WR(0.6), WR(0.6), WR(0.6), WR(0.6),
       A(0.7), A(0.7), HT(0.85),
       S(0.4), R(0.4), R(0.4)],
      [WR(0.55), WR(0.55), WR(0.55),
       A(0.6), A(0.6), HT(0.7), HT(0.7),
       R(0.35), R(0.35), S(0.35), SO(0.35),
       B(1.4)],
      [WR(0.5), WR(0.5), WR(0.5), WR(0.5),
       A(0.5), A(0.5), HT(0.6), HT(0.6), HT(0.6),
       R(0.3), R(0.3), S(0.3), R(0.3),
       PL(0.95), B(1.3), B(1.5)],
      [B(1.0), AB(1.2),
       WR(0.45), WR(0.45), WR(0.45), WR(0.45),
       A(0.45), A(0.45), HT(0.55), HT(0.55),
       R(0.28), R(0.28), S(0.28), SO(0.28),
       PL(0.8), PL(0.8), B(1.6), AB(1.8)],
      [AB(0.9), AB(1.1),
       WR(0.4), WR(0.4), WR(0.4), WR(0.4), WR(0.4),
       A(0.4), A(0.4), HT(0.5), HT(0.5), HT(0.5), HT(0.5),
       R(0.25), R(0.25), S(0.25), R(0.25), SO(0.25),
       PL(0.75), PL(0.75), PL(0.75), B(1.8), AB(2.1)],
    ],
    obstacles: [
      Destr(5, 2, 'crystal', 40, 14), Destr(5, 6, 'crystal', 40, 14),
      Destr(5, 11, 'crystal', 40, 14),
      Destr(1, 6, 'totem', 50, 18), Destr(9, 6, 'totem', 50, 18),
      Ob(0, 2, 'deadTree'), Ob(9, 13, 'deadTree'), Ob(3, 14, 'rock'),
    ],
  },

  // L20 幽影迴廊 — splitter-centric. Waves split into runners on death.
  // Single path with crystal cluster rewarding AOE tower concentration.
  'level-20': {
    startingGold: 265, startingLives: 12,
    paths: [path1(p(1, -0.5), p(1, 3), p(9, 3), p(9, 8), p(1, 8), p(1, 12), p(9, 12), p(9, 15.5))],
    waves: [
      [WR(0.6), WR(0.6), WR(0.6),
       SP(0.9), SP(0.9), SP(0.9),
       A(0.9), A(0.9)],
      [SP(0.75), SP(0.75), SP(0.75), SP(0.75),
       WR(0.55), WR(0.55), WR(0.55),
       HT(0.9), A(0.9)],
      [SP(0.7), SP(0.7), SP(0.7),
       WR(0.5), WR(0.5),
       A(0.6), A(0.6), HT(0.75), HT(0.75),
       PL(1.0), B(1.4)],
      [SP(0.6), SP(0.6), SP(0.6), SP(0.6),
       WR(0.45), WR(0.45), WR(0.45),
       A(0.5), HT(0.6), HT(0.6), HT(0.6),
       PL(0.9), B(1.3), AB(1.5)],
      [AB(1.0), B(1.2),
       SP(0.5), SP(0.5), SP(0.5), SP(0.5), SP(0.5),
       WR(0.4), WR(0.4), WR(0.4),
       A(0.45), HT(0.55), HT(0.55), HT(0.55),
       PL(0.8), PL(0.8), B(1.6), AB(1.8)],
      [AB(0.9), AB(1.1),
       SP(0.42), SP(0.42), SP(0.42), SP(0.42), SP(0.42), SP(0.42),
       WR(0.38), WR(0.38), WR(0.38), WR(0.38),
       A(0.4), HT(0.5), HT(0.5), HT(0.5), HT(0.5),
       PL(0.75), PL(0.75), B(1.8), AB(2.0), AB(2.2)],
    ],
    obstacles: [
      Destr(4, 5, 'crystal', 38, 12), Destr(5, 5, 'crystal', 38, 12), Destr(6, 5, 'crystal', 38, 12),
      Destr(4, 10, 'totem', 50, 18), Destr(6, 10, 'totem', 50, 18),
      Destr(5, 13, 'crystal', 38, 12),
      Ob(0, 5, 'deadTree'), Ob(9, 10, 'deadTree'), Ob(0, 13, 'rock'),
    ],
  },

  // L21 治療者庭院 — 2-path strategic dilemma. Path 0 has healer units
  // that buff escorted armor; path 1 is pure speed. Players must decide
  // kill-order priority (healer first or tanks first?).
  'level-21': {
    startingGold: 270, startingLives: 12,
    paths: [
      path1(p(2, -0.5), p(2, 5), p(6, 5), p(6, 10), p(2, 10), p(2, 15.5)),
      path1(p(8, -0.5), p(8, 10), p(6, 10), p(6, 12), p(2, 12), p(2, 15.5)),
    ],
    waves: [
      [HL(1.2, 0), A(0.7, 0), A(0.7, 0), HT(0.85, 0),
       S(0.35, 1), S(0.35, 1), R(0.35, 1), R(0.35, 1), R(0.35, 1), WR(0.6, 1)],
      [HL(1.1, 0), A(0.65, 0), A(0.65, 0), HT(0.8, 0), HT(0.8, 0),
       WR(0.5, 1), WR(0.5, 1), S(0.3, 1), R(0.3, 1), R(0.3, 1), R(0.3, 1)],
      [HL(1.0, 0), HL(1.4, 0), HT(0.7, 0), HT(0.7, 0), A(0.7, 0), A(0.7, 0),
       SP(0.8, 1), SP(0.8, 1), WR(0.5, 1), WR(0.5, 1),
       PL(0.95, 1), B(1.4, 0)],
      [HL(0.9, 0), A(0.55, 0), A(0.55, 0), HT(0.65, 0), HT(0.65, 0), HT(0.65, 0),
       SP(0.7, 1), SP(0.7, 1), SP(0.7, 1), WR(0.45, 1), WR(0.45, 1),
       R(0.3, 1), PL(0.85, 1), B(1.3, 0)],
      [HL(0.9, 0), AB(1.2, 0),
       HT(0.5, 0), HT(0.5, 0), A(0.5, 0), A(0.5, 0),
       SP(0.6, 1), SP(0.6, 1), SP(0.6, 1), WR(0.4, 1), WR(0.4, 1), WR(0.4, 1),
       PL(0.8, 1), PL(0.8, 1), B(1.6, 1)],
      [HL(0.9, 0), AB(1.1, 0), AB(1.3, 0),
       HT(0.45, 0), HT(0.45, 0), HT(0.45, 0), A(0.45, 0), A(0.45, 0),
       SP(0.55, 1), SP(0.55, 1), SP(0.55, 1), SP(0.55, 1),
       WR(0.38, 1), WR(0.38, 1), WR(0.38, 1), WR(0.38, 1),
       PL(0.75, 1), PL(0.75, 1), B(1.8, 1), AB(2.0, 0)],
    ],
    obstacles: [
      Destr(5, 3, 'crystal', 42, 14), Destr(5, 7, 'totem', 52, 18),
      Destr(4, 13, 'crystal', 42, 14), Destr(6, 13, 'crystal', 42, 14),
      Ob(0, 5, 'deadTree'), Ob(9, 5, 'deadTree'), Ob(0, 10, 'rock'), Ob(9, 13, 'rock'),
    ],
  },

  // L22 分裂祭壇 — central altar with destructible cluster. splitter +
  // wraith mix. AOE tower (missile) + ethereal counter (sniper) matter.
  'level-22': {
    startingGold: 275, startingLives: 12,
    paths: [path1(p(5, -0.5), p(5, 2), p(1, 2), p(1, 12), p(9, 12), p(9, 2), p(7, 2), p(7, 15.5))],
    waves: [
      [WR(0.6), WR(0.6), WR(0.6), WR(0.6),
       SP(0.8), SP(0.8), SP(0.8),
       A(0.9), HT(0.95)],
      [SP(0.7), SP(0.7), SP(0.7),
       WR(0.5), WR(0.5), WR(0.5),
       A(0.65), A(0.65), HT(0.8)],
      [SP(0.6), SP(0.6), SP(0.6), WR(0.45), WR(0.45), WR(0.45),
       A(0.55), A(0.55), HT(0.7), HT(0.7),
       PL(0.95), B(1.4)],
      [HL(1.2),
       SP(0.55), SP(0.55), SP(0.55), WR(0.4), WR(0.4), WR(0.4), WR(0.4),
       A(0.5), HT(0.6), HT(0.6), HT(0.6),
       PL(0.85), B(1.3), AB(1.5)],
      [AB(1.0), HL(1.2),
       SP(0.48), SP(0.48), SP(0.48), SP(0.48),
       WR(0.38), WR(0.38), WR(0.38), WR(0.38),
       A(0.45), A(0.45), HT(0.55), HT(0.55),
       PL(0.8), PL(0.8), B(1.6), AB(1.8)],
      [AB(0.9), VB(1.2),
       SP(0.42), SP(0.42), SP(0.42), SP(0.42), SP(0.42),
       WR(0.36), WR(0.36), WR(0.36), WR(0.36), WR(0.36),
       A(0.4), A(0.4), HT(0.5), HT(0.5), HT(0.5),
       PL(0.75), PL(0.75), B(1.8), AB(2.1)],
    ],
    obstacles: [
      Destr(4, 5, 'totem', 50, 18), Destr(5, 5, 'crystal', 42, 14), Destr(6, 5, 'totem', 50, 18),
      Destr(4, 8, 'crystal', 42, 14), Destr(5, 8, 'crystal', 42, 14), Destr(6, 8, 'crystal', 42, 14),
      Destr(5, 11, 'totem', 50, 18),
      Ob(0, 7, 'deadTree'), Ob(9, 7, 'deadTree'),
    ],
  },

  // L23 第一個人 — W5 finale. 3-path voidBoss arena. Unlocks the campaign
  // climax. Max strategic density.
  'level-23': {
    startingGold: 290, startingLives: 13,
    paths: [
      path1(p(1, -0.5), p(1, 5), p(5, 5), p(5, 10), p(5, 15.5)),
      path1(p(5, -0.5), p(5, 5), p(5, 10), p(5, 15.5)),
      path1(p(9, -0.5), p(9, 5), p(5, 5), p(5, 10), p(5, 15.5)),
    ],
    waves: [
      [WR(0.55, 0), WR(0.55, 0), WR(0.55, 0),
       HL(1.0, 1), A(0.65, 1), A(0.65, 1), HT(0.8, 1),
       SP(0.7, 2), SP(0.7, 2), SP(0.7, 2)],
      [WR(0.5, 0), WR(0.5, 0), WR(0.5, 0),
       HL(0.9, 1), HT(0.7, 1), HT(0.7, 1), A(0.6, 1),
       SP(0.6, 2), SP(0.6, 2), WR(0.5, 2), WR(0.5, 2)],
      [WR(0.45, 0), WR(0.45, 0), WR(0.45, 0), WR(0.45, 0),
       HL(0.85, 1), HT(0.6, 1), HT(0.6, 1), A(0.55, 1), A(0.55, 1),
       SP(0.55, 2), SP(0.55, 2), WR(0.45, 2), WR(0.45, 2),
       PL(0.95, 1), B(1.4, 1)],
      [WR(0.42, 0), WR(0.42, 0), WR(0.42, 0),
       HL(0.8, 1), HL(1.5, 1), HT(0.55, 1), HT(0.55, 1), A(0.5, 1), A(0.5, 1),
       SP(0.5, 2), SP(0.5, 2), SP(0.5, 2), WR(0.42, 2), WR(0.42, 2),
       PL(0.85, 1), B(1.3, 0), B(1.5, 2)],
      [AB(1.0, 1), B(1.2, 0), B(1.4, 2),
       WR(0.4, 0), WR(0.4, 0), WR(0.4, 0), WR(0.4, 0),
       HL(0.75, 1), HT(0.5, 1), HT(0.5, 1), A(0.45, 1), A(0.45, 1),
       SP(0.45, 2), SP(0.45, 2), SP(0.45, 2), WR(0.38, 2), WR(0.38, 2), WR(0.38, 2),
       PL(0.8, 1), PL(0.8, 1),
       B(1.8, 1), AB(2.0, 2)],
      [VB(1.0, 1), AB(1.3, 0), AB(1.6, 2),
       WR(0.36, 0), WR(0.36, 0), WR(0.36, 0), WR(0.36, 0),
       HL(0.7, 1), HT(0.45, 1), HT(0.45, 1), A(0.4, 1), A(0.4, 1),
       SP(0.4, 2), SP(0.4, 2), SP(0.4, 2), SP(0.4, 2),
       WR(0.34, 2), WR(0.34, 2), WR(0.34, 2), WR(0.34, 2),
       PL(0.7, 1), PL(0.7, 1), PL(0.7, 1),
       B(2.0, 0), FB(2.2, 1), B(2.4, 2)],
    ],
    obstacles: [
      Destr(4, 3, 'crystal', 45, 16), Destr(6, 3, 'crystal', 45, 16),
      Destr(3, 7, 'totem', 55, 20), Destr(7, 7, 'totem', 55, 20),
      Destr(5, 8, 'crystal', 45, 16),
      Destr(4, 12, 'crystal', 45, 16), Destr(6, 12, 'crystal', 45, 16),
      Ob(0, 0, 'deadTree'), Ob(9, 0, 'deadTree'), Ob(5, 14, 'totem'),
    ],
  },
};

// ============ Apply ============

let changed = 0;
const log = [];
for (const [id, spec] of Object.entries(DESIGNS)) {
  const file = path.join(DIR, id + '.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Preserve: id, name, world, flavorText, intro, outroWin, outroLose, availableTowers
  // Replace: paths, obstacles, startingGold, startingLives, waves
  data.paths = spec.paths;
  data.obstacles = spec.obstacles;
  data.startingGold = spec.startingGold;
  data.startingLives = spec.startingLives;
  data.waves = cleanPaths(spec.waves, spec.paths.length);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  const ent = spec.waves.reduce((a, w) => a + w.length, 0);
  const destr = spec.obstacles.filter(o => o.destructible).length;
  log.push(`${id}: paths=${spec.paths.length} gold=${spec.startingGold} lives=${spec.startingLives} entries=${ent} destr=${destr}/${spec.obstacles.length}`);
  changed++;
}

console.log(log.join('\n'));
console.log(`\n${changed} level(s) redesigned.`);
