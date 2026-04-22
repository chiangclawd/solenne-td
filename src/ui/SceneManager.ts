import type { Scene } from './Scene.ts';

export class SceneManager {
  current: Scene | null = null;

  transition(next: Scene): void {
    this.current?.onExit();
    this.current = next;
    this.current.onEnter();
  }
}
