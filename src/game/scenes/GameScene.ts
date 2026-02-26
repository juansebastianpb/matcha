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

    // Listen for effects
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

    this.engine.on('gameOver', () => {
      // Top-out: penalty + screen shake
      this.cameras.main.shake(200, 0.01)
    })

    // Draw background
    this.drawBackground()
    this.drawGridBackground()

    // Create sprite arrays
    this.sprites = new Array(GRID_ROWS * GRID_COLS).fill(null)
    this.previewSprites = []

    // Create preview row sprites
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

    // Create cursor
    this.cursorGraphics = this.add.graphics()
    this.cursorGraphics.setDepth(5)

    // Input
    this.input.on('pointerdown', this.handlePointer, this)

    // Keyboard
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

    // Initial render
    const state = this.engine.currentState
    this.renderState(state)

    // Reset store
    const store = useGameStore.getState()
    store.reset()
    store.setPlaying(true)
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return

    // Game timer (real seconds)
    this.gameTimer += delta / 1000
    const timeLeft = Math.max(0, ROUND_DURATION - this.gameTimer)

    // Speed up rise as time runs out
    if (timeLeft < 30) {
      this.riseSpeedMultiplier = 1.5
    }
    if (timeLeft < 15) {
      this.riseSpeedMultiplier = 2
    }

    // Engine ticks at ENGINE_FPS
    this.engineAccum += delta
    const msPerTick = 1000 / ENGINE_FPS
    let stepped = false

    while (this.engineAccum >= msPerTick) {
      this.engineAccum -= msPerTick

      // Auto-rise
      this.autoRiseCounter++
      const riseInterval = Math.floor(AUTO_RISE_INTERVAL / this.riseSpeedMultiplier)
      if (this.autoRiseCounter >= riseInterval) {
        this.autoRiseCounter = 0
        this.engine.addEvent({
          time: this.engine.time,
          type: 'addRow',
        })
      }

      // Step engine
      this.engine.step()
      stepped = true
    }

    if (stepped) {
      const state = this.engine.currentState
      this.renderState(state)

      // Sync to store
      const store = useGameStore.getState()
      store.setScore(state.score)
      store.setTime(timeLeft)
    }

    // Draw cursor
    this.drawCursor()

    // Time's up
    if (timeLeft <= 0) {
      this.endGame()
    }
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (this.isGameOver) return

    const col = Math.floor((pointer.x - GRID_OFFSET_X) / CELL_SIZE)
    const row = Math.floor((pointer.y - GRID_OFFSET_Y) / CELL_SIZE)

    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      // Tapped below grid = manual rise
      if (row >= GRID_ROWS) {
        this.doAddRow()
      }
      return
    }

    // Tap-to-select, tap-to-swap mechanic
    const tappedIndex = col + row * GRID_COLS

    if (this.selectedIndex === null) {
      // First tap: select
      this.selectedIndex = tappedIndex
      this.cursorX = col
      this.cursorY = row
    } else {
      const selCol = this.selectedIndex % GRID_COLS
      const selRow = Math.floor(this.selectedIndex / GRID_COLS)

      // Same block: deselect
      if (tappedIndex === this.selectedIndex) {
        this.selectedIndex = null
        return
      }

      // Adjacent horizontally on the same row
      if (selRow === row && Math.abs(selCol - col) === 1) {
        // Swap at the left index
        const swapCol = Math.min(selCol, col)
        const swapIndex = swapCol + selRow * GRID_COLS
        this.engine.addEvent({
          time: this.engine.time,
          type: 'swap',
          index: swapIndex,
        })
        this.selectedIndex = null
      } else {
        // Not adjacent: reselect
        this.selectedIndex = tappedIndex
        this.cursorX = col
        this.cursorY = row
      }
    }
  }

  private doSwap(): void {
    if (this.isGameOver) return
    const index = this.cursorX + this.cursorY * GRID_COLS
    this.engine.addEvent({
      time: this.engine.time,
      type: 'swap',
      index,
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
    const blocks = state.blocks

    blocks.forEach((block, i) => {
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

        // Smooth position with swap animation
        let targetX = x
        if (block.swapTimer !== 0) {
          const swapRatio = block.swapTimer / state.swapTime
          targetX = x - swapRatio * CELL_SIZE
        }

        // Lerp position for smooth movement
        sprite.x += (targetX - sprite.x) * 0.4
        sprite.y += (y - sprite.y) * 0.4

        // Flash animation
        if (block.flashTimer >= 0) {
          sprite.setAlpha(block.flashTimer % 2 === 0 ? 0.3 : 1)
          sprite.setScale(1.1)
        } else {
          sprite.setAlpha(1)

          // Landing bounce
          if (block.floatTimer === -1 && Math.abs(sprite.y - y) > 2) {
            sprite.setScale(1)
          } else {
            // Reset scale smoothly
            const s = sprite.scaleX
            sprite.setScale(s + (1 - s) * 0.3)
          }
        }

        // Floating/falling: slight transparency
        if (block.floatTimer >= 0) {
          sprite.setAlpha(0.85)
        }
      } else {
        // No block or garbage block
        if (this.sprites[i]) {
          this.sprites[i]!.setVisible(false)
        }
      }
    })

    // Render preview row
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

    // Swap cursor: highlights two adjacent blocks
    const x = GRID_OFFSET_X + this.cursorX * CELL_SIZE
    const y = GRID_OFFSET_Y + this.cursorY * CELL_SIZE

    const alpha = 0.6 + Math.sin(this.time.now / 200) * 0.3

    // Draw cursor spanning two blocks
    this.cursorGraphics.lineStyle(3, 0xffffff, alpha)
    this.cursorGraphics.strokeRoundedRect(
      x - 2, y - 2,
      CELL_SIZE * 2 + BLOCK_GAP, BLOCK_SIZE + 4,
      6
    )

    // If a single block is selected (tap mode), highlight it
    if (this.selectedIndex !== null) {
      const selCol = this.selectedIndex % GRID_COLS
      const selRow = Math.floor(this.selectedIndex / GRID_COLS)
      const sx = GRID_OFFSET_X + selCol * CELL_SIZE
      const sy = GRID_OFFSET_Y + selRow * CELL_SIZE

      this.cursorGraphics.lineStyle(3, 0x55efc4, alpha)
      this.cursorGraphics.strokeRoundedRect(sx - 1, sy - 1, BLOCK_SIZE + 2, BLOCK_SIZE + 2, 4)
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
    this.isGameOver = true

    const state = this.engine.currentState
    const store = useGameStore.getState()
    store.setPlaying(false)
    store.setGameOver(true)
    store.setFinalScore(state.score)

    // Count cleared blocks (rough estimate from score)
    store.setBlocksCleared(Math.floor(state.score / 10))

    this.input.off('pointerdown', this.handlePointer, this)
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
