import Phaser from 'phaser'
import { GameEngine } from '../engine'
import type { GameState, GameEffect } from '../engine'
import { getScore } from '../engine/scoring'
import { computeGarbage } from '../engine/garbageRouting'
import {
  GRID_ROWS, GRID_COLS,
  getDesktopLayouts, getMobileLayouts,
  type BoardLayout,
} from '../vs-constants'
import { ENGINE_FPS, AUTO_RISE_INTERVAL } from '../constants'
import { useGameStore } from '../../stores/gameStore'
import { useMatchStore } from '../../stores/matchStore'
import { spawnClearParticles, spawnLandingDust, spawnGarbageImpact } from '../art/effects'
import { JKISS31 } from '../engine/jkiss'
import { PuzzleAI } from '../ai/PuzzleAI'
import * as Sound from '../audio/SoundManager'
import { startMusic, stopMusic, playIncomingGarbage, playGarbageLand } from '../audio/SoundManager'

// Map engine color names to tile texture indices (same as GameScene)
const COLOR_TO_INDEX: Record<string, number> = {
  red: 0,
  blue: 1,
  green: 3,
  violet: 4,
  yellow: 5,
  navy: 2,
}

const DANGER_THRESHOLDS = [4, 2, 0] as const
const DANGER_VARIANT = ['_cheeky', '_scared', '_dead'] as const
const DANGER_WOBBLE_AMP = [1, 1.5, 2] as const
const DANGER_WOBBLE_FREQ = [0.006, 0.012, 0.02] as const
const DANGER_ALPHA = [0, 0.1, 0.25, 0.4] as const

const KAWAII_TEXTURES_LOCAL = ['kawaii_circle', 'kawaii_heart', 'kawaii_star', 'kawaii_flower', 'kawaii_diamond', 'kawaii_note']
const KAWAII_TEXTURES_REMOTE = ['kawaii_circle', 'kawaii_star', 'kawaii_diamond']
const KAWAII_TINTS_LOCAL = [0xffc0cb, 0xffd1dc, 0xffe4e1, 0xfff0f5, 0xffeaa7, 0xffffff]

const SWELL_PEAK = 1.3
const STAGGER_MS = 35
const DEATH_COL_DELAY = 60
const DEATH_ROW_DELAY = 25

interface BoardState {
  engine: GameEngine
  sprites: (Phaser.GameObjects.Sprite | null)[]
  glowSprites: (Phaser.GameObjects.Sprite | null)[]
  previewSprites: Phaser.GameObjects.Sprite[]
  prevFloatTimers: number[]
  prevFlashTimers: number[]
  flashStartTimes: number[]
  flashStaggerOffsets: number[]
  landingSurpriseTimes: number[]
  gridBg: Phaser.GameObjects.Graphics
  gridGlow: Phaser.GameObjects.Graphics
  gridLines: Phaser.GameObjects.Graphics
  borderGlow: Phaser.GameObjects.Graphics
  garbageBorderGfx: Phaser.GameObjects.Graphics
  prevSlabYs: Map<string, number>
  slabLandTimes: Map<string, number>
  slabVisualYs: Map<string, number>
  garbageWarningGfx: Phaser.GameObjects.Graphics
  dangerOverlay: Phaser.GameObjects.Graphics
  flashOverlay: Phaser.GameObjects.Rectangle
  sparkles: Phaser.GameObjects.Sprite[]
  sparkleMask: Phaser.Display.Masks.GeometryMask
  side: 'local' | 'remote'
  gradientOverlay: Phaser.GameObjects.Graphics
  shutterTop: Phaser.GameObjects.Graphics
  shutterBottom: Phaser.GameObjects.Graphics
  lastState: GameState | null
  isGameOver: boolean
  autoRiseCounter: number
  engineStepCount: number
  totalBlocksCleared: number
  savedFinalScore: number
  currentDangerAlpha: number
  originX: number
  originY: number
  cellSize: number
  blockSize: number
  blockGap: number
  depthOffset: number
}

export class VsGameScene extends Phaser.Scene {
  private local!: BoardState
  private remote!: BoardState
  private mobile = false

  private cursorX = 0
  private cursorY = 0
  private cursorGraphics!: Phaser.GameObjects.Graphics
  private engineAccum = 0
  private matchOver = false
  private _wasCountingDown = true
  private startAt = 0
  private cpuAI: PuzzleAI | null = null

  constructor() {
    super({ key: 'VsGameScene' })
  }

  create(data?: { mobile?: boolean }): void {
    this.matchOver = false
    this.engineAccum = 0
    this.cursorX = 2
    this.cursorY = 6
    this._wasCountingDown = true
    this.mobile = data?.mobile ?? false

    // Pick layout based on mobile flag
    const layouts = this.mobile ? getMobileLayouts() : getDesktopLayouts()

    // Create two engines
    const localEngine = new GameEngine({
      width: GRID_COLS,
      height: GRID_ROWS,
      initialRows: 6,
      scoringSystem: 'puzzleLeague',
    })

    const remoteEngine = new GameEngine({
      width: GRID_COLS,
      height: GRID_ROWS,
      initialRows: 6,
      scoringSystem: 'puzzleLeague',
    })

    // Apply seeds from matchStore if available
    const matchState = useMatchStore.getState()
    if (matchState.localSeed) {
      localEngine.invalidateCache()
      const state = JSON.parse((localEngine as any).initialStateJSON)
      const rng = new JKISS31()
      rng.x = matchState.localSeed
      rng.scramble()
      state.RNG = rng.serialize()
      ;(localEngine as any).initialStateJSON = JSON.stringify(state)
      localEngine.invalidateCache()
    }
    if (matchState.remoteSeed) {
      remoteEngine.invalidateCache()
      const state = JSON.parse((remoteEngine as any).initialStateJSON)
      const rng = new JKISS31()
      rng.x = matchState.remoteSeed
      rng.scramble()
      state.RNG = rng.serialize()
      ;(remoteEngine as any).initialStateJSON = JSON.stringify(state)
      remoteEngine.invalidateCache()
    }

    this.local = this.createBoard(localEngine, layouts.local, 'local')
    this.remote = this.createBoard(remoteEngine, layouts.remote, 'remote')

    // Set up CPU AI if in CPU mode
    const cpuDifficulty = matchState.cpuDifficulty
    if (cpuDifficulty) {
      this.cpuAI = new PuzzleAI(cpuDifficulty)
    } else {
      this.cpuAI = null
    }

    // Set up local engine effects
    this.setupLocalEffects()
    this.setupRemoteEffects()

    // Cursor
    this.cursorGraphics = this.add.graphics()
    this.cursorGraphics.setDepth(5)

    // Input
    this.input.on('pointerdown', this.handlePointer, this)
    this.input.keyboard?.on('keydown-LEFT', () => { if (this.cursorX > 0) this.cursorX-- })
    this.input.keyboard?.on('keydown-RIGHT', () => { if (this.cursorX < GRID_COLS - 2) this.cursorX++ })
    this.input.keyboard?.on('keydown-UP', () => { if (this.cursorY > 0) this.cursorY-- })
    this.input.keyboard?.on('keydown-DOWN', () => { if (this.cursorY < GRID_ROWS - 1) this.cursorY++ })
    this.input.keyboard?.on('keydown-SPACE', () => this.doSwap())
    this.input.keyboard?.on('keydown-X', () => this.doSwap())
    this.input.keyboard?.on('keydown-Z', () => this.doAddRow())

    this.events.on('shutdown', () => {
      stopMusic()
      // Clean up engine listeners to prevent accumulation on rematch
      this.local.engine.removeAllListeners()
      this.remote.engine.removeAllListeners()
      // Remove all pending delayed calls
      this.time.removeAllEvents()
      // Clear input listeners
      this.input.removeAllListeners()
      this.input.keyboard?.removeAllListeners()
    })

    // Initial render
    this.local.lastState = this.local.engine.step()
    this.remote.lastState = this.remote.engine.step()
    this.renderBoard(this.local)
    this.renderBoard(this.remote)

    // VS divider line (desktop only)
    if (!this.mobile) {
      const gridWidth = GRID_COLS * this.local.cellSize
      const divX = this.local.originX + gridWidth + (this.remote.originX - (this.local.originX + gridWidth)) / 2
      const divGfx = this.add.graphics()
      divGfx.lineStyle(1, 0xffffff, 0.08)
      divGfx.beginPath()
      divGfx.moveTo(divX, this.local.originY)
      divGfx.lineTo(divX, this.local.originY + GRID_ROWS * this.local.cellSize)
      divGfx.strokePath()
      divGfx.setDepth(-1)
    }

    const store = useGameStore.getState()
    store.reset()
    store.setPlaying(true)

    // Synchronize countdown so both players' engines start at startAt
    const COUNTDOWN_DURATION = 4 * 900 // 3600ms (4 steps × 900ms each)
    this.startAt = useMatchStore.getState().startAt ?? (Date.now() + COUNTDOWN_DURATION)
    const delay = Math.max(0, this.startAt - Date.now() - COUNTDOWN_DURATION)
    if (delay > 0) {
      this.time.delayedCall(delay, () => {
        useGameStore.getState().setCountdown(3)
      })
    } else {
      store.setCountdown(3)
    }
  }

  update(_time: number, delta: number): void {
    if (this.matchOver) return

    const countingDown = useGameStore.getState().countdown !== null

    if (this._wasCountingDown && !countingDown) {
      startMusic()
    }
    this._wasCountingDown = countingDown

    if (!countingDown && Date.now() >= this.startAt) {
      this.engineAccum += delta
      const msPerTick = 1000 / ENGINE_FPS

      while (this.engineAccum >= msPerTick) {
        this.engineAccum -= msPerTick
        if (this.matchOver) break

        this.tickBoard(this.local)
        this.tickBoard(this.remote)

        // CPU AI drives the remote board
        if (this.cpuAI && !this.remote.isGameOver && this.remote.engineStepCount >= this.cpuAI.warmupTicks) {
          const action = this.cpuAI.think(this.remote.engine.currentState)
          if (action) {
            this.remote.engine.addEvent({
              time: this.remote.engine.time,
              type: action.type,
              ...(action.index !== undefined ? { index: action.index } : {}),
            })
          }
        }
      }
    }

    if (this.local.lastState) {
      this.renderBoard(this.local, delta)
      if (!this.local.isGameOver) {
        const store = useGameStore.getState()
        store.setScore(this.local.lastState.score)
        store.tickDisplayScore()

      }
    }

    if (this.remote.lastState) {
      this.renderBoard(this.remote, delta)
      // Update opponent score (use saved score after game over since engine resets it)
      if (!this.remote.isGameOver) {
        useMatchStore.getState().setOpponentScore(this.remote.lastState.score)
      }
    }

    // Update floating sparkles
    this.updateSparkles(this.local, delta)
    this.updateSparkles(this.remote, delta)

    if (!this.matchOver && !countingDown) this.drawCursor()
  }

  private createBoard(engine: GameEngine, layout: BoardLayout, side: 'local' | 'remote'): BoardState {
    const { cellSize, blockSize, blockGap, originX, originY } = layout
    const totalCells = GRID_ROWS * GRID_COLS
    const gridWidth = GRID_COLS * cellSize
    const gridHeight = GRID_ROWS * cellSize

    // Depth offset for mobile remote board (renders above local board in overlap zone)
    const depthOffset = (this.mobile && side === 'remote') ? 20 : 0

    // Scale factor relative to desktop cell size (71) for decorative elements
    const sizeScale = cellSize / 71

    // Theme colors per side
    const theme = side === 'local'
      ? { bg: 0x251745, bgTop: 0x2f1f55, glow1: 0xfd79a8, glow2: 0xffeaa7,
          border: 0xf8b4c8, borderAlpha: 0.3, dot: 0xf8b4c8, dotAlpha: 0.05,
          glowAlpha: 0.025, sparkleCount: 14, sparkleAlpha: [0.18, 0.35] as [number, number],
          frameBorder: 0xf0a050, frameGlow: 0xffd48a }
      : { bg: 0x151a30, bgTop: 0x1c2240, glow1: 0x4a5568, glow2: 0x4a5568,
          border: 0x3a3d52, borderAlpha: 0.15, dot: 0x4a5568, dotAlpha: 0.03,
          glowAlpha: 0.015, sparkleCount: 8, sparkleAlpha: [0.08, 0.18] as [number, number],
          frameBorder: 0x5a8fd4, frameGlow: 0x7db9ff }

    // Grid background
    const gx = originX - 4
    const gy = originY - 4
    const gw = gridWidth + 8
    const gh = gridHeight + 8

    const gridGlow = this.add.graphics()
    gridGlow.setDepth(-2 + depthOffset)
    // Primary glow (upper-left)
    const glow1Cx = gx + gw * 0.3
    const glow1Cy = gy + gh * 0.3
    const glowRadius = 120 * sizeScale
    for (let i = 0; i < 4; i++) {
      gridGlow.fillStyle(theme.glow1, theme.glowAlpha - i * 0.005)
      gridGlow.fillCircle(glow1Cx, glow1Cy, glowRadius + i * 30 * sizeScale)
    }
    // Secondary glow (lower-right)
    const glow2Cx = gx + gw * 0.7
    const glow2Cy = gy + gh * 0.7
    for (let i = 0; i < 4; i++) {
      gridGlow.fillStyle(theme.glow2, theme.glowAlpha * 0.8 - i * 0.004)
      gridGlow.fillCircle(glow2Cx, glow2Cy, 110 * sizeScale + i * 25 * sizeScale)
    }

    // Base fill (solid fallback)
    const gridBg = this.add.graphics()
    gridBg.fillStyle(theme.bg, 1)
    gridBg.fillRoundedRect(gx, gy, gw, gh, 14 * sizeScale)
    gridBg.setDepth(-1 + depthOffset)

    // Kawaii frame — 3 layers for puffy raised border look
    // 1. Outer glow halo
    const outerGlow = this.add.graphics()
    outerGlow.lineStyle(8, theme.frameGlow, 0.15)
    outerGlow.strokeRoundedRect(gx - 2, gy - 2, gw + 4, gh + 4, 16 * sizeScale)
    outerGlow.setDepth(-1.5 + depthOffset)

    // 2. Main thick border
    const mainBorder = this.add.graphics()
    mainBorder.lineStyle(4, theme.frameBorder, 0.6)
    mainBorder.strokeRoundedRect(gx, gy, gw, gh, 14 * sizeScale)
    mainBorder.setDepth(-1 + depthOffset)

    // 3. Inner highlight shine
    const innerHighlight = this.add.graphics()
    innerHighlight.lineStyle(1.5, 0xffffff, 0.12)
    innerHighlight.strokeRoundedRect(gx + 2, gy + 2, gw - 4, gh - 4, 12 * sizeScale)
    innerHighlight.setDepth(-0.7 + depthOffset)

    // Gradient overlay (top-to-bottom)
    const gradientOverlay = this.add.graphics()
    gradientOverlay.fillGradientStyle(theme.bgTop, theme.bgTop, theme.bg, theme.bg, 1)
    gradientOverlay.fillRect(gx, gy, gw, gh)
    const maskShape = this.make.graphics({})
    maskShape.fillStyle(0xffffff)
    maskShape.fillRoundedRect(gx, gy, gw, gh, 14 * sizeScale)
    gradientOverlay.setMask(maskShape.createGeometryMask())
    gradientOverlay.setDepth(-0.9 + depthOffset)

    const borderGlow = this.add.graphics()
    borderGlow.setDepth(14 + depthOffset)

    const garbageBorderGfx = this.add.graphics()
    garbageBorderGfx.setDepth(1.5 + depthOffset)

    const prevSlabYs = new Map<string, number>()
    const slabLandTimes = new Map<string, number>()
    const slabVisualYs = new Map<string, number>()

    const garbageWarningGfx = this.add.graphics()
    garbageWarningGfx.setDepth(6 + depthOffset)

    // Honeycomb polka-dot pattern
    const gridLines = this.add.graphics()
    gridLines.fillStyle(theme.dot, theme.dotAlpha)
    const dotSpacingX = gw / 6
    const dotSpacingY = gh / 12
    for (let row = 0; row < 12; row++) {
      const offsetX = row % 2 === 0 ? 0 : dotSpacingX * 0.5
      for (let col = 0; col < 7; col++) {
        const dx = gx + col * dotSpacingX + offsetX
        const dy = gy + row * dotSpacingY + dotSpacingY * 0.5
        if (dx > gx && dx < gx + gw && dy > gy && dy < gy + gh) {
          gridLines.fillCircle(dx, dy, 1.5 * sizeScale)
        }
      }
    }
    gridLines.setDepth(-0.8 + depthOffset)

    const dangerOverlay = this.add.graphics()
    dangerOverlay.setDepth(-0.5 + depthOffset)

    const flashOverlay = this.add.rectangle(
      gx + gw / 2, gy + gh / 2, gw, gh, 0xffffff,
    )
    flashOverlay.setAlpha(0)
    flashOverlay.setDepth(15 + depthOffset)

    const shutterTop = this.add.graphics()
    shutterTop.setDepth(16 + depthOffset)
    const shutterBottom = this.add.graphics()
    shutterBottom.setDepth(16 + depthOffset)

    // Preview sprites (next row) — hidden on mobile remote board
    const previewSprites: Phaser.GameObjects.Sprite[] = []
    const showPreview = !(this.mobile && side === 'remote')
    for (let x = 0; x < GRID_COLS; x++) {
      const sprite = this.add.sprite(
        originX + x * cellSize + blockSize / 2,
        originY + GRID_ROWS * cellSize + blockSize / 2 + 3,
        'tile_0'
      )
      sprite.setDisplaySize(cellSize - 4, cellSize - 4)
      sprite.setAlpha(0.2)
      sprite.setDepth(1 + depthOffset)
      sprite.setVisible(false)
      if (!showPreview) sprite.setActive(false)
      previewSprites.push(sprite)
    }

    // Floating sparkles (kawaii shapes) — each masked to board bounds
    const sparkleMaskGfx = this.add.graphics()
    sparkleMaskGfx.fillStyle(0xffffff)
    sparkleMaskGfx.fillRoundedRect(gx, gy, gw, gh, 14 * sizeScale)
    sparkleMaskGfx.setVisible(false)
    const sparkleMask = sparkleMaskGfx.createGeometryMask()

    const sparkleTextures = side === 'local' ? KAWAII_TEXTURES_LOCAL : KAWAII_TEXTURES_REMOTE
    const sparkles: Phaser.GameObjects.Sprite[] = []
    const sparkleSize = { min: 30 * sizeScale, max: 54 * sizeScale }
    for (let i = 0; i < theme.sparkleCount; i++) {
      const sx = Phaser.Math.FloatBetween(gx + 10, gx + gw - 10)
      const sy = Phaser.Math.FloatBetween(gy, gy + gh)
      const size = Phaser.Math.FloatBetween(sparkleSize.min, sparkleSize.max)
      const alpha = Phaser.Math.FloatBetween(theme.sparkleAlpha[0], theme.sparkleAlpha[1])
      const texture = sparkleTextures[Math.floor(Math.random() * sparkleTextures.length)]
      const sparkle = this.add.sprite(sx, sy, texture)
      sparkle.setDisplaySize(size, size)
      sparkle.setAlpha(alpha)
      sparkle.setDepth(0.5 + depthOffset)
      sparkle.setMask(sparkleMask)
      if (side === 'local') {
        sparkle.setTint(KAWAII_TINTS_LOCAL[Math.floor(Math.random() * KAWAII_TINTS_LOCAL.length)])
      }
      sparkle.setData('baseX', sx)
      sparkle.setData('speedY', Phaser.Math.FloatBetween(50, 95))
      sparkle.setData('wobbleAmp', Phaser.Math.FloatBetween(5, 15))
      sparkle.setData('wobblePhase', Math.random() * Math.PI * 2)
      sparkle.setData('baseAlpha', alpha)
      sparkles.push(sparkle)
    }

    // No in-game label — the React UI handles this

    return {
      engine,
      sprites: new Array(totalCells).fill(null),
      glowSprites: new Array(totalCells).fill(null),
      previewSprites,
      prevFloatTimers: new Array(totalCells).fill(-1),
      prevFlashTimers: new Array(totalCells).fill(-1),
      flashStartTimes: new Array(totalCells).fill(0),
      flashStaggerOffsets: new Array(totalCells).fill(0),
      landingSurpriseTimes: new Array(totalCells).fill(0),
      gridBg,
      gridGlow,
      gridLines,
      borderGlow,
      garbageBorderGfx,
      prevSlabYs,
      slabLandTimes,
      slabVisualYs,
      garbageWarningGfx,
      dangerOverlay,
      flashOverlay,
      sparkles,
      sparkleMask,
      side,
      gradientOverlay,
      shutterTop,
      shutterBottom,
      lastState: null,
      isGameOver: false,
      autoRiseCounter: 0,
      engineStepCount: 0,
      totalBlocksCleared: 0,
      savedFinalScore: 0,
      currentDangerAlpha: 0,
      originX,
      originY,
      cellSize,
      blockSize,
      blockGap,
      depthOffset,
    }
  }

  private setupLocalEffects(): void {
    const board = this.local

    board.engine.on('matchMade', (effect: GameEffect) => {
      if (board.isGameOver || board.engineStepCount < 30) return
      board.totalBlocksCleared += effect.indices?.length ?? 0
      const count = effect.indices?.length ?? 0
      Sound.playMatch()
      useGameStore.getState().setExcitement(count > 3 ? 2 : 1)
      this.pulseSparkles(board, count > 3 ? 2 : 1)

      if (effect.indices) {
        this.assignFlashStagger(board, effect.indices)
      }

      // Score popup
      if (effect.indices) {
        const centroid = this.getBlockCentroid(board, effect.indices)
        const score = getScore('puzzleLeague', count, 0)
        this.showScorePopup(score, centroid.x, centroid.y)
      }

      // Send garbage to opponent
      const garbage = computeGarbage(effect)
      if (garbage && !this.remote.isGameOver) {
        const x = Math.floor(Math.random() * (GRID_COLS - garbage.width + 1))
        this.remote.engine.addEvent({
          time: this.remote.engine.time,
          type: 'addGarbage',
          slab: { x, width: garbage.width, height: garbage.height },
        })
        // Also broadcast if networked
        const channel = useMatchStore.getState().channel
        if (channel) {
          channel.sendGarbage({ x, width: garbage.width, height: garbage.height })
        }
      }

      // Combo effects
      if (count > 3) {
        const store = useGameStore.getState()
        store.setMaxCombo(Math.max(count - 2, store.maxCombo))
        useGameStore.getState().emitCelebration('combo', Math.min(count - 2, 5))
      }

      // Broadcast event
      const channel = useMatchStore.getState().channel
      if (channel && effect.indices) {
        // We broadcast the effect for remote display
      }
    })

    board.engine.on('chainMatchMade', (effect: GameEffect) => {
      if (board.isGameOver || board.engineStepCount < 30) return
      board.totalBlocksCleared += effect.indices?.length ?? 0
      const chainNum = effect.chainNumber ?? 0
      if (chainNum > 1) {
        useGameStore.getState().setChain(chainNum)
        const store = useGameStore.getState()
        store.setMaxChain(Math.max(chainNum, store.maxChain))
        Sound.playChain(chainNum)
        useGameStore.getState().setExcitement(Math.min(2 + chainNum, 5))
        this.pulseSparkles(board, Math.min(2 + chainNum, 5))
        useGameStore.getState().emitCelebration('chain', Math.min(chainNum, 5))

        if (effect.indices) {
          const centroid = this.getBlockCentroid(board, effect.indices)
          const score = getScore('puzzleLeague', effect.indices.length, chainNum)
          this.showScorePopup(score, centroid.x, centroid.y)
          this.assignFlashStagger(board, effect.indices)
        }

        // Chain screen effect (local board only — reduced intensity)
        this.doChainScreenEffect(board, chainNum)
      }

      // Send garbage to opponent
      const garbage = computeGarbage(effect)
      if (garbage && !this.remote.isGameOver) {
        const x = Math.floor(Math.random() * (GRID_COLS - garbage.width + 1))
        this.remote.engine.addEvent({
          time: this.remote.engine.time,
          type: 'addGarbage',
          slab: { x, width: garbage.width, height: garbage.height },
        })
        const channel = useMatchStore.getState().channel
        if (channel) {
          channel.sendGarbage({ x, width: garbage.width, height: garbage.height })
        }
      }
    })

    board.engine.on('chainDone', () => {
      if (board.isGameOver || board.engineStepCount < 30) return
      useGameStore.getState().setChain(0)
    })

    board.engine.on('blockLanded', (effect: GameEffect) => {
      if (board.isGameOver || board.engineStepCount < 30) return
      Sound.playLand()
      if (effect.index !== undefined) {
        const col = effect.index % GRID_COLS
        const row = Math.floor(effect.index / GRID_COLS)
        const x = board.originX + col * board.cellSize + board.blockSize / 2
        const y = board.originY + row * board.cellSize + board.blockSize / 2
        spawnLandingDust(this, x, y, board.blockSize)
      }
    })

    board.engine.on('flashDone', (effect: GameEffect) => {
      if (board.isGameOver || board.engineStepCount < 30) return
      if (effect.index !== undefined) {
        this.spawnParticlesAt(board, effect.index)
      }
    })

    board.engine.on('addRow', () => {
      if (board.isGameOver || board.engineStepCount < 30) return
      if (this.cursorY > 0) this.cursorY--
      Sound.playRowPush()
    })

    board.engine.on('gameOver', () => {
      this.handleBoardGameOver(board, 'local')
    })
  }

  private setupRemoteEffects(): void {
    const board = this.remote
    const isNetworked = !!useMatchStore.getState().channel

    // Remote board: reduced effects, with sound
    board.engine.on('matchMade', (effect: GameEffect) => {
      if (board.isGameOver || board.engineStepCount < 30) return
      board.totalBlocksCleared += effect.indices?.length ?? 0
      Sound.playMatch()
      if (effect.indices) {
        this.assignFlashStagger(board, effect.indices)
      }

      // In local-only mode, remote matches send garbage to local board
      // In networked mode, garbage comes through the channel instead
      if (!isNetworked) {
        const garbage = computeGarbage(effect)
        if (garbage && !this.local.isGameOver) {
          const x = Math.floor(Math.random() * (GRID_COLS - garbage.width + 1))
          this.local.engine.addEvent({
            time: this.local.engine.time,
            type: 'addGarbage',
            slab: { x, width: garbage.width, height: garbage.height },
          })
        }
      }
    })

    board.engine.on('chainMatchMade', (effect: GameEffect) => {
      if (board.isGameOver || board.engineStepCount < 30) return
      board.totalBlocksCleared += effect.indices?.length ?? 0
      const chainNum = effect.chainNumber ?? 0
      if (chainNum > 1) {
        Sound.playChain(chainNum)
      }
      if (effect.indices) {
        this.assignFlashStagger(board, effect.indices)
      }

      if (!isNetworked) {
        const garbage = computeGarbage(effect)
        if (garbage && !this.local.isGameOver) {
          const x = Math.floor(Math.random() * (GRID_COLS - garbage.width + 1))
          this.local.engine.addEvent({
            time: this.local.engine.time,
            type: 'addGarbage',
            slab: { x, width: garbage.width, height: garbage.height },
          })
        }
      }
    })

    board.engine.on('gameOver', () => {
      this.handleBoardGameOver(board, 'remote')
    })
  }

  private handleBoardGameOver(board: BoardState, which: 'local' | 'remote'): void {
    if (this.matchOver) return
    board.savedFinalScore = board.lastState?.score ?? 0
    board.isGameOver = true
    this.matchOver = true

    // Freeze scores in stores before the engine resets them
    if (which === 'remote') {
      useMatchStore.getState().setOpponentScore(board.savedFinalScore)
    } else {
      useGameStore.getState().setScore(board.savedFinalScore)
    }

    Sound.playBubble()
    // Reduce shake intensity on mobile when remote board dies
    const shakeIntensity = (this.mobile && which === 'remote') ? 0.008 : 0.015
    this.cameras.main.shake(400, shakeIntensity)

    // Run death cascade on the losing board
    this.doCascadingDeath(board)

    // Determine result
    const iLost = which === 'local'
    const result = iLost ? 'lose' : 'win'

    // Broadcast game over if we lost
    if (iLost) {
      const channel = useMatchStore.getState().channel
      if (channel) channel.sendGameOver()
    }

    // Show result after brief delay for cascade
    this.time.delayedCall(2000, () => {
      stopMusic()
      this.cursorGraphics.clear()

      const store = useGameStore.getState()
      store.setPlaying(false)
      store.setGameOver(true)
      store.setFinalScore(this.local.savedFinalScore || this.local.lastState?.score || 0)
      store.setBlocksCleared(this.local.totalBlocksCleared)

      useMatchStore.getState().setFinished(result)
    })
  }

  private tickBoard(board: BoardState): void {
    if (board.isGameOver) return

    board.autoRiseCounter++
    if (board.autoRiseCounter >= AUTO_RISE_INTERVAL) {
      board.autoRiseCounter = 0
      board.engine.addEvent({
        time: board.engine.time,
        type: 'addRow',
      })
    }

    board.lastState = board.engine.step()
    board.engineStepCount++
  }

  private renderBoard(board: BoardState, delta = 0): void {
    const state = board.lastState
    if (!state) return

    const { cellSize, blockSize } = board
    const lerpSpeed = 12
    const t = delta > 0 ? 1 - Math.exp(-lerpSpeed * delta / 1000) : 1
    const now = this.time.now
    const ox = board.originX
    const oy = board.originY

    // Danger level
    let highestOccupiedRow = GRID_ROWS
    for (let i = 0; i < state.blocks.length; i++) {
      if (state.blocks[i].color && !state.blocks[i].garbage) {
        const row = Math.floor(i / state.width)
        if (row < highestOccupiedRow) highestOccupiedRow = row
      }
    }
    let dangerLevel = 0
    for (let lvl = 0; lvl < DANGER_THRESHOLDS.length; lvl++) {
      if (highestOccupiedRow <= DANGER_THRESHOLDS[lvl]) dangerLevel = lvl + 1
    }
    this.updateDangerOverlay(board, dangerLevel)

    state.blocks.forEach((block, i) => {
      const col = i % state.width
      const row = Math.floor(i / state.width)
      const x = ox + col * cellSize + blockSize / 2
      const y = oy + row * cellSize + blockSize / 2

      if (block.color && !block.garbage) {
        const textureIndex = COLOR_TO_INDEX[block.color] ?? 0
        let textureKey = `tile_${textureIndex}`

        if (block.flashTimer >= 0) {
          textureKey = `tile_${textureIndex}_excited`
        } else if (block.floatTimer >= 0) {
          textureKey = `tile_${textureIndex}_surprised`
        } else if (block.chaining) {
          textureKey = `tile_${textureIndex}_dreamy`
        } else if (dangerLevel > 0) {
          textureKey = `tile_${textureIndex}${DANGER_VARIANT[dangerLevel - 1]}`
        } else if (now - board.landingSurpriseTimes[i] < 200) {
          textureKey = `tile_${textureIndex}_surprised`
        } else {
          const cycle = (i * 7 + Math.floor(now / 4000)) % 30
          if (row >= GRID_ROWS - 2 && cycle === 0) {
            textureKey = `tile_${textureIndex}_sleepy`
          } else if (cycle === 1) {
            textureKey = `tile_${textureIndex}_cheeky`
          }
        }

        let targetX = x
        if (block.swapTimer !== 0) {
          targetX = x - (block.swapTimer / state.swapTime) * cellSize
        }

        let wobbleX = 0
        if (dangerLevel > 0 && block.flashTimer < 0 && block.floatTimer < 0) {
          wobbleX = Math.sin(now * DANGER_WOBBLE_FREQ[dangerLevel - 1] + i * 1.7) * DANGER_WOBBLE_AMP[dangerLevel - 1]
        }

        if (!board.sprites[i]) {
          const sprite = this.add.sprite(targetX, y, textureKey)
          sprite.setDisplaySize(cellSize, cellSize)
          sprite.setDepth(2 + board.depthOffset)
          board.sprites[i] = sprite
        }

        const sprite = board.sprites[i]!
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

        // Flash animation
        if (block.flashTimer >= 0) {
          const prevFlash = board.prevFlashTimers[i]
          if (prevFlash < 0) board.flashStartTimes[i] = now

          const staggerOffset = board.flashStaggerOffsets[i] || 0
          const elapsed = now - board.flashStartTimes[i] - staggerOffset
          const flashDurationMs = state.flashTime * (1000 / ENGINE_FPS)

          if (elapsed < 0) {
            sprite.setAlpha(0.7 + Math.sin(now * 0.02) * 0.2)
            sprite.setDisplaySize(cellSize, cellSize)
            sprite.setTint(0xffffff)
            this.showGlow(board, i, textureIndex, sprite.x, sprite.y, true, 1.0)
          } else {
            const progress = Math.min(elapsed / flashDurationMs, 1)
            if (progress < 0.4) {
              const swellT = progress / 0.4
              const scale = 1.0 + (SWELL_PEAK - 1.0) * swellT
              sprite.setDisplaySize(cellSize * scale, cellSize * scale)
              sprite.setAlpha(1)
              sprite.setTint(Phaser.Display.Color.GetColor(255, Math.floor(255 - swellT * 40), Math.floor(255 - swellT * 40)))
              this.showGlow(board, i, textureIndex, sprite.x, sprite.y, true, scale)
            } else if (progress < 0.7) {
              sprite.setDisplaySize(cellSize * SWELL_PEAK, cellSize * SWELL_PEAK)
              sprite.setAlpha(1)
              sprite.setTint(0xffffff)
              this.showGlow(board, i, textureIndex, sprite.x, sprite.y, true, SWELL_PEAK)
            } else {
              const shrinkT = (progress - 0.7) / 0.3
              const scale = SWELL_PEAK * (1 - shrinkT)
              sprite.setDisplaySize(Math.max(1, cellSize * scale), Math.max(1, cellSize * scale))
              sprite.setAlpha(1 - shrinkT)
              sprite.setTint(0xffffff)
              this.showGlow(board, i, textureIndex, sprite.x, sprite.y, true, scale)
            }
          }
        } else {
          sprite.setAlpha(1)
          sprite.clearTint()
          sprite.setDisplaySize(cellSize, cellSize)
          this.showGlow(board, i, textureIndex, sprite.x, sprite.y, false)
        }

        if (block.floatTimer >= 0) {
          sprite.setAlpha(0.85)
        }

        // Landing bounce
        const prevFloat = board.prevFloatTimers[i]
        if (prevFloat >= 0 && block.floatTimer < 0) {
          this.tweens.add({
            targets: sprite,
            displayHeight: { from: cellSize * 0.85, to: cellSize },
            displayWidth: { from: cellSize * 1.1, to: cellSize },
            duration: 200,
            ease: 'Bounce.easeOut',
          })
          board.landingSurpriseTimes[i] = now
        }
        board.prevFloatTimers[i] = block.floatTimer
        board.prevFlashTimers[i] = block.flashTimer
      } else {
        if (board.sprites[i]) {
          board.sprites[i]!.setVisible(false)
        }
        this.showGlow(board, i, 0, 0, 0, false)
        board.prevFloatTimers[i] = -1
        board.prevFlashTimers[i] = -1
      }
    })

    // Render garbage slabs
    // Garbage blocks rendered via the block.garbage/block.slab path in the engine
    // They show as colored blocks (from released garbage), which are already rendered above
    // Active garbage slabs (not yet released) need explicit rendering
    this.renderGarbageSlabs(board, state, delta)

    // Preview row (skip on mobile remote)
    if (state.nextRow && !(this.mobile && board.side === 'remote')) {
      state.nextRow.forEach((block, i) => {
        if (block.color) {
          const textureIndex = COLOR_TO_INDEX[block.color] ?? 0
          board.previewSprites[i].setTexture(`tile_${textureIndex}_sleepy`)
        }
      })
    }
  }

  private renderGarbageSlabs(board: BoardState, state: GameState, delta = 0): void {
    const { cellSize } = board
    const now = this.time.now
    board.garbageBorderGfx.clear()
    board.garbageWarningGfx.clear()
    const activeSlabKeys = new Set<string>()
    const lerpSpeed = 10
    const t = delta > 0 ? 1 - Math.exp(-lerpSpeed * delta / 1000) : 1

    for (let si = 0; si < state.garbage.length; si++) {
      const slab = state.garbage[si]
      // Stable identity: uuid if available, otherwise index + x + width (height can shrink on release)
      const slabKey = slab.uuid ?? `s${si}_${slab.x}_${slab.width}`
      activeSlabKeys.add(slabKey)

      const prevY = board.prevSlabYs.get(slabKey)
      const isStill = prevY !== undefined && prevY === slab.y

      // Detect landing: slab was moving last frame, is still this frame
      // We check slabLandTimes to avoid re-triggering
      const landTime = board.slabLandTimes.get(slabKey)
      const justLandedNow = isStill && !landTime && board.slabVisualYs.has(slabKey)
      // Also detect if the visual Y was interpolating and slab stopped
      const visualY = board.slabVisualYs.get(slabKey)
      const needsLandDetect = visualY !== undefined && Math.abs(visualY - slab.y) > 0.1 && isStill && !landTime

      // --- Phase A: Warning indicator for slabs entirely above the board ---
      const slabBottomRow = state.height - 1 - slab.y
      const slabTopRow = state.height - 1 - (slab.y + slab.height - 1)
      if (slabTopRow < 0 && slabBottomRow < 0) {
        // Entire slab is above the board — draw warning bar at top
        const warningX = board.originX + slab.x * cellSize
        const warningW = slab.width * cellSize
        const warningY = board.originY
        const warningH = Math.max(4, 6 * (cellSize / 71))
        const pulse = 0.4 + Math.sin(now * 0.008) * 0.3

        // Hazard stripe background
        board.garbageWarningGfx.fillStyle(0x4a4e5c, pulse)
        board.garbageWarningGfx.fillRect(warningX, warningY - warningH - 2, warningW, warningH)

        // Striped pattern
        const stripeW = 8
        for (let sx = warningX; sx < warningX + warningW; sx += stripeW * 2) {
          board.garbageWarningGfx.fillStyle(0x7a7e8c, pulse * 0.7)
          board.garbageWarningGfx.fillRect(sx, warningY - warningH - 2, stripeW, warningH)
        }

        // Update prev tracking but skip rendering cells
        board.prevSlabYs.set(slabKey, slab.y)
        if (!board.slabVisualYs.has(slabKey)) {
          board.slabVisualYs.set(slabKey, slab.y)
        }
        continue
      }

      // --- Phase B: Smooth drop interpolation ---
      if (!board.slabVisualYs.has(slabKey)) {
        board.slabVisualYs.set(slabKey, slab.y)
      }
      let currentVisualY = board.slabVisualYs.get(slabKey)!
      // Only lerp for downward motion (gravity fall). Upward shifts (addRow) snap instantly.
      if (slab.y > currentVisualY) {
        currentVisualY = slab.y
      } else {
        currentVisualY += (slab.y - currentVisualY) * t
        if (Math.abs(slab.y - currentVisualY) < 0.05) currentVisualY = slab.y
      }
      board.slabVisualYs.set(slabKey, currentVisualY)

      // --- Phase C: Landing impact detection ---
      if ((justLandedNow || needsLandDetect) && !board.slabLandTimes.has(slabKey)) {
        board.slabLandTimes.set(slabKey, now)

        // Camera shake scaled to slab size
        this.cameras.main.shake(120, 0.006 * slab.height)

        // Landing thud
        if (board === this.local) {
          playGarbageLand()
        }

        // Dust particles along bottom edge (skip on mobile remote board)
        if (!(this.mobile && board.side === 'remote')) {
          const bottomGridRow = state.height - 1 - slab.y
          if (bottomGridRow >= 0 && bottomGridRow < state.height) {
            const dustX = board.originX + (slab.x + slab.width / 2) * cellSize
            const dustY = board.originY + (bottomGridRow + 1) * cellSize
            spawnGarbageImpact(this, dustX, dustY, slab.width * cellSize)
          }
        }
      }

      // Landing bounce timing
      const landedAt = board.slabLandTimes.get(slabKey)
      const landElapsed = landedAt ? now - landedAt : Infinity
      const bouncing = landElapsed < 200

      // Squash-stretch during bounce
      let scaleX = 1, scaleY = 1
      if (bouncing) {
        const bt = landElapsed / 200
        // Spring: squash then recover
        const bounce = Math.sin(bt * Math.PI) * (1 - bt)
        scaleX = 1 + bounce * 0.1
        scaleY = 1 - bounce * 0.15
      }

      // Track pixel bounds for unified border
      let minPx = Infinity, minPy = Infinity, maxPx = -Infinity, maxPy = -Infinity

      const isFlashing = slab.flashTimer > 0
      const flashAlpha = isFlashing ? 0.6 + Math.sin(now * 0.03) * 0.3 : 1.0

      for (let gy = slab.y; gy < slab.y + slab.height; gy++) {
        for (let gx = slab.x; gx < slab.x + slab.width; gx++) {
          const gridRow = state.height - 1 - gy
          if (gridRow < 0 || gridRow >= state.height) continue
          const idx = gx + gridRow * state.width
          const block = state.blocks[idx]
          if (!block || !block.garbage) continue

          const px = board.originX + gx * cellSize + board.blockSize / 2

          // Use visual Y for smooth interpolation
          const visualGridRow = state.height - 1 - (gy - slab.y + currentVisualY)
          const py = board.originY + visualGridRow * cellSize + board.blockSize / 2

          // Update pixel bounds (use visual position)
          const left = board.originX + gx * cellSize
          const top = board.originY + visualGridRow * cellSize
          if (left < minPx) minPx = left
          if (top < minPy) minPy = top
          if (left + cellSize > maxPx) maxPx = left + cellSize
          if (top + cellSize > maxPy) maxPy = top + cellSize

          // Render garbage cell
          if (!board.sprites[idx]) {
            const sprite = this.add.sprite(px, py, 'garbage_cell')
            sprite.setDisplaySize(cellSize, cellSize)
            sprite.setDepth(2 + board.depthOffset)
            board.sprites[idx] = sprite
          }
          const sprite = board.sprites[idx]!
          sprite.setTexture('garbage_cell')
          sprite.setVisible(true)
          sprite.clearTint()
          sprite.setAlpha(flashAlpha)
          if (isFlashing) {
            sprite.setTint(Phaser.Display.Color.GetColor(
              200 + Math.floor(Math.sin(now * 0.04) * 55),
              200 + Math.floor(Math.sin(now * 0.04) * 55),
              220 + Math.floor(Math.sin(now * 0.04) * 35),
            ))
          }
          sprite.setDisplaySize(cellSize * scaleX, cellSize * scaleY)
          sprite.x = px
          sprite.y = py
        }
      }

      // Draw unified slab background + border
      if (minPx < Infinity) {
        const bw = maxPx - minPx
        const bh = maxPy - minPy
        // Light background fill to unify the slab
        board.garbageBorderGfx.fillStyle(0x9ba4b5, 0.12)
        board.garbageBorderGfx.fillRoundedRect(minPx + 1, minPy + 1, bw - 2, bh - 2, 8)
        // Border
        board.garbageBorderGfx.lineStyle(2, 0x7d879a, 0.35)
        board.garbageBorderGfx.strokeRoundedRect(minPx + 1, minPy + 1, bw - 2, bh - 2, 8)
      }

      // Update prev Y tracking
      board.prevSlabYs.set(slabKey, slab.y)
    }

    // Clean stale tracking entries
    for (const key of board.prevSlabYs.keys()) {
      if (!activeSlabKeys.has(key)) {
        board.prevSlabYs.delete(key)
        board.slabLandTimes.delete(key)
        board.slabVisualYs.delete(key)
      }
    }
  }

  private showGlow(board: BoardState, index: number, colorIndex: number, x: number, y: number, visible: boolean, scale = 1): void {
    const { blockSize, depthOffset } = board
    if (visible) {
      if (!board.glowSprites[index]) {
        const glow = this.add.sprite(x, y, `glow_${colorIndex}`)
        glow.setDisplaySize(blockSize + 10, blockSize + 10)
        glow.setDepth(1 + depthOffset)
        glow.setAlpha(0.5)
        board.glowSprites[index] = glow
      }
      const glow = board.glowSprites[index]!
      glow.setTexture(`glow_${colorIndex}`)
      glow.setPosition(x, y)
      glow.setVisible(true)
      const baseAlpha = 0.1 + Math.sin(this.time.now * 0.015) * 0.3 + 0.3
      glow.setAlpha(baseAlpha)
      const glowSize = (blockSize + 10) * scale
      glow.setDisplaySize(glowSize, glowSize)
    } else {
      if (board.glowSprites[index]) {
        board.glowSprites[index]!.setVisible(false)
      }
    }
  }

  private updateDangerOverlay(board: BoardState, dangerLevel: number): void {
    const { cellSize } = board
    const targetAlpha = DANGER_ALPHA[dangerLevel]
    board.currentDangerAlpha += (targetAlpha - board.currentDangerAlpha) * 0.02
    const gx = board.originX - 4
    const gy = board.originY - 4
    const gw = GRID_COLS * cellSize + 8
    const gh = GRID_ROWS * cellSize + 8
    const color = dangerLevel >= 2 ? 0x330000 : 0x000000
    board.dangerOverlay.clear()
    board.dangerOverlay.fillStyle(color, board.currentDangerAlpha)
    board.dangerOverlay.fillRoundedRect(gx, gy, gw, gh, 14)
  }

  private doChainScreenEffect(board: BoardState, chainNum: number): void {
    if (chainNum >= 2) {
      const intensity = Math.min(0.008 * chainNum, 0.03)
      this.cameras.main.shake(150 + chainNum * 30, intensity)

      const flashAlpha = Math.min(0.15 + chainNum * 0.06, 0.4)
      board.flashOverlay.setAlpha(flashAlpha)
      this.tweens.add({
        targets: board.flashOverlay,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
      })
    }
  }

  private updateSparkles(board: BoardState, delta: number): void {
    if (board.isGameOver) return
    const { cellSize } = board
    const now = this.time.now
    const gy = board.originY - 4
    const gh = GRID_ROWS * cellSize + 8
    const gx = board.originX - 4
    const gw = GRID_COLS * cellSize + 8

    for (const sparkle of board.sparkles) {
      const speedY = sparkle.getData('speedY') as number
      let baseX = sparkle.getData('baseX') as number
      const wobbleAmp = sparkle.getData('wobbleAmp') as number
      const wobblePhase = sparkle.getData('wobblePhase') as number

      sparkle.y -= speedY * delta / 1000

      // Wrap at top
      if (sparkle.y < gy - 10) {
        sparkle.y = gy + gh + 10
        baseX = Phaser.Math.FloatBetween(gx + 10, gx + gw - 10)
        sparkle.setData('baseX', baseX)
      }

      sparkle.x = baseX + Math.sin(now * 0.0008 + wobblePhase) * wobbleAmp
    }
  }

  private pulseSparkles(board: BoardState, intensity: number): void {
    if (board.side !== 'local') return
    const { cellSize } = board

    const gx = board.originX - 4
    const gy = board.originY - 4
    const gw = GRID_COLS * cellSize + 8
    const gh = GRID_ROWS * cellSize + 8

    // Flash existing sparkles
    for (const sparkle of board.sparkles) {
      const baseAlpha = sparkle.getData('baseAlpha') as number
      const peakAlpha = Math.min(0.3 + intensity * 0.05, 0.5)
      this.tweens.add({
        targets: sparkle,
        alpha: peakAlpha,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 150,
        yoyo: true,
        ease: 'Sine.easeOut',
        onComplete: () => {
          sparkle.setAlpha(baseAlpha)
          sparkle.setScale(1)
        },
      })
    }

    // Spawn burst sparkles (kawaii shapes)
    const burstCount = Math.floor(2 + intensity * 2)
    for (let i = 0; i < burstCount; i++) {
      const bx = Phaser.Math.FloatBetween(gx + 10, gx + gw - 10)
      const by = Phaser.Math.FloatBetween(gy + 10, gy + gh - 10)
      const sizeScale = cellSize / 71
      const size = Phaser.Math.FloatBetween(36 * sizeScale, 66 * sizeScale)
      const texture = KAWAII_TEXTURES_LOCAL[Math.floor(Math.random() * KAWAII_TEXTURES_LOCAL.length)]
      const burst = this.add.sprite(bx, by, texture)
      burst.setDisplaySize(size, size)
      burst.setAlpha(0)
      burst.setDepth(0.5)
      burst.setTint(KAWAII_TINTS_LOCAL[Math.floor(Math.random() * KAWAII_TINTS_LOCAL.length)])
      burst.setMask(board.sparkleMask)
      this.tweens.add({
        targets: burst,
        alpha: { from: 0.4, to: 0 },
        scaleX: { from: 1.2, to: 0.3 },
        scaleY: { from: 1.2, to: 0.3 },
        duration: 600,
        ease: 'Power2',
        onComplete: () => burst.destroy(),
      })
    }

    // Briefly brighten ambient glow
    this.tweens.add({
      targets: board.gridGlow,
      alpha: { from: 1.5, to: 1 },
      duration: 300,
      ease: 'Sine.easeOut',
    })
  }

  private assignFlashStagger(board: BoardState, indices: number[]): void {
    const sorted = [...indices].sort((a, b) => {
      const rowA = Math.floor(a / GRID_COLS)
      const rowB = Math.floor(b / GRID_COLS)
      if (rowA !== rowB) return rowA - rowB
      return (a % GRID_COLS) - (b % GRID_COLS)
    })
    for (let i = 0; i < sorted.length; i++) {
      board.flashStaggerOffsets[sorted[i]] = i * STAGGER_MS
    }
  }

  private getBlockCentroid(board: BoardState, indices: number[]): { x: number; y: number } {
    const { cellSize, blockSize } = board
    let sumX = 0, sumY = 0
    for (const idx of indices) {
      sumX += board.originX + (idx % GRID_COLS) * cellSize + blockSize / 2
      sumY += board.originY + Math.floor(idx / GRID_COLS) * cellSize + blockSize / 2
    }
    return { x: sumX / indices.length, y: sumY / indices.length }
  }

  private showScorePopup(score: number, x: number, y: number): void {
    const text = this.add.text(x, y, `+${score}`, {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#FFD700', blur: 6, fill: true },
    })
    text.setOrigin(0.5)
    text.setDepth(3)
    text.setScale(0.3)

    this.tweens.add({
      targets: text,
      scaleX: 1,
      scaleY: 1,
      duration: 120,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: text,
          y: y - 40,
          alpha: 0,
          duration: 500,
          ease: 'Power2',
          onComplete: () => text.destroy(),
        })
      },
    })
  }

  private spawnParticlesAt(board: BoardState, index: number): void {
    if (!board.lastState) return
    const { cellSize, blockSize } = board
    const col = index % GRID_COLS
    const row = Math.floor(index / GRID_COLS)
    const x = board.originX + col * cellSize + blockSize / 2
    const y = board.originY + row * cellSize + blockSize / 2
    const block = board.lastState.blocks[index]
    const colorIndex = block?.color ? (COLOR_TO_INDEX[block.color] ?? 0) : 0
    spawnClearParticles(this, x, y, colorIndex, 8)
  }

  private doCascadingDeath(board: BoardState): void {
    const { cellSize } = board
    const blocksByCol: { col: number; row: number; index: number }[] = []
    if (board.lastState) {
      for (let i = 0; i < board.lastState.blocks.length; i++) {
        const block = board.lastState.blocks[i]
        if (block.color && !block.garbage && board.sprites[i]?.visible) {
          blocksByCol.push({
            col: i % GRID_COLS,
            row: Math.floor(i / GRID_COLS),
            index: i,
          })
        }
      }
    }
    blocksByCol.sort((a, b) => a.col !== b.col ? a.col - b.col : b.row - a.row)

    let prevCol = -1, colIndex = -1, rowInCol = 0, maxDelay = 0
    for (const entry of blocksByCol) {
      if (entry.col !== prevCol) { colIndex++; rowInCol = 0; prevCol = entry.col }
      const delay = colIndex * DEATH_COL_DELAY + rowInCol * DEATH_ROW_DELAY
      if (delay > maxDelay) maxDelay = delay
      rowInCol++

      const sprite = board.sprites[entry.index]
      if (!sprite) continue
      this.showGlow(board, entry.index, 0, 0, 0, false)

      this.tweens.add({
        targets: sprite,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        angle: (Math.random() - 0.5) * 30,
        duration: 250,
        delay,
        ease: 'Back.easeIn',
        onComplete: () => sprite.setVisible(false),
      })
    }

    board.garbageBorderGfx.clear()
    board.prevSlabYs.clear()
    board.slabLandTimes.clear()
    board.slabVisualYs.clear()

    // Fade warning graphics
    this.tweens.add({
      targets: board.garbageWarningGfx,
      alpha: 0,
      duration: 300,
    })

    // Fade grid after blocks die
    this.time.delayedCall(maxDelay, () => {
      this.tweens.add({
        targets: [board.gridLines, board.gridGlow, board.dangerOverlay, board.gridBg, board.gradientOverlay, board.garbageBorderGfx, board.garbageWarningGfx, ...board.sparkles],
        alpha: 0,
        duration: 300,
        ease: 'Power2',
      })
    })

    // Shutters
    const gridHeight = GRID_ROWS * cellSize
    const shutterDelay = maxDelay + 150
    const halfH = (gridHeight + 8) / 2
    this.time.delayedCall(shutterDelay, () => {
      const sx = board.originX - 4
      const sy = board.originY - 4
      const sw = GRID_COLS * cellSize + 8
      const sh = gridHeight + 8
      const proxy = { h: 0 }
      this.tweens.add({
        targets: proxy,
        h: halfH,
        duration: 500,
        ease: 'Power3',
        onUpdate: () => {
          board.shutterTop.clear()
          board.shutterTop.fillStyle(0x0a0a12, 0.92)
          board.shutterTop.fillRoundedRect(sx, sy, sw, proxy.h, { tl: 14, tr: 14, bl: 0, br: 0 })
          board.shutterBottom.clear()
          board.shutterBottom.fillStyle(0x0a0a12, 0.92)
          board.shutterBottom.fillRoundedRect(sx, sy + sh - proxy.h, sw, proxy.h, { tl: 0, tr: 0, bl: 14, br: 14 })
        },
      })
    })
  }

  // --- Input ---

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (this.matchOver || this.local.isGameOver) return
    if (useGameStore.getState().countdown !== null) return

    // Only handle clicks on the local board
    const ox = this.local.originX
    const oy = this.local.originY
    const { cellSize } = this.local
    const col = Math.floor((pointer.x - ox) / cellSize)
    const row = Math.floor((pointer.y - oy) / cellSize)

    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      if (row >= GRID_ROWS && col >= 0 && col < GRID_COLS) this.doAddRow()
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
    if (this.matchOver || this.local.isGameOver) return
    if (useGameStore.getState().countdown !== null) return
    Sound.playSwap()
    const event = {
      time: this.local.engine.time,
      type: 'swap' as const,
      index: this.cursorX + this.cursorY * GRID_COLS,
    }
    this.local.engine.addEvent(event)

    // Broadcast
    const channel = useMatchStore.getState().channel
    if (channel) {
      channel.sendEvent(event)
    }
  }

  private doAddRow(): void {
    if (this.matchOver || this.local.isGameOver) return
    const event = {
      time: this.local.engine.time,
      type: 'addRow' as const,
    }
    this.local.engine.addEvent(event)
    this.local.autoRiseCounter = 0

    const channel = useMatchStore.getState().channel
    if (channel) {
      channel.sendEvent(event)
    }
  }

  private drawCursor(): void {
    this.cursorGraphics.clear()
    if (this.matchOver || this.local.isGameOver || useGameStore.getState().countdown !== null) return

    const { cellSize, blockSize, blockGap } = this.local
    const x = this.local.originX + this.cursorX * cellSize
    const y = this.local.originY + this.cursorY * cellSize
    const alpha = 0.6 + Math.sin(this.time.now / 200) * 0.3
    const w = cellSize * 2 + blockGap
    const h = blockSize + 3

    this.cursorGraphics.lineStyle(4, 0xfbbf24, alpha * 0.2)
    this.cursorGraphics.strokeRoundedRect(x - 2, y - 2, w, h, 10)
    this.cursorGraphics.lineStyle(2, 0xfbbf24, alpha)
    this.cursorGraphics.strokeRoundedRect(x - 2, y - 2, w, h, 10)
  }

  // --- Network integration ---

  /** Called externally to apply an opponent event to the remote engine */
  applyOpponentEvent(event: { type: string; index?: number; time?: number }): void {
    this.remote.engine.addEvent({
      time: this.remote.engine.time,
      type: event.type as 'swap' | 'addRow',
      index: event.index,
    })
  }

  /** Called externally when opponent sends garbage to us */
  applyIncomingGarbage(slab: { x: number; width: number; height: number }): void {
    this.local.engine.addEvent({
      time: this.local.engine.time,
      type: 'addGarbage',
      slab,
    })
    playIncomingGarbage()
  }

  /** Called externally when opponent reports game over */
  applyOpponentGameOver(): void {
    if (this.matchOver) return
    this.handleBoardGameOver(this.remote, 'remote')
  }
}
