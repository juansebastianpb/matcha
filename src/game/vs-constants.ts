// Versus mode layout constants
// Smaller blocks to fit two boards side by side

import { GRID_COLS, GRID_ROWS } from './constants'

export const VS_BLOCK_SIZE = 68
export const VS_BLOCK_GAP = 3
export const VS_CELL_SIZE = VS_BLOCK_SIZE + VS_BLOCK_GAP

export const VS_GRID_WIDTH = GRID_COLS * VS_CELL_SIZE
export const VS_GRID_HEIGHT = GRID_ROWS * VS_CELL_SIZE

export const VS_GRID_OFFSET_X = 8
export const VS_GRID_OFFSET_Y = 10

export const VS_BOARD_GAP = 80

// Total canvas: left-offset + board + gap + board + right-offset
export const VS_GAME_WIDTH = VS_GRID_OFFSET_X + VS_GRID_WIDTH + VS_BOARD_GAP + VS_GRID_WIDTH + VS_GRID_OFFSET_X
export const VS_GAME_HEIGHT = VS_GRID_HEIGHT + VS_GRID_OFFSET_Y * 2

// Board origins (top-left of each grid area)
export const VS_LEFT_BOARD_X = VS_GRID_OFFSET_X
export const VS_RIGHT_BOARD_X = VS_GRID_OFFSET_X + VS_GRID_WIDTH + VS_BOARD_GAP
export const VS_BOARD_Y = VS_GRID_OFFSET_Y

// Mobile canvas — narrow so the local grid fills ~89% of width
// Height tuned so width is the scaling bottleneck on most phones
export const VS_MOBILE_GAME_WIDTH = 400
export const VS_MOBILE_GAME_HEIGHT = 860

export interface BoardLayout {
  cellSize: number
  blockSize: number
  blockGap: number
  originX: number
  originY: number
}

export function getDesktopLayouts(): { local: BoardLayout; remote: BoardLayout } {
  return {
    local: { cellSize: 71, blockSize: 68, blockGap: 3, originX: VS_LEFT_BOARD_X, originY: VS_BOARD_Y },
    remote: { cellSize: 71, blockSize: 68, blockGap: 3, originX: VS_RIGHT_BOARD_X, originY: VS_BOARD_Y },
  }
}

export function getMobileLayouts(): { local: BoardLayout; remote: BoardLayout } {
  // Remote preview: small, centered above local board
  // Remote grid: 6*11=66 wide, 12*11=132 tall, centered at x=167
  //   16px top pad → y=16, bottom=148
  //   20px gap
  // Local grid: 6*57=342 wide, 12*57=684 tall, centered at x=29
  //   y=168, bottom=852 (8px bottom pad in 860)
  return {
    local: { cellSize: 57, blockSize: 53, blockGap: 4, originX: 29, originY: 168 },
    remote: { cellSize: 11, blockSize: 9, blockGap: 2, originX: 167, originY: 16 },
  }
}

export { GRID_COLS, GRID_ROWS }
