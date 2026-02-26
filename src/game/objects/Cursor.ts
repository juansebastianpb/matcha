import Phaser from 'phaser'
import { BLOCK_SIZE, CELL_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y } from '../constants'

export class Cursor extends Phaser.GameObjects.Graphics {
  selectedRow: number = -1
  selectedCol: number = -1
  isVisible: boolean = false

  constructor(scene: Phaser.Scene) {
    super(scene)
    scene.add.existing(this)
    this.setDepth(5)
    this.setVisible(false)
  }

  select(row: number, col: number): void {
    this.selectedRow = row
    this.selectedCol = col
    this.isVisible = true
    this.setVisible(true)
    this.draw()
  }

  deselect(): void {
    this.selectedRow = -1
    this.selectedCol = -1
    this.isVisible = false
    this.setVisible(false)
  }

  private draw(): void {
    this.clear()

    const x = GRID_OFFSET_X + this.selectedCol * CELL_SIZE
    const y = GRID_OFFSET_Y + this.selectedRow * CELL_SIZE

    // Highlight box
    this.lineStyle(3, 0xffffff, 0.9)
    this.strokeRoundedRect(x - 1, y - 1, BLOCK_SIZE + 2, BLOCK_SIZE + 2, 6)

    // Pulsing glow effect via alpha tweak
    this.scene.tweens.addCounter({
      from: 0.5,
      to: 1,
      duration: 400,
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        this.setAlpha(tween.getValue() ?? 1)
      },
    })
  }
}
