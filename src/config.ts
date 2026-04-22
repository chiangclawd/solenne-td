export const TILE_SIZE = 40;
export const GRID_COLS = 10;
export const GRID_ROWS = 15;
export const WORLD_WIDTH = TILE_SIZE * GRID_COLS;
export const WORLD_HEIGHT = TILE_SIZE * GRID_ROWS;

export const COLORS = {
  bgOuter: '#050810',
  bgWorld: '#0f1828',
  grid: '#1e2a3d',
  text: '#e4e9f0',
  textDim: '#7a8a9f',
  accent: '#5eb8ff',
} as const;
