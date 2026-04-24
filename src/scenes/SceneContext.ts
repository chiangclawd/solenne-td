import type { Renderer } from '../engine/Renderer.ts';
import type { AssetLoader } from '../engine/AssetLoader.ts';
import type { AudioManager, BgmTrack } from '../engine/AudioManager.ts';
import type { AssetName } from '../assets.ts';
import type { LevelData } from '../game/Level.ts';
import type { SaveData } from '../storage/SaveData.ts';
import type { Scene } from '../ui/Scene.ts';
import type { AchievementTracker } from '../game/Achievements.ts';

export interface SceneContext {
  readonly renderer: Renderer;
  readonly assets: AssetLoader<AssetName>;
  readonly audio: AudioManager;
  readonly levels: readonly LevelData[];
  readonly save: SaveData;
  readonly achievements: AchievementTracker;
  readonly version: string;
  readonly buildDate: string;
  getFps(): number;
  getSpeed(): number;
  setSpeed(s: number): void;
  transition(next: Scene): void;
  persistSave(): void;
  applyAudioSettings(): void;
  playBgm(track: BgmTrack): void;
}
