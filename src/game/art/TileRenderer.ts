import Phaser from 'phaser'
import { TILE_PALETTES } from './colors'
import { BLOCK_SIZE, BLOCK_TYPE_COUNT } from '../constants'
import { GARBAGE_BLOCK } from '../../characters'
import type { Expression } from '../../characters'

const EXPRESSIONS: Expression[] = [
  'happy', 'sleepy', 'surprised', 'cheeky', 'dreamy', 'excited', 'scared', 'dead',
]

// HD rendering: 3× pixel density + padding for traits that extend past the body
const RENDER_SCALE = 3
const PAD = 13 // extra pixels at 1× for traits
const S = (BLOCK_SIZE / 60) * RENDER_SCALE // design→pixel scale: 1.6
const OFF = PAD * RENDER_SCALE // pixel offset in texture: 14
const TEX_SIZE = (BLOCK_SIZE + PAD * 2) * RENDER_SCALE // 124

/** Convert design-space position to texture pixel */
function px(v: number): number { return v * S + OFF }
/** Convert design-space size/radius to texture pixels */
function sz(v: number): number { return v * S }

export function generateTileTextures(scene: Phaser.Scene): void {
  for (let i = 0; i < BLOCK_TYPE_COUNT; i++) {
    const palette = TILE_PALETTES[i]

    for (const expr of EXPRESSIONS) {
      const key = expr === 'happy' ? `tile_${i}` : `tile_${i}_${expr}`
      const g = scene.add.graphics()

      // Behind-body traits (ears)
      drawBehindTraits(g, i, palette)
      drawBase(g, palette)
      // On-top traits (horns, antenna, leaf, flame)
      drawFrontTraits(g, i, palette)
      drawExpression(g, expr, i)

      g.generateTexture(key, TEX_SIZE, TEX_SIZE)
      g.destroy()
    }
  }

  // Glow textures
  for (let i = 0; i < BLOCK_TYPE_COUNT; i++) {
    const palette = TILE_PALETTES[i]
    const g = scene.add.graphics()
    const glowSize = BLOCK_SIZE + 16
    const r = glowSize / 2

    g.fillStyle(palette.fill, 0.35)
    g.fillCircle(r, r, r)
    g.fillStyle(palette.fill, 0.2)
    g.fillCircle(r, r, r * 0.7)

    g.generateTexture(`glow_${i}`, glowSize, glowSize)
    g.destroy()
  }

  // Particle textures (per-color)
  for (let i = 0; i < BLOCK_TYPE_COUNT; i++) {
    const palette = TILE_PALETTES[i]
    const g = scene.add.graphics()
    const pSize = 8

    g.fillStyle(palette.fill)
    g.fillCircle(pSize / 2, pSize / 2, pSize / 2)

    g.generateTexture(`particle_${i}`, pSize, pSize)
    g.destroy()
  }

  // White particle (used by sparkles, landing dust)
  {
    const g = scene.add.graphics()
    g.fillStyle(0xffffff)
    g.fillCircle(4, 4, 4)
    g.generateTexture('particle_white', 8, 8)
    g.destroy()
  }

  // Ring particle (used by clear effects)
  {
    const g = scene.add.graphics()
    g.lineStyle(2, 0xffffff, 1)
    g.strokeCircle(8, 8, 7)
    g.generateTexture('particle_ring', 16, 16)
    g.destroy()
  }

  // Kawaii sparkle shapes (64×64, white, used for board ambient sparkles)
  const kawaiiSize = 64
  const kc = kawaiiSize / 2

  // Smooth circle (high-res replacement for particle_white in sparkles)
  {
    const g = scene.add.graphics()
    g.fillStyle(0xffffff)
    g.fillCircle(kc, kc, 26)
    g.generateTexture('kawaii_circle', kawaiiSize, kawaiiSize)
    g.destroy()
    scene.textures.get('kawaii_circle').setFilter(Phaser.Textures.FilterMode.LINEAR)
  }

  // Heart
  {
    const g = scene.add.graphics()
    g.fillStyle(0xffffff)
    const hs = 20
    g.fillCircle(kc - hs * 0.45, kc - hs * 0.25, hs * 0.55)
    g.fillCircle(kc + hs * 0.45, kc - hs * 0.25, hs * 0.55)
    g.fillTriangle(
      kc - hs, kc + hs * 0.05,
      kc + hs, kc + hs * 0.05,
      kc, kc + hs * 0.85,
    )
    g.generateTexture('kawaii_heart', kawaiiSize, kawaiiSize)
    g.destroy()
    scene.textures.get('kawaii_heart').setFilter(Phaser.Textures.FilterMode.LINEAR)
  }

  // 4-pointed twinkle star
  {
    const g = scene.add.graphics()
    g.fillStyle(0xffffff)
    const outerR = 28, innerR = 8
    g.beginPath()
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 - Math.PI / 2
      const r = i % 2 === 0 ? outerR : innerR
      const sx = kc + Math.cos(angle) * r
      const sy = kc + Math.sin(angle) * r
      if (i === 0) g.moveTo(sx, sy)
      else g.lineTo(sx, sy)
    }
    g.closePath()
    g.fillPath()
    g.generateTexture('kawaii_star', kawaiiSize, kawaiiSize)
    g.destroy()
    scene.textures.get('kawaii_star').setFilter(Phaser.Textures.FilterMode.LINEAR)
  }

  // 5-petal flower
  {
    const g = scene.add.graphics()
    g.fillStyle(0xffffff)
    const petalR = 11, dist = 13
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2
      g.fillCircle(kc + Math.cos(angle) * dist, kc + Math.sin(angle) * dist, petalR)
    }
    g.fillStyle(0xffffff, 0.9)
    g.fillCircle(kc, kc, 8)
    g.generateTexture('kawaii_flower', kawaiiSize, kawaiiSize)
    g.destroy()
    scene.textures.get('kawaii_flower').setFilter(Phaser.Textures.FilterMode.LINEAR)
  }

  // Diamond
  {
    const g = scene.add.graphics()
    g.fillStyle(0xffffff)
    const dr = 24
    g.beginPath()
    g.moveTo(kc, kc - dr)
    g.lineTo(kc + dr * 0.6, kc)
    g.lineTo(kc, kc + dr)
    g.lineTo(kc - dr * 0.6, kc)
    g.closePath()
    g.fillPath()
    g.generateTexture('kawaii_diamond', kawaiiSize, kawaiiSize)
    g.destroy()
    scene.textures.get('kawaii_diamond').setFilter(Phaser.Textures.FilterMode.LINEAR)
  }

  // Musical note
  {
    const g = scene.add.graphics()
    g.fillStyle(0xffffff)
    g.fillCircle(20, 44, 12)
    g.fillRect(30, 8, 6, 38)
    g.fillStyle(0xffffff, 0.9)
    g.fillTriangle(33, 8, 54, 16, 33, 24)
    g.generateTexture('kawaii_note', kawaiiSize, kawaiiSize)
    g.destroy()
    scene.textures.get('kawaii_note').setFilter(Phaser.Textures.FilterMode.LINEAR)
  }
}

// ── Base circle (shadow, fill, border, highlight) ────────────

function drawBase(g: Phaser.GameObjects.Graphics, palette: { fill: number; border: number; highlight: number }): void {
  const cx = TEX_SIZE / 2
  const cy = TEX_SIZE / 2
  const r = (BLOCK_SIZE / 2 - 2) * RENDER_SCALE

  // Shadow
  g.fillStyle(0x000000, 0.15)
  g.fillCircle(cx + 1 * RENDER_SCALE, cy + 2 * RENDER_SCALE, r)

  // Main circle
  g.fillStyle(palette.fill)
  g.fillCircle(cx, cy, r)

  // Border
  g.lineStyle(2 * RENDER_SCALE, palette.border, 1)
  g.strokeCircle(cx, cy, r)

  // Highlight
  g.fillStyle(palette.highlight, 0.6)
  g.fillEllipse(cx - 2 * RENDER_SCALE, cy - 6 * RENDER_SCALE, r * 0.7, r * 0.4)
}

// ── Character traits (behind body) ───────────────────────────

function drawBehindTraits(g: Phaser.GameObjects.Graphics, charId: number, palette: { fill: number; border: number }): void {
  switch (charId) {
    case 0: // Pip — round bear ears
      g.fillStyle(palette.fill)
      g.fillCircle(px(12), px(10), sz(8))
      g.fillStyle(palette.border)
      g.fillCircle(px(12), px(10), sz(5))
      g.fillStyle(palette.fill)
      g.fillCircle(px(48), px(10), sz(8))
      g.fillStyle(palette.border)
      g.fillCircle(px(48), px(10), sz(5))
      break
    case 2: // Fizz — pointy cat ears
      g.fillStyle(palette.fill)
      g.fillTriangle(px(8), px(18), px(14), px(0), px(22), px(16))
      g.fillStyle(palette.border)
      g.fillTriangle(px(10), px(16), px(14), px(4), px(20), px(15))
      g.fillStyle(palette.fill)
      g.fillTriangle(px(38), px(16), px(46), px(0), px(52), px(18))
      g.fillStyle(palette.border)
      g.fillTriangle(px(40), px(15), px(46), px(4), px(50), px(16))
      break
  }
}

// ── Character traits (on top / front) ────────────────────────

function drawFrontTraits(g: Phaser.GameObjects.Graphics, charId: number, palette: { fill: number; border: number; highlight: number }): void {
  switch (charId) {
    case 1: { // Lumi — antenna with glowing orb
      g.lineStyle(2 * RENDER_SCALE, palette.border, 1)
      g.lineBetween(px(30), px(6), px(30), px(-2))
      g.fillStyle(0xffffff, 0.7)
      g.fillCircle(px(30), px(-4), sz(4))
      g.fillStyle(palette.fill)
      g.fillCircle(px(30), px(-4), sz(2.5))
      break
    }
    case 2: { // Fizz — whiskers
      g.lineStyle(1.2 * RENDER_SCALE, 0x2d3436, 0.3)
      g.lineBetween(px(6), px(32), px(16), px(34))
      g.lineBetween(px(7), px(36), px(16), px(36))
      g.lineBetween(px(44), px(34), px(54), px(32))
      g.lineBetween(px(44), px(36), px(53), px(36))
      break
    }
    case 3: { // Koko — leaf sprout
      g.lineStyle(2 * RENDER_SCALE, 0x40c9a2, 1)
      g.lineBetween(px(30), px(6), px(30), px(-1))
      // Right leaf
      g.fillStyle(0x40c9a2)
      g.fillEllipse(px(35), px(-2), sz(7) * 2, sz(4) * 2)
      // Left leaf (lighter)
      g.fillStyle(0x55efc4)
      g.fillEllipse(px(25), px(-1), sz(6) * 2, sz(3.5) * 2)
      break
    }
    case 4: { // Nyx — curved horns
      // Left horn: curve from (18,8) through (14,-2) to (10,-4)
      g.lineStyle(3.2 * RENDER_SCALE, palette.border, 1)
      g.beginPath()
      g.moveTo(px(18), px(8))
      // Approximate quadratic bezier with small line segments
      drawQuadBezier(g, px(18), px(8), px(14), px(-2), px(10), px(-4))
      g.strokePath()
      // Right horn
      g.beginPath()
      drawQuadBezier(g, px(42), px(8), px(46), px(-2), px(50), px(-4))
      g.strokePath()
      // Horn tips
      g.fillStyle(palette.fill)
      g.fillCircle(px(10), px(-4), sz(2.5))
      g.fillCircle(px(50), px(-4), sz(2.5))
      break
    }
    case 5: { // Blaze — flame crown
      // Outer flame (darker coral)
      g.fillStyle(palette.border, 1)
      g.beginPath()
      g.moveTo(px(20), px(8))
      g.lineTo(px(22), px(-1))
      g.lineTo(px(26), px(6))
      g.lineTo(px(30), px(-5))
      g.lineTo(px(34), px(6))
      g.lineTo(px(38), px(-1))
      g.lineTo(px(40), px(8))
      g.closePath()
      g.fillPath()
      // Inner flame (light coral)
      g.fillStyle(palette.highlight, 1)
      g.beginPath()
      g.moveTo(px(22), px(7))
      g.lineTo(px(25), px(0))
      g.lineTo(px(28), px(6))
      g.lineTo(px(30), px(-2))
      g.lineTo(px(32), px(6))
      g.lineTo(px(35), px(0))
      g.lineTo(px(38), px(7))
      g.closePath()
      g.fillPath()
      break
    }
  }
}

// ── Expression dispatcher ────────────────────────────────────

function drawExpression(g: Phaser.GameObjects.Graphics, expr: Expression, charId: number): void {
  switch (expr) {
    case 'happy': drawHappy(g, charId); break
    case 'sleepy': drawSleepy(g, charId); break
    case 'surprised': drawSurprised(g, charId); break
    case 'cheeky': drawCheeky(g, charId); break
    case 'dreamy': drawDreamy(g, charId); break
    case 'excited': drawExcited(g, charId); break
    case 'scared': drawScared(g, charId); break
    case 'dead': drawDead(g, charId); break
  }
}

// ── Expressions (per-character variants) ──────────────────────

function drawHappy(g: Phaser.GameObjects.Graphics, charId: number): void {
  const ink = 0x2d3436
  switch (charId) {
    case 0: { // Pip — round dot eyes with shine, U-smile, blush
      g.fillStyle(ink)
      g.fillCircle(px(21), px(25), sz(5))
      g.fillCircle(px(39), px(25), sz(5))
      g.fillStyle(0xffffff)
      g.fillCircle(px(22.5), px(23.5), sz(2))
      g.fillCircle(px(40.5), px(23.5), sz(2))
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(22), px(37), px(30), px(46), px(38), px(37))
      g.strokePath()
      g.fillStyle(0xffb8b8, 0.35)
      g.fillCircle(px(14), px(35), sz(5))
      g.fillCircle(px(46), px(35), sz(5))
      break
    }
    case 1: { // Lumi — small contemplative dots, raised brows, gentle arc
      g.fillStyle(ink)
      g.fillCircle(px(21), px(27), sz(3))
      g.fillCircle(px(39), px(27), sz(3))
      g.lineStyle(1.6 * RENDER_SCALE, ink, 0.6)
      g.lineBetween(px(17), px(20), px(25), px(19))
      g.lineBetween(px(35), px(19), px(43), px(20))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(25), px(38), px(30), px(42), px(35), px(38))
      g.strokePath()
      break
    }
    case 2: { // Fizz — one open dot + one squinty, fang grin
      g.fillStyle(ink)
      g.fillCircle(px(21), px(25), sz(5))
      g.fillStyle(0xffffff)
      g.fillCircle(px(22.5), px(23.5), sz(2))
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(34), px(26), px(39), px(22), px(44), px(26))
      g.strokePath()
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(20), px(37), px(30), px(44), px(40), px(37))
      g.strokePath()
      g.fillStyle(0xffffff)
      g.fillTriangle(px(35), px(37), px(37), px(37), px(36), px(42))
      break
    }
    case 3: { // Koko — tiny relaxed dots, flat gentle smile
      g.fillStyle(ink)
      g.fillCircle(px(22), px(26), sz(2.5))
      g.fillCircle(px(38), px(26), sz(2.5))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(25), px(38), px(30), px(41), px(35), px(38))
      g.strokePath()
      break
    }
    case 4: { // Nyx — half-moon lidded eyes + lash lines, smirk
      g.fillStyle(ink)
      g.beginPath()
      drawQuadBezier(g, px(16), px(27), px(21), px(22), px(26), px(27))
      drawQuadBezier(g, px(26), px(27), px(21), px(30), px(16), px(27))
      g.fillPath()
      g.beginPath()
      drawQuadBezier(g, px(34), px(27), px(39), px(22), px(44), px(27))
      drawQuadBezier(g, px(44), px(27), px(39), px(30), px(34), px(27))
      g.fillPath()
      g.lineStyle(1.6 * RENDER_SCALE, ink, 0.7)
      g.lineBetween(px(15), px(26), px(13), px(24))
      g.lineBetween(px(45), px(26), px(47), px(24))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(24), px(38), px(32), px(42), px(38), px(36))
      g.strokePath()
      break
    }
    case 5: { // Blaze — BIG round eyes + big shine, WIDE open smile + tooth line
      g.fillStyle(ink)
      g.fillCircle(px(21), px(24), sz(7))
      g.fillCircle(px(39), px(24), sz(7))
      g.fillStyle(0xffffff)
      g.fillCircle(px(23), px(22), sz(3))
      g.fillCircle(px(41), px(22), sz(3))
      g.lineStyle(2.8 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(18), px(37), px(30), px(48), px(42), px(37))
      g.strokePath()
      g.lineStyle(1.5 * RENDER_SCALE, 0xffffff, 0.5)
      g.lineBetween(px(26), px(40), px(34), px(40))
      break
    }
  }
}

function drawSleepy(g: Phaser.GameObjects.Graphics, charId: number): void {
  const ink = 0x2d3436
  switch (charId) {
    case 0: { // Pip — closed arc eyes, tiny O mouth, zzZ
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(16), px(26), px(21), px(30), px(26), px(26))
      g.strokePath()
      g.beginPath()
      drawQuadBezier(g, px(34), px(26), px(39), px(30), px(44), px(26))
      g.strokePath()
      g.fillStyle(ink)
      g.fillEllipse(px(30), px(38), sz(3) * 2, sz(2) * 2)
      drawZLetter(g, px(42), px(14), sz(5), 0.5)
      drawZLetter(g, px(47), px(9), sz(3.5), 0.3)
      break
    }
    case 1: { // Lumi — flat line eyes, barely-there mouth, zzZ
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.lineBetween(px(16), px(26), px(26), px(26))
      g.lineBetween(px(34), px(26), px(44), px(26))
      g.lineStyle(1.5 * RENDER_SCALE, ink, 0.5)
      g.lineBetween(px(27), px(38), px(33), px(38))
      drawZLetter(g, px(42), px(14), sz(5), 0.5)
      drawZLetter(g, px(47), px(9), sz(3.5), 0.3)
      break
    }
    case 2: { // Fizz — flat line eyes, fang peeking out
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.lineBetween(px(16), px(26), px(26), px(26))
      g.lineBetween(px(34), px(26), px(44), px(26))
      g.lineStyle(1.5 * RENDER_SCALE, ink, 0.7)
      g.lineBetween(px(26), px(38), px(34), px(38))
      g.fillStyle(0xffffff)
      g.fillTriangle(px(33), px(38), px(35), px(38), px(34), px(42))
      break
    }
    case 3: { // Koko — tiny barely-open dots, no mouth
      g.fillStyle(ink, 0.6)
      g.fillCircle(px(22), px(26), sz(1.5))
      g.fillCircle(px(38), px(26), sz(1.5))
      break
    }
    case 4: { // Nyx — heavy closed arcs with lashes, flat line
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(16), px(27), px(21), px(30), px(26), px(27))
      g.strokePath()
      g.beginPath()
      drawQuadBezier(g, px(34), px(27), px(39), px(30), px(44), px(27))
      g.strokePath()
      g.lineStyle(1.6 * RENDER_SCALE, ink, 0.7)
      g.lineBetween(px(15), px(27), px(13), px(25))
      g.lineBetween(px(45), px(27), px(47), px(25))
      g.lineStyle(1.5 * RENDER_SCALE, ink, 0.7)
      g.lineBetween(px(26), px(39), px(34), px(39))
      break
    }
    case 5: { // Blaze — droopy half-closed eyes, small frown
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.lineBetween(px(16), px(27), px(26), px(27))
      g.beginPath()
      drawQuadBezier(g, px(16), px(27), px(21), px(24), px(26), px(27))
      g.strokePath()
      g.lineBetween(px(34), px(27), px(44), px(27))
      g.beginPath()
      drawQuadBezier(g, px(34), px(27), px(39), px(24), px(44), px(27))
      g.strokePath()
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(24), px(40), px(30), px(37), px(36), px(40))
      g.strokePath()
      break
    }
  }
}

function drawSurprised(g: Phaser.GameObjects.Graphics, charId: number): void {
  const ink = 0x2d3436
  switch (charId) {
    case 0: { // Pip — huge round eyes + shine, O mouth
      g.fillStyle(ink)
      g.fillCircle(px(21), px(25), sz(7))
      g.fillCircle(px(39), px(25), sz(7))
      g.fillStyle(0xffffff)
      g.fillCircle(px(23), px(23), sz(3))
      g.fillCircle(px(41), px(23), sz(3))
      g.fillStyle(ink)
      g.fillEllipse(px(30), px(40), sz(5) * 2, sz(4) * 2)
      g.fillStyle(0xe17055)
      g.fillEllipse(px(30), px(40), sz(3) * 2, sz(2.5) * 2)
      break
    }
    case 1: { // Lumi — wide open eyes (biggest for Lumi), raised brows, small O
      g.fillStyle(ink)
      g.fillCircle(px(21), px(25), sz(5))
      g.fillCircle(px(39), px(25), sz(5))
      g.fillStyle(0xffffff)
      g.fillCircle(px(22.5), px(23.5), sz(2))
      g.fillCircle(px(40.5), px(23.5), sz(2))
      g.lineStyle(1.6 * RENDER_SCALE, ink, 0.6)
      g.lineBetween(px(17), px(17), px(25), px(17))
      g.lineBetween(px(35), px(17), px(43), px(17))
      g.fillStyle(ink)
      g.fillEllipse(px(30), px(40), sz(3) * 2, sz(2.5) * 2)
      break
    }
    case 2: { // Fizz — both eyes wide open, big O + fang
      g.fillStyle(ink)
      g.fillCircle(px(21), px(25), sz(6))
      g.fillCircle(px(39), px(25), sz(6))
      g.fillStyle(0xffffff)
      g.fillCircle(px(23), px(23), sz(2.5))
      g.fillCircle(px(41), px(23), sz(2.5))
      g.fillStyle(ink)
      g.fillEllipse(px(30), px(40), sz(5) * 2, sz(4) * 2)
      g.fillStyle(0xe17055)
      g.fillEllipse(px(30), px(40), sz(3) * 2, sz(2.5) * 2)
      g.fillStyle(0xffffff)
      g.fillTriangle(px(34), px(36), px(36), px(36), px(35), px(40))
      break
    }
    case 3: { // Koko — slightly bigger dots (still small), small O
      g.fillStyle(ink)
      g.fillCircle(px(22), px(26), sz(3.5))
      g.fillCircle(px(38), px(26), sz(3.5))
      g.fillStyle(ink)
      g.fillEllipse(px(30), px(40), sz(3) * 2, sz(2) * 2)
      break
    }
    case 4: { // Nyx — wide eyes, lashes raised, O mouth
      g.fillStyle(ink)
      g.fillCircle(px(21), px(25), sz(6))
      g.fillCircle(px(39), px(25), sz(6))
      g.fillStyle(0xffffff)
      g.fillCircle(px(22.5), px(23.5), sz(2.5))
      g.fillCircle(px(40.5), px(23.5), sz(2.5))
      g.lineStyle(1.6 * RENDER_SCALE, ink, 0.7)
      g.lineBetween(px(15), px(22), px(13), px(19))
      g.lineBetween(px(45), px(22), px(47), px(19))
      g.fillStyle(ink)
      g.fillEllipse(px(30), px(40), sz(4) * 2, sz(3) * 2)
      g.fillStyle(0xe17055)
      g.fillEllipse(px(30), px(40), sz(2.5) * 2, sz(2) * 2)
      break
    }
    case 5: { // Blaze — enormous eyes, giant O mouth
      g.fillStyle(ink)
      g.fillCircle(px(21), px(24), sz(8))
      g.fillCircle(px(39), px(24), sz(8))
      g.fillStyle(0xffffff)
      g.fillCircle(px(24), px(21), sz(3.5))
      g.fillCircle(px(42), px(21), sz(3.5))
      g.fillStyle(ink)
      g.fillEllipse(px(30), px(41), sz(7) * 2, sz(5) * 2)
      g.fillStyle(0xe17055)
      g.fillEllipse(px(30), px(41), sz(5) * 2, sz(3.5) * 2)
      break
    }
  }
}

function drawCheeky(g: Phaser.GameObjects.Graphics, charId: number): void {
  const ink = 0x2d3436
  switch (charId) {
    case 0: { // Pip — one open dot + one wink, tongue out
      g.fillStyle(ink)
      g.fillCircle(px(21), px(25), sz(5))
      g.fillStyle(0xffffff)
      g.fillCircle(px(22.5), px(23.5), sz(2))
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(34), px(26), px(39), px(20), px(44), px(26))
      g.strokePath()
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(22), px(37), px(30), px(43), px(38), px(36))
      g.strokePath()
      g.fillStyle(0xe17055)
      g.fillEllipse(px(37), px(41), sz(5) * 2, sz(4) * 2)
      break
    }
    case 1: { // Lumi — side-looking dots, raised brow, small smirk
      g.fillStyle(ink)
      g.fillCircle(px(23), px(27), sz(3))
      g.fillCircle(px(41), px(27), sz(3))
      g.lineStyle(1.6 * RENDER_SCALE, ink, 0.6)
      g.lineBetween(px(17), px(19), px(25), px(20))
      g.lineBetween(px(35), px(21), px(43), px(20))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(26), px(38), px(33), px(41), px(38), px(37))
      g.strokePath()
      break
    }
    case 2: { // Fizz — both winking (^^), big tongue out
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(16), px(28), px(21), px(20), px(26), px(28))
      g.strokePath()
      g.beginPath()
      drawQuadBezier(g, px(34), px(28), px(39), px(20), px(44), px(28))
      g.strokePath()
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(20), px(37), px(30), px(44), px(40), px(37))
      g.strokePath()
      g.fillStyle(0xe17055)
      g.fillEllipse(px(30), px(43), sz(6) * 2, sz(4) * 2)
      break
    }
    case 3: { // Koko — looking to the side, one-sided smile
      g.fillStyle(ink)
      g.fillCircle(px(24), px(26), sz(2.5))
      g.fillCircle(px(40), px(26), sz(2.5))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(25), px(39), px(30), px(41), px(35), px(37))
      g.strokePath()
      break
    }
    case 4: { // Nyx — one lidded eye + one open dot, knowing smirk + tongue
      g.fillStyle(ink)
      g.beginPath()
      drawQuadBezier(g, px(16), px(27), px(21), px(23), px(26), px(27))
      drawQuadBezier(g, px(26), px(27), px(21), px(29), px(16), px(27))
      g.fillPath()
      g.lineStyle(1.6 * RENDER_SCALE, ink, 0.7)
      g.lineBetween(px(15), px(26), px(13), px(24))
      g.fillStyle(ink)
      g.fillCircle(px(39), px(25), sz(5))
      g.fillStyle(0xffffff)
      g.fillCircle(px(40.5), px(23.5), sz(2))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(24), px(38), px(32), px(42), px(38), px(36))
      g.strokePath()
      g.fillStyle(0xe17055)
      g.fillEllipse(px(37), px(40), sz(4) * 2, sz(3) * 2)
      break
    }
    case 5: { // Blaze — one dot + one star, huge side grin
      g.fillStyle(ink)
      g.fillCircle(px(21), px(24), sz(7))
      g.fillStyle(0xffffff)
      g.fillCircle(px(23), px(22), sz(3))
      g.fillStyle(ink)
      g.fillCircle(px(39), px(24), sz(7))
      drawStarPupil(g, px(40), px(23), sz(5))
      g.lineStyle(2.8 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(18), px(37), px(30), px(46), px(42), px(35))
      g.strokePath()
      break
    }
  }
}

function drawDreamy(g: Phaser.GameObjects.Graphics, charId: number): void {
  const ink = 0x2d3436
  switch (charId) {
    case 0: { // Pip — heart eyes, gentle smile, sparkles
      drawHeart(g, px(21), px(25), sz(8), 0xe84393)
      drawHeart(g, px(39), px(25), sz(8), 0xe84393)
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(24), px(38), px(30), px(42), px(36), px(38))
      g.strokePath()
      drawSparkle(g, px(12), px(16), sz(4))
      drawSparkle(g, px(49), px(14), sz(3))
      break
    }
    case 1: { // Lumi — upward-gazing dots, soft U-smile, sparkle
      g.fillStyle(ink)
      g.fillCircle(px(21), px(23), sz(3))
      g.fillCircle(px(39), px(23), sz(3))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(24), px(37), px(30), px(42), px(36), px(37))
      g.strokePath()
      drawSparkle(g, px(49), px(14), sz(3))
      break
    }
    case 2: { // Fizz — heart eyes, small content smile
      drawHeart(g, px(21), px(25), sz(8), 0xe84393)
      drawHeart(g, px(39), px(25), sz(8), 0xe84393)
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(26), px(38), px(30), px(41), px(34), px(38))
      g.strokePath()
      break
    }
    case 3: { // Koko — closed happy arcs (^_^), blush, sparkle
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(17), px(28), px(22), px(22), px(27), px(28))
      g.strokePath()
      g.beginPath()
      drawQuadBezier(g, px(33), px(28), px(38), px(22), px(43), px(28))
      g.strokePath()
      g.fillStyle(0xffb8b8, 0.35)
      g.fillCircle(px(16), px(34), sz(4))
      g.fillCircle(px(44), px(34), sz(4))
      drawSparkle(g, px(49), px(14), sz(3))
      break
    }
    case 4: { // Nyx — half-lidded with stars inside, curve smile
      g.fillStyle(ink)
      g.beginPath()
      drawQuadBezier(g, px(16), px(27), px(21), px(22), px(26), px(27))
      drawQuadBezier(g, px(26), px(27), px(21), px(30), px(16), px(27))
      g.fillPath()
      g.beginPath()
      drawQuadBezier(g, px(34), px(27), px(39), px(22), px(44), px(27))
      drawQuadBezier(g, px(44), px(27), px(39), px(30), px(34), px(27))
      g.fillPath()
      drawStarPupil(g, px(21), px(26), sz(3))
      drawStarPupil(g, px(39), px(26), sz(3))
      g.lineStyle(1.6 * RENDER_SCALE, ink, 0.7)
      g.lineBetween(px(15), px(26), px(13), px(24))
      g.lineBetween(px(45), px(26), px(47), px(24))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(24), px(38), px(30), px(42), px(36), px(38))
      g.strokePath()
      break
    }
    case 5: { // Blaze — big heart eyes, wide happy smile, sparkles
      drawHeart(g, px(21), px(24), sz(11), 0xe84393)
      drawHeart(g, px(39), px(24), sz(11), 0xe84393)
      g.lineStyle(2.8 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(18), px(37), px(30), px(48), px(42), px(37))
      g.strokePath()
      drawSparkle(g, px(10), px(14), sz(4))
      drawSparkle(g, px(50), px(12), sz(3.5))
      break
    }
  }
}

function drawExcited(g: Phaser.GameObjects.Graphics, charId: number): void {
  const ink = 0x2d3436
  switch (charId) {
    case 0: { // Pip — big eyes with stars, D-shaped open mouth
      g.fillStyle(ink)
      g.fillCircle(px(21), px(24), sz(6))
      g.fillCircle(px(39), px(24), sz(6))
      drawStarPupil(g, px(22), px(23), sz(4.5))
      drawStarPupil(g, px(40), px(23), sz(4.5))
      g.fillStyle(ink)
      g.beginPath()
      g.moveTo(px(20), px(36))
      drawQuadBezier(g, px(20), px(36), px(30), px(48), px(40), px(36))
      g.closePath()
      g.fillPath()
      g.fillStyle(0xe17055)
      g.beginPath()
      g.moveTo(px(22), px(37))
      drawQuadBezier(g, px(22), px(37), px(30), px(46), px(38), px(37))
      g.closePath()
      g.fillPath()
      break
    }
    case 1: { // Lumi — wide eyes with star pupils, open smile
      g.fillStyle(ink)
      g.fillCircle(px(21), px(25), sz(5))
      g.fillCircle(px(39), px(25), sz(5))
      drawStarPupil(g, px(22), px(24), sz(3.5))
      drawStarPupil(g, px(40), px(24), sz(3.5))
      g.fillStyle(ink)
      g.beginPath()
      g.moveTo(px(22), px(37))
      drawQuadBezier(g, px(22), px(37), px(30), px(45), px(38), px(37))
      g.closePath()
      g.fillPath()
      g.fillStyle(0xe17055)
      g.beginPath()
      g.moveTo(px(24), px(38))
      drawQuadBezier(g, px(24), px(38), px(30), px(43), px(36), px(38))
      g.closePath()
      g.fillPath()
      break
    }
    case 2: { // Fizz — huge eyes with stars, open mouth + fang
      g.fillStyle(ink)
      g.fillCircle(px(21), px(24), sz(7))
      g.fillCircle(px(39), px(24), sz(7))
      drawStarPupil(g, px(22), px(23), sz(5))
      drawStarPupil(g, px(40), px(23), sz(5))
      g.fillStyle(ink)
      g.beginPath()
      g.moveTo(px(20), px(36))
      drawQuadBezier(g, px(20), px(36), px(30), px(48), px(40), px(36))
      g.closePath()
      g.fillPath()
      g.fillStyle(0xe17055)
      g.beginPath()
      g.moveTo(px(22), px(37))
      drawQuadBezier(g, px(22), px(37), px(30), px(46), px(38), px(37))
      g.closePath()
      g.fillPath()
      g.fillStyle(0xffffff)
      g.fillTriangle(px(35), px(36), px(37), px(36), px(36), px(40))
      break
    }
    case 3: { // Koko — actual open eyes (rare!), genuine smile
      g.fillStyle(ink)
      g.fillCircle(px(22), px(26), sz(4))
      g.fillCircle(px(38), px(26), sz(4))
      g.fillStyle(0xffffff)
      g.fillCircle(px(23), px(25), sz(1.5))
      g.fillCircle(px(39), px(25), sz(1.5))
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(22), px(37), px(30), px(44), px(38), px(37))
      g.strokePath()
      break
    }
    case 4: { // Nyx — big eyes with stars, lashes, open grin
      g.fillStyle(ink)
      g.fillCircle(px(21), px(24), sz(6))
      g.fillCircle(px(39), px(24), sz(6))
      drawStarPupil(g, px(22), px(23), sz(4.5))
      drawStarPupil(g, px(40), px(23), sz(4.5))
      g.lineStyle(1.6 * RENDER_SCALE, ink, 0.7)
      g.lineBetween(px(15), px(22), px(13), px(19))
      g.lineBetween(px(45), px(22), px(47), px(19))
      g.fillStyle(ink)
      g.beginPath()
      g.moveTo(px(20), px(36))
      drawQuadBezier(g, px(20), px(36), px(30), px(48), px(40), px(36))
      g.closePath()
      g.fillPath()
      g.fillStyle(0xe17055)
      g.beginPath()
      g.moveTo(px(22), px(37))
      drawQuadBezier(g, px(22), px(37), px(30), px(46), px(38), px(37))
      g.closePath()
      g.fillPath()
      break
    }
    case 5: { // Blaze — enormous star eyes, massive D-mouth
      g.fillStyle(ink)
      g.fillCircle(px(21), px(23), sz(8))
      g.fillCircle(px(39), px(23), sz(8))
      drawStarPupil(g, px(22), px(22), sz(6))
      drawStarPupil(g, px(40), px(22), sz(6))
      g.fillStyle(ink)
      g.beginPath()
      g.moveTo(px(16), px(35))
      drawQuadBezier(g, px(16), px(35), px(30), px(52), px(44), px(35))
      g.closePath()
      g.fillPath()
      g.fillStyle(0xe17055)
      g.beginPath()
      g.moveTo(px(18), px(36))
      drawQuadBezier(g, px(18), px(36), px(30), px(50), px(42), px(36))
      g.closePath()
      g.fillPath()
      break
    }
  }
}

function drawScared(g: Phaser.GameObjects.Graphics, charId: number): void {
  const ink = 0x2d3436
  switch (charId) {
    case 0: { // Pip — round white eyes with shine + tiny pupils, zigzag mouth, sweat
      g.fillStyle(0xffffff)
      g.fillCircle(px(21), px(25), sz(7))
      g.fillCircle(px(39), px(25), sz(7))
      g.lineStyle(1.6 * RENDER_SCALE, ink, 1)
      g.strokeCircle(px(21), px(25), sz(7))
      g.strokeCircle(px(39), px(25), sz(7))
      g.fillStyle(ink)
      g.fillCircle(px(23), px(27), sz(2.5))
      g.fillCircle(px(41), px(27), sz(2.5))
      // Pip's signature shine highlights
      g.fillStyle(0xffffff, 0.6)
      g.fillCircle(px(18), px(22), sz(2.5))
      g.fillCircle(px(36), px(22), sz(2.5))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      g.moveTo(px(20), px(40))
      g.lineTo(px(25), px(37))
      g.lineTo(px(30), px(40))
      g.lineTo(px(35), px(37))
      g.lineTo(px(40), px(40))
      g.strokePath()
      g.fillStyle(0x74b9ff, 0.6)
      g.fillEllipse(px(48), px(18), sz(3) * 2, sz(5) * 2)
      break
    }
    case 1: { // Lumi — small white eyes + worried brows, wavy mouth, double sweat
      g.fillStyle(0xffffff)
      g.fillCircle(px(21), px(27), sz(4.5))
      g.fillCircle(px(39), px(27), sz(4.5))
      g.lineStyle(1.6 * RENDER_SCALE, ink, 1)
      g.strokeCircle(px(21), px(27), sz(4.5))
      g.strokeCircle(px(39), px(27), sz(4.5))
      g.fillStyle(ink)
      g.fillCircle(px(22), px(28), sz(1.5))
      g.fillCircle(px(40), px(28), sz(1.5))
      // Lumi's signature worried brow lines
      g.lineStyle(2 * RENDER_SCALE, ink, 0.7)
      g.lineBetween(px(16), px(20), px(25), px(22))
      g.lineBetween(px(35), px(22), px(44), px(20))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(22), px(39), px(26), px(42), px(30), px(39))
      drawQuadBezier(g, px(30), px(39), px(34), px(36), px(38), px(39))
      g.strokePath()
      g.fillStyle(0x74b9ff, 0.6)
      g.fillEllipse(px(48), px(16), sz(2.5) * 2, sz(4) * 2)
      g.fillEllipse(px(46), px(22), sz(2) * 2, sz(3) * 2)
      break
    }
    case 2: { // Fizz — one big white eye + one squinty, jagged mouth, sweat
      // Left eye (big white circle)
      g.fillStyle(0xffffff)
      g.fillCircle(px(21), px(25), sz(7))
      g.lineStyle(1.6 * RENDER_SCALE, ink, 1)
      g.strokeCircle(px(21), px(25), sz(7))
      g.fillStyle(ink)
      g.fillCircle(px(23), px(27), sz(2.5))
      // Right eye (squinty arc — Fizz's signature asymmetry)
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(34), px(26), px(39), px(23), px(44), px(26))
      g.strokePath()
      g.fillStyle(ink)
      g.fillCircle(px(39), px(27), sz(1.5))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      g.moveTo(px(20), px(39))
      g.lineTo(px(24), px(37))
      g.lineTo(px(27), px(41))
      g.lineTo(px(30), px(36))
      g.lineTo(px(33), px(41))
      g.lineTo(px(36), px(37))
      g.lineTo(px(40), px(39))
      g.strokePath()
      g.fillStyle(0x74b9ff, 0.6)
      g.fillEllipse(px(48), px(18), sz(3) * 2, sz(5) * 2)
      break
    }
    case 3: { // Koko — slightly bigger white dots, flat frown (still chill), single sweat
      g.fillStyle(0xffffff)
      g.fillCircle(px(22), px(26), sz(4))
      g.fillCircle(px(38), px(26), sz(4))
      g.lineStyle(1.4 * RENDER_SCALE, ink, 1)
      g.strokeCircle(px(22), px(26), sz(4))
      g.strokeCircle(px(38), px(26), sz(4))
      g.fillStyle(ink)
      g.fillCircle(px(23), px(27), sz(1.5))
      g.fillCircle(px(39), px(27), sz(1.5))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      drawQuadBezier(g, px(25), px(40), px(30), px(38), px(35), px(40))
      g.strokePath()
      g.fillStyle(0x74b9ff, 0.5)
      g.fillEllipse(px(46), px(20), sz(2) * 2, sz(3.5) * 2)
      break
    }
    case 4: { // Nyx — white eyes with lashes, zigzag, tear drop
      g.fillStyle(0xffffff)
      g.fillCircle(px(21), px(25), sz(6))
      g.fillCircle(px(39), px(25), sz(6))
      g.lineStyle(1.6 * RENDER_SCALE, ink, 1)
      g.strokeCircle(px(21), px(25), sz(6))
      g.strokeCircle(px(39), px(25), sz(6))
      g.fillStyle(ink)
      g.fillCircle(px(22), px(27), sz(2))
      g.fillCircle(px(40), px(27), sz(2))
      g.lineStyle(1.6 * RENDER_SCALE, ink, 0.7)
      g.lineBetween(px(15), px(22), px(13), px(20))
      g.lineBetween(px(45), px(22), px(47), px(20))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.beginPath()
      g.moveTo(px(22), px(40))
      g.lineTo(px(26), px(37))
      g.lineTo(px(30), px(40))
      g.lineTo(px(34), px(37))
      g.lineTo(px(38), px(40))
      g.strokePath()
      g.fillStyle(0x74b9ff, 0.7)
      g.fillEllipse(px(14), px(33), sz(2.5) * 2, sz(4) * 2)
      break
    }
    case 5: { // Blaze — HUGE white eyes with big shine + big pupils, rectangle mouth + teeth, sweat drops
      g.fillStyle(0xffffff)
      g.fillCircle(px(21), px(24), sz(9))
      g.fillCircle(px(39), px(24), sz(9))
      g.lineStyle(1.6 * RENDER_SCALE, ink, 1)
      g.strokeCircle(px(21), px(24), sz(9))
      g.strokeCircle(px(39), px(24), sz(9))
      g.fillStyle(ink)
      g.fillCircle(px(24), px(27), sz(3.5))
      g.fillCircle(px(42), px(27), sz(3.5))
      // Blaze's signature big shine highlights
      g.fillStyle(0xffffff, 0.6)
      g.fillCircle(px(18), px(20), sz(3.5))
      g.fillCircle(px(36), px(20), sz(3.5))
      g.fillStyle(ink)
      g.fillRect(px(20), px(37), sz(20), sz(8))
      g.fillStyle(0xffffff)
      g.fillRect(px(22), px(37), sz(4), sz(3))
      g.fillRect(px(27), px(37), sz(4), sz(3))
      g.fillRect(px(32), px(37), sz(4), sz(3))
      g.fillStyle(0x74b9ff, 0.6)
      g.fillEllipse(px(48), px(14), sz(3) * 2, sz(5) * 2)
      g.fillEllipse(px(50), px(22), sz(2) * 2, sz(3.5) * 2)
      break
    }
  }
}

function drawDead(g: Phaser.GameObjects.Graphics, charId: number): void {
  const ink = 0x2d3436
  switch (charId) {
    case 0: { // Pip — X eyes, flat line, tongue out
      g.lineStyle(2.8 * RENDER_SCALE, ink, 1)
      g.lineBetween(px(15), px(20), px(27), px(30))
      g.lineBetween(px(27), px(20), px(15), px(30))
      g.lineBetween(px(33), px(20), px(45), px(30))
      g.lineBetween(px(45), px(20), px(33), px(30))
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.lineBetween(px(22), px(40), px(38), px(40))
      g.fillStyle(0xe17055)
      g.fillEllipse(px(35), px(44), sz(4) * 2, sz(3) * 2)
      break
    }
    case 1: { // Lumi — spiral eyes, flat line
      drawSpiral(g, px(21), px(25), sz(6), ink)
      drawSpiral(g, px(39), px(25), sz(6), ink)
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.lineBetween(px(24), px(40), px(36), px(40))
      break
    }
    case 2: { // Fizz — X eyes, tongue out sideways + fang
      g.lineStyle(2.8 * RENDER_SCALE, ink, 1)
      g.lineBetween(px(15), px(20), px(27), px(30))
      g.lineBetween(px(27), px(20), px(15), px(30))
      g.lineBetween(px(33), px(20), px(45), px(30))
      g.lineBetween(px(45), px(20), px(33), px(30))
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.lineBetween(px(22), px(40), px(38), px(40))
      g.fillStyle(0xe17055)
      g.fillEllipse(px(40), px(43), sz(5) * 2, sz(3) * 2)
      g.fillStyle(0xffffff)
      g.fillTriangle(px(34), px(40), px(36), px(40), px(35), px(44))
      break
    }
    case 3: { // Koko — circle eyes (O_O), flat mouth
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.strokeCircle(px(22), px(26), sz(4))
      g.strokeCircle(px(38), px(26), sz(4))
      g.lineStyle(2 * RENDER_SCALE, ink, 1)
      g.lineBetween(px(25), px(40), px(35), px(40))
      break
    }
    case 4: { // Nyx — spiral eyes, tongue out, lashes still visible
      drawSpiral(g, px(21), px(25), sz(6), ink)
      drawSpiral(g, px(39), px(25), sz(6), ink)
      g.lineStyle(1.6 * RENDER_SCALE, ink, 0.7)
      g.lineBetween(px(15), px(22), px(13), px(20))
      g.lineBetween(px(45), px(22), px(47), px(20))
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.lineBetween(px(22), px(40), px(38), px(40))
      g.fillStyle(0xe17055)
      g.fillEllipse(px(35), px(44), sz(4) * 2, sz(3) * 2)
      break
    }
    case 5: { // Blaze — flat line eyes (—_—), flat mouth
      g.lineStyle(3 * RENDER_SCALE, ink, 1)
      g.lineBetween(px(14), px(25), px(28), px(25))
      g.lineBetween(px(32), px(25), px(46), px(25))
      g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
      g.lineBetween(px(20), px(40), px(40), px(40))
      break
    }
  }
}

// ── Drawing helpers ──────────────────────────────────────────

function drawQuadBezier(
  g: Phaser.GameObjects.Graphics,
  x0: number, y0: number,
  cx: number, cy: number,
  x1: number, y1: number,
  steps = 12,
): void {
  g.moveTo(x0, y0)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    const bx = mt * mt * x0 + 2 * mt * t * cx + t * t * x1
    const by = mt * mt * y0 + 2 * mt * t * cy + t * t * y1
    g.lineTo(bx, by)
  }
}

function drawHeart(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, color: number): void {
  const hs = size / 2
  g.fillStyle(color)
  g.fillCircle(cx - hs * 0.5, cy - hs * 0.3, hs * 0.65)
  g.fillCircle(cx + hs * 0.5, cy - hs * 0.3, hs * 0.65)
  g.fillTriangle(
    cx - hs, cy,
    cx + hs, cy,
    cx, cy + hs * 0.9,
  )
}

function drawSparkle(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
  g.fillStyle(0xffffff, 0.8)
  g.fillRect(x - size, y - 0.5 * RENDER_SCALE, size * 2, 1 * RENDER_SCALE)
  g.fillRect(x - 0.5 * RENDER_SCALE, y - size, 1 * RENDER_SCALE, size * 2)
}

function drawStarPupil(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
  g.lineStyle(2 * RENDER_SCALE, 0xffffff, 1)
  // Cross
  g.lineBetween(x - size, y, x + size, y)
  g.lineBetween(x, y - size, x, y + size)
  // Diagonal
  g.lineStyle(1.2 * RENDER_SCALE, 0xffffff, 1)
  g.lineBetween(x - size * 0.6, y - size * 0.6, x + size * 0.6, y + size * 0.6)
  g.lineBetween(x + size * 0.6, y - size * 0.6, x - size * 0.6, y + size * 0.6)
}

function drawZLetter(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, alpha: number): void {
  g.lineStyle(1.5 * RENDER_SCALE, 0x2d3436, alpha)
  g.lineBetween(x, y, x + size, y)
  g.lineBetween(x + size, y, x, y + size)
  g.lineBetween(x, y + size, x + size, y + size)
}

function drawSpiral(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, color: number): void {
  g.lineStyle(1.8 * RENDER_SCALE, color, 1)
  g.beginPath()
  const turns = 2.5
  const steps = 30
  g.moveTo(cx, cy)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const angle = turns * Math.PI * 2 * t
    const r = size * t
    g.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
  }
  g.strokePath()
}

// ── Garbage block textures ────────────────────────────────────

export function generateGarbageTextures(scene: Phaser.Scene): void {
  const { fill, border, highlight } = GARBAGE_BLOCK
  const ink = 0x2d3436

  // garbage_cell: cute round blob (same style as regular tiles)
  // Uses TEX_SIZE/RENDER_SCALE from module scope
  {
    const g = scene.add.graphics()
    const cx = TEX_SIZE / 2
    const cy = TEX_SIZE / 2
    const r = (BLOCK_SIZE / 2 - 2) * RENDER_SCALE

    // Shadow
    g.fillStyle(0x000000, 0.15)
    g.fillCircle(cx + 1 * RENDER_SCALE, cy + 2 * RENDER_SCALE, r)

    // Main circle
    g.fillStyle(fill)
    g.fillCircle(cx, cy, r)

    // Border
    g.lineStyle(2 * RENDER_SCALE, border, 1)
    g.strokeCircle(cx, cy, r)

    // Highlight
    g.fillStyle(highlight, 0.6)
    g.fillEllipse(cx - 2 * RENDER_SCALE, cy - 6 * RENDER_SCALE, r * 0.7, r * 0.4)

    // Grumpy face — angry brow eyes + flat frown
    // Left eye: dot
    g.fillStyle(ink)
    g.fillCircle(px(21), px(26), sz(4))
    g.fillStyle(0xffffff)
    g.fillCircle(px(22), px(24.5), sz(1.5))

    // Right eye: dot
    g.fillStyle(ink)
    g.fillCircle(px(39), px(26), sz(4))
    g.fillStyle(0xffffff)
    g.fillCircle(px(40), px(24.5), sz(1.5))

    // Angry brows — angled lines above eyes
    g.lineStyle(2.4 * RENDER_SCALE, ink, 0.8)
    // Left brow: low on inside, high on outside
    g.beginPath()
    g.moveTo(px(15), px(18))
    g.lineTo(px(26), px(21))
    g.strokePath()
    // Right brow: high on outside, low on inside
    g.beginPath()
    g.moveTo(px(34), px(21))
    g.lineTo(px(45), px(18))
    g.strokePath()

    // Frown
    g.lineStyle(2.4 * RENDER_SCALE, ink, 1)
    g.beginPath()
    drawQuadBezier(g, px(22), px(40), px(30), px(36), px(38), px(40))
    g.strokePath()

    g.generateTexture('garbage_cell', TEX_SIZE, TEX_SIZE)
    g.destroy()
  }
}
