import type { Renderer, WorldPoint } from './Renderer.ts';

export interface TapEvent {
  screenX: number;
  screenY: number;
  world: WorldPoint;
}

export type TapHandler = (ev: TapEvent) => void;
export type HoverHandler = (ev: TapEvent | null) => void;

export class InputHandler {
  private readonly tapHandlers: TapHandler[] = [];
  private readonly hoverHandlers: HoverHandler[] = [];
  private readonly releaseHandlers: TapHandler[] = [];
  private readonly renderer: Renderer;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    renderer.canvas.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      renderer.canvas.setPointerCapture?.(ev.pointerId);
      const e = this.makeEvent(ev.clientX, ev.clientY);
      for (const h of this.tapHandlers) h(e);
    });
    renderer.canvas.addEventListener('pointermove', (ev) => {
      const e = this.makeEvent(ev.clientX, ev.clientY);
      for (const h of this.hoverHandlers) h(e);
    });
    renderer.canvas.addEventListener('pointerup', (ev) => {
      ev.preventDefault();
      const e = this.makeEvent(ev.clientX, ev.clientY);
      for (const h of this.releaseHandlers) h(e);
    });
    renderer.canvas.addEventListener('pointercancel', (ev) => {
      const e = this.makeEvent(ev.clientX, ev.clientY);
      for (const h of this.releaseHandlers) h(e);
    });
    renderer.canvas.addEventListener('pointerleave', () => {
      for (const h of this.hoverHandlers) h(null);
    });
  }

  private makeEvent(cx: number, cy: number): TapEvent {
    const rect = this.renderer.canvas.getBoundingClientRect();
    return {
      screenX: cx - rect.left,
      screenY: cy - rect.top,
      world: this.renderer.screenToWorld(cx, cy),
    };
  }

  onTap(handler: TapHandler): void { this.tapHandlers.push(handler); }
  onHover(handler: HoverHandler): void { this.hoverHandlers.push(handler); }
  onRelease(handler: TapHandler): void { this.releaseHandlers.push(handler); }
}
