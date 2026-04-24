export interface TileCoord {
  x: number;
  y: number;
}

export interface WaveEntryData {
  delay: number;
  enemy: string;
  /** Which path index this enemy spawns on. Defaults to 0 (first path). */
  path?: number;
}

export type WaveData = readonly WaveEntryData[];

export interface DialogueLineData {
  speaker: string;
  text: string;
  color?: string;
  portrait?: string;
}

export interface Obstacle {
  x: number;
  y: number;
  /** 'tree' | 'rock' | 'barrel' | 'column' | 'crystal' | 'totem' | 'ruin' — kind of decoration. */
  kind: string;
  /**
   * Optional — if truthy, this obstacle can be broken by tower AOE / hero
   * skills. Destroying it frees the tile and drops gold.
   */
  destructible?: boolean;
  /** Custom HP (default 40). */
  hp?: number;
  /** Gold dropped on destruction (default 15). */
  reward?: number;
}

export interface LevelData {
  id: string;
  name: string;
  world: number;
  flavorText?: string;
  /**
   * One or more enemy paths. Each path is a list of tile waypoints. Enemies
   * are assigned a path via their wave entry's `path` field (default 0).
   * Single-path levels just have `paths.length === 1`.
   */
  paths: readonly (readonly TileCoord[])[];
  startingGold: number;
  startingLives: number;
  availableTowers: readonly string[];
  waves: readonly WaveData[];
  intro?: readonly DialogueLineData[];
  outroWin?: readonly DialogueLineData[];
  outroLose?: readonly DialogueLineData[];
  endless?: boolean;
  coverImage?: string;
  obstacles?: readonly Obstacle[];
}
