import Phaser from 'phaser'
import type { BlockData } from '../types'
import { Block } from './Block'

export class BlockFactory {
  private scene: Phaser.Scene
  private blocks: Map<string, Block> = new Map()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  private key(row: number, col: number): string {
    return `${row},${col}`
  }

  createBlock(data: BlockData): Block {
    const block = new Block(this.scene, data)
    this.blocks.set(this.key(data.row, data.col), block)
    return block
  }

  getBlock(row: number, col: number): Block | undefined {
    return this.blocks.get(this.key(row, col))
  }

  moveBlock(fromRow: number, fromCol: number, toRow: number, toCol: number): void {
    const block = this.blocks.get(this.key(fromRow, fromCol))
    if (block) {
      this.blocks.delete(this.key(fromRow, fromCol))
      this.blocks.set(this.key(toRow, toCol), block)
    }
  }

  removeBlock(row: number, col: number): void {
    const block = this.blocks.get(this.key(row, col))
    if (block) {
      block.destroy()
      this.blocks.delete(this.key(row, col))
    }
  }

  clear(): void {
    this.blocks.forEach((block) => block.destroy())
    this.blocks.clear()
  }

  getAllBlocks(): Block[] {
    return Array.from(this.blocks.values())
  }

  rebuildIndex(): void {
    const newMap = new Map<string, Block>()
    this.blocks.forEach((block) => {
      newMap.set(this.key(block.blockData.row, block.blockData.col), block)
    })
    this.blocks = newMap
  }
}
