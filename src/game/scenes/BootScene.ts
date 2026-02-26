import Phaser from 'phaser'
import { generateTileTextures } from '../art/TileRenderer'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create(): void {
    generateTileTextures(this)
    this.scene.start('GameScene')
  }
}
