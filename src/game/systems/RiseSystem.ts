import { Grid } from '../objects/Grid'
import { BlockFactory } from '../objects/BlockFactory'
import type { BlockData } from '../types'
import { RISE_SPEED, RISE_PAUSE_ON_CHAIN, GRID_ROWS, GRID_COLS, CELL_SIZE } from '../constants'

export class RiseSystem {
  private grid: Grid
  private factory: BlockFactory
  private riseOffset = 0
  private paused = false
  private pauseTimer = 0
  private speed: number = RISE_SPEED
  private pendingRow: BlockData[] | null = null

  constructor(_scene: Phaser.Scene, grid: Grid, factory: BlockFactory) {
    this.grid = grid
    this.factory = factory
  }

  pause(duration: number = RISE_PAUSE_ON_CHAIN): void {
    this.paused = true
    this.pauseTimer = duration
  }

  setSpeed(speed: number): void {
    this.speed = speed
  }

  update(delta: number): { toppedOut: boolean; rowAdded: boolean } {
    if (this.paused) {
      this.pauseTimer -= delta
      if (this.pauseTimer <= 0) {
        this.paused = false
      }
      return { toppedOut: false, rowAdded: false }
    }

    this.riseOffset += this.speed * (delta / 16.67)

    if (this.riseOffset >= CELL_SIZE) {
      this.riseOffset = 0

      // Generate new row if needed
      if (!this.pendingRow) {
        this.pendingRow = this.grid.generateNewRow()
      }

      const toppedOut = this.grid.pushRowUp(this.pendingRow)

      if (toppedOut) {
        return { toppedOut: true, rowAdded: false }
      }

      // Rebuild sprites
      this.rebuildSprites()
      this.pendingRow = null

      return { toppedOut: false, rowAdded: true }
    }

    // Shift all sprites up by the rise offset
    this.shiftSprites()

    return { toppedOut: false, rowAdded: false }
  }

  private shiftSprites(): void {
    const blocks = this.factory.getAllBlocks()
    for (const block of blocks) {
      const baseY = block.gridY()
      block.y = baseY - this.riseOffset
    }
  }

  private rebuildSprites(): void {
    this.factory.clear()
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const data = this.grid.getBlock(row, col)
        if (data) {
          this.factory.createBlock(data)
        }
      }
    }
  }

  getRiseOffset(): number {
    return this.riseOffset
  }

  isPaused(): boolean {
    return this.paused
  }
}
