/**
 * Challenge-based 3-star system (v2.3 A1).
 *
 * Each level can optionally define two extra stars beyond "just complete it":
 *   Star 1: complete the level (universal, no spec)
 *   Star 2: limitation-type challenge (e.g. "don't build cannon")
 *   Star 3: mastery-type challenge (e.g. "no lives lost")
 *
 * A spec is evaluated against a ChallengeState snapshot captured during the
 * run + scene context (selectedHero, destructibleCount, etc). Returns a
 * boolean; the caller maps (star1, star2, star3) to the saved challengeFlags
 * tuple.
 *
 * If a level has no `challenges` field in JSON, we fall back to the legacy
 * livesRatio system so pre-A1 levels don't silently drop to 1 star.
 */
import type { HeroId } from './Heroes.ts';

export type ChallengeSpec =
  /** Never lose a life during the whole run. */
  | { kind: 'noLivesLost' }
  /** Hero must be deployed and never die. */
  | { kind: 'heroSurvives' }
  /** Play the level without deploying any hero. */
  | { kind: 'noHero' }
  /** Must use the specified hero (and only that one). */
  | { kind: 'heroRequired'; id: HeroId }
  /** Forbidden to build any instance of the given tower id. */
  | { kind: 'towerForbidden'; id: string }
  /** Total tower builds across the run must not exceed n. */
  | { kind: 'maxTowers'; n: number }
  /** Never sell a tower. */
  | { kind: 'noSell' }
  /** Never upgrade a tower. */
  | { kind: 'noUpgrade' }
  /** Break every destructible obstacle present at level start. */
  | { kind: 'destroyAllDestr' }
  /** Complete the run in under `seconds` from first wave start. */
  | { kind: 'timeLimit'; seconds: number };

export interface LevelChallenges {
  readonly star2: ChallengeSpec;
  readonly star3: ChallengeSpec;
}

/**
 * Runtime state the evaluator needs — populated by GameScene during play.
 * All fields are updated on the relevant game event so evaluation at
 * triggerWin is a pure read.
 */
export interface ChallengeState {
  livesLostThisRun: boolean;
  heroDiedThisRun: boolean;
  anyTowerSold: boolean;
  anyTowerUpgraded: boolean;
  towerBuildsById: Record<string, number>;
  /** Date.now() ms at first wave start. 0 before any wave. */
  startMs: number;
  destructiblesBroken: number;
  destructiblesAtStart: number;
}

export interface ChallengeContext {
  selectedHeroId: HeroId | null;
}

export function makeInitialState(destructiblesAtStart: number): ChallengeState {
  return {
    livesLostThisRun: false,
    heroDiedThisRun: false,
    anyTowerSold: false,
    anyTowerUpgraded: false,
    towerBuildsById: {},
    startMs: 0,
    destructiblesBroken: 0,
    destructiblesAtStart,
  };
}

export function evaluateChallenge(
  spec: ChallengeSpec,
  state: ChallengeState,
  ctx: ChallengeContext,
): boolean {
  switch (spec.kind) {
    case 'noLivesLost':
      return !state.livesLostThisRun;
    case 'heroSurvives':
      return ctx.selectedHeroId !== null && !state.heroDiedThisRun;
    case 'noHero':
      return ctx.selectedHeroId === null;
    case 'heroRequired':
      return ctx.selectedHeroId === spec.id;
    case 'towerForbidden':
      return (state.towerBuildsById[spec.id] ?? 0) === 0;
    case 'maxTowers': {
      let total = 0;
      for (const c of Object.values(state.towerBuildsById)) total += c;
      return total <= spec.n;
    }
    case 'noSell':
      return !state.anyTowerSold;
    case 'noUpgrade':
      return !state.anyTowerUpgraded;
    case 'destroyAllDestr':
      return state.destructiblesAtStart > 0
        && state.destructiblesBroken >= state.destructiblesAtStart;
    case 'timeLimit': {
      if (state.startMs === 0) return false;
      const elapsedSec = (Date.now() - state.startMs) / 1000;
      return elapsedSec <= spec.seconds;
    }
  }
}

/** Human-readable description shown on end overlay + level-select card. */
export function describeChallenge(
  spec: ChallengeSpec,
  opts?: { towerName?: (id: string) => string; heroName?: (id: HeroId) => string },
): string {
  const tname = opts?.towerName ?? ((id) => id);
  const hname = opts?.heroName ?? ((id) => id);
  switch (spec.kind) {
    case 'noLivesLost':     return '零失血通關';
    case 'heroSurvives':    return '英雄整場不死亡';
    case 'noHero':          return '不派遣英雄';
    case 'heroRequired':    return `指定${hname(spec.id)}通關`;
    case 'towerForbidden':  return `不建造「${tname(spec.id)}」`;
    case 'maxTowers':       return `全場最多 ${spec.n} 座塔`;
    case 'noSell':          return '不賣掉任何塔';
    case 'noUpgrade':       return '不升級任何塔';
    case 'destroyAllDestr': return '破壞所有可破壞物';
    case 'timeLimit':       return `${spec.seconds} 秒內通關`;
  }
}

/** Short icon glyph for HUD/card usage. Kept ASCII-compatible for fonts. */
export function iconForChallenge(spec: ChallengeSpec): string {
  switch (spec.kind) {
    case 'noLivesLost':     return '♥';
    case 'heroSurvives':    return '⚔';
    case 'noHero':          return '∅';
    case 'heroRequired':    return '★';
    case 'towerForbidden':  return '⊘';
    case 'maxTowers':       return '#';
    case 'noSell':          return '$';
    case 'noUpgrade':       return '↑';
    case 'destroyAllDestr': return '✕';
    case 'timeLimit':       return '⏱';
  }
}

/**
 * Legacy fallback for levels without a `challenges` field. Maps lives ratio
 * to a [star1, star2, star3] triple so UI can render 3 bars uniformly.
 */
export function legacyStarFlags(livesRatio: number): [boolean, boolean, boolean] {
  // Star 1: completed (always true if we're computing this).
  // Star 2: kept > 50% lives. Star 3: flawless.
  return [true, livesRatio >= 0.5, livesRatio >= 1.0];
}
