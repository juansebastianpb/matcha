import Phaser from 'phaser'
import { GameEngine } from '../engine'
import type { GameState } from '../engine'
import {
  GRID_ROWS, GRID_COLS, GRID_OFFSET_X, GRID_OFFSET_Y,
  CELL_SIZE, BLOCK_SIZE, BLOCK_GAP, GAME_WIDTH, GAME_HEIGHT,
  ENGINE_FPS, ROUND_DURATION, AUTO_RISE_INTERVAL,
} from '../constants'
import { useGameStore } from '../../stores/gameStore'

// Map engine color names to tile texture indices
const COLOR_TO_INDEX: Record<string, number> = {
  red: 0,
  green: 3,
  blue: 1,
  violet: 4,
  yellow: 0,
  navy: 5,
}

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine
  private sprites: (Phaser.GameObjects.Sprite | null)[] = []
  private previewSprites: Phaser.GameObjects.Sprite[] = []
  private cursorGraphics!: Phaser.GameObjects.Graphics
  private cursorX = 0
  private cursorY = 0
  private selectedIndex: number | null = null

  private engineAccum = 0
  private gameTimer = 0
  private isGameOver = false
  private autoRiseCounter = 0
  private riseSpeedMultiplier = 1

  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    this.isGameOver = false
    this.engineAccum = 0
    this.gameTimer = 0
    this.autoRiseCounter = 0
    this.selectedIndex = null
    this.cursorX = 2
    this.cursorY = 6
    this.riseSpeedMultiplier = 1

    // Init engine
    this.engine = new GameEngine({
      width: GRID_COLS,
      height: GRID_ROWS,
      initialRows: 6,
      scoringSystem: 'puzzleLeague',
    })

    // Listen for engine effects
    this.engine.on('chainMatchMade', (effect) => {
      const chainNum = effect.chainNumber ?? 0
      if (chainNum > 1) {
        this.showPopup(`${chainNum}x CHAIN!`, '#FFD700', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30)
        useGameStore.getState().setChain(chainNum)
        const store = useGameStore.getState()
        store.setMaxChain(Math.max(chainNum, store.maxChain))
      }
    })

    this.engine.on('matchMade', (effect) => {
      const count = effect.indices?.length ?? 0
      if (count > 3) {
        this.showPopup(`${count}x COMBO!`, '#FF6B6B', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10)
        const store = useGameStore.getState()
        store.setMaxCombo(Math.max(count - 2, store.maxCombo))
      }
    })

    // Game over: blocks reached the top
    this.engine.on('gameOver', () => {
      this.cameras.main.shake(300, 0.015)
      this.endGame()
    })

    // Cursor moves up when a row is added
    this.engine.on('addRow', () => {
      if (this.cursorY > 0) this.cursorY--
    })

    this.drawBackground()
    this.drawGridBackground()

    // Create sprite pool
    this.sprites = new Array(GRID_ROWS * GRID_COLS).fill(null)
    this.previewSprites = []

    for (let x = 0; x < GRID_COLS; x++) {
      const sprite = this.add.sprite(
        GRID_OFFSET_X + x * CELL_SIZE + BLOCK_SIZE / 2,
        GRID_OFFSET_Y + GRID_ROWS * CELL_SIZE + BLOCK_SIZE / 2 + 4,
        'tile_0'
      )
      sprite.setDisplaySize(BLOCK_SIZE - 8, BLOCK_SIZE - 8)
      sprite.setAlpha(0.4)
      sprite.setDepth(1)
      this.previewSprites.push(sprite)
    }

    this.cursorGraphics = this.add.graphics()
    this.cursorGraphics.setDepth(5)

    // Input: pointer
    this.input.on('pointerdown', this.handlePointer, this)

    // Input: keyboard (same as original panel-league keybindings)
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

    // Initial render — use engine.step() directly like the original source does
    // (do NOT use engine.currentState which double-steps)
    const state = this.engine.step()
    this.renderState(state)

    const store = useGameStore.getState()
    store.reset()
    store.setPlaying(true)
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return

    // Real-time countdown
    this.gameTimer += delta / 1000
    const timeLeft = Math.max(0, ROUND_DURATION - this.gameTimer)

    // Speed up rising blocks as time runs out
    if (timeLeft < 30) this.riseSpeedMultiplier = 1.5
    if (timeLeft < 15) this.riseSpeedMultiplier = 2

    // Fixed timestep engine tick
    this.engineAccum += delta
    const msPerTick = 1000 / ENGINE_FPS
    let lastState: GameState | null = null

    while (this.engineAccum >= msPerTick) {
      this.engineAccum -= msPerTick

      if (this.isGameOver) break

      // Auto-rise: add a row every N engine ticks
      this.autoRiseCounter++
      const riseInterval = Math.floor(AUTO_RISE_INTERVAL / this.riseSpeedMultiplier)
      if (this.autoRiseCounter >= riseInterval) {
        this.autoRiseCounter = 0
        this.engine.addEvent({
          time: this.engine.time,
          type: 'addRow',
        })
      }

      // Step engine — returns state directly (same pattern as original source sandbox)
      lastState = this.engine.step()
    }

    if (lastState) {
      this.renderState(lastState)

      const store = useGameStore.getState()
      store.setScore(lastState.score)
      store.setTime(timeLeft)
    }

    this.drawCursor()

    // Time's up
    if (timeLeft <= 0 && !this.isGameOver) {
      this.endGame()
    }
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (this.isGameOver) return

    const col = Math.floor((pointer.x - GRID_OFFSET_X) / CELL_SIZE)
    const row = Math.floor((pointer.y - GRID_OFFSET_Y) / CELL_SIZE)

    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      if (row >= GRID_ROWS) this.doAddRow()
      return
    }

    const tappedIndex = col + row * GRID_COLS

    if (this.selectedIndex === null) {
      this.selectedIndex = tappedIndex
      this.cursorX = col
      this.cursorY = row
    } else {
      const selCol = this.selectedIndex % GRID_COLS
      const selRow = Math.floor(this.selectedIndex / GRID_COLS)

      if (tappedIndex === this.selectedIndex) {
        this.selectedIndex = null
        return
      }

      // Adjacent horizontal swap
      if (selRow === row && Math.abs(selCol - col) === 1) {
        const swapCol = Math.min(selCol, col)
        this.engine.addEvent({
          time: this.engine.time,
          type: 'swap',
          index: swapCol + selRow * GRID_COLS,
        })
        this.selectedIndex = null
      } else {
        this.selectedIndex = tappedIndex
        this.cursorX = col
        this.cursorY = row
      }
    }
  }

  private doSwap(): void {
    if (this.isGameOver) return
    this.engine.addEvent({
      time: this.engine.time,
      type: 'swap',
      index: this.cursorX + this.cursorY * GRID_COLS,
    })
    this.selectedIndex = null
  }

  private doAddRow(): void {
    if (this.isGameOver) return
    this.engine.addEvent({
      time: this.engine.time,
      type: 'addRow',
    })
    this.autoRiseCounter = 0
  }

  private renderState(state: GameState): void {
    state.blocks.forEach((block, i) => {
      const col = i % state.width
      const row = Math.floor(i / state.width)
      const x = GRID_OFFSET_X + col * CELL_SIZE + BLOCK_SIZE / 2
      const y = GRID_OFFSET_Y + row * CELL_SIZE + BLOCK_SIZE / 2

      if (block.color && !block.garbage) {
        const textureIndex = COLOR_TO_INDEX[block.color] ?? 0

        if (!this.sprites[i]) {
          const sprite = this.add.sprite(x, y, `tile_${textureIndex}`)
          sprite.setDisplaySize(BLOCK_SIZE - 2, BLOCK_SIZE - 2)
          sprite.setDepth(2)
          this.sprites[i] = sprite
        }

        const sprite = this.sprites[i]!
        sprite.setTexture(`tile_${textureIndex}`)
        sprite.setVisible(true)

        // Swap slide animation (from original panel-league block.js)
        let targetX = x
        if (block.swapTimer !== 0) {
          const swapRatio = block.swapTimer / state.swapTime
          targetX = x - swapRatio * CELL_SIZE
        }

        sprite.x += (targetX - sprite.x) * 0.4
        sprite.y += (y - sprite.y) * 0.4

        // Flashing (from original: block has flashTimer >= 0 when matched)
        if (block.flashTimer >= 0) {
          sprite.setAlpha(block.flashTimer % 2 === 0 ? 0.3 : 1)
          sprite.setScale(1.1)
        } else {
          sprite.setAlpha(1)
          const s = sprite.scaleX
          sprite.setScale(s + (1 - s) * 0.3)
        }

        // Floating/falling transparency
        if (block.floatTimer >= 0) {
          sprite.setAlpha(0.85)
        }
      } else {
        if (this.sprites[i]) {
          this.sprites[i]!.setVisible(false)
        }
      }
    })

    // Preview row (next row coming from bottom)
    if (state.nextRow) {
      state.nextRow.forEach((block, i) => {
        if (block.color) {
          const textureIndex = COLOR_TO_INDEX[block.color] ?? 0
          this.previewSprites[i].setTexture(`tile_${textureIndex}`)
          this.previewSprites[i].setVisible(true)
        } else {
          this.previewSprites[i].setVisible(false)
        }
      })
    }
  }

  private drawCursor(): void {
    this.cursorGraphics.clear()
    if (this.isGameOver) return

    const x = GRID_OFFSET_X + this.cursorX * CELL_SIZE
    const y = GRID_OFFSET_Y + this.cursorY * CELL_SIZE
    const alpha = 0.6 + Math.sin(this.time.now / 200) * 0.3

    // Swap cursor: two-wide highlight (same as original panel-league swapper)
    this.cursorGraphics.lineStyle(3, 0xffffff, alpha)
    this.cursorGraphics.strokeRoundedRect(
      x - 2, y - 2,
      CELL_SIZE * 2 + BLOCK_GAP, BLOCK_SIZE + 4,
      6
    )

    // Selection highlight for tap-to-swap
    if (this.selectedIndex !== null) {
      const selCol = this.selectedIndex % GRID_COLS
      const selRow = Math.floor(this.selectedIndex / GRID_COLS)
      this.cursorGraphics.lineStyle(3, 0x55efc4, alpha)
      this.cursorGraphics.strokeRoundedRect(
        GRID_OFFSET_X + selCol * CELL_SIZE - 1,
        GRID_OFFSET_Y + selRow * CELL_SIZE - 1,
        BLOCK_SIZE + 2, BLOCK_SIZE + 2, 4
      )
    }
  }

  private showPopup(text: string, color: string, x: number, y: number): void {
    const popup = this.add.text(x, y, text, {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial',
      color,
      stroke: '#000000',
      strokeThickness: 3,
    })
    popup.setOrigin(0.5)
    popup.setDepth(20)
    this.tweens.add({
      targets: popup,
      y: y - 40,
      alpha: 0,
      scale: 1.3,
      duration: 800,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    })
  }

  private endGame(): void {
    if (this.isGameOver) return
    this.isGameOver = true

    // Get final state from the last cached state (no double-step)
    const stateJSON = this.engine.lastValidState
    const state: GameState = stateJSON ? JSON.parse(stateJSON) : { score: 0 }

    const store = useGameStore.getState()
    store.setPlaying(false)
    store.setGameOver(true)
    store.setFinalScore(state.score)
    store.setBlocksCleared(Math.floor(state.score / 10))

    this.input.off('pointerdown', this.handlePointer, this)
    this.cursorGraphics.clear()
  }

  private drawBackground(): void {
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1)
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    bg.setDepth(-2)
  }

  private drawGridBackground(): void {
    const gridBg = this.add.graphics()
    gridBg.fillStyle(0x0f3460, 0.3)
    gridBg.fillRoundedRect(
      GRID_OFFSET_X - 4, GRID_OFFSET_Y - 4,
      GRID_COLS * CELL_SIZE + 8, GRID_ROWS * CELL_SIZE + 8,
      8
    )
    gridBg.setDepth(-1)

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
}
