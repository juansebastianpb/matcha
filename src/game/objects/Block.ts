import Phaser from 'phaser'
import { BlockState } from '../types'
import type { BlockData, BlockType } from '../types'
import { BLOCK_SIZE, CELL_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y, LANDING_BOUNCE_DURATION } from '../constants'

export class Block extends Phaser.GameObjects.Sprite {
  data_: BlockData

  constructor(scene: Phaser.Scene, data: BlockData) {
    const x = GRID_OFFSET_X + data.col * CELL_SIZE + BLOCK_SIZE / 2
    const y = GRID_OFFSET_Y + data.row * CELL_SIZE + BLOCK_SIZE / 2

    super(scene, x, y, `tile_${data.type}`)

    this.data_ = data
    this.setDisplaySize(BLOCK_SIZE - 2, BLOCK_SIZE - 2)
    scene.add.existing(this)
  }

  get blockData(): BlockData {
    return this.data_
  }

  updatePosition(animated = false): void {
    const targetX = GRID_OFFSET_X + this.data_.col * CELL_SIZE + BLOCK_SIZE / 2
    const targetY = GRID_OFFSET_Y + this.data_.row * CELL_SIZE + BLOCK_SIZE / 2

    if (animated) {
      this.scene.tweens.add({
        targets: this,
        x: targetX,
        y: targetY,
        duration: 120,
        ease: 'Power2',
        onComplete: () => {
          if (this.data_.state === BlockState.Falling) {
            this.playLandingBounce()
          }
          this.data_.state = BlockState.Idle
        },
      })
    } else {
      this.x = targetX
      this.y = targetY
    }
  }

  playSwapAnimation(targetRow: number, targetCol: number, onComplete: () => void): void {
    const targetX = GRID_OFFSET_X + targetCol * CELL_SIZE + BLOCK_SIZE / 2
    const targetY = GRID_OFFSET_Y + targetRow * CELL_SIZE + BLOCK_SIZE / 2

    this.data_.state = BlockState.Swapping
    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      duration: 120,
      ease: 'Power2',
      onComplete,
    })
  }

  playMatchAnimation(onComplete: () => void): void {
    this.data_.state = BlockState.Matched
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 300,
      ease: 'Power2',
      yoyo: false,
      onComplete,
    })
  }

  playLandingBounce(): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: { from: 1.1, to: 1 },
      scaleY: { from: 0.9, to: 1 },
      duration: LANDING_BOUNCE_DURATION,
      ease: 'Bounce.Out',
    })
  }

  updateType(type: BlockType): void {
    this.data_.type = type
    this.setTexture(`tile_${type}`)
  }

  gridX(): number {
    return GRID_OFFSET_X + this.data_.col * CELL_SIZE + BLOCK_SIZE / 2
  }

  gridY(): number {
    return GRID_OFFSET_Y + this.data_.row * CELL_SIZE + BLOCK_SIZE / 2
  }
}
