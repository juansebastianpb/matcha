import { Grid } from '../objects/Grid'
import { BlockFactory } from '../objects/BlockFactory'
import { BlockState } from '../types'
import type { MatchGroup, BlockType } from '../types'
import { createClearEffect } from '../art/effects'
import { CLEAR_DELAY } from '../constants'

export class MatchSystem {
  private grid: Grid
  private factory: BlockFactory
  private scene: Phaser.Scene
  private clearing = false

  constructor(scene: Phaser.Scene, grid: Grid, factory: BlockFactory) {
    this.scene = scene
    this.grid = grid
    this.factory = factory
  }

  checkMatches(): MatchGroup[] {
    if (this.clearing) return []
    return this.grid.findMatches()
  }

  clearMatches(matches: MatchGroup[], onCleared: (totalBlocks: number, groups: number) => void): void {
    if (matches.length === 0) return
    this.clearing = true

    const uniqueBlocks = new Map<string, { row: number; col: number; type: BlockType }>()
    for (const group of matches) {
      for (const pos of group.blocks) {
        uniqueBlocks.set(`${pos.row},${pos.col}`, { ...pos, type: group.type })
      }
    }

    // Mark blocks as matched and play animation
    uniqueBlocks.forEach(({ row, col }) => {
      const block = this.grid.getBlock(row, col)
      if (block) block.state = BlockState.Matched

      const sprite = this.factory.getBlock(row, col)
      if (sprite) {
        sprite.playMatchAnimation(() => {})
      }
    })

    // After delay, remove blocks
    this.scene.time.delayedCall(CLEAR_DELAY, () => {
      uniqueBlocks.forEach(({ row, col, type }) => {
        createClearEffect(this.scene, row, col, type)
        this.grid.setBlock(row, col, null)
        this.factory.removeBlock(row, col)
      })

      this.clearing = false
      onCleared(uniqueBlocks.size, matches.length)
    })
  }

  isClearing(): boolean {
    return this.clearing
  }
}
