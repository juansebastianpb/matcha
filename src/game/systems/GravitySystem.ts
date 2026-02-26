import { Grid } from '../objects/Grid'
import { BlockFactory } from '../objects/BlockFactory'

export class GravitySystem {
  private grid: Grid
  private factory: BlockFactory

  constructor(grid: Grid, factory: BlockFactory) {
    this.grid = grid
    this.factory = factory
  }

  applyGravity(): boolean {
    const moves = this.grid.applyGravity()
    if (moves.length === 0) return false

    for (const move of moves) {
      this.factory.moveBlock(move.from.row, move.from.col, move.to.row, move.to.col)
      const sprite = this.factory.getBlock(move.to.row, move.to.col)
      if (sprite) {
        sprite.updatePosition(true)
      }
    }

    return true
  }

  isFalling(): boolean {
    return this.grid.hasActiveBlocks()
  }
}
