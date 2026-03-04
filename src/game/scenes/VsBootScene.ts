import Phaser from 'phaser'
import { generateTileTextures, generateGarbageTextures } from '../art/TileRenderer'
import { initAudio } from '../audio/SoundManager'

export class VsBootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VsBootScene' })
  }

  create(): void {
    generateTileTextures(this)
    generateGarbageTextures(this)
    initAudio()
    const mobile = this.registry.get('mobile') ?? false
    this.scene.start('VsGameScene', { mobile })
  }
}
