import type { Scene } from './Scene.ts';

/**
 * Scene manager with cross-fade transitions.
 * When a transition triggers, we keep `current` rendering while a fade covers
 * the screen, swap scenes at the peak, then fade out.
 */
const FADE_IN = 0.22;    // old scene fades out over this
const FADE_OUT = 0.22;   // new scene fades in over this

export class SceneManager {
  current: Scene | null = null;
  private pendingNext: Scene | null = null;
  private fadePhase: 'idle' | 'out' | 'in' = 'idle';
  private fadeT = 0;

  transition(next: Scene): void {
    if (this.current === null) {
      this.current = next;
      this.current.onEnter();
      return;
    }
    this.pendingNext = next;
    this.fadePhase = 'out';
    this.fadeT = 0;
  }

  updateTransition(dt: number): void {
    if (this.fadePhase === 'idle') return;
    this.fadeT += dt;
    if (this.fadePhase === 'out' && this.fadeT >= FADE_IN) {
      this.fadeT = 0;
      this.fadePhase = 'in';
      if (this.pendingNext) {
        this.current?.onExit();
        this.current = this.pendingNext;
        this.pendingNext = null;
        this.current.onEnter();
      }
    } else if (this.fadePhase === 'in' && this.fadeT >= FADE_OUT) {
      this.fadePhase = 'idle';
      this.fadeT = 0;
    }
  }

  /** Fade overlay opacity [0..1]. Caller draws a black rect with this alpha over the full canvas. */
  fadeAlpha(): number {
    if (this.fadePhase === 'out') return Math.min(1, this.fadeT / FADE_IN);
    if (this.fadePhase === 'in') return Math.max(0, 1 - this.fadeT / FADE_OUT);
    return 0;
  }
}
