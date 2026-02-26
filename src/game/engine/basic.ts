// Core game logic adapted from panel-league (MIT)

import { JKISS31 } from './jkiss'
import { newBlock, clearBlock, matrixFloodFill, shuffleInPlace } from './util'
import type { Block, GameState, GameEvent, GameEffect, GarbageSlab } from './types'

function blocksCanSwap(
  block1: Block | undefined,
  block2: Block | undefined,
  above1: Block | undefined,
  above2: Block | undefined
): boolean {
  if (!block1 || !block2) return false
  if (!block1.color && !block2.color) return false
  if (block1.flashTimer >= 0 || block2.flashTimer >= 0) return false
  if (block1.floatTimer > 0 || block2.floatTimer > 0) return false
  if (block1.garbage || block2.garbage) return false
  if ((above1 && above1.floatTimer > 0) || (above2 && above2.floatTimer > 0)) return false
  return true
}

function blocksMatch(
  block1: Block | undefined,
  block2: Block | undefined,
  below1?: Block | undefined,
  below2?: Block | undefined
): boolean {
  if (!block1 || !block2) return false
  if (block1.flashTimer >= 0 || block2.flashTimer >= 0) return false
  if (!block1.color || !block2.color) return false
  if (block1.swapTimer !== 0 || block2.swapTimer !== 0) return false
  if (block1.garbage || block2.garbage) return false

  const block1Floating = block1.floatTimer >= 0
  const block2Floating = block2.floatTimer >= 0
  const below1Supporting = below1 && below1.swapTimer && !below1.color
  const below2Supporting = below2 && below2.swapTimer && !below2.color

  if ((block1Floating && !below1Supporting) || (block2Floating && !below2Supporting)) {
    return false
  }
  if (block1.color === block2.color) {
    return !block1.preventMatching && !block2.preventMatching
  }
  return false
}

export function handleSwapping(state: GameState): void {
  state.blocks.forEach((block) => {
    if (block.swapTimer > 0) {
      --block.swapTimer
    } else if (block.swapTimer < 0) {
      ++block.swapTimer
    } else {
      state.dirty = true
    }
  })
}

export function findMatches(state: GameState, blocks: Block[]): boolean {
  if (!state.dirty) return false

  let matchFound = false
  blocks.forEach((block, i) => {
    const below = blocks[i + state.width]
    let left: Block | undefined
    let right: Block | undefined
    let leftBelow: Block | undefined
    let rightBelow: Block | undefined

    if (i % state.width > 0) {
      left = blocks[i - 1]
      leftBelow = blocks[i - 1 + state.width]
    }
    if (i % state.width < state.width - 1) {
      right = blocks[i + 1]
      rightBelow = blocks[i + 1 + state.width]
    }

    if (
      blocksMatch(left, block, leftBelow, below) &&
      blocksMatch(block, right, below, rightBelow)
    ) {
      left!.matching = true
      block.matching = true
      right!.matching = true
      matchFound = true
    }

    const above = blocks[i - state.width]
    if (blocksMatch(below, block) && blocksMatch(block, above)) {
      above!.matching = true
      block.matching = true
      below!.matching = true
      matchFound = true
    }
  })
  return matchFound
}

function invalidateMatches(blocks: Block[]): void {
  blocks.forEach((block) => {
    if (block.matching) {
      block.preventMatching = true
    }
  })
}

export function clearMatches(blocks: Block[], includeInvalid?: boolean): void {
  blocks.forEach((block) => {
    delete block.matching
    if (includeInvalid) {
      delete block.preventMatching
    }
  })
}

function pushRow(blocks: Block[], nextRow: Block[], width: number): void {
  for (let i = 0; i < width; ++i) {
    blocks.shift()
    blocks.push(nextRow[i])
  }
}

export function addRow(state: GameState): void {
  state.dirty = true
  if (state.nextRow) {
    pushRow(state.blocks, state.nextRow, state.width)
    findMatches(state, state.blocks)
    invalidateMatches(state.blocks)
    clearMatches(state.blocks)
  }
  const RNG = JKISS31.unserialize(state.RNG)
  while (true) {
    const nextRow: Block[] = []
    for (let i = 0; i < state.width; ++i) {
      const block = newBlock()
      block.color = state.blockTypes[RNG.step() % state.blockTypes.length]
      nextRow.push(block)
    }
    const candidateBlocks = state.blocks.slice()
    pushRow(candidateBlocks, nextRow, state.width)
    const candidateMatches = findMatches(state, candidateBlocks)
    clearMatches(candidateBlocks)
    if (!candidateMatches) {
      state.nextRow = nextRow
      break
    }
  }
  clearMatches(state.blocks, true)
  state.RNG = RNG.serialize()
}

function refillBlocks(state: GameState): void {
  const { blocks, blockTypes } = state
  state.dirty = true
  state.garbage.length = 0
  blocks.forEach(clearBlock)
  blocks.forEach((block, index) => {
    block.color = blockTypes[Math.floor(index / 3) % blockTypes.length]
  })
  const RNG = JKISS31.unserialize(state.RNG)
  const random = () => RNG.step01()
  while (true) {
    shuffleInPlace(blocks, random)
    const matchesFound = findMatches(state, blocks)
    clearMatches(blocks)
    if (!matchesFound) break
  }
  state.RNG = RNG.serialize()
}

export function handleEvents(state: GameState, events: GameEvent[]): GameEffect[] {
  const effects: GameEffect[] = []
  const { garbage, blocks } = state
  const isActive = blocks.some(
    (block) => block.flashTimer >= 0 || block.floatTimer >= 0 || block.swapTimer
  )

  const sorted = events.slice().sort((e1, e2) => {
    if (e1.type < e2.type) return -1
    if (e1.type > e2.type) return 1
    return (e1.index || 0) - (e2.index || 0)
  })

  if (sorted.find((event) => event.type === 'clearAll')) {
    blocks.forEach(clearBlock)
    garbage.length = 0
  }

  sorted.forEach((event) => {
    if (event.type === 'swap') {
      const index = event.index!
      if (index % state.width < state.width - 1) {
        const block1 = blocks[index]
        const block2 = blocks[index + 1]
        const above1 = blocks[index - state.width]
        const above2 = blocks[index + 1 - state.width]

        if (blocksCanSwap(block1, block2, above1, above2)) {
          block1.swapTimer = state.swapTime
          block2.swapTimer = -state.swapTime
          blocks[index] = block2
          blocks[index + 1] = block1
        }
      }
    } else if (event.type === 'addRow' && (state.addRowWhileActive || !isActive)) {
      if (blocks.slice(0, state.width).every((block) => !block.color)) {
        addRow(state)
        garbage.forEach((slab) => ++slab.y)
        effects.push({ type: 'addRow' })
      } else {
        effects.push({ type: 'gameOver' })
      }
    } else if (event.type === 'addGarbage' && event.slab) {
      const slab: GarbageSlab = {
        ...event.slab,
        y: 0,
        height: 1,
        flashTime: state.garbageFlashTime * event.slab.width * 1,
        flashTimer: -1,
      }
      if (slab.x + slab.width > state.width) {
        throw new Error('Invalid garbage slab')
      }
      slab.y = garbage.reduce(
        (max, s) => Math.max(max, s.y + s.height),
        state.height
      )
      slab.flashTime = state.garbageFlashTime * slab.width * slab.height
      garbage.push(slab)
    }
  })

  if (sorted.find((event) => event.type === 'refill')) {
    refillBlocks(state)
  }

  return effects
}

export function handleGravity(state: GameState): GameEffect[] {
  const effects: GameEffect[] = []
  const { blocks } = state

  for (let i = blocks.length - 1; i >= 0; --i) {
    const block = blocks[i]
    if (!block.color || block.garbage) continue

    const below = blocks[i + state.width]
    if (
      below &&
      block.flashTimer < 0 &&
      (!below.color || !below.swapTimer) &&
      (!below.color || below.floatTimer >= 0)
    ) {
      if (block.floatTimer < 0) {
        if (below.color && !block.swapTimer) {
          block.floatTimer = below.floatTimer
        } else {
          block.floatTimer = state.floatTime + 1
        }
        block.chaining = block.chaining || below.chaining
      } else if (block.floatTimer === 0 || block.floatTimer === 1) {
        if (below.color) {
          block.floatTimer = below.floatTimer
        } else {
          blocks[i] = below
          blocks[i + state.width] = block
        }
      }
    } else {
      if (block.floatTimer >= 0) {
        effects.push({ type: 'blockLanded', index: i })
      }
      block.floatTimer = -1
    }
  }

  if (effects.length) {
    state.dirty = true
  }
  return effects
}

export function handleChaining(state: GameState): void {
  if (!state.dirty) return

  const source: boolean[][] = []
  const target: boolean[][] = []

  for (let i = 0; i < state.height; ++i) {
    const sourceRow: boolean[] = []
    const targetRow: boolean[] = []
    for (let j = 0; j < state.width; ++j) {
      const block = state.blocks[j + i * state.width]
      sourceRow.push(!!(block.chaining && block.matching))
      targetRow.push(!!block.matching)
    }
    source.push(sourceRow)
    target.push(targetRow)
  }

  matrixFloodFill(source, target)

  for (let i = 0; i < state.height; ++i) {
    for (let j = 0; j < state.width; ++j) {
      if (source[i][j]) {
        state.blocks[j + i * state.width].chaining = true
      }
    }
  }
}

export function handleTimers(state: GameState): GameEffect[] {
  const { blocks } = state
  const effects: GameEffect[] = []
  let matchMade = false
  let chainMatchMade = false
  const wasChaining = blocks.some((block) => block.chaining)
  const indicesMatched: number[] = []

  blocks.forEach((block, i) => {
    const above = blocks[i - state.width]
    const below = blocks[i + state.width]

    if (!block.color) {
      block.chaining = false
    }

    if (
      block.floatTimer < 0 &&
      block.flashTimer < 0 &&
      !block.swapTimer &&
      !block.matching &&
      (!below || !below.swapTimer)
    ) {
      block.chaining = false
    }

    if (block.floatTimer > 0) {
      --block.floatTimer
    }

    if (!--block.flashTimer) {
      clearBlock(block)
      if (above && above.color) {
        above.chaining = true
        above.floatTimer = state.floatTime + 1
      }
      effects.push({ type: 'flashDone', index: i })
    }

    if (block.matching) {
      block.flashTimer = state.flashTime
      matchMade = true
      indicesMatched.push(i)
      if (block.chaining) {
        chainMatchMade = true
      }
    }
  })

  clearMatches(blocks)
  const isChaining = blocks.some((block) => block.chaining)

  if (wasChaining && !isChaining) {
    effects.push({ type: 'chainDone', chainNumber: state.chainNumber })
    state.chainNumber = 0
  }

  if (chainMatchMade) {
    state.chainNumber++
    effects.push({ type: 'chainMatchMade', chainNumber: state.chainNumber, indices: indicesMatched })
  } else if (matchMade) {
    effects.push({ type: 'matchMade', chainNumber: state.chainNumber, indices: indicesMatched })
  }

  return effects
}
