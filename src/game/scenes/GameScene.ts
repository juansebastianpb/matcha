import Phaser from 'phaser'
import { GameEngine } from '../engine'
import type { GameState } from '../engine'
import { getScore } from '../engine/scoring'
import {
  GRID_ROWS, GRID_COLS, GRID_OFFSET_X, GRID_OFFSET_Y,
  CELL_SIZE, BLOCK_SIZE, BLOCK_GAP, GAME_WIDTH, GAME_HEIGHT,
  ENGINE_FPS, AUTO_RISE_INTERVAL,
} from '../constants'
import { useGameStore } from '../../stores/gameStore'
import { spawnClearParticles, spawnTrailParticle, spawnLandingDust } from '../art/effects'
import * as Sound from '../audio/SoundManager'
import { startMusic, stopMusic } from '../audio/SoundManager'

// Map engine color names to tile texture indices
const COLOR_TO_INDEX: Record<string, number> = {
  red: 0,      // Yellow happy face
  blue: 1,     // Blue sleepy face
  green: 3,    // Green cheeky face
  violet: 4,   // Purple dreamy face
  yellow: 5,   // Orange excited face
  navy: 2,     // Pink surprised face
}

// Danger zone thresholds — based on highest occupied row
const DANGER_THRESHOLDS = [4, 2, 0] as const
const DANGER_VARIANT = ['_cheeky', '_scared', '_dead'] as const
const DANGER_WOBBLE_AMP = [1, 2, 3] as const
const DANGER_WOBBLE_FREQ = [0.006, 0.012, 0.02] as const

// Juice constants
const SCORE_POPUP_FONT = 20
const CHAIN_FONT = 48
const COMBO_FONT = 42
const SCORE_RISE = 60
const SWELL_PEAK = 1.35
const STAGGER_MS = 40
const DEATH_COL_DELAY = 80
const DEATH_ROW_DELAY = 30
const DANGER_ALPHA = [0, 0.1, 0.25, 0.4] as const

// Hype words escalating by combo/chain size
const COMBO_WORDS = ['NICE!', 'GREAT!', 'AMAZING!', 'INCREDIBLE!', 'UNSTOPPABLE!']
const CHAIN_WORDS = ['CHAIN!', 'SUPER!', 'BLAZING!', 'LEGENDARY!', 'GODLIKE!']

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine
  private sprites: (Phaser.GameObjects.Sprite | null)[] = []
  private glowSprites: (Phaser.GameObjects.Sprite | null)[] = []
  private previewSprites: Phaser.GameObjects.Sprite[] = []
  private cursorGraphics!: Phaser.GameObjects.Graphics
  private cursorX = 0
  private cursorY = 0

  private engineAccum = 0
  private isGameOver = false
  private autoRiseCounter = 0
  private lastState: GameState | null = null
  private totalBlocksCleared = 0
  private savedFinalScore = 0
  private engineStepCount = 0
  private _wasCountingDown = true

  // Track per-slot state for detecting transitions
  private prevFloatTimers: number[] = []
  private prevFlashTimers: number[] = []

  // Flash animation: real ms timestamps and stagger offsets
  private flashStartTimes: number[] = []
  private flashStaggerOffsets: number[] = []

  // Landing surprise: timestamp when each slot last landed
  private landingSurpriseTimes: number[] = []

  // White flash overlay for big chains
  private flashOverlay!: Phaser.GameObjects.Rectangle

  // Danger overlay
  private dangerOverlay!: Phaser.GameObjects.Graphics
  private currentDangerAlpha = 0

  // Multiplier banner
  private multiplierBanner: Phaser.GameObjects.Text | null = null
  private multiplierBg: Phaser.GameObjects.Rectangle | null = null

  // Grid visuals
  private gridBg!: Phaser.GameObjects.Graphics
  private gridGlow!: Phaser.GameObjects.Graphics
  private gridLines!: Phaser.GameObjects.Graphics
  private borderGlow!: Phaser.GameObjects.Graphics
  private shutterTop!: Phaser.GameObjects.Graphics
  private shutterBottom!: Phaser.GameObjects.Graphics
  private shutterGlowTop!: Phaser.GameObjects.Graphics
  private shutterGlowBottom!: Phaser.GameObjects.Graphics
  private gameOverText: Phaser.GameObjects.Text | null = null
  private gameOverFaces: Phaser.GameObjects.Sprite[] = []

  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    this.isGameOver = false
    this.engineAccum = 0
    this.autoRiseCounter = 0
    this.totalBlocksCleared = 0
    this.savedFinalScore = 0
    this.engineStepCount = 0
    this.cursorX = 2
    this.cursorY = 6
    this.gameOverText = null
    this.gameOverFaces = []
    // Init engine
    this.engine = new GameEngine({
      width: GRID_COLS,
      height: GRID_ROWS,
      initialRows: 6,
      scoringSystem: 'puzzleLeague',
    })

    // Listen for engine effects
    this.engine.on('chainMatchMade', (effect) => {
      if (this.isGameOver) return
      // Suppress all effects during startup grace period
      if (this.engineStepCount < 30) return
      this.totalBlocksCleared += effect.indices?.length ?? 0
      const chainNum = effect.chainNumber ?? 0
      if (chainNum > 1) {
        const centroid = effect.indices
          ? this.getBlockCentroid(effect.indices)
          : { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 - 30 }

        // Giant chain text
        const word = CHAIN_WORDS[Math.min(chainNum - 2, CHAIN_WORDS.length - 1)]
        this.showHypeText(`${chainNum}x ${word}`, '#FFD700', CHAIN_FONT + chainNum * 4)
        this.showMultiplierBanner(chainNum)

        useGameStore.getState().setChain(chainNum)
        const store = useGameStore.getState()
        store.setMaxChain(Math.max(chainNum, store.maxChain))
        Sound.playChain(chainNum)
        useGameStore.getState().setExcitement(Math.min(2 + chainNum, 5))
        this.doChainScreenEffect(chainNum)

        // Full-screen React celebration
        useGameStore.getState().emitCelebration('chain', Math.min(chainNum, 5))

        // Score popup
        if (effect.indices) {
          const score = getScore('puzzleLeague', effect.indices.length, chainNum)
          this.showScorePopup(score, centroid.x, centroid.y - 20)
          this.assignFlashStagger(effect.indices)
        }

        // Sparkle explosion + starburst — scaled up
        this.spawnFullScreenSparkles(centroid.x, centroid.y, 30 + chainNum * 8)
        this.spawnStarburst(centroid.x, centroid.y)

        // Flying celebration faces
        if (effect.indices) {
          this.spawnCelebrationFaces(centroid.x, centroid.y, effect.indices, Math.min(chainNum + 2, 8))
        }

        // Confetti for chains 2+
        this.spawnConfetti(20 + chainNum * 12)
      }
    })

    this.engine.on('matchMade', (effect) => {
      if (this.isGameOver) return
      // Suppress all effects during startup grace period
      if (this.engineStepCount < 30) return
      this.totalBlocksCleared += effect.indices?.length ?? 0
      const count = effect.indices?.length ?? 0
      Sound.playMatch()
      useGameStore.getState().setExcitement(count > 3 ? 2 : 1)

      // Start glow + scale pulse on matched blocks
      if (effect.indices) {
        for (const idx of effect.indices) {
          this.startMatchEffect(idx)
        }
        this.assignFlashStagger(effect.indices)
      }

      // Score popup at match location
      if (effect.indices) {
        const centroid = this.getBlockCentroid(effect.indices)
        const score = getScore('puzzleLeague', count, 0)
        this.showScorePopup(score, centroid.x, centroid.y)

        // Sparkle burst for every match — beefed up
        this.spawnFullScreenSparkles(centroid.x, centroid.y, 14 + count * 2)
      }

      if (count > 3) {
        const centroid = effect.indices
          ? this.getBlockCentroid(effect.indices)
          : { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 + 10 }

        // Big hype word instead of plain combo text
        const comboLevel = count - 4
        const word = COMBO_WORDS[Math.min(comboLevel, COMBO_WORDS.length - 1)]
        this.showHypeText(`${count}x ${word}`, '#FFFFFF', COMBO_FONT + count * 2)

        const store = useGameStore.getState()
        store.setMaxCombo(Math.max(count - 2, store.maxCombo))

        // Full-screen React celebration
        useGameStore.getState().emitCelebration('combo', Math.min(count - 2, 5))

        // Column flash
        if (effect.indices) {
          this.doColumnFlash(effect.indices)
        }

        // Sparkles + starburst — scaled up
        this.spawnFullScreenSparkles(centroid.x, centroid.y, 20 + count * 4)
        this.spawnStarburst(centroid.x, centroid.y)

        // Flying faces
        if (effect.indices) {
          this.spawnCelebrationFaces(centroid.x, centroid.y, effect.indices, Math.min(count, 8))
        }

        // Confetti for combos 4+
        this.spawnConfetti(20 + count * 8)

        // Border glow on combo
        this.flashBorderGlow(0xffffff, 0.3)
      }
    })

    this.engine.on('flashDone', (effect) => {
      if (this.isGameOver) return
      if (this.engineStepCount < 30) return
      // Particles on clear
      if (effect.indices) {
        for (const idx of effect.indices) {
          this.spawnParticlesAt(idx)
        }
      } else if (effect.index !== undefined) {
        this.spawnParticlesAt(effect.index)
      }
    })

    this.engine.on('chainDone', () => {
      if (this.isGameOver) return
      if (this.engineStepCount < 30) return
      this.hideMultiplierBanner()
      useGameStore.getState().setChain(0)
    })

    this.engine.on('blockLanded', (effect) => {
      if (this.isGameOver) return
      if (this.engineStepCount < 30) return
      Sound.playLand()
      // Landing dust
      if (effect.index !== undefined) {
        const col = effect.index % GRID_COLS
        const row = Math.floor(effect.index / GRID_COLS)
        const x = GRID_OFFSET_X + col * CELL_SIZE + BLOCK_SIZE / 2
        const y = GRID_OFFSET_Y + row * CELL_SIZE + BLOCK_SIZE / 2
        spawnLandingDust(this, x, y, BLOCK_SIZE)
      }
    })

    // Game over: blocks reached the top
    this.engine.on('gameOver', () => {
      this.doCascadingDeath()
    })

    // Cursor moves up when a row is added
    this.engine.on('addRow', () => {
      if (this.isGameOver) return
      if (this.engineStepCount < 30) return
      if (this.cursorY > 0) this.cursorY--
      Sound.playRowPush()
    })

    this.drawBackground()
    this.drawGridBackground()

    // Create danger overlay — covers only the grid area (rounded to match grid bg)
    this.dangerOverlay = this.add.graphics()
    this.dangerOverlay.setDepth(-0.5)

    // Create sprite pool + glow pool
    const totalCells = GRID_ROWS * GRID_COLS
    this.sprites = new Array(totalCells).fill(null)
    this.glowSprites = new Array(totalCells).fill(null)
    this.prevFloatTimers = new Array(totalCells).fill(-1)
    this.prevFlashTimers = new Array(totalCells).fill(-1)
    this.flashStartTimes = new Array(totalCells).fill(0)
    this.flashStaggerOffsets = new Array(totalCells).fill(0)
    this.landingSurpriseTimes = new Array(totalCells).fill(0)
    this.previewSprites = []

    for (let x = 0; x < GRID_COLS; x++) {
      const sprite = this.add.sprite(
        GRID_OFFSET_X + x * CELL_SIZE + BLOCK_SIZE / 2,
        GRID_OFFSET_Y + GRID_ROWS * CELL_SIZE + BLOCK_SIZE / 2 + 4,
        'tile_0'
      )
      sprite.setDisplaySize(CELL_SIZE - 6, CELL_SIZE - 6)
      sprite.setAlpha(0.25)
      sprite.setDepth(1)
      sprite.setVisible(false)
      this.previewSprites.push(sprite)
    }

    this.cursorGraphics = this.add.graphics()
    this.cursorGraphics.setDepth(5)

    // White flash overlay for chain effects — scoped to grid
    const fx = GRID_OFFSET_X - 4
    const fy = GRID_OFFSET_Y - 4
    const fw = GRID_COLS * CELL_SIZE + 8
    const fh = GRID_ROWS * CELL_SIZE + 8
    this.flashOverlay = this.add.rectangle(
      fx + fw / 2, fy + fh / 2, fw, fh, 0xffffff,
    )
    this.flashOverlay.setAlpha(0)
    this.flashOverlay.setDepth(15)

    // Shutters for game-over close effect (hidden until needed)
    this.shutterTop = this.add.graphics()
    this.shutterTop.setDepth(16)
    this.shutterBottom = this.add.graphics()
    this.shutterBottom.setDepth(16)
    this.shutterGlowTop = this.add.graphics()
    this.shutterGlowTop.setDepth(16)
    this.shutterGlowBottom = this.add.graphics()
    this.shutterGlowBottom.setDepth(16)


    // Input: pointer
    this.input.on('pointerdown', this.handlePointer, this)

    // Input: keyboard
    this.input.keyboard?.on('keydown-LEFT', () => {
      if (this.cursorX > 0) this.cursorX--
    })
    this.input.keyboard?.on('keydown-RIGHT', () => {
      if (this.cursorX < GRID_COLS - 2) this.cursorX++
    })
    this.input.keyboard?.on('keydown-UP', () => {
      if (this.cursorY > 0) this.cursorY--
    })
    this.input.keyboard?.on('keydown-DOWN', () => {
      if (this.cursorY < GRID_ROWS - 1) this.cursorY++
    })
    this.input.keyboard?.on('keydown-SPACE', () => this.doSwap())
    this.input.keyboard?.on('keydown-X', () => this.doSwap())
    this.input.keyboard?.on('keydown-Z', () => this.doAddRow())

    // Clean up on shutdown (e.g. game destroyed on navigation)
    this.events.on('shutdown', () => {
      stopMusic()
      this.engine.removeAllListeners()
      this.time.removeAllEvents()
      this.input.removeAllListeners()
      this.input.keyboard?.removeAllListeners()
    })

    // Initial render
    this.lastState = this.engine.step()
    this.renderState(this.lastState)

    const store = useGameStore.getState()
    store.reset()
    store.setPlaying(true)
    store.setCountdown(3)
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return

    const countingDown = useGameStore.getState().countdown !== null

    // When countdown just finished, start music
    if (this._wasCountingDown && !countingDown) {
      startMusic()
    }
    this._wasCountingDown = countingDown

    if (!countingDown) {
      // Fixed timestep engine tick
      this.engineAccum += delta
      const msPerTick = 1000 / ENGINE_FPS

      while (this.engineAccum >= msPerTick) {
        this.engineAccum -= msPerTick

        if (this.isGameOver) break

        // Auto-rise
        this.autoRiseCounter++
        if (this.autoRiseCounter >= AUTO_RISE_INTERVAL) {
          this.autoRiseCounter = 0
          this.engine.addEvent({
            time: this.engine.time,
            type: 'addRow',
          })
        }

        this.lastState = this.engine.step()
        this.engineStepCount++
      }
    }

    // Render every frame (grid visible behind countdown overlay)
    if (this.lastState) {
      this.renderState(this.lastState, delta)

      if (!this.isGameOver) {
        const store = useGameStore.getState()
        store.setScore(this.lastState.score)
        store.tickDisplayScore()
      }
    }

    if (!this.isGameOver && !countingDown) this.drawCursor()
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (this.isGameOver) return
    if (useGameStore.getState().countdown !== null) return

    const col = Math.floor((pointer.x - GRID_OFFSET_X) / CELL_SIZE)
    const row = Math.floor((pointer.y - GRID_OFFSET_Y) / CELL_SIZE)

    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      if (row >= GRID_ROWS) this.doAddRow()
      return
    }

    if (row === this.cursorY && (col === this.cursorX || col === this.cursorX + 1)) {
      this.doSwap()
      return
    }

    this.cursorX = Math.min(col, GRID_COLS - 2)
    this.cursorY = row
  }

  private doSwap(): void {
    if (this.isGameOver) return
    if (useGameStore.getState().countdown !== null) return
    Sound.playSwap()
    this.engine.addEvent({
      time: this.engine.time,
      type: 'swap',
      index: this.cursorX + this.cursorY * GRID_COLS,
    })
  }

  private doAddRow(): void {
    if (this.isGameOver) return
    this.engine.addEvent({
      time: this.engine.time,
      type: 'addRow',
    })
    this.autoRiseCounter = 0
  }

  private renderState(state: GameState, delta = 0): void {
    const lerpSpeed = 12
    const t = delta > 0 ? 1 - Math.exp(-lerpSpeed * delta / 1000) : 1
    const now = this.time.now

    // Compute highest occupied row (lowest row index with a colored non-garbage block)
    let highestOccupiedRow = GRID_ROWS // safe default (no blocks)
    for (let i = 0; i < state.blocks.length; i++) {
      const block = state.blocks[i]
      if (block.color && !block.garbage) {
        const row = Math.floor(i / state.width)
        if (row < highestOccupiedRow) highestOccupiedRow = row
      }
    }

    // Determine danger level: 0 = safe, 1 = nervous, 2 = panic, 3 = dead
    let dangerLevel = 0
    for (let lvl = 0; lvl < DANGER_THRESHOLDS.length; lvl++) {
      if (highestOccupiedRow <= DANGER_THRESHOLDS[lvl]) {
        dangerLevel = lvl + 1
      }
    }

    // Update danger overlay
    this.updateDangerOverlay(dangerLevel)

    state.blocks.forEach((block, i) => {
      const col = i % state.width
      const row = Math.floor(i / state.width)
      const x = GRID_OFFSET_X + col * CELL_SIZE + BLOCK_SIZE / 2
      const y = GRID_OFFSET_Y + row * CELL_SIZE + BLOCK_SIZE / 2

      if (block.color && !block.garbage) {
        const textureIndex = COLOR_TO_INDEX[block.color] ?? 0

        // Pick texture variant based on state (priority order)
        let textureKey = `tile_${textureIndex}`
        if (block.flashTimer >= 0) {
          textureKey = `tile_${textureIndex}_excited`
        } else if (block.floatTimer >= 0) {
          textureKey = `tile_${textureIndex}_surprised`
        } else if (block.chaining) {
          textureKey = `tile_${textureIndex}_dreamy`
        } else if (dangerLevel > 0) {
          textureKey = `tile_${textureIndex}${DANGER_VARIANT[dangerLevel - 1]}`
        } else if (now - this.landingSurpriseTimes[i] < 200) {
          // Brief surprise face on landing
          textureKey = `tile_${textureIndex}_surprised`
        } else {
          // Idle variety — deterministic so faces don't flicker
          const cycle = (i * 7 + Math.floor(now / 4000)) % 30
          if (row >= GRID_ROWS - 2 && cycle === 0) {
            textureKey = `tile_${textureIndex}_sleepy`
          } else if (cycle === 1) {
            textureKey = `tile_${textureIndex}_cheeky`
          }
        }

        // Swap slide offset
        let targetX = x
        if (block.swapTimer !== 0) {
          const swapRatio = block.swapTimer / state.swapTime
          targetX = x - swapRatio * CELL_SIZE
        }

        // Wobble scales with danger level — all blocks react
        let wobbleX = 0
        if (dangerLevel > 0 && block.flashTimer < 0 && block.floatTimer < 0) {
          const amp = DANGER_WOBBLE_AMP[dangerLevel - 1]
          const freq = DANGER_WOBBLE_FREQ[dangerLevel - 1]
          wobbleX = Math.sin(now * freq + i * 1.7) * amp
        }

        if (!this.sprites[i]) {
          const sprite = this.add.sprite(targetX, y, textureKey)
          sprite.setDisplaySize(CELL_SIZE, CELL_SIZE)
          sprite.setDepth(2)
          this.sprites[i] = sprite
        }

        const sprite = this.sprites[i]!
        const wasHidden = !sprite.visible
        sprite.setTexture(textureKey)
        sprite.setVisible(true)

        if (wasHidden) {
          sprite.x = targetX + wobbleX
          sprite.y = y
        }

        sprite.x += (targetX + wobbleX - sprite.x) * t
        sprite.y += (y - sprite.y) * t

        if (Math.abs(targetX + wobbleX - sprite.x) < 0.5) sprite.x = targetX + wobbleX
        if (Math.abs(y - sprite.y) < 0.5) sprite.y = y

        // Grow-before-clear animation (replaces alpha flicker)
        if (block.flashTimer >= 0) {
          const prevFlash = this.prevFlashTimers[i]

          // Detect flash start (transition from <0 to >=0)
          if (prevFlash < 0) {
            this.flashStartTimes[i] = now
          }

          const staggerOffset = this.flashStaggerOffsets[i] || 0
          const elapsed = now - this.flashStartTimes[i] - staggerOffset
          const flashDurationMs = state.flashTime * (1000 / ENGINE_FPS)

          if (elapsed < 0) {
            // Waiting for stagger turn — gentle alpha pulse
            sprite.setAlpha(0.7 + Math.sin(now * 0.02) * 0.2)
            sprite.setDisplaySize(CELL_SIZE, CELL_SIZE)
            sprite.setTint(0xffffff)
            this.showGlow(i, textureIndex, sprite.x, sprite.y, true, 1.0)
          } else {
            const progress = Math.min(elapsed / flashDurationMs, 1)

            if (progress < 0.4) {
              // Phase 1: Swell 1.0 → SWELL_PEAK
              const swellT = progress / 0.4
              const scale = 1.0 + (SWELL_PEAK - 1.0) * swellT
              const size = CELL_SIZE * scale
              sprite.setDisplaySize(size, size)
              sprite.setAlpha(1)
              sprite.setTint(
                Phaser.Display.Color.GetColor(
                  255,
                  Math.floor(255 - swellT * 40),
                  Math.floor(255 - swellT * 40),
                ),
              )
              this.showGlow(i, textureIndex, sprite.x, sprite.y, true, scale)
            } else if (progress < 0.7) {
              // Phase 2: Hold at peak, bright white
              const size = CELL_SIZE * SWELL_PEAK
              sprite.setDisplaySize(size, size)
              sprite.setAlpha(1)
              sprite.setTint(0xffffff)
              this.showGlow(i, textureIndex, sprite.x, sprite.y, true, SWELL_PEAK)
            } else {
              // Phase 3: Shrink to 0 + fade
              const shrinkT = (progress - 0.7) / 0.3
              const scale = SWELL_PEAK * (1 - shrinkT)
              const size = Math.max(1, CELL_SIZE * scale)
              sprite.setDisplaySize(size, size)
              sprite.setAlpha(1 - shrinkT)
              sprite.setTint(0xffffff)
              this.showGlow(i, textureIndex, sprite.x, sprite.y, true, scale)
            }

            // Trail particles during flash (30% chance per frame)
            if (Math.random() < 0.3) {
              spawnTrailParticle(this, sprite.x, sprite.y, textureIndex)
            }
          }
        } else {
          sprite.setAlpha(1)
          sprite.clearTint()
          sprite.setDisplaySize(CELL_SIZE, CELL_SIZE)
          this.showGlow(i, textureIndex, sprite.x, sprite.y, false)
        }

        // Floating/falling
        if (block.floatTimer >= 0) {
          sprite.setAlpha(0.85)
        }

        // Detect landing: floatTimer went from >=0 to <0
        const prevFloat = this.prevFloatTimers[i]
        if (prevFloat >= 0 && block.floatTimer < 0) {
          this.doLandingBounce(sprite)
          spawnLandingDust(this, sprite.x, sprite.y, BLOCK_SIZE)
          this.landingSurpriseTimes[i] = now
        }
        this.prevFloatTimers[i] = block.floatTimer
        this.prevFlashTimers[i] = block.flashTimer
      } else {
        if (this.sprites[i]) {
          this.sprites[i]!.setVisible(false)
        }
        this.showGlow(i, 0, 0, 0, false)
        this.prevFloatTimers[i] = -1
        this.prevFlashTimers[i] = -1
      }
    })

    // Preview row — kept hidden so upcoming blocks aren't spoiled
    if (state.nextRow) {
      state.nextRow.forEach((block, i) => {
        if (block.color) {
          const textureIndex = COLOR_TO_INDEX[block.color] ?? 0
          this.previewSprites[i].setTexture(`tile_${textureIndex}_sleepy`)
        }
      })
    }
  }

  // --- Centroid + Score Popup helpers ---

  private getBlockCentroid(indices: number[]): { x: number; y: number } {
    let sumX = 0
    let sumY = 0
    for (const idx of indices) {
      const col = idx % GRID_COLS
      const row = Math.floor(idx / GRID_COLS)
      sumX += GRID_OFFSET_X + col * CELL_SIZE + BLOCK_SIZE / 2
      sumY += GRID_OFFSET_Y + row * CELL_SIZE + BLOCK_SIZE / 2
    }
    return { x: sumX / indices.length, y: sumY / indices.length }
  }

  private showScorePopup(score: number, x: number, y: number): void {
    const text = this.add.text(x, y, `+${score}`, {
      fontSize: `${SCORE_POPUP_FONT}px`,
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#FFD700',
        blur: 8,
        fill: true,
      },
    })
    text.setOrigin(0.5)
    text.setDepth(3)
    text.setScale(0.3)

    // Pop-in with Back.easeOut
    this.tweens.add({
      targets: text,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 120,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Float up + fade
        this.tweens.add({
          targets: text,
          y: y - SCORE_RISE,
          alpha: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 600,
          ease: 'Power2',
          onComplete: () => text.destroy(),
        })
      },
    })
  }

  // --- Flash stagger assignment ---

  private assignFlashStagger(indices: number[]): void {
    // Sort L→R, T→B
    const sorted = [...indices].sort((a, b) => {
      const rowA = Math.floor(a / GRID_COLS)
      const rowB = Math.floor(b / GRID_COLS)
      if (rowA !== rowB) return rowA - rowB
      return (a % GRID_COLS) - (b % GRID_COLS)
    })
    for (let i = 0; i < sorted.length; i++) {
      this.flashStaggerOffsets[sorted[i]] = i * STAGGER_MS
    }
  }

  // --- Effect helpers ---

  private showGlow(index: number, colorIndex: number, x: number, y: number, visible: boolean, scale = 1): void {
    if (visible) {
      if (!this.glowSprites[index]) {
        const glow = this.add.sprite(x, y, `glow_${colorIndex}`)
        glow.setDisplaySize(BLOCK_SIZE + 14, BLOCK_SIZE + 14)
        glow.setDepth(1)
        glow.setAlpha(0.5)
        this.glowSprites[index] = glow
      }
      const glow = this.glowSprites[index]!
      glow.setTexture(`glow_${colorIndex}`)
      glow.setPosition(x, y)
      glow.setVisible(true)
      // Enhanced pulse range 0.1–0.7, scaled with block
      const baseAlpha = 0.1 + Math.sin(this.time.now * 0.015) * 0.3 + 0.3
      glow.setAlpha(baseAlpha)
      const glowSize = (BLOCK_SIZE + 14) * scale
      glow.setDisplaySize(glowSize, glowSize)
    } else {
      if (this.glowSprites[index]) {
        this.glowSprites[index]!.setVisible(false)
      }
    }
  }

  private startMatchEffect(index: number): void {
    const sprite = this.sprites[index]
    if (!sprite || !sprite.visible) return

    // Scale pulse: 1.0 → 1.15 → 1.0
    this.tweens.add({
      targets: sprite,
      displayWidth: BLOCK_SIZE + 6,
      displayHeight: BLOCK_SIZE + 6,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeOut',
    })
  }

  private doLandingBounce(sprite: Phaser.GameObjects.Sprite): void {
    // Squash-and-stretch: compress Y, then bounce
    this.tweens.add({
      targets: sprite,
      displayHeight: { from: CELL_SIZE * 0.85, to: CELL_SIZE },
      displayWidth: { from: CELL_SIZE * 1.1, to: CELL_SIZE },
      duration: 200,
      ease: 'Bounce.easeOut',
    })
  }

  private spawnParticlesAt(index: number): void {
    if (!this.lastState) return
    const col = index % GRID_COLS
    const row = Math.floor(index / GRID_COLS)
    const x = GRID_OFFSET_X + col * CELL_SIZE + BLOCK_SIZE / 2
    const y = GRID_OFFSET_Y + row * CELL_SIZE + BLOCK_SIZE / 2

    const block = this.lastState.blocks[index]
    const colorIndex = block?.color ? (COLOR_TO_INDEX[block.color] ?? 0) : 0

    spawnClearParticles(this, x, y, colorIndex, 12)
  }

  private doChainScreenEffect(chainNum: number): void {
    // Chain 2+: shake + white flash + speed lines
    if (chainNum >= 2) {
      const intensity = Math.min(0.01 * chainNum, 0.04)
      this.cameras.main.shake(200 + chainNum * 60, intensity)

      // White flash for all chains
      const flashAlpha = Math.min(0.2 + chainNum * 0.08, 0.5)
      this.flashOverlay.setAlpha(flashAlpha)
      this.tweens.add({
        targets: this.flashOverlay,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
      })

      this.spawnSpeedLines(chainNum)

      // Border glow — escalates with chain
      const glowColor = chainNum >= 3 ? 0xFFD700 : 0xffffff
      const glowIntensity = chainNum >= 4 ? 0.7 : chainNum >= 3 ? 0.5 : 0.3
      this.flashBorderGlow(glowColor, glowIntensity)
    }

    // Chain 3+: zoom pulse
    if (chainNum >= 3) {
      const zoom = Math.min(1.03 + chainNum * 0.01, 1.08)
      this.cameras.main.zoomTo(zoom, 80)
      this.time.delayedCall(80, () => {
        this.cameras.main.zoomTo(1, 200)
      })
    }

    // Chain 4+: gold-tinted flash overlay — scoped to grid
    if (chainNum >= 4) {
      const gfx = GRID_OFFSET_X - 4
      const gfy = GRID_OFFSET_Y - 4
      const gfw = GRID_COLS * CELL_SIZE + 8
      const gfh = GRID_ROWS * CELL_SIZE + 8
      const goldFlash = this.add.rectangle(
        gfx + gfw / 2, gfy + gfh / 2, gfw, gfh, 0xFFD700,
      )
      goldFlash.setAlpha(Math.min(0.15 + chainNum * 0.05, 0.4))
      goldFlash.setDepth(15)
      this.tweens.add({
        targets: goldFlash,
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => goldFlash.destroy(),
      })
    }
  }

  // --- Border glow pulse on chains/combos ---

  private flashBorderGlow(color: number, intensity: number): void {
    const gx = GRID_OFFSET_X - 4
    const gy = GRID_OFFSET_Y - 4
    const gw = GRID_COLS * CELL_SIZE + 8
    const gh = GRID_ROWS * CELL_SIZE + 8
    const drawBorder = (alpha: number) => {
      this.borderGlow.clear()
      if (alpha <= 0) return
      // Inner glow stroke
      this.borderGlow.lineStyle(4, color, alpha)
      this.borderGlow.strokeRoundedRect(gx, gy, gw, gh, 20)
      // Outer glow stroke for high intensity
      if (intensity >= 0.5) {
        this.borderGlow.lineStyle(8, color, alpha * 0.4)
        this.borderGlow.strokeRoundedRect(gx - 3, gy - 3, gw + 6, gh + 6, 22)
      }
    }
    drawBorder(intensity)
    const proxy = { alpha: intensity }
    this.tweens.add({
      targets: proxy,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onUpdate: () => drawBorder(proxy.alpha),
      onComplete: () => this.borderGlow.clear(),
    })
  }

  // --- Column flash on combo (count > 3) ---

  private doColumnFlash(indices: number[]): void {
    const cols = new Set<number>()
    for (const idx of indices) {
      cols.add(idx % GRID_COLS)
    }
    for (const col of cols) {
      const flashX = GRID_OFFSET_X + col * CELL_SIZE + CELL_SIZE / 2
      // Flash extends full screen height, not just grid
      const flash = this.add.rectangle(
        flashX, GAME_HEIGHT / 2,
        CELL_SIZE + 4, GAME_HEIGHT,
        0xffffff,
      )
      flash.setAlpha(0.5)
      flash.setDepth(8)
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 1.5,
        duration: 400,
        ease: 'Power2',
        onComplete: () => flash.destroy(),
      })
    }
  }

  // --- Speed lines during big chains (chain >= 3) ---

  private spawnSpeedLines(chainNum: number): void {
    const count = Math.min(chainNum * 4, 20)
    for (let i = 0; i < count; i++) {
      const fromLeft = Math.random() > 0.5
      const lineWidth = 40 + Math.random() * 80
      const lineHeight = 2 + Math.random() * 2
      const startX = fromLeft ? -lineWidth : GAME_WIDTH + lineWidth
      const endX = fromLeft ? GAME_WIDTH + lineWidth : -lineWidth
      const lineY = Math.random() * GAME_HEIGHT

      const line = this.add.rectangle(startX, lineY, lineWidth, lineHeight, 0xffffff)
      line.setAlpha(0.5 + Math.random() * 0.4)
      line.setDepth(0)

      const delay = Math.random() * 150
      this.tweens.add({
        targets: line,
        x: endX,
        alpha: 0,
        duration: 180 + Math.random() * 120,
        delay,
        ease: 'Linear',
        onComplete: () => line.destroy(),
      })
    }
  }

  // --- Danger overlay ---

  private updateDangerOverlay(dangerLevel: number): void {
    const targetAlpha = DANGER_ALPHA[dangerLevel]
    // Lerp toward target
    this.currentDangerAlpha += (targetAlpha - this.currentDangerAlpha) * 0.02

    const gx = GRID_OFFSET_X - 4
    const gy = GRID_OFFSET_Y - 4
    const gw = GRID_COLS * CELL_SIZE + 8
    const gh = GRID_ROWS * CELL_SIZE + 8
    const color = dangerLevel >= 2 ? 0x330000 : 0x000000

    this.dangerOverlay.clear()
    this.dangerOverlay.fillStyle(color, this.currentDangerAlpha)
    this.dangerOverlay.fillRoundedRect(gx, gy, gw, gh, 20)
  }

  // --- Multiplier banner ---

  private showMultiplierBanner(chainNum: number): void {
    const bannerX = GRID_OFFSET_X + (GRID_COLS * CELL_SIZE) / 2
    const bannerY = GRID_OFFSET_Y - 12

    if (!this.multiplierBg) {
      this.multiplierBg = this.add.rectangle(bannerX, bannerY, 120, 24, 0x000000, 0.7)
      this.multiplierBg.setStrokeStyle(2, 0xFFD700)
      this.multiplierBg.setDepth(18)

      this.multiplierBanner = this.add.text(bannerX, bannerY, '', {
        fontSize: '14px',
        fontFamily: 'Arial Black, Arial',
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 2,
      })
      this.multiplierBanner.setOrigin(0.5)
      this.multiplierBanner.setDepth(18)
    }

    this.multiplierBg!.setVisible(true)
    this.multiplierBanner!.setVisible(true)
    this.multiplierBanner!.setText(`${chainNum}x CHAIN`)

    // Pulse on each increment
    this.tweens.add({
      targets: [this.multiplierBg, this.multiplierBanner],
      scaleX: { from: 1.2, to: 1 },
      scaleY: { from: 1.2, to: 1 },
      duration: 200,
      ease: 'Back.easeOut',
    })
  }

  private hideMultiplierBanner(): void {
    if (this.multiplierBg) this.multiplierBg.setVisible(false)
    if (this.multiplierBanner) this.multiplierBanner.setVisible(false)
  }

  // --- Cascading Game-Over Death ---

  private doCascadingDeath(): void {
    // Snapshot score before engine zeros it on gameOver
    this.savedFinalScore = useGameStore.getState().score
    this.isGameOver = true
    this.cursorGraphics.clear()
    stopMusic()

    // Play bubble sound ONCE for the whole cascade
    Sound.playBubble()

    // Camera shake builds
    this.cameras.main.shake(600, 0.02)

    // Collect all visible blocks by column/row
    const blocksByCol: { col: number; row: number; index: number }[] = []
    if (this.lastState) {
      for (let i = 0; i < this.lastState.blocks.length; i++) {
        const block = this.lastState.blocks[i]
        if (block.color && !block.garbage && this.sprites[i]?.visible) {
          const col = i % GRID_COLS
          const row = Math.floor(i / GRID_COLS)
          blocksByCol.push({ col, row, index: i })
        }
      }
    }

    // Sort by column (L→R), then row (bottom→top = higher row first)
    blocksByCol.sort((a, b) => {
      if (a.col !== b.col) return a.col - b.col
      return b.row - a.row // bottom first
    })

    // Assign delays: column-by-column with within-column bottom→top stagger
    let prevCol = -1
    let colIndex = -1
    let rowInCol = 0
    let maxDelay = 0

    for (const entry of blocksByCol) {
      if (entry.col !== prevCol) {
        colIndex++
        rowInCol = 0
        prevCol = entry.col
      }
      const delay = colIndex * DEATH_COL_DELAY + rowInCol * DEATH_ROW_DELAY
      if (delay > maxDelay) maxDelay = delay
      rowInCol++

      const sprite = this.sprites[entry.index]
      if (!sprite) continue

      // Hide glow immediately
      this.showGlow(entry.index, 0, 0, 0, false)

      this.tweens.add({
        targets: sprite,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        angle: (Math.random() - 0.5) * 30,
        duration: 300,
        delay,
        ease: 'Back.easeIn',
        onStart: () => {
          // Spawn 4 mini particles per dying block
          const colorIndex = COLOR_TO_INDEX[this.lastState?.blocks[entry.index]?.color ?? 'red'] ?? 0
          spawnClearParticles(this, sprite.x, sprite.y, colorIndex, 4)
        },
        onComplete: () => {
          sprite.setVisible(false)
        },
      })
    }

    // Hide preview row immediately
    for (const ps of this.previewSprites) {
      this.tweens.add({
        targets: ps,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
      })
    }

    // Hide multiplier banner
    this.hideMultiplierBanner()

    // Fade out grid lines + glow + danger overlay after blocks die
    this.time.delayedCall(maxDelay, () => {
      this.tweens.add({
        targets: [this.gridLines, this.gridGlow, this.dangerOverlay, this.gridBg],
        alpha: 0,
        duration: 400,
        ease: 'Power2',
      })
    })

    // Shutters close after blocks finish dying — warehouse doors (rounded corners)
    const shutterDelay = maxDelay + 200
    const halfH = (GRID_ROWS * CELL_SIZE + 8) / 2
    this.time.delayedCall(shutterDelay, () => {
      const sx = GRID_OFFSET_X - 4
      const sy = GRID_OFFSET_Y - 4
      const sw = GRID_COLS * CELL_SIZE + 8
      const sh = GRID_ROWS * CELL_SIZE + 8
      const proxy = { h: 0 }
      this.tweens.add({
        targets: proxy,
        h: halfH,
        duration: 600,
        ease: 'Power3',
        onUpdate: () => {
          this.shutterTop.clear()
          this.shutterTop.fillStyle(0x0a0a12, 0.92)
          this.shutterTop.fillRoundedRect(sx, sy, sw, proxy.h, { tl: 20, tr: 20, bl: 0, br: 0 })

          this.shutterBottom.clear()
          this.shutterBottom.fillStyle(0x0a0a12, 0.92)
          this.shutterBottom.fillRoundedRect(sx, sy + sh - proxy.h, sw, proxy.h, { tl: 0, tr: 0, bl: 20, br: 20 })

          // Glowing pink edge lines on closing edges
          this.shutterGlowTop.clear()
          this.shutterGlowTop.lineStyle(2, 0xfd79a8, 0.6)
          this.shutterGlowTop.beginPath()
          this.shutterGlowTop.moveTo(sx, sy + proxy.h)
          this.shutterGlowTop.lineTo(sx + sw, sy + proxy.h)
          this.shutterGlowTop.strokePath()

          this.shutterGlowBottom.clear()
          this.shutterGlowBottom.lineStyle(2, 0xfd79a8, 0.6)
          this.shutterGlowBottom.beginPath()
          this.shutterGlowBottom.moveTo(sx, sy + sh - proxy.h)
          this.shutterGlowBottom.lineTo(sx + sw, sy + sh - proxy.h)
          this.shutterGlowBottom.strokePath()
        },
        onComplete: () => {
          // Hide glow lines once shutters are fully closed
          this.shutterGlowTop.clear()
          this.shutterGlowBottom.clear()
        },
      })
    })

    // "GAME OVER" Phaser text — pops in once shutters are ~80% closed
    this.time.delayedCall(shutterDelay + 480, () => {
      const cx = GRID_OFFSET_X + (GRID_COLS * CELL_SIZE) / 2
      const cy = GRID_OFFSET_Y + (GRID_ROWS * CELL_SIZE) / 2
      this.gameOverText = this.add.text(cx, cy, 'GAME OVER', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '44px',
        fontStyle: '900',
        color: '#ffffff',
        shadow: { offsetX: 0, offsetY: 0, color: '#fd79a8', blur: 16, fill: true, stroke: true },
      })
      this.gameOverText.setOrigin(0.5, 0.5)
      this.gameOverText.setDepth(17)
      this.gameOverText.setScale(0)
      this.tweens.add({
        targets: this.gameOverText,
        scaleX: 1,
        scaleY: 1,
        duration: 250,
        ease: 'Back.easeOut',
        onUpdate: (_tween, target) => {
          // Overshoot to 1.15 then settle to 1
          const progress = _tween.progress
          const scale = progress < 0.7
            ? progress / 0.7 * 1.15
            : 1.15 - (progress - 0.7) / 0.3 * 0.15
          target.setScale(scale)
        },
      })
    })

    // Rotating tile face sprites scattered around GAME OVER text
    this.time.delayedCall(shutterDelay + 550, () => {
      const cx = GRID_OFFSET_X + (GRID_COLS * CELL_SIZE) / 2
      const cy = GRID_OFFSET_Y + (GRID_ROWS * CELL_SIZE) / 2
      const positions = [
        { x: cx - 90, y: cy - 40 },
        { x: cx + 85, y: cy - 35 },
        { x: cx - 70, y: cy + 40 },
        { x: cx + 75, y: cy + 45 },
        { x: cx, y: cy - 55 },
      ]
      this.gameOverFaces = []
      for (let i = 0; i < 5; i++) {
        const tileIdx = i % 6
        const texKey = `tile_${tileIdx}`
        if (!this.textures.exists(texKey)) continue
        const face = this.add.sprite(positions[i].x, positions[i].y, texKey)
        const size = 36 + Math.random() * 8
        face.setDisplaySize(size, size)
        face.setAlpha(0)
        face.setScale(0)
        face.setDepth(17)
        this.gameOverFaces.push(face)

        // Staggered scale pop-in
        this.tweens.add({
          targets: face,
          scaleX: size / face.width,
          scaleY: size / face.height,
          alpha: 0.6 + Math.random() * 0.2,
          duration: 200,
          delay: i * 60,
          ease: 'Back.easeOut',
        })

        // Continuous rotation
        this.tweens.add({
          targets: face,
          angle: (Math.random() > 0.5 ? 360 : -360),
          duration: 4000 + Math.random() * 3000,
          repeat: -1,
          ease: 'Linear',
        })
      }
    })

    // Sound sequence after cascade: bubble (already playing) → trailer → boom → modal
    const cascadeEnd = maxDelay + 300 // last block animation finishes

    // 2. Trailer bass dive
    this.time.delayedCall(cascadeEnd, () => {
      Sound.playTrailer()
      this.cameras.main.shake(200, 0.01)
    })

    // 3. Boom impact (after trailer finishes ~2.3s)
    this.time.delayedCall(cascadeEnd + 2400, () => {
      Sound.playBoom()
      this.cameras.main.shake(150, 0.015)
    })

    // Show modal after full sequence + extra pause
    this.time.delayedCall(cascadeEnd + 3500, () => {
      this.endGame()
    })
  }

  // --- Big Hype Text (full-screen spanning) ---

  private showHypeText(text: string, color: string, fontSize: number): void {
    // Emit to React overlay so text can overflow the canvas bounds
    useGameStore.getState().emitHype(text, color, fontSize)
  }

  // --- Full-screen sparkle explosion ---

  private spawnFullScreenSparkles(cx: number, cy: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 120 + Math.random() * 200
      const dx = Math.cos(angle) * speed
      const dy = Math.sin(angle) * speed

      const sparkle = this.add.sprite(cx, cy, 'particle_white')
      const size = 6 + Math.random() * 12
      sparkle.setDisplaySize(size, size)
      sparkle.setDepth(11)
      sparkle.setAlpha(1)

      this.tweens.add({
        targets: sparkle,
        x: cx + dx,
        y: cy + dy,
        alpha: 0,
        angle: Math.random() * 540,
        displayWidth: size * 0.2,
        displayHeight: size * 0.2,
        duration: 500 + Math.random() * 500,
        ease: 'Power2',
        onComplete: () => sparkle.destroy(),
      })
    }
  }

  // --- Starburst rays from match center ---

  private spawnStarburst(cx: number, cy: number): void {
    const rayCount = 12
    for (let i = 0; i < rayCount; i++) {
      const angle = (Math.PI * 2 * i) / rayCount + (Math.random() - 0.5) * 0.2
      const length = 80 + Math.random() * 60
      const isGold = i % 3 === 0

      const ray = this.add.rectangle(cx, cy, length, isGold ? 4 : 2.5, isGold ? 0xFFD700 : 0xffffff)
      ray.setRotation(angle)
      ray.setAlpha(0.9)
      ray.setDepth(10)
      ray.setOrigin(0, 0.5)

      this.tweens.add({
        targets: ray,
        scaleX: 4,
        scaleY: 0.3,
        alpha: 0,
        duration: 450,
        ease: 'Power2',
        onComplete: () => ray.destroy(),
      })
    }
  }

  // --- Celebration faces flying out from match ---

  private spawnCelebrationFaces(cx: number, cy: number, indices: number[], count: number): void {
    for (let i = 0; i < count; i++) {
      const idx = indices[i % indices.length]
      const block = this.lastState?.blocks[idx]
      if (!block?.color) continue

      const textureIndex = COLOR_TO_INDEX[block.color] ?? 0
      const textureKey = `tile_${textureIndex}_excited`

      const face = this.add.sprite(cx, cy, textureKey)
      face.setDisplaySize(CELL_SIZE * 0.9, CELL_SIZE * 0.9)
      face.setDepth(20)
      face.setAlpha(1)

      // Fly outward in all directions, well beyond the grid
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8
      const dist = 150 + Math.random() * 200
      const targetX = cx + Math.cos(angle) * dist
      const targetY = cy + Math.sin(angle) * dist

      this.tweens.add({
        targets: face,
        x: targetX,
        y: targetY,
        angle: (Math.random() - 0.5) * 540,
        scaleX: { from: 1.2, to: 0.2 },
        scaleY: { from: 1.2, to: 0.2 },
        alpha: 0,
        duration: 700 + Math.random() * 400,
        delay: i * 50,
        ease: 'Power2',
        onComplete: () => face.destroy(),
      })
    }
  }

  // --- Confetti rain ---

  private spawnConfetti(count: number): void {
    // Light in-canvas burst — React CelebrationOverlay handles the full-screen show
    const colors = [0xFFD700, 0xFF6B6B, 0x74b9ff, 0x55efc4, 0xfd79a8, 0xffeaa7, 0xdda0dd]
    const cx = GAME_WIDTH / 2
    const cy = GAME_HEIGHT * 0.35
    const capped = Math.min(count, 24)

    for (let i = 0; i < capped; i++) {
      const angle = (Math.PI * 2 * i) / capped + (Math.random() - 0.5) * 0.6
      const speed = 100 + Math.random() * 160
      const color = colors[Math.floor(Math.random() * colors.length)]
      const size = 4 + Math.random() * 5

      const confetti = this.add.rectangle(cx, cy, size, size * 1.8, color)
      confetti.setDepth(20)
      confetti.setAlpha(0)
      confetti.setRotation(Math.random() * Math.PI)

      this.tweens.add({
        targets: confetti,
        x: cx + Math.cos(angle) * speed,
        y: cy + Math.sin(angle) * speed + 80,
        angle: (Math.random() - 0.5) * 720,
        alpha: { from: 0.9, to: 0 },
        duration: 800 + Math.random() * 600,
        ease: 'Power2',
        onComplete: () => confetti.destroy(),
      })
    }
  }

  // --- UI ---

  private drawCursor(): void {
    this.cursorGraphics.clear()
    if (this.isGameOver || useGameStore.getState().countdown !== null) return

    const x = GRID_OFFSET_X + this.cursorX * CELL_SIZE
    const y = GRID_OFFSET_Y + this.cursorY * CELL_SIZE
    const alpha = 0.6 + Math.sin(this.time.now / 200) * 0.3
    const w = CELL_SIZE * 2 + BLOCK_GAP
    const h = BLOCK_SIZE + 4

    // Outer glow stroke
    this.cursorGraphics.lineStyle(6, 0xfbbf24, alpha * 0.2)
    this.cursorGraphics.strokeRoundedRect(x - 2, y - 2, w, h, 12)
    // Main stroke
    this.cursorGraphics.lineStyle(2.5, 0xfbbf24, alpha)
    this.cursorGraphics.strokeRoundedRect(x - 2, y - 2, w, h, 12)
  }

  private endGame(): void {
    if (this.isGameOver && useGameStore.getState().isGameOver) return
    this.isGameOver = true

    // Clean up game-over Phaser overlays before showing React modal
    if (this.gameOverText) {
      this.gameOverText.destroy()
      this.gameOverText = null
    }
    for (const face of this.gameOverFaces) {
      face.destroy()
    }
    this.gameOverFaces = []

    const store = useGameStore.getState()
    store.setPlaying(false)
    store.setGameOver(true)
    store.setFinalScore(this.savedFinalScore)
    store.setBlocksCleared(this.totalBlocksCleared)

    this.input.off('pointerdown', this.handlePointer, this)
    this.cursorGraphics.clear()
    stopMusic()
  }

  private drawBackground(): void {
    // Canvas is transparent — page background shows through
  }

  private drawGridBackground(): void {
    const gx = GRID_OFFSET_X - 4
    const gy = GRID_OFFSET_Y - 4
    const gw = GRID_COLS * CELL_SIZE + 8
    const gh = GRID_ROWS * CELL_SIZE + 8

    // Ambient glow behind grid
    this.gridGlow = this.add.graphics()
    this.gridGlow.setDepth(-2)
    // Pink glow — upper-left
    const pinkCx = gx + gw * 0.3
    const pinkCy = gy + gh * 0.3
    for (let i = 0; i < 5; i++) {
      const r = 160 + i * 40
      const a = 0.015 - i * 0.003
      this.gridGlow.fillStyle(0xfd79a8, a)
      this.gridGlow.fillCircle(pinkCx, pinkCy, r)
    }
    // Amber glow — lower-right
    const amberCx = gx + gw * 0.7
    const amberCy = gy + gh * 0.7
    for (let i = 0; i < 5; i++) {
      const r = 135 + i * 35
      const a = 0.012 - i * 0.00225
      this.gridGlow.fillStyle(0xffeaa7, a)
      this.gridGlow.fillCircle(amberCx, amberCy, r)
    }
    // Intro animation for glow
    this.gridGlow.setScale(0.96)
    this.gridGlow.setAlpha(0)
    this.tweens.add({
      targets: this.gridGlow,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
    })

    // Grid background — warm dark navy, rounder
    this.gridBg = this.add.graphics()
    this.gridBg.fillStyle(0x15162a, 0.30)
    this.gridBg.fillRoundedRect(gx, gy, gw, gh, 20)
    this.gridBg.lineStyle(2, 0xf8b4c8, 0.10)
    this.gridBg.strokeRoundedRect(gx, gy, gw, gh, 20)
    this.gridBg.setDepth(-1)

    // Border glow overlay — pulses on chains/combos
    this.borderGlow = this.add.graphics()
    this.borderGlow.setDepth(14)

    // Intersection dots instead of gridlines
    this.gridLines = this.add.graphics()
    this.gridLines.fillStyle(0xf8b4c8, 0.06)
    for (let row = 0; row <= GRID_ROWS; row++) {
      for (let col = 0; col <= GRID_COLS; col++) {
        const x = GRID_OFFSET_X + col * CELL_SIZE
        const y = GRID_OFFSET_Y + row * CELL_SIZE
        this.gridLines.fillCircle(x, y, 1.5)
      }
    }
    this.gridLines.setDepth(-1)
  }
}
