import { Enemy } from './Enemy.ts';
import type { EnemyConfig } from './Enemy.ts';
import type { Path } from './Path.ts';

export interface WaveEntry {
  delay: number;
  enemy: EnemyConfig;
  /** Index into WaveManager.paths — which path this enemy walks. */
  path?: number;
}

export type Wave = readonly WaveEntry[];

export class WaveManager {
  readonly waves: readonly Wave[];
  private readonly paths: readonly Path[];
  private currentWaveIndex: number;
  private entryIndex: number;
  private timer: number;
  private spawning: boolean;

  constructor(waves: readonly Wave[], paths: readonly Path[]) {
    if (paths.length === 0) throw new Error('WaveManager requires at least one path');
    this.waves = waves;
    this.paths = paths;
    this.currentWaveIndex = 0;
    this.entryIndex = 0;
    this.timer = 0;
    this.spawning = false;
  }

  totalWaves(): number {
    return this.waves.length;
  }

  isSpawning(): boolean {
    return this.spawning;
  }

  startWave(index: number): void {
    if (index < 0 || index >= this.waves.length) return;
    this.currentWaveIndex = index;
    this.entryIndex = 0;
    this.timer = 0;
    this.spawning = true;
  }

  update(dt: number, onSpawn: (enemy: Enemy) => void): void {
    if (!this.spawning) return;
    const wave = this.waves[this.currentWaveIndex];
    this.timer += dt;
    while (this.entryIndex < wave.length && this.timer >= wave[this.entryIndex].delay) {
      const entry = wave[this.entryIndex];
      this.timer -= entry.delay;
      // Clamp path index to valid range — the validator should have caught
      // out-of-bounds, but be defensive in case endless / generated waves slip
      // through with no path assignment.
      const pathIdx = entry.path !== undefined && entry.path < this.paths.length ? entry.path : 0;
      onSpawn(new Enemy(this.paths[pathIdx], entry.enemy));
      this.entryIndex++;
    }
    if (this.entryIndex >= wave.length) {
      this.spawning = false;
    }
  }
}
