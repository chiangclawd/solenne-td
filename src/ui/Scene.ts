import type { SceneContext } from '../scenes/SceneContext.ts';

export interface Scene {
  onEnter(): void;
  onExit(): void;
  update(dt: number): void;
  render(): void;
  onTap(screenX: number, screenY: number, worldX: number, worldY: number): void;
  onHover?(screenX: number, screenY: number, worldX: number, worldY: number): void;
  onHoverEnd?(): void;
}

export abstract class BaseScene implements Scene {
  protected readonly ctx: SceneContext;

  constructor(ctx: SceneContext) {
    this.ctx = ctx;
  }

  onEnter(): void {}
  onExit(): void {}
  abstract update(dt: number): void;
  abstract render(): void;
  abstract onTap(screenX: number, screenY: number, worldX: number, worldY: number): void;
  onHover?(_screenX: number, _screenY: number, _worldX: number, _worldY: number): void;
  onHoverEnd?(): void;

  protected inside(x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }
}
