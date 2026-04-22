export type GameStatus = 'intro' | 'idle' | 'playing' | 'outroWin' | 'outroLose' | 'won' | 'lost';

export class GameState {
  gold: number;
  lives: number;
  waveIndex: number;
  status: GameStatus;
  kills: number;
  private readonly startGold: number;
  private readonly startLives: number;

  constructor(startGold: number, startLives: number) {
    this.startGold = startGold;
    this.startLives = startLives;
    this.gold = startGold;
    this.lives = startLives;
    this.waveIndex = 0;
    this.status = 'idle';
    this.kills = 0;
  }

  reset(): void {
    this.gold = this.startGold;
    this.lives = this.startLives;
    this.waveIndex = 0;
    this.status = 'idle';
    this.kills = 0;
  }
}
