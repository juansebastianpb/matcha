import Phaser from 'phaser'
import { TILE_PALETTES } from './colors'
import { BLOCK_SIZE, BLOCK_TYPE_COUNT } from '../constants'

export function generateTileTextures(scene: Phaser.Scene): void {
  const size = BLOCK_SIZE
  const r = size / 2 - 2

  for (let i = 0; i < BLOCK_TYPE_COUNT; i++) {
    const key = `tile_${i}`
    const palette = TILE_PALETTES[i]

    const g = scene.add.graphics()

    // Shadow
    g.fillStyle(0x000000, 0.15)
    g.fillCircle(size / 2 + 1, size / 2 + 2, r)

    // Main circle
    g.fillStyle(palette.fill)
    g.fillCircle(size / 2, size / 2, r)

    // Border
    g.lineStyle(2, palette.border, 1)
    g.strokeCircle(size / 2, size / 2, r)

    // Highlight
    g.fillStyle(palette.highlight, 0.6)
    g.fillEllipse(size / 2 - 2, size / 2 - 6, r * 0.7, r * 0.4)

    // Face - eyes
    const eyeY = size / 2 - 4
    const eyeSpacing = 7

    switch (i) {
      case 0: // Yellow - Happy smile
        drawHappyFace(g, size, eyeY, eyeSpacing)
        break
      case 1: // Blue - Sleepy
        drawSleepyFace(g, size, eyeY, eyeSpacing)
        break
      case 2: // Pink - Surprised
        drawSurprisedFace(g, size, eyeY, eyeSpacing)
        break
      case 3: // Green - Cheeky wink
        drawCheekyFace(g, size, eyeY, eyeSpacing)
        break
      case 4: // Purple - Dreamy
        drawDreamyFace(g, size, eyeY, eyeSpacing)
        break
      case 5: // Orange - Excited
        drawExcitedFace(g, size, eyeY, eyeSpacing)
        break
    }

    g.generateTexture(key, size, size)
    g.destroy()
  }
}

function drawHappyFace(g: Phaser.GameObjects.Graphics, size: number, eyeY: number, spacing: number) {
  g.fillStyle(0x2d3436)
  g.fillCircle(size / 2 - spacing, eyeY, 3)
  g.fillCircle(size / 2 + spacing, eyeY, 3)
  // Shine
  g.fillStyle(0xffffff)
  g.fillCircle(size / 2 - spacing + 1, eyeY - 1, 1.2)
  g.fillCircle(size / 2 + spacing + 1, eyeY - 1, 1.2)
  // Smile
  g.lineStyle(2, 0x2d3436, 1)
  g.beginPath()
  g.arc(size / 2, size / 2 + 2, 8, Phaser.Math.DegToRad(10), Phaser.Math.DegToRad(170), false)
  g.strokePath()
  // Blush
  g.fillStyle(0xffb8b8, 0.3)
  g.fillCircle(size / 2 - 12, size / 2 + 4, 4)
  g.fillCircle(size / 2 + 12, size / 2 + 4, 4)
}

function drawSleepyFace(g: Phaser.GameObjects.Graphics, size: number, eyeY: number, spacing: number) {
  g.lineStyle(2, 0x2d3436, 1)
  // Closed eyes (curved lines)
  g.beginPath()
  g.arc(size / 2 - spacing, eyeY, 3, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false)
  g.strokePath()
  g.beginPath()
  g.arc(size / 2 + spacing, eyeY, 3, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false)
  g.strokePath()
  // Sleepy mouth
  g.beginPath()
  g.arc(size / 2, size / 2 + 5, 4, Phaser.Math.DegToRad(10), Phaser.Math.DegToRad(170), false)
  g.strokePath()
}

function drawSurprisedFace(g: Phaser.GameObjects.Graphics, size: number, eyeY: number, spacing: number) {
  g.fillStyle(0x2d3436)
  g.fillCircle(size / 2 - spacing, eyeY - 1, 4)
  g.fillCircle(size / 2 + spacing, eyeY - 1, 4)
  g.fillStyle(0xffffff)
  g.fillCircle(size / 2 - spacing + 1, eyeY - 2, 1.8)
  g.fillCircle(size / 2 + spacing + 1, eyeY - 2, 1.8)
  // O mouth
  g.fillStyle(0x2d3436)
  g.fillCircle(size / 2, size / 2 + 6, 4)
  g.fillStyle(0xe17055)
  g.fillCircle(size / 2, size / 2 + 6, 2.5)
}

function drawCheekyFace(g: Phaser.GameObjects.Graphics, size: number, eyeY: number, spacing: number) {
  // Open eye
  g.fillStyle(0x2d3436)
  g.fillCircle(size / 2 - spacing, eyeY, 3)
  g.fillStyle(0xffffff)
  g.fillCircle(size / 2 - spacing + 1, eyeY - 1, 1.2)
  // Wink eye (arc)
  g.lineStyle(2, 0x2d3436, 1)
  g.beginPath()
  g.arc(size / 2 + spacing, eyeY, 3, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false)
  g.strokePath()
  // Smirk
  g.beginPath()
  g.arc(size / 2 + 2, size / 2 + 3, 7, Phaser.Math.DegToRad(10), Phaser.Math.DegToRad(150), false)
  g.strokePath()
  // Tongue
  g.fillStyle(0xe17055)
  g.fillCircle(size / 2 + 4, size / 2 + 8, 2.5)
}

function drawDreamyFace(g: Phaser.GameObjects.Graphics, size: number, eyeY: number, spacing: number) {
  g.fillStyle(0x2d3436)
  // Star-shaped eyes (simple dots with lashes)
  g.fillCircle(size / 2 - spacing, eyeY, 2.5)
  g.fillCircle(size / 2 + spacing, eyeY, 2.5)
  g.fillStyle(0xffffff)
  g.fillCircle(size / 2 - spacing + 1, eyeY - 1, 1)
  g.fillCircle(size / 2 + spacing + 1, eyeY - 1, 1)
  // Lashes
  g.lineStyle(1.5, 0x2d3436, 1)
  g.lineBetween(size / 2 - spacing - 3, eyeY - 4, size / 2 - spacing - 1, eyeY - 2)
  g.lineBetween(size / 2 + spacing + 3, eyeY - 4, size / 2 + spacing + 1, eyeY - 2)
  // Wavy smile
  g.lineStyle(2, 0x2d3436, 1)
  g.beginPath()
  g.arc(size / 2, size / 2 + 4, 5, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false)
  g.strokePath()
}

function drawExcitedFace(g: Phaser.GameObjects.Graphics, size: number, eyeY: number, spacing: number) {
  // Wide eyes
  g.fillStyle(0x2d3436)
  g.fillCircle(size / 2 - spacing, eyeY - 1, 4)
  g.fillCircle(size / 2 + spacing, eyeY - 1, 4)
  g.fillStyle(0xffffff)
  g.fillCircle(size / 2 - spacing + 1.5, eyeY - 2, 2)
  g.fillCircle(size / 2 + spacing + 1.5, eyeY - 2, 2)
  // Big grin
  g.lineStyle(2, 0x2d3436, 1)
  g.beginPath()
  g.arc(size / 2, size / 2 + 1, 9, Phaser.Math.DegToRad(10), Phaser.Math.DegToRad(170), false)
  g.strokePath()
  // Teeth line
  g.lineStyle(1, 0x2d3436, 0.5)
  g.lineBetween(size / 2 - 7, size / 2 + 4, size / 2 + 7, size / 2 + 4)
}
