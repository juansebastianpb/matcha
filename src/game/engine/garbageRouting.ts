// Converts match/chain effects into garbage slab specs for versus mode
//
// Garbage rules (Panel de Pon / Tetris Attack style):
//   3-match          → nothing (baseline)
//   4-match combo    → width 3, height 1
//   5-match combo    → width 4, height 1
//   6+ match combo   → width min(N-1, 6), height 1
//   Chain x2         → width 6, height 1
//   Chain x3         → width 6, height 2
//   Chain xN         → width 6, height min(N-1, 6)

import type { GameEffect } from './types'

export interface GarbageSpec {
  width: number
  height: number
}

/**
 * Compute garbage to send to the opponent based on a match/chain effect.
 * Returns null if no garbage should be sent (e.g., a basic 3-match).
 */
export function computeGarbage(effect: GameEffect): GarbageSpec | null {
  if (effect.type === 'chainMatchMade') {
    const chainNumber = effect.chainNumber ?? 0
    if (chainNumber >= 2) {
      return {
        width: 6,
        height: Math.min(chainNumber - 1, 6),
      }
    }
  }

  if (effect.type === 'matchMade' || effect.type === 'chainMatchMade') {
    const count = effect.indices?.length ?? 0
    if (count >= 6) {
      return { width: Math.min(count - 1, 6), height: 1 }
    }
    if (count === 5) {
      return { width: 4, height: 1 }
    }
    if (count === 4) {
      return { width: 3, height: 1 }
    }
  }

  return null
}
