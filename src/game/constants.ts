export const GRID_ROWS = 12
export const GRID_COLS = 6
export const BLOCK_SIZE = 48
export const BLOCK_GAP = 2
export const CELL_SIZE = BLOCK_SIZE + BLOCK_GAP

export const GRID_WIDTH = GRID_COLS * CELL_SIZE
export const GRID_HEIGHT = GRID_ROWS * CELL_SIZE

export const GRID_OFFSET_X = 16
export const GRID_OFFSET_Y = 16

export const GAME_WIDTH = GRID_WIDTH + GRID_OFFSET_X * 2
export const GAME_HEIGHT = GRID_HEIGHT + GRID_OFFSET_Y * 2

// Initial rows filled with blocks at start
export const INITIAL_ROWS = 6

// Timing
export const ROUND_DURATION = 90
export const SWAP_DURATION = 120 // ms
export const CLEAR_FLASH_DURATION = 300 // ms
export const CLEAR_DELAY = 400 // ms
export const FALL_SPEED = 6 // pixels per frame
export const RISE_SPEED = 0.3 // pixels per frame
export const RISE_PAUSE_ON_CHAIN = 2000 // ms
export const TOPOUT_PENALTY_PAUSE = 3000 // ms
export const LANDING_BOUNCE_DURATION = 150 // ms

// Scoring
export const POINTS_PER_BLOCK = 10
export const COMBO_BONUS_PER_GROUP = 50
export const TOPOUT_PENALTY = -100

// Number of block types
export const BLOCK_TYPE_COUNT = 6
