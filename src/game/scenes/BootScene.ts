import Phaser from 'phaser'
import { generateTileTextures } from '../art/TileRenderer'
import { initAudio } from '../audio/SoundManager'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create(): void {
    generateTileTextures(this)
    initAudio()
    this.scene.start('GameScene')
  }
}
