// Utility functions adapted from panel-league (MIT)

import type { Block, GameState } from './types'

export const BLOCK_COLORS = ['red', 'green', 'blue', 'violet', 'yellow', 'navy']

export function newBlock(): Block {
  return {
    color: null,
    flashTimer: -1,
    floatTimer: -1,
    swapTimer: 0,
    chaining: false,
    garbage: false,
  }
}

export function clearBlock(block: Block): void {
  block.color = null
  block.flashTimer = -1
  block.floatTimer = -1
  block.swapTimer = 0
  block.chaining = false
  block.garbage = false
}

export function floodFill(
  state: GameState,
  callback: (block: Block, neighbour: Block) => boolean | void
): void {
  const blocks = state.blocks
  let active = true
  while (active) {
    active = false
    blocks.forEach((block, i) => {
      const below = blocks[i + state.width]
      const above = blocks[i - state.width]
      let left: Block | undefined
      let right: Block | undefined

      if (i % state.width > 0) {
        left = blocks[i - 1]
      }
      if (i % state.width < state.width - 1) {
        right = blocks[i + 1]
      }

      const neighbours = [left, right, above, below]
      for (const neighbour of neighbours) {
        if (!neighbour) continue
        if (callback(block, neighbour)) {
          active = true
        }
      }
    })
  }
}

function seedFill(
  source: boolean[][],
  target: boolean[][],
  x: number,
  y: number
): void {
  const row = source[y]
  if (row && row[x] === false && target[y][x]) {
    source[y][x] = true
    seedFill(source, target, x - 1, y)
    seedFill(source, target, x + 1, y)
    seedFill(source, target, x, y - 1)
    seedFill(source, target, x, y + 1)
  }
}

export function matrixFloodFill(source: boolean[][], target: boolean[][]): void {
  for (let i = 0; i < source.length; ++i) {
    const row = source[i]
    for (let j = 0; j < row.length; ++j) {
      if (row[j]) {
        seedFill(source, target, j - 1, i)
        seedFill(source, target, j + 1, i)
        seedFill(source, target, j, i - 1)
        seedFill(source, target, j, i + 1)
      }
    }
  }
}

export function shuffleInPlace<T>(array: T[], random: () => number): void {
  for (let i = array.length - 1; i > 0; --i) {
    const j = Math.floor(random() * (i + 1))
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
}
