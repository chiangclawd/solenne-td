import type { Renderer, WorldPoint } from './Renderer.ts';

export interface TapEvent {
  screenX: number;
  screenY: number;
  world: WorldPoint;
}

export interface ReleaseEvent extends TapEvent {
  didDrag: boolean;
}

export interface DragEvent {
  dx: number;
  dy: number;
  dt: number;
  totalDist: number;
  screenX: number;
  screenY: number;
}

export type TapHandler = (ev: TapEvent) => void;
export type HoverHandler = (ev: TapEvent | null) => void;
export type ReleaseHandler = (ev: ReleaseEvent) => void;
export type DragHandler = (ev: DragEvent) => void;
export type WheelHandler = (deltaY: number) => void;

const DRAG_THRESHOLD = 4;

/**
 * Unified input — touch events on touchscreens, pointer events elsewhere.
 *
 * Touch path is intentionally minimal:
 *   - ev.touches[0] is used as "the finger" (single-finger UI only)
 *   - preventDefault is called in touchmove ONLY (not touchstart) — Safari has
 *     been observed to truncate the event stream if you preventDefault too early
 *   - touch-action:none on the canvas CSS prevents browser scroll regardless
 */
export class InputHandler {
  private readonly tapHandlers: TapHandler[] = [];
  private readonly hoverHandlers: HoverHandler[] = [];
  private readonly releaseHandlers: ReleaseHandler[] = [];
  private readonly dragHandlers: DragHandler[] = [];
  private readonly wheelHandlers: WheelHandler[] = [];
  private readonly renderer: Renderer;

  private downX: number | null = null;
  private downY: number | null = null;
  private lastMoveX = 0;
  private lastMoveY = 0;
  private lastMoveT = 0;
  private didDrag = false;
  private touchActive = false;
  /** Enable on-screen debug overlay by appending ?debug to the URL. */
  private debugCounts = { tStart: 0, tMove: 0, tEnd: 0, pDown: 0, pMove: 0, pUp: 0, lastDy: 0 };

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    const canvas = renderer.canvas;
    const hasTouch = 'ontouchstart' in window
      || (typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0);

    if (hasTouch) this.wireTouch(canvas);
    this.wirePointer(canvas);
    this.wireWheel(canvas);
    if (typeof location !== 'undefined' && location.search.includes('debug')) {
      this.installDebugOverlay();
    }
  }

  private installDebugOverlay(): void {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:4px;left:4px;z-index:9999;background:rgba(0,0,0,0.75);color:#0f0;font:10px/1.1 monospace;padding:4px 6px;border-radius:4px;pointer-events:none;white-space:pre;';
    document.body.appendChild(el);
    const tick = (): void => {
      const c = this.debugCounts;
      el.textContent =
        `touch  start:${c.tStart}  move:${c.tMove}  end:${c.tEnd}\n` +
        `pointer down:${c.pDown}  move:${c.pMove}  up:${c.pUp}\n` +
        `active:${this.touchActive ? '1' : '0'}  dy:${c.lastDy.toFixed(1)}`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private wireTouch(canvas: HTMLCanvasElement): void {
    // touchstart: do NOT call preventDefault — some iOS versions truncate the
    // event stream if we do. touch-action:none on the canvas already stops
    // browser gestures on down.
    canvas.addEventListener('touchstart', (ev) => {
      this.debugCounts.tStart++;
      if (this.touchActive) return;
      const t = ev.touches[0];
      if (!t) return;
      this.touchActive = true;
      this.downX = t.clientX;
      this.downY = t.clientY;
      this.lastMoveX = t.clientX;
      this.lastMoveY = t.clientY;
      this.lastMoveT = ev.timeStamp;
      this.didDrag = false;
      const e = this.makeEvent(t.clientX, t.clientY);
      for (const h of this.tapHandlers) h(e);
    }, { passive: true });

    canvas.addEventListener('touchmove', (ev) => {
      this.debugCounts.tMove++;
      if (!this.touchActive) return;
      ev.preventDefault();
      const t = ev.touches[0];
      if (!t) return;
      const dx = t.clientX - this.lastMoveX;
      const dy = t.clientY - this.lastMoveY;
      this.debugCounts.lastDy = dy;
      const dtMs = ev.timeStamp - this.lastMoveT;
      const dt = Math.max(0.001, dtMs / 1000);
      this.lastMoveX = t.clientX;
      this.lastMoveY = t.clientY;
      this.lastMoveT = ev.timeStamp;
      if (this.downX !== null && this.downY !== null) {
        const totalDist = Math.hypot(t.clientX - this.downX, t.clientY - this.downY);
        if (totalDist > DRAG_THRESHOLD) this.didDrag = true;
        if (dx !== 0 || dy !== 0) {
          const e = this.makeEvent(t.clientX, t.clientY);
          const dragEv: DragEvent = {
            dx, dy, dt, totalDist,
            screenX: e.screenX, screenY: e.screenY,
          };
          for (const h of this.dragHandlers) h(dragEv);
        }
      }
      // Hover feed for game scene placement preview
      const hoverEv = this.makeEvent(t.clientX, t.clientY);
      for (const h of this.hoverHandlers) h(hoverEv);
    }, { passive: false });

    const end = (ev: TouchEvent): void => {
      this.debugCounts.tEnd++;
      if (!this.touchActive) return;
      // Use changedTouches[0] since touches is empty by the time touchend fires
      const t = ev.changedTouches[0];
      const cx = t ? t.clientX : this.lastMoveX;
      const cy = t ? t.clientY : this.lastMoveY;
      const base = this.makeEvent(cx, cy);
      const didDrag = this.didDrag;
      this.touchActive = false;
      this.downX = null;
      this.downY = null;
      this.didDrag = false;
      for (const h of this.releaseHandlers) h({ ...base, didDrag });
    };
    canvas.addEventListener('touchend', end, { passive: true });
    canvas.addEventListener('touchcancel', end, { passive: true });
  }

  private wirePointer(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', (ev) => {
      this.debugCounts.pDown++;
      // On touch devices, touch events drive everything — suppress synthesized
      // pointer events for touch/pen pointer types.
      if (this.touchActive || ev.pointerType === 'touch' || ev.pointerType === 'pen') return;
      ev.preventDefault();
      this.downX = ev.clientX;
      this.downY = ev.clientY;
      this.lastMoveX = ev.clientX;
      this.lastMoveY = ev.clientY;
      this.lastMoveT = ev.timeStamp;
      this.didDrag = false;
      const e = this.makeEvent(ev.clientX, ev.clientY);
      for (const h of this.tapHandlers) h(e);
    });
    canvas.addEventListener('pointermove', (ev) => {
      this.debugCounts.pMove++;
      if (this.touchActive || ev.pointerType === 'touch' || ev.pointerType === 'pen') return;
      const latest = this.makeEvent(ev.clientX, ev.clientY);
      for (const h of this.hoverHandlers) h(latest);
      if (this.downX === null || this.downY === null) return;
      ev.preventDefault();
      const dx = ev.clientX - this.lastMoveX;
      const dy = ev.clientY - this.lastMoveY;
      const dtMs = ev.timeStamp - this.lastMoveT;
      const dt = Math.max(0.001, dtMs / 1000);
      this.lastMoveX = ev.clientX;
      this.lastMoveY = ev.clientY;
      this.lastMoveT = ev.timeStamp;
      const totalDist = Math.hypot(ev.clientX - this.downX, ev.clientY - this.downY);
      if (totalDist > DRAG_THRESHOLD) this.didDrag = true;
      if (dx !== 0 || dy !== 0) {
        const dragEv: DragEvent = {
          dx, dy, dt, totalDist,
          screenX: latest.screenX, screenY: latest.screenY,
        };
        for (const h of this.dragHandlers) h(dragEv);
      }
    }, { passive: false });
    canvas.addEventListener('pointerup', (ev) => {
      this.debugCounts.pUp++;
      if (this.touchActive || ev.pointerType === 'touch' || ev.pointerType === 'pen') return;
      ev.preventDefault();
      const base = this.makeEvent(ev.clientX, ev.clientY);
      const didDrag = this.didDrag;
      this.downX = null;
      this.downY = null;
      this.didDrag = false;
      for (const h of this.releaseHandlers) h({ ...base, didDrag });
    });
    canvas.addEventListener('pointercancel', (ev) => {
      if (this.touchActive || ev.pointerType === 'touch' || ev.pointerType === 'pen') return;
      const base = this.makeEvent(ev.clientX, ev.clientY);
      const didDrag = this.didDrag;
      this.downX = null;
      this.downY = null;
      this.didDrag = false;
      for (const h of this.releaseHandlers) h({ ...base, didDrag });
    });
    canvas.addEventListener('pointerleave', () => {
      if (this.touchActive) return;
      for (const h of this.hoverHandlers) h(null);
    });
  }

  private wireWheel(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('wheel', (ev) => {
      if (this.wheelHandlers.length === 0) return;
      ev.preventDefault();
      for (const h of this.wheelHandlers) h(ev.deltaY);
    }, { passive: false });
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
  onRelease(handler: ReleaseHandler): void { this.releaseHandlers.push(handler); }
  onDrag(handler: DragHandler): void { this.dragHandlers.push(handler); }
  onWheel(handler: WheelHandler): void { this.wheelHandlers.push(handler); }
}
