// Grid dimensions (matching engine defaults)
export const GRID_COLS = 6
export const GRID_ROWS = 12
export const INITIAL_ROWS = 6

// Rendering
export const BLOCK_SIZE = 48
export const BLOCK_GAP = 2
export const CELL_SIZE = BLOCK_SIZE + BLOCK_GAP

export const GRID_WIDTH = GRID_COLS * CELL_SIZE
export const GRID_HEIGHT = GRID_ROWS * CELL_SIZE

export const GRID_OFFSET_X = 16
export const GRID_OFFSET_Y = 16

export const GAME_WIDTH = GRID_WIDTH + GRID_OFFSET_X * 2
export const GAME_HEIGHT = GRID_HEIGHT + GRID_OFFSET_Y * 2

// Timing
export const ROUND_DURATION = 90 // seconds
export const ENGINE_FPS = 15 // engine steps per second
export const AUTO_RISE_INTERVAL = 90 // engine steps between auto-rise (~6 seconds at 15fps)

// Block type count
export const BLOCK_TYPE_COUNT = 6
