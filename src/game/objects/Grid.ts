import { BlockState, BlockType } from '../types'
import type { BlockData, MatchGroup, Position } from '../types'
import { GRID_ROWS, GRID_COLS, BLOCK_TYPE_COUNT, INITIAL_ROWS } from '../constants'

export class Grid {
  cells: (BlockData | null)[][]

  constructor() {
    this.cells = []
    for (let row = 0; row < GRID_ROWS; row++) {
      this.cells[row] = new Array(GRID_COLS).fill(null)
    }
  }

  init(): void {
    // Fill bottom INITIAL_ROWS rows with blocks, no pre-existing matches
    for (let row = GRID_ROWS - INITIAL_ROWS; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        this.cells[row][col] = this.createBlockNoMatch(row, col)
      }
    }
  }

  createBlockNoMatch(row: number, col: number): BlockData {
    const excluded = new Set<BlockType>()

    // Check horizontal: if two to the left are the same, exclude that type
    if (col >= 2) {
      const left1 = this.cells[row][col - 1]
      const left2 = this.cells[row][col - 2]
      if (left1 && left2 && left1.type === left2.type) {
        excluded.add(left1.type)
      }
    }

    // Check vertical: if two above are the same, exclude that type
    if (row >= 2) {
      const up1 = this.cells[row - 1]?.[col]
      const up2 = this.cells[row - 2]?.[col]
      if (up1 && up2 && up1.type === up2.type) {
        excluded.add(up1.type)
      }
    }

    const available: BlockType[] = []
    for (let t = 0; t < BLOCK_TYPE_COUNT; t++) {
      if (!excluded.has(t as BlockType)) {
        available.push(t as BlockType)
      }
    }

    const type = available[Math.floor(Math.random() * available.length)]
    return { type, state: BlockState.Idle, row, col }
  }

  getBlock(row: number, col: number): BlockData | null {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null
    return this.cells[row][col]
  }

  setBlock(row: number, col: number, block: BlockData | null): void {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return
    this.cells[row][col] = block
    if (block) {
      block.row = row
      block.col = col
    }
  }

  swap(a: Position, b: Position): void {
    const blockA = this.cells[a.row][a.col]
    const blockB = this.cells[b.row][b.col]
    this.cells[a.row][a.col] = blockB
    this.cells[b.row][b.col] = blockA
    if (blockA) {
      blockA.row = b.row
      blockA.col = b.col
    }
    if (blockB) {
      blockB.row = a.row
      blockB.col = a.col
    }
  }

  findMatches(): MatchGroup[] {
    const matches: MatchGroup[] = []
    const matched = new Set<string>()

    // Horizontal
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col <= GRID_COLS - 3; col++) {
        const block = this.cells[row][col]
        if (!block || block.state !== BlockState.Idle) continue

        const type = block.type
        let len = 1
        while (col + len < GRID_COLS) {
          const next = this.cells[row][col + len]
          if (!next || next.type !== type || next.state !== BlockState.Idle) break
          len++
        }

        if (len >= 3) {
          const group: MatchGroup = { blocks: [], type }
          for (let i = 0; i < len; i++) {
            const key = `${row},${col + i}`
            if (!matched.has(key)) {
              matched.add(key)
            }
            group.blocks.push({ row, col: col + i })
          }
          matches.push(group)
        }
      }
    }

    // Vertical
    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = 0; row <= GRID_ROWS - 3; row++) {
        const block = this.cells[row][col]
        if (!block || block.state !== BlockState.Idle) continue

        const type = block.type
        let len = 1
        while (row + len < GRID_ROWS) {
          const next = this.cells[row + len]?.[col]
          if (!next || next.type !== type || next.state !== BlockState.Idle) break
          len++
        }

        if (len >= 3) {
          const group: MatchGroup = { blocks: [], type }
          for (let i = 0; i < len; i++) {
            group.blocks.push({ row: row + i, col })
          }
          matches.push(group)
        }
      }
    }

    return matches
  }

  applyGravity(): { from: Position; to: Position }[] {
    const moves: { from: Position; to: Position }[] = []

    for (let col = 0; col < GRID_COLS; col++) {
      // Work bottom-up, find gaps and drop blocks into them
      let writeRow = GRID_ROWS - 1

      for (let row = GRID_ROWS - 1; row >= 0; row--) {
        const block = this.cells[row][col]
        if (block) {
          if (row !== writeRow) {
            moves.push({ from: { row, col }, to: { row: writeRow, col } })
            this.cells[writeRow][col] = block
            block.row = writeRow
            block.state = BlockState.Falling
            this.cells[row][col] = null
          }
          writeRow--
        }
      }

      // Clear any remaining cells above
      for (let row = writeRow; row >= 0; row--) {
        this.cells[row][col] = null
      }
    }

    return moves
  }

  generateNewRow(): BlockData[] {
    const newRow: BlockData[] = []
    for (let col = 0; col < GRID_COLS; col++) {
      newRow.push(this.createBlockNoMatch(GRID_ROWS - 1, col))
    }
    return newRow
  }

  pushRowUp(newRow: BlockData[]): boolean {
    // Check if top row has any blocks (would cause top-out)
    for (let col = 0; col < GRID_COLS; col++) {
      if (this.cells[0][col]) {
        return true // topped out
      }
    }

    // Shift everything up by one row
    for (let row = 0; row < GRID_ROWS - 1; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        this.cells[row][col] = this.cells[row + 1][col]
        if (this.cells[row][col]) {
          this.cells[row][col]!.row = row
        }
      }
    }

    // Insert new row at bottom
    for (let col = 0; col < GRID_COLS; col++) {
      newRow[col].row = GRID_ROWS - 1
      newRow[col].col = col
      this.cells[GRID_ROWS - 1][col] = newRow[col]
    }

    return false
  }

  hasActiveBlocks(): boolean {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const block = this.cells[row][col]
        if (block && block.state !== BlockState.Idle) {
          return true
        }
      }
    }
    return false
  }

  isSettled(): boolean {
    return !this.hasActiveBlocks()
  }
}
