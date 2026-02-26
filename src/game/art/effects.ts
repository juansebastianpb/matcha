import Phaser from 'phaser'
import { TILE_PALETTES } from './colors'
import { BlockType } from '../types'
import { CELL_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y, BLOCK_SIZE } from '../constants'

export function createClearEffect(scene: Phaser.Scene, row: number, col: number, type: BlockType): void {
  const x = GRID_OFFSET_X + col * CELL_SIZE + BLOCK_SIZE / 2
  const y = GRID_OFFSET_Y + row * CELL_SIZE + BLOCK_SIZE / 2
  const palette = TILE_PALETTES[type]

  // Particle burst
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    const particle = scene.add.circle(x, y, 4, palette.fill)
    particle.setDepth(10)

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * 30,
      y: y + Math.sin(angle) * 30,
      alpha: 0,
      scale: 0.3,
      duration: 350,
      ease: 'Power2',
      onComplete: () => particle.destroy(),
    })
  }

  // Flash circle
  const flash = scene.add.circle(x, y, BLOCK_SIZE / 2, 0xffffff, 0.8)
  flash.setDepth(9)
  scene.tweens.add({
    targets: flash,
    scale: 1.5,
    alpha: 0,
    duration: 250,
    ease: 'Power2',
    onComplete: () => flash.destroy(),
  })
}

export function createChainPopup(scene: Phaser.Scene, x: number, y: number, chain: number): void {
  const text = scene.add.text(x, y, `${chain}x CHAIN!`, {
    fontSize: '16px',
    fontFamily: 'Arial Black, Arial',
    color: '#FFD700',
    stroke: '#000000',
    strokeThickness: 3,
  })
  text.setOrigin(0.5)
  text.setDepth(20)

  scene.tweens.add({
    targets: text,
    y: y - 40,
    alpha: 0,
    scale: 1.3,
    duration: 800,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  })
}

export function createComboPopup(scene: Phaser.Scene, x: number, y: number, combo: number): void {
  const text = scene.add.text(x, y, `${combo}x COMBO!`, {
    fontSize: '14px',
    fontFamily: 'Arial Black, Arial',
    color: '#FF6B6B',
    stroke: '#000000',
    strokeThickness: 3,
  })
  text.setOrigin(0.5)
  text.setDepth(20)

  scene.tweens.add({
    targets: text,
    y: y - 35,
    alpha: 0,
    scale: 1.2,
    duration: 700,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  })
}

export function createScorePopup(scene: Phaser.Scene, x: number, y: number, points: number): void {
  const text = scene.add.text(x, y, `+${points}`, {
    fontSize: '12px',
    fontFamily: 'Arial',
    color: '#FFFFFF',
    stroke: '#000000',
    strokeThickness: 2,
  })
  text.setOrigin(0.5)
  text.setDepth(20)

  scene.tweens.add({
    targets: text,
    y: y - 25,
    alpha: 0,
    duration: 600,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  })
}
