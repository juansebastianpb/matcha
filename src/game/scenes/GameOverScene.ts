import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../constants'

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(): void {
    // This scene is mostly handled by React overlay
    // Just dim the game canvas
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.5
    )
    overlay.setDepth(100)
  }
}
