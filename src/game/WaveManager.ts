import { Enemy } from './Enemy.ts';
import type { EnemyConfig } from './Enemy.ts';
import type { Path } from './Path.ts';

export interface WaveEntry {
  delay: number;
  enemy: EnemyConfig;
}

export type Wave = readonly WaveEntry[];

export class WaveManager {
  readonly waves: readonly Wave[];
  private readonly path: Path;
  private currentWaveIndex: number;
  private entryIndex: number;
  private timer: number;
  private spawning: boolean;

  constructor(waves: readonly Wave[], path: Path) {
    this.waves = waves;
    this.path = path;
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
      onSpawn(new Enemy(this.path, entry.enemy));
      this.entryIndex++;
    }
    if (this.entryIndex >= wave.length) {
      this.spawning = false;
    }
  }
}
