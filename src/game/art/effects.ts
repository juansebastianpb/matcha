import Phaser from 'phaser'
import { TILE_PALETTES } from './colors'

/**
 * Spawn a 3-layer burst of particles at (x, y):
 * 1. Main burst — 12 colored particles, wider spread + gravity
 * 2. Sparkle stars — 4 white star shapes, spin + fly outward
 * 3. Shockwave ring — expanding circle stroke + fade
 */
export function spawnClearParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  colorIndex: number,
  count = 12,
): void {
  const palette = TILE_PALETTES[colorIndex]
  if (!palette) return

  const textureKey = `particle_${colorIndex}`

  // --- Layer 1: Main burst (12 particles, wider spread + gravity) ---
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6
    const speed = 50 + Math.random() * 60
    const dx = Math.cos(angle) * speed
    const dy = Math.sin(angle) * speed - 30 // upward bias
    const size = 4 + Math.random() * 5

    const p = scene.add.sprite(x, y, textureKey)
    p.setDisplaySize(size, size)
    p.setDepth(10)
    p.setAlpha(0.9)

    scene.tweens.add({
      targets: p,
      x: x + dx,
      y: y + dy + 20, // gravity pull
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 300 + Math.random() * 200,
      ease: 'Power2',
      onComplete: () => p.destroy(),
    })
  }

  // --- Layer 2: Sparkle stars (4 white stars, spin + fly outward) ---
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 2 * i) / 4 + Math.PI / 4
    const speed = 30 + Math.random() * 25
    const dx = Math.cos(angle) * speed
    const dy = Math.sin(angle) * speed - 15

    const star = scene.add.sprite(x, y, 'particle_white')
    star.setDisplaySize(6, 6)
    star.setDepth(11)
    star.setAlpha(0.9)

    scene.tweens.add({
      targets: star,
      x: x + dx,
      y: y + dy,
      alpha: 0,
      angle: 180 + Math.random() * 180,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 250 + Math.random() * 150,
      ease: 'Power2',
      onComplete: () => star.destroy(),
    })
  }

  // --- Layer 3: Shockwave ring (expanding circle r=4→30, stroke + fade) ---
  const ring = scene.add.sprite(x, y, 'particle_ring')
  ring.setDisplaySize(8, 8)
  ring.setDepth(12)
  ring.setAlpha(0.6)

  scene.tweens.add({
    targets: ring,
    displayWidth: 60,
    displayHeight: 60,
    alpha: 0,
    duration: 250,
    ease: 'Power2',
    onComplete: () => ring.destroy(),
  })
}

/**
 * Spawn small trail particles during flash phase (called per-frame with 30% chance).
 * Small colored particles drift upward.
 */
export function spawnTrailParticle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  colorIndex: number,
): void {
  const textureKey = `particle_${colorIndex}`
  const p = scene.add.sprite(
    x + (Math.random() - 0.5) * 20,
    y + (Math.random() - 0.5) * 10,
    textureKey,
  )
  p.setDisplaySize(3, 3)
  p.setDepth(10)
  p.setAlpha(0.6)

  scene.tweens.add({
    targets: p,
    y: p.y - 15 - Math.random() * 10,
    alpha: 0,
    scaleX: 0.1,
    scaleY: 0.1,
    duration: 200 + Math.random() * 100,
    ease: 'Power2',
    onComplete: () => p.destroy(),
  })
}

/**
 * Spawn landing dust — 3 white circles at block base, spread + scale up + fade.
 */
export function spawnLandingDust(
  scene: Phaser.Scene,
  x: number,
  y: number,
  blockSize: number,
): void {
  const baseY = y + blockSize / 2
  for (let i = 0; i < 3; i++) {
    const offsetX = (i - 1) * 8
    const dust = scene.add.sprite(x + offsetX, baseY, 'particle_white')
    dust.setDisplaySize(4, 4)
    dust.setDepth(10)
    dust.setAlpha(0.5)

    scene.tweens.add({
      targets: dust,
      x: x + offsetX + (i - 1) * 6,
      y: baseY + 2,
      displayWidth: 10,
      displayHeight: 10,
      alpha: 0,
      duration: 200 + Math.random() * 100,
      ease: 'Power2',
      onComplete: () => dust.destroy(),
    })
  }
}
