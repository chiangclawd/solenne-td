export interface TileCoord {
  x: number;
  y: number;
}

export interface WaveEntryData {
  delay: number;
  enemy: string;
}

export type WaveData = readonly WaveEntryData[];

export interface DialogueLineData {
  speaker: string;
  text: string;
  color?: string;
  portrait?: string;
}

export interface LevelData {
  id: string;
  name: string;
  world: number;
  flavorText?: string;
  path: readonly TileCoord[];
  startingGold: number;
  startingLives: number;
  availableTowers: readonly string[];
  waves: readonly WaveData[];
  intro?: readonly DialogueLineData[];
  outroWin?: readonly DialogueLineData[];
  outroLose?: readonly DialogueLineData[];
  endless?: boolean;
  coverImage?: string;
}
