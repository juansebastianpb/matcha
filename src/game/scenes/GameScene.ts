import Phaser from 'phaser'
import { Grid } from '../objects/Grid'
import { BlockFactory } from '../objects/BlockFactory'
import { Cursor } from '../objects/Cursor'
import { MatchSystem } from '../systems/MatchSystem'
import { GravitySystem } from '../systems/GravitySystem'
import { ChainSystem } from '../systems/ChainSystem'
import { ComboSystem } from '../systems/ComboSystem'
import { ScoreSystem } from '../systems/ScoreSystem'
import { SwapSystem } from '../systems/SwapSystem'
import { RiseSystem } from '../systems/RiseSystem'
import { TimerSystem } from '../systems/TimerSystem'
import { InputSystem } from '../systems/InputSystem'
import type { Position } from '../types'
import type { MatchGroup } from '../types'
import { createChainPopup, createComboPopup, createScorePopup } from '../art/effects'
import {
  GRID_ROWS, GRID_COLS, GRID_OFFSET_X, GRID_OFFSET_Y,
  CELL_SIZE, GAME_WIDTH, GAME_HEIGHT,
  RISE_PAUSE_ON_CHAIN, TOPOUT_PENALTY_PAUSE,
} from '../constants'
import { useGameStore } from '../../stores/gameStore'

const GamePhase = {
  Playing: 0,
  Matching: 1,
  Gravity: 2,
  GameOver: 3,
} as const
type GamePhase = (typeof GamePhase)[keyof typeof GamePhase]

export class GameScene extends Phaser.Scene {
  private grid!: Grid
  private factory!: BlockFactory
  private cursor!: Cursor
  private matchSystem!: MatchSystem
  private gravitySystem!: GravitySystem
  private chainSystem!: ChainSystem
  private comboSystem!: ComboSystem
  private scoreSystem!: ScoreSystem
  private swapSystem!: SwapSystem
  private riseSystem!: RiseSystem
  private timerSystem!: TimerSystem
  private inputSystem!: InputSystem

  private phase: GamePhase = GamePhase.Playing
  private selectedPos: Position | null = null

  // Visual
  private gridBg!: Phaser.GameObjects.Graphics

  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    this.phase = GamePhase.Playing
    this.selectedPos = null

    this.drawBackground()
    this.drawGridBackground()

    this.grid = new Grid()
    this.grid.init()

    this.factory = new BlockFactory(this)

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const data = this.grid.getBlock(row, col)
        if (data) {
          this.factory.createBlock(data)
        }
      }
    }

    this.cursor = new Cursor(this)

    this.chainSystem = new ChainSystem()
    this.comboSystem = new ComboSystem()
    this.scoreSystem = new ScoreSystem(this.chainSystem, this.comboSystem)
    this.matchSystem = new MatchSystem(this, this.grid, this.factory)
    this.gravitySystem = new GravitySystem(this.grid, this.factory)
    this.swapSystem = new SwapSystem(this.grid, this.factory)
    this.riseSystem = new RiseSystem(this, this.grid, this.factory)
    this.timerSystem = new TimerSystem()

    this.inputSystem = new InputSystem(this, (pos) => this.handleBlockSelect(pos))

    this.timerSystem.start()

    const store = useGameStore.getState()
    store.reset()
    store.setPlaying(true)
  }

  update(_time: number, delta: number): void {
    if (this.phase === GamePhase.GameOver) return

    this.timerSystem.update(delta)

    const store = useGameStore.getState()
    store.setTime(this.timerSystem.getRemaining())
    store.setScore(this.scoreSystem.getScore())

    if (this.timerSystem.isExpired()) {
      this.endGame()
      return
    }

    switch (this.phase) {
      case GamePhase.Playing:
        this.updatePlaying(delta)
        break
      case GamePhase.Matching:
        this.updateMatching()
        break
      case GamePhase.Gravity:
        this.updateGravity()
        break
    }
  }

  private updatePlaying(delta: number): void {
    if (this.swapSystem.isSwapping() || this.matchSystem.isClearing()) return

    const riseResult = this.riseSystem.update(delta)
    if (riseResult.toppedOut) {
      this.handleTopout()
    }
    if (riseResult.rowAdded && this.selectedPos) {
      this.selectedPos.row = Math.max(0, this.selectedPos.row - 1)
      this.cursor.select(this.selectedPos.row, this.selectedPos.col)
    }
  }

  private updateMatching(): void {
    if (this.matchSystem.isClearing()) return

    this.phase = GamePhase.Gravity
    const hasFalls = this.gravitySystem.applyGravity()
    if (!hasFalls) {
      this.checkForMoreMatches()
    }
  }

  private updateGravity(): void {
    if (this.gravitySystem.isFalling()) return
    this.checkForMoreMatches()
  }

  private checkForMoreMatches(): void {
    const matches = this.matchSystem.checkMatches()
    if (matches.length > 0) {
      this.chainSystem.increment()
      this.processMatches(matches)
    } else {
      const chainLevel = this.chainSystem.getLevel()
      if (chainLevel > 1) {
        useGameStore.getState().setMaxChain(Math.max(chainLevel, useGameStore.getState().maxChain))
      }
      this.chainSystem.reset()
      this.comboSystem.reset()
      this.phase = GamePhase.Playing
    }
  }

  private processMatches(matches: MatchGroup[]): void {
    this.phase = GamePhase.Matching

    this.matchSystem.clearMatches(matches, (totalBlocks, groupCount) => {
      const points = this.scoreSystem.addClear(totalBlocks, groupCount)

      const centerX = GAME_WIDTH / 2
      const centerY = GAME_HEIGHT / 2

      createScorePopup(this, centerX, centerY - 20, points)

      if (this.chainSystem.getLevel() > 1) {
        createChainPopup(this, centerX, centerY - 45, this.chainSystem.getLevel())
        this.riseSystem.pause(RISE_PAUSE_ON_CHAIN)
        useGameStore.getState().setChain(this.chainSystem.getLevel())
      }

      if (groupCount > 1) {
        createComboPopup(this, centerX, centerY + 10, groupCount)
        const maxCombo = this.comboSystem.getMaxCombo()
        useGameStore.getState().setMaxCombo(Math.max(maxCombo, useGameStore.getState().maxCombo))
      }
    })
  }

  private handleBlockSelect(pos: Position): void {
    if (this.phase !== GamePhase.Playing) return
    if (this.swapSystem.isSwapping() || this.matchSystem.isClearing()) return

    const adjustedRow = pos.row

    if (this.selectedPos === null) {
      const block = this.grid.getBlock(adjustedRow, pos.col)
      if (!block) return

      this.selectedPos = { row: adjustedRow, col: pos.col }
      this.cursor.select(adjustedRow, pos.col)
    } else {
      const target = { row: adjustedRow, col: pos.col }

      if (target.row === this.selectedPos.row && target.col === this.selectedPos.col) {
        this.selectedPos = null
        this.cursor.deselect()
        return
      }

      if (this.swapSystem.canSwap(this.selectedPos, target)) {
        this.cursor.deselect()
        const from = this.selectedPos
        this.selectedPos = null

        this.swapSystem.performSwap(from, target, () => {
          const matches = this.matchSystem.checkMatches()
          if (matches.length > 0) {
            this.chainSystem.startChain()
            this.processMatches(matches)
          }
        })
      } else {
        const block = this.grid.getBlock(adjustedRow, pos.col)
        if (block) {
          this.selectedPos = target
          this.cursor.select(adjustedRow, pos.col)
        } else {
          this.selectedPos = null
          this.cursor.deselect()
        }
      }
    }
  }

  private handleTopout(): void {
    this.scoreSystem.applyTopoutPenalty()
    this.riseSystem.pause(TOPOUT_PENALTY_PAUSE)
    this.cameras.main.shake(200, 0.01)
    useGameStore.getState().setScore(this.scoreSystem.getScore())
  }

  private endGame(): void {
    this.phase = GamePhase.GameOver

    const store = useGameStore.getState()
    store.setPlaying(false)
    store.setGameOver(true)
    store.setFinalScore(this.scoreSystem.getScore())
    store.setBlocksCleared(this.scoreSystem.getBlocksCleared())

    this.inputSystem.destroy()
  }

  private drawBackground(): void {
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1)
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    bg.setDepth(-2)
  }

  private drawGridBackground(): void {
    this.gridBg = this.add.graphics()
    this.gridBg.fillStyle(0x0f3460, 0.3)
    this.gridBg.fillRoundedRect(
      GRID_OFFSET_X - 4,
      GRID_OFFSET_Y - 4,
      GRID_COLS * CELL_SIZE + 8,
      GRID_ROWS * CELL_SIZE + 8,
      8
    )
    this.gridBg.setDepth(-1)

    const gridLines = this.add.graphics()
    gridLines.lineStyle(1, 0xffffff, 0.05)
    for (let row = 0; row <= GRID_ROWS; row++) {
      const y = GRID_OFFSET_Y + row * CELL_SIZE
      gridLines.lineBetween(GRID_OFFSET_X, y, GRID_OFFSET_X + GRID_COLS * CELL_SIZE, y)
    }
    for (let col = 0; col <= GRID_COLS; col++) {
      const x = GRID_OFFSET_X + col * CELL_SIZE
      gridLines.lineBetween(x, GRID_OFFSET_Y, x, GRID_OFFSET_Y + GRID_ROWS * CELL_SIZE)
    }
    gridLines.setDepth(-1)
  }

  shutdown(): void {
    this.inputSystem?.destroy()
  }
}
