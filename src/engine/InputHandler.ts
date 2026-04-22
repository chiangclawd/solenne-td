import type { Renderer, WorldPoint } from './Renderer.ts';

export interface TapEvent {
  screenX: number;
  screenY: number;
  world: WorldPoint;
}

export type TapHandler = (ev: TapEvent) => void;

export class InputHandler {
  private readonly handlers: TapHandler[] = [];
  private readonly renderer: Renderer;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    renderer.canvas.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      const rect = this.renderer.canvas.getBoundingClientRect();
      const screenX = ev.clientX - rect.left;
      const screenY = ev.clientY - rect.top;
      const world = this.renderer.screenToWorld(ev.clientX, ev.clientY);
      for (const h of this.handlers) h({ screenX, screenY, world });
    });
  }

  onTap(handler: TapHandler): void {
    this.handlers.push(handler);
  }
}
