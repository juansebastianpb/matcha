import { Grid } from '../objects/Grid'
import { BlockFactory } from '../objects/BlockFactory'
import { BlockState } from '../types'
import type { Position } from '../types'

export class SwapSystem {
  private grid: Grid
  private factory: BlockFactory
  private swapping = false

  constructor(grid: Grid, factory: BlockFactory) {
    this.grid = grid
    this.factory = factory
  }

  canSwap(a: Position, b: Position): boolean {
    if (this.swapping) return false
    // Must be adjacent horizontally
    if (a.row !== b.row) return false
    if (Math.abs(a.col - b.col) !== 1) return false

    // At least one position must have a block
    const blockA = this.grid.getBlock(a.row, a.col)
    const blockB = this.grid.getBlock(b.row, b.col)
    if (!blockA && !blockB) return false

    // Both must be idle (if they exist)
    if (blockA && blockA.state !== BlockState.Idle) return false
    if (blockB && blockB.state !== BlockState.Idle) return false

    return true
  }

  performSwap(a: Position, b: Position, onComplete: () => void): void {
    this.swapping = true

    const spriteA = this.factory.getBlock(a.row, a.col)
    const spriteB = this.factory.getBlock(b.row, b.col)

    let animCount = 0
    const totalAnims = (spriteA ? 1 : 0) + (spriteB ? 1 : 0)

    const checkDone = () => {
      animCount++
      if (animCount >= totalAnims) {
        // Update grid data
        this.grid.swap(a, b)

        // Update factory index
        if (spriteA && spriteB) {
          this.factory.moveBlock(a.row, a.col, -1, -1) // temp
          this.factory.moveBlock(b.row, b.col, a.row, a.col)
          // Move spriteA from temp
          this.factory.removeBlock(-1, -1) // Won't find it, that's OK
        }

        // Rebuild index after swap
        this.factory.rebuildIndex()

        // Set blocks back to idle
        const newA = this.grid.getBlock(a.row, a.col)
        const newB = this.grid.getBlock(b.row, b.col)
        if (newA) newA.state = BlockState.Idle
        if (newB) newB.state = BlockState.Idle

        this.swapping = false
        onComplete()
      }
    }

    if (spriteA) {
      spriteA.playSwapAnimation(b.row, b.col, checkDone)
    }
    if (spriteB) {
      spriteB.playSwapAnimation(a.row, a.col, checkDone)
    }

    if (totalAnims === 0) {
      this.grid.swap(a, b)
      this.swapping = false
      onComplete()
    }
  }

  isSwapping(): boolean {
    return this.swapping
  }
}
