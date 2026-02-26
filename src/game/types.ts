export const BlockType = {
  Yellow: 0,
  Blue: 1,
  Pink: 2,
  Green: 3,
  Purple: 4,
  Orange: 5,
} as const

export type BlockType = (typeof BlockType)[keyof typeof BlockType]

export const BlockState = {
  Idle: 'idle',
  Swapping: 'swapping',
  Matched: 'matched',
  Clearing: 'clearing',
  Falling: 'falling',
  Landing: 'landing',
} as const

export type BlockState = (typeof BlockState)[keyof typeof BlockState]

export interface BlockData {
  type: BlockType
  state: BlockState
  row: number
  col: number
}

export interface MatchGroup {
  blocks: { row: number; col: number }[]
  type: BlockType
}

export interface GridCell {
  block: BlockData | null
}

export interface Position {
  row: number
  col: number
}

export interface SwapAction {
  from: Position
  to: Position
}
