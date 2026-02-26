import Phaser from 'phaser'
import type { Position } from '../types'
import { GRID_OFFSET_X, GRID_OFFSET_Y, CELL_SIZE, GRID_COLS, GRID_ROWS } from '../constants'

export class InputSystem {
  private scene: Phaser.Scene
  private onSelect: (pos: Position) => void

  constructor(scene: Phaser.Scene, onSelect: (pos: Position) => void) {
    this.scene = scene
    this.onSelect = onSelect

    scene.input.on('pointerdown', this.handlePointer, this)
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    const col = Math.floor((pointer.x - GRID_OFFSET_X) / CELL_SIZE)
    const row = Math.floor((pointer.y - GRID_OFFSET_Y) / CELL_SIZE)

    if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
      this.onSelect({ row, col })
    }
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.handlePointer, this)
  }
}
