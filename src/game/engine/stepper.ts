// Game stepper adapted from panel-league (MIT)

import { JKISS31 } from './jkiss'
import { BLOCK_COLORS, newBlock } from './util'
import * as basic from './basic'
import * as garbage from './garbage'
import { getScore } from './scoring'
import type { GameState, GameEvent, GameEffect, GameOptions } from './types'

const defaultOptions = {
  width: 6,
  height: 12,
  flashTime: 3,
  floatTime: 3,
  swapTime: 2,
  garbageFlashTime: 1,
  initialRows: 6,
  blockTypes: BLOCK_COLORS,
  addRowWhileActive: true,
  scoringSystem: 'puzzleLeague',
}

export class ScoringStepper {
  test = false

  get name(): string {
    return 'panelLeagueScoring'
  }

  initializeState(options: GameOptions = {}): GameState {
    const width = options.width ?? defaultOptions.width
    const height = options.height ?? defaultOptions.height
    const initialRNG = new JKISS31()
    const numBlocks = width * height

    initialRNG.scramble()

    const state: GameState = {
      time: 0,
      width,
      height,
      flashTime: options.flashTime ?? defaultOptions.flashTime,
      floatTime: options.floatTime ?? defaultOptions.floatTime,
      swapTime: options.swapTime ?? defaultOptions.swapTime,
      garbageFlashTime: options.garbageFlashTime ?? defaultOptions.garbageFlashTime,
      chainNumber: 0,
      initialRows: options.initialRows ?? defaultOptions.initialRows,
      RNG: initialRNG.serialize(),
      nextRow: null,
      blocks: Array.from({ length: numBlocks }, newBlock),
      blockTypes: options.blockTypes ?? defaultOptions.blockTypes,
      addRowWhileActive: options.addRowWhileActive ?? defaultOptions.addRowWhileActive,
      garbage: [],
      dirty: true,
      score: 0,
      scoringSystem: options.scoringSystem ?? defaultOptions.scoringSystem,
    }

    if (options.colors) {
      if (options.colors.length !== numBlocks) {
        throw new Error('Dimension mismatch')
      }
      options.colors.forEach((color, i) => {
        state.blocks[i].color = color
      })
    } else {
      for (let i = 0; i < state.initialRows + 1; ++i) {
        basic.addRow(state)
      }
    }

    // Ensure no pre-existing matches on the starting grid.
    // addRow's clearMatches(true) removes preventMatching flags, so
    // the first engine step would find and trigger those matches.
    const fixRNG = JKISS31.unserialize(state.RNG)
    for (let pass = 0; pass < 50; pass++) {
      state.dirty = true
      const hasMatch = basic.findMatches(state, state.blocks)
      if (!hasMatch) {
        basic.clearMatches(state.blocks, true)
        break
      }
      // Re-color every matched block before clearing flags
      for (const block of state.blocks) {
        if (block.matching) {
          block.color = state.blockTypes[fixRNG.step() % state.blockTypes.length]
        }
      }
      basic.clearMatches(state.blocks, true)
    }
    state.RNG = fixRNG.serialize()

    return state
  }

  step(state: GameState, events: GameEvent[]): GameEffect[] {
    let effects: GameEffect[] = []

    ++state.time
    state.dirty = this.test

    basic.handleSwapping(state)
    effects = effects.concat(basic.handleEvents(state, events))
    garbage.handleGarbageGravity(state)
    effects = effects.concat(basic.handleGravity(state))
    basic.findMatches(state, state.blocks)
    garbage.shockGarbage(state)
    garbage.releaseGarbage(state)
    basic.handleChaining(state)
    effects = effects.concat(basic.handleTimers(state))

    // Scoring
    effects.forEach((effect) => {
      switch (effect.type) {
        case 'gameOver':
          state.score = 0
          break
        case 'addRow':
          state.score += 1
          break
        case 'chainMatchMade':
        case 'matchMade':
          state.score += getScore(
            state.scoringSystem,
            effect.indices?.length ?? 0,
            effect.chainNumber ?? 0
          )
          break
      }
    })

    return effects
  }

  postProcess(state: GameState): void {
    state.garbage.forEach((slab) => {
      for (let y = 0; y < slab.height; ++y) {
        for (let x = 0; x < slab.width; ++x) {
          const block = garbage.garbageCoordsToBlock(state, slab.x + x, slab.y + y)
          if (block) {
            block.slab = slab
          }
        }
      }
    })
  }
}
