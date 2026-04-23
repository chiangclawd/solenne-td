import './style.css';
import { Renderer } from './engine/Renderer.ts';
import { GameLoop } from './engine/GameLoop.ts';
import { InputHandler } from './engine/InputHandler.ts';
import { AssetLoader } from './engine/AssetLoader.ts';
import { AudioManager } from './engine/AudioManager.ts';
import type { BgmTrack } from './engine/AudioManager.ts';
import { ASSET_MANIFEST } from './assets.ts';
import type { AssetName } from './assets.ts';
import { loadLevel, LEVEL_IDS } from './game/LevelLoader.ts';
import { loadSave, persistSave } from './storage/SaveData.ts';
import { SceneManager } from './ui/SceneManager.ts';
import { MainMenuScene } from './scenes/MainMenuScene.ts';
import { AchievementTracker } from './game/Achievements.ts';
import type { SceneContext } from './scenes/SceneContext.ts';

const VERSION = '2.0.0';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('#game-canvas element not found');

async function main(): Promise<void> {
  const renderer = new Renderer(canvas as HTMLCanvasElement);
  const assets = new AssetLoader<AssetName>();
  const audio = new AudioManager();
  const save = loadSave();
  const achievements = new AchievementTracker();

  const [, levels] = await Promise.all([
    assets.load(ASSET_MANIFEST),
    Promise.all(LEVEL_IDS.map((id) => loadLevel(id))),
  ]);

  const sceneManager = new SceneManager();

  const loop = new GameLoop({
    update: (dt) => {
      sceneManager.current?.update(dt);
      achievements.update(dt);
      sceneManager.updateTransition(dt);
    },
    render: () => {
      sceneManager.current?.render();
      // Fade overlay
      const a = sceneManager.fadeAlpha();
      if (a > 0) {
        renderer.beginScreen();
        renderer.drawScreenRect(0, 0, renderer.vw(), renderer.vh(), `rgba(5, 8, 20, ${a})`);
      }
    },
  });

  const applyAudioSettings = (): void => {
    audio.applySettings({
      masterVolume: save.settings.masterVolume,
      sfxVolume: save.settings.sfxVolume,
      bgmVolume: save.settings.bgmVolume,
      muted: save.settings.muted,
    });
  };

  const ctx: SceneContext = {
    renderer,
    assets,
    audio,
    levels,
    save,
    achievements,
    version: VERSION,
    getFps: () => loop.getFps(),
    getSpeed: () => loop.getSpeed(),
    setSpeed: (s) => loop.setSpeed(s),
    transition: (next) => sceneManager.transition(next),
    persistSave: () => persistSave(save),
    applyAudioSettings,
    playBgm: (track: BgmTrack) => audio.playBgm(track),
  };

  sceneManager.transition(new MainMenuScene(ctx));
  requestAnimationFrame(() => {
    document.body.classList.add('booted');
    setTimeout(() => {
      const splash = document.getElementById('boot-splash');
      if (splash) splash.remove();
    }, 600);
  });

  const input = new InputHandler(renderer);
  input.onTap((ev) => {
    audio.ensureContext();
    applyAudioSettings();
    if (audio.currentBgmTrack() === 'none') {
      audio.playBgm('menu');
    }
    sceneManager.current?.onTap(ev.screenX, ev.screenY, ev.world.x, ev.world.y);
  });
  input.onHover((ev) => {
    if (!ev) { sceneManager.current?.onHoverEnd?.(); return; }
    sceneManager.current?.onHover?.(ev.screenX, ev.screenY, ev.world.x, ev.world.y);
  });

  loop.start();
}

main().catch((err) => {
  console.error('Bootstrap failed:', err);
  const el = document.getElementById('game-canvas');
  if (el) {
    el.outerHTML = `<pre style="color:#ff6b6b;padding:20px;font-family:monospace;white-space:pre-wrap;">${String(err)}</pre>`;
  }
});
