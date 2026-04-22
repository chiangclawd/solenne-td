export interface GameLoopCallbacks {
  update(dtSeconds: number): void;
  render(alpha: number): void;
}

const FIXED_DT = 1 / 60;
const MAX_FRAME_TIME = 0.25;

export class GameLoop {
  private readonly cb: GameLoopCallbacks;
  private running = false;
  private lastTime = 0;
  private accumulator = 0;
  private rafId = 0;
  private fps = 0;
  private frameCount = 0;
  private fpsTimer = 0;
  private speed = 1;

  constructor(cb: GameLoopCallbacks) {
    this.cb = cb;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  getFps(): number { return this.fps; }
  getSpeed(): number { return this.speed; }
  setSpeed(s: number): void { this.speed = Math.max(0, s); }

  private tick = (now: number): void => {
    if (!this.running) return;
    let frameTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME;

    this.accumulator += frameTime * this.speed;
    let ticks = 0;
    while (this.accumulator >= FIXED_DT && ticks < 240) {
      this.cb.update(FIXED_DT);
      this.accumulator -= FIXED_DT;
      ticks++;
    }
    const alpha = this.accumulator / FIXED_DT;
    this.cb.render(alpha);

    this.frameCount++;
    this.fpsTimer += frameTime;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
