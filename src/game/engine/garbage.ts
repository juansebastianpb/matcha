// Garbage system adapted from panel-league (MIT)

import { JKISS31 } from './jkiss'
import { floodFill } from './util'
import type { Block, GameState, GarbageSlab } from './types'

function garbageCoordsToIndex(state: GameState, x: number, y: number): number | undefined {
  if (x < 0 || x >= state.width) return undefined
  return x + state.width * (state.height - 1 - y)
}

export function garbageCoordsToBlock(state: GameState, x: number, y: number): Block | undefined {
  const index = garbageCoordsToIndex(state, x, y)
  if (index === undefined) return undefined
  return state.blocks[index]
}

export function handleGarbageGravity(state: GameState): void {
  const { blocks, garbage } = state
  const RNG = JKISS31.unserialize(state.RNG)

  garbage.forEach((slab) => {
    if (slab.y > 0 && slab.y <= state.height) {
      let below = false
      for (let x = 0; x < slab.width; ++x) {
        const block = garbageCoordsToBlock(state, slab.x + x, slab.y - 1)
        if (block && block.color) {
          below = true
          break
        }
      }
      if (!below) {
        for (let y = 0; y < slab.height; ++y) {
          for (let x = 0; x < slab.width; ++x) {
            const index = garbageCoordsToIndex(state, slab.x + x, slab.y + y)
            if (index !== undefined) {
              const block = blocks[index]
              if (block) {
                blocks[index] = blocks[index + state.width]
                blocks[index + state.width] = block
              }
            }
          }
        }
        --slab.y
        if (slab.y + slab.height >= state.height) {
          for (let x = 0; x < slab.width; ++x) {
            const index = slab.x + x
            const block = blocks[index]
            block.color = state.blockTypes[RNG.step() % state.blockTypes.length]
            while (
              x >= 2 &&
              block.color === blocks[index - 1].color &&
              blocks[index - 1].color === blocks[index - 2].color
            ) {
              block.color = state.blockTypes[RNG.step() % state.blockTypes.length]
            }
            block.garbage = true
          }
        }
      }
    } else {
      const below = garbage.some(
        (other) =>
          other.y + other.height === slab.y &&
          other.x < slab.x + slab.width &&
          slab.x < other.x + other.width
      )
      if (!below) {
        --slab.y
      }
    }
  })
  garbage.sort((slab, other) => slab.y - other.y)
  state.RNG = RNG.serialize()
}

export function shockGarbage(state: GameState): void {
  const { garbage } = state

  const shockableBlocks: Block[] = []
  garbage.forEach((slab) => {
    if (slab.flashTimer >= 0) return
    for (let y = 0; y < slab.height; ++y) {
      for (let x = 0; x < slab.width; ++x) {
        const block = garbageCoordsToBlock(state, slab.x + x, slab.y + y)
        if (block) {
          block.slab = slab
          shockableBlocks.push(block)
        }
      }
    }
  })

  floodFill(state, (block, neighbour) => {
    if (!block.slab || block.shocking) return false
    if (neighbour.matching || neighbour.shocking) {
      block.shocking = true
      const slab = block.slab!
      slab.flashTimer = slab.flashTime
      return true
    }
    return false
  })

  shockableBlocks.forEach((block) => {
    delete block.shocking
    delete block.slab
  })
}

export function releaseGarbage(state: GameState): void {
  const { garbage } = state
  const slabsToRemove: GarbageSlab[] = []

  garbage.forEach((slab) => {
    if (slab.flashTimer-- !== 0) return
    state.dirty = true
    for (let x = 0; x < slab.width; ++x) {
      const block = garbageCoordsToBlock(state, slab.x + x, slab.y)
      if (block) {
        block.garbage = false
        block.chaining = true
        block.floatTimer = state.floatTime
      }
    }
    ++slab.y
    --slab.height
    if (!slab.height) {
      slabsToRemove.push(slab)
    }
  })

  slabsToRemove.forEach((slab) => garbage.splice(garbage.indexOf(slab), 1))
}
