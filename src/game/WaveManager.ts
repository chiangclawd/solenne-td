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

/**
 * One per-path spawn stream built from a wave. Each path runs on its OWN
 * timer so enemies on path 1 start spawning concurrently with path 0 —
 * fixing the bug where multi-path levels felt like "path 1 is empty" because
 * all path-0 entries had to drain before path-1 entries started their delays.
 */
interface PathStream {
  path: number;
  entries: readonly WaveEntry[];
  cursor: number;
  timer: number;
}

export class WaveManager {
  readonly waves: readonly Wave[];
  private readonly paths: readonly Path[];
  private spawning: boolean;
  private streams: PathStream[];

  constructor(waves: readonly Wave[], paths: readonly Path[]) {
    if (paths.length === 0) throw new Error('WaveManager requires at least one path');
    this.waves = waves;
    this.paths = paths;
    this.spawning = false;
    this.streams = [];
  }

  totalWaves(): number {
    return this.waves.length;
  }

  isSpawning(): boolean {
    return this.spawning;
  }

  startWave(index: number): void {
    if (index < 0 || index >= this.waves.length) return;
    this.streams = this.buildStreams(this.waves[index]);
    this.spawning = this.streams.some((s) => s.entries.length > 0);
  }

  /**
   * Partition a wave's entries by path index into independent streams.
   * Preserves in-wave ordering within each stream (later entries on the same
   * path still fire after earlier ones). Entries without a path field default
   * to path 0. Out-of-range indices clamp to 0 — the level validator should
   * catch those, but be defensive for generated/endless waves.
   */
  private buildStreams(wave: Wave): PathStream[] {
    const byPath: WaveEntry[][] = this.paths.map(() => []);
    for (const entry of wave) {
      const pIdx = entry.path !== undefined && entry.path >= 0 && entry.path < this.paths.length
        ? entry.path
        : 0;
      byPath[pIdx].push(entry);
    }
    return byPath.map((entries, path) => ({ path, entries, cursor: 0, timer: 0 }));
  }

  update(dt: number, onSpawn: (enemy: Enemy) => void): void {
    if (!this.spawning) return;
    let anyPending = false;
    for (const stream of this.streams) {
      if (stream.cursor >= stream.entries.length) continue;
      stream.timer += dt;
      while (
        stream.cursor < stream.entries.length &&
        stream.timer >= stream.entries[stream.cursor].delay
      ) {
        const entry = stream.entries[stream.cursor];
        stream.timer -= entry.delay;
        onSpawn(new Enemy(this.paths[stream.path], entry.enemy));
        stream.cursor++;
      }
      if (stream.cursor < stream.entries.length) anyPending = true;
    }
    if (!anyPending) this.spawning = false;
  }
}
