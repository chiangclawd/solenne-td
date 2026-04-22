import type { WorldPoint } from '../engine/Renderer.ts';

export class Path {
  readonly waypoints: readonly WorldPoint[];
  readonly totalLength: number;
  private readonly segmentLengths: number[];
  private readonly cumulativeLengths: number[];

  constructor(waypoints: readonly WorldPoint[]) {
    if (waypoints.length < 2) throw new Error('Path needs at least 2 waypoints');
    this.waypoints = waypoints;
    this.segmentLengths = [];
    this.cumulativeLengths = [0];
    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const a = waypoints[i - 1];
      const b = waypoints[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      this.segmentLengths.push(len);
      total += len;
      this.cumulativeLengths.push(total);
    }
    this.totalLength = total;
  }

  computeOccupiedTiles(tileSize: number): Set<string> {
    const tiles = new Set<string>();
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const a = this.waypoints[i];
      const b = this.waypoints[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.ceil(len / (tileSize * 0.25)));
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        const tx = Math.floor(px / tileSize);
        const ty = Math.floor(py / tileSize);
        tiles.add(`${tx},${ty}`);
      }
    }
    return tiles;
  }

  pointAt(distance: number): WorldPoint {
    const d = Math.max(0, Math.min(this.totalLength, distance));
    for (let i = 0; i < this.segmentLengths.length; i++) {
      const segStart = this.cumulativeLengths[i];
      const segLen = this.segmentLengths[i];
      if (d <= segStart + segLen || i === this.segmentLengths.length - 1) {
        const t = segLen === 0 ? 0 : (d - segStart) / segLen;
        const a = this.waypoints[i];
        const b = this.waypoints[i + 1];
        return {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
        };
      }
    }
    const last = this.waypoints[this.waypoints.length - 1];
    return { x: last.x, y: last.y };
  }
}
