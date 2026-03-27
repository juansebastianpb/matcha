import type { GameState, Block } from '../engine/types'

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert'
export interface AIAction { type: 'swap' | 'addRow'; index?: number }

interface DifficultyParams {
  thinkInterval: number       // ticks between actions
  missChance: number          // probability of skipping a good match
  seekChains: boolean         // use chain lookahead
  scanFraction: number        // fraction of board to scan
  chainWeight: number         // score multiplier for chain depth
  garbageWeight: number       // bonus for matching near garbage
  targetHeight: number        // ideal stack height in rows (raise when below)
  dangerHeight: number        // rows from top — avoid raising, prioritize any clear
  setupWeight: number         // multiplier for non-matching positioning moves
  flattenWeight: number       // bonus for leveling column heights
  skillChain: boolean         // can act during chain resolution (no busy check)
  noiseScale: number          // random noise on scores (makes Easy sloppy)
  burstMoves: number          // max swaps per think cycle (rapid combos for Hard)
  maxChainLookahead: number   // cascade depth cap (deeper = stronger chains)
  warmupTicks: number         // engine ticks before AI starts acting
  preferCombo: number         // bonus multiplier for 4+ simultaneous clears
  bottomBias: number          // how much to prefer clearing from the bottom (chain potential)
}

const PARAMS: Record<AIDifficulty, DifficultyParams> = {
  easy: {
    thinkInterval: 30,
    missChance: 0.55,
    seekChains: false,
    scanFraction: 0.25,
    chainWeight: 0,
    garbageWeight: 3,
    targetHeight: 4,
    dangerHeight: 3,
    setupWeight: 0.15,
    flattenWeight: 0.5,
    skillChain: false,
    noiseScale: 0.55,
    burstMoves: 1,
    maxChainLookahead: 0,
    warmupTicks: 100,
    preferCombo: 10,
    bottomBias: 1,
  },
  medium: {
    thinkInterval: 14,
    missChance: 0.25,
    seekChains: true,
    scanFraction: 0.6,
    chainWeight: 3,
    garbageWeight: 25,
    targetHeight: 6,
    dangerHeight: 3,
    setupWeight: 0.6,
    flattenWeight: 3,
    skillChain: false,
    noiseScale: 0.20,
    burstMoves: 1,
    maxChainLookahead: 1,
    warmupTicks: 55,
    preferCombo: 30,
    bottomBias: 3,
  },
  hard: {
    thinkInterval: 10,
    missChance: 0.15,
    seekChains: true,
    scanFraction: 0.75,
    chainWeight: 6,
    garbageWeight: 40,
    targetHeight: 6,
    dangerHeight: 3,
    setupWeight: 1.0,
    flattenWeight: 4,
    skillChain: false,
    noiseScale: 0.12,
    burstMoves: 1,
    maxChainLookahead: 2,
    warmupTicks: 40,
    preferCombo: 40,
    bottomBias: 4,
  },
  expert: {
    thinkInterval: 5,
    missChance: 0.05,
    seekChains: true,
    scanFraction: 0.9,
    chainWeight: 10,
    garbageWeight: 65,
    targetHeight: 7,
    dangerHeight: 2,
    setupWeight: 1.8,
    flattenWeight: 5,
    skillChain: true,
    noiseScale: 0.05,
    burstMoves: 2,
    maxChainLookahead: 3,
    warmupTicks: 25,
    preferCombo: 50,
    bottomBias: 5,
  },
}

// Match scores live above this threshold so they always beat setup moves
const MATCH_TIER = 1000

export class PuzzleAI {
  private params: DifficultyParams
  private tickCounter = 0
  private moveQueue: AIAction[] = []

  get warmupTicks(): number {
    return this.params.warmupTicks
  }

  constructor(difficulty: AIDifficulty) {
    this.params = PARAMS[difficulty]
  }

  reset(): void {
    this.tickCounter = 0
    this.moveQueue = []
  }

  think(state: GameState): AIAction | null {
    // Drain queued burst moves first
    if (this.moveQueue.length > 0) {
      return this.moveQueue.shift()!
    }

    this.tickCounter++

    const { width, height, blocks } = state

    // ── Board analysis ──

    const len = blocks.length
    const colors = new Array<string | null>(len)
    const isGarbage = new Uint8Array(len)
    let garbageCount = 0
    let highestGarbageRow = height
    let highestRow = height

    for (let i = 0; i < len; i++) {
      colors[i] = blocks[i].color
      if (blocks[i].garbage) {
        isGarbage[i] = 1
        garbageCount++
        const gy = Math.floor(i / width)
        if (gy < highestGarbageRow) highestGarbageRow = gy
      }
      if (blocks[i].color !== null || blocks[i].garbage) {
        const y = Math.floor(i / width)
        if (y < highestRow) highestRow = y
      }
    }

    const stackHeight = height - highestRow

    // Column heights
    const colHeights = new Array<number>(width).fill(0)
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (colors[x + y * width] !== null || isGarbage[x + y * width]) {
          colHeights[x] = height - y
          break
        }
      }
    }

    // Max column height and unevenness
    const maxColHeight = Math.max(...colHeights)
    const minColHeight = Math.min(...colHeights)
    const heightSpread = maxColHeight - minColHeight

    // ── Danger assessment ──
    // Danger when stack is within dangerHeight of the top
    const inDanger = stackHeight >= height - this.params.dangerHeight
    // Critical: within 2 rows of death
    const criticalDanger = stackHeight >= height - 2
    // Garbage threatening death
    const garbageNearTop = highestGarbageRow < 4
    // Columns are very uneven (tower problem)
    const hasTower = heightSpread >= 3

    // In danger: think faster, never miss
    const effectiveInterval = (criticalDanger || (inDanger && garbageNearTop))
      ? Math.max(1, Math.floor(this.params.thinkInterval / 2))
      : this.params.thinkInterval
    const effectiveMissChance = (inDanger || garbageNearTop) ? 0 : this.params.missChance

    if (this.tickCounter < effectiveInterval) return null

    // Skill chain: Hard can act while board is animating
    if (!this.params.skillChain && this.isBoardBusy(blocks)) return null

    this.tickCounter = 0

    // ── Decide mode: survival vs offense ──
    // Survival mode: stack is high, garbage near top, or towers exist
    const survivalMode = inDanger || garbageNearTop || criticalDanger
    // Flatten mode: columns are very uneven even when not in immediate danger
    const flattenMode = hasTower && stackHeight >= height - 5

    // Baseline board quality for scoring setup moves
    const skipSetups = criticalDanger
    const baselinePairs = skipSetups ? 0 : this.countPairs(colors, width, height)
    const baselineFlatness = skipSetups ? 0 : this.computeFlatness(colHeights, width)
    const baselineChainPotential = (!skipSetups && this.params.seekChains)
      ? this.countChainSetups(colors, width, height)
      : 0

    // Build and optionally subsample scan positions
    // In survival/flatten mode, always scan everything
    const effectiveScanFraction = (survivalMode || flattenMode)
      ? Math.max(this.params.scanFraction, 0.9)
      : this.params.scanFraction

    const totalPositions: Array<{ x: number; y: number }> = []
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width - 1; x++) {
        totalPositions.push({ x, y })
      }
    }
    const scanCount = Math.ceil(totalPositions.length * effectiveScanFraction)
    const positions = effectiveScanFraction < 1
      ? this.shuffle(totalPositions).slice(0, scanCount)
      : totalPositions

    let bestScore = -Infinity
    let bestIndex = -1

    for (const { x, y } of positions) {
      const idx = x + y * width
      if (!this.canSwap(blocks, idx, width)) continue

      const c1 = colors[idx]
      const c2 = colors[idx + 1]
      if (c1 === c2) continue  // pointless swap

      // Simulate swap
      colors[idx] = c2
      colors[idx + 1] = c1

      const matches = this.findMatches(colors, width, height)
      let score: number

      if (matches.length > 0) {
        // ── MATCH FOUND ──
        score = MATCH_TIER + matches.length * 10

        // --- SURVIVAL SCORING ---
        if (criticalDanger) {
          // About to die: ANY clear is extremely valuable
          score += 2000
        } else if (inDanger) {
          score += 800
        }

        // Bonus for clearing blocks in tall columns (flatten towers)
        let towerClearBonus = 0
        for (const mIdx of matches) {
          const mx = mIdx % width
          const my = Math.floor(mIdx / width)
          const ch = colHeights[mx]

          // Always reward clearing tall columns
          towerClearBonus += ch * this.params.flattenWeight * 0.5

          // Extra bonus for clearing the tallest columns
          if (ch >= maxColHeight - 1 && heightSpread >= 3) {
            towerClearBonus += heightSpread * 15
          }

          // In danger: bonus for clearing blocks high up on the board
          if (survivalMode) {
            towerClearBonus += (height - my) * 5
          }
        }
        score += towerClearBonus

        // --- GARBAGE BREAKING ---
        const garbageAdj = this.countGarbageAdjacency(matches, isGarbage, width, height)
        if (garbageAdj > 0) {
          // Base garbage bonus
          score += garbageAdj * this.params.garbageWeight

          // Urgent: garbage near the top of the board
          if (garbageNearTop) {
            score += garbageAdj * 400
          }
          // Critical: garbage + danger = top priority survival move
          if (inDanger) {
            score += garbageAdj * 600
          }
          // Garbage blocks take up a lot of space — always worth breaking
          if (garbageCount >= width) {
            score += garbageAdj * 200
          }
        }

        // --- OFFENSIVE SCORING (when not in survival mode) ---
        if (!survivalMode) {
          // Prefer clearing from the bottom — more blocks above = more chain potential
          // This is THE key competitive principle: work from the bottom
          score += y * this.params.bottomBias

          // Combo bonus: 4+ simultaneous is valuable — sends garbage
          // 3-matches send nothing, 4+ send garbage blocks
          if (matches.length >= 4) {
            score += (matches.length - 3) * this.params.preferCombo
          }
          // Slight penalty for bare 3-matches when better options likely exist
          // (competitive players never clear 3s when 4+ is available)
          if (matches.length === 3 && !inDanger) {
            score -= 20
          }

          // Chain depth lookahead
          if (this.params.seekChains) {
            const chainDepth = this.evaluateChainDepth(colors, matches, width, height)
            score += chainDepth * this.params.chainWeight * 40
          }
        } else {
          // In survival: still prefer combos (they buy more stop time)
          if (matches.length >= 4) {
            score += (matches.length - 3) * 40
          }
          // In survival: chain lookahead only if not critical
          if (this.params.seekChains && !criticalDanger) {
            const chainDepth = this.evaluateChainDepth(colors, matches, width, height)
            score += chainDepth * this.params.chainWeight * 20
          }
        }

        // --- FLATTEN BONUS ---
        // Simulate post-clear column heights and reward flattening
        if (flattenMode || hasTower) {
          const postColHeights = colHeights.slice()
          for (const mIdx of matches) {
            const mx = mIdx % width
            // Approximate: each cleared block reduces column height
            if (postColHeights[mx] > 0) postColHeights[mx]--
          }
          const postSpread = Math.max(...postColHeights) - Math.min(...postColHeights)
          const spreadReduction = heightSpread - postSpread
          if (spreadReduction > 0) {
            score += spreadReduction * 30 * this.params.flattenWeight
          }
        }

        // Noise injection for Easy — jitter match scores
        if (this.params.noiseScale > 0) {
          score += (Math.random() - 0.5) * MATCH_TIER * this.params.noiseScale
        }

      } else {
        // ── NO MATCH — score as setup/positioning ──

        // Tower-reducing moves are SURVIVAL moves, not setup moves.
        // They must ALWAYS be evaluated, even in critical danger.
        const h1 = colHeights[x], h2 = colHeights[x + 1]
        const localSpread = Math.abs(h1 - h2)

        if ((hasTower || localSpread >= 2) && localSpread >= 2) {
          score = 0

          // Case 1: Moving a block into an empty space — most impactful
          // Block slides off tall column, falls via gravity onto shorter column
          if (c1 && !c2 && h1 > h2 + 1) {
            score = MATCH_TIER + 300 + (h1 - h2) * 100
          } else if (c2 && !c1 && h2 > h1 + 1) {
            score = MATCH_TIER + 300 + (h2 - h1) * 100
          }
          // Case 2: Both have blocks but big height difference
          // Still worth doing — redistributes blocks toward flat
          else if (c1 && c2 && localSpread >= 3) {
            score = MATCH_TIER + 100 + localSpread * 60
          }

          // Massive boost when tallest column is near death
          if (maxColHeight >= height - 3 && score > 0) {
            score += 1500
            if (h1 >= maxColHeight - 1 || h2 >= maxColHeight - 1) {
              score += 1000
            }
          }

          // In critical danger, tower moves are the TOP priority
          if (criticalDanger && score > 0) {
            score += 3000
          }
        } else if (!skipSetups) {
          // Normal setup scoring (not tower-reducing)
          const newPairs = this.countPairs(colors, width, height)
          const pairDelta = newPairs - baselinePairs

          const newColHeights = colHeights.slice()
          for (const cx of [x, x + 1]) {
            newColHeights[cx] = 0
            for (let cy = 0; cy < height; cy++) {
              if (colors[cx + cy * width] !== null) {
                newColHeights[cx] = height - cy
                break
              }
            }
          }
          const flatDelta = this.computeFlatness(newColHeights, width) - baselineFlatness

          let gravityBonus = 0
          if (c1 && !c2) gravityBonus = 2
          if (c2 && !c1) gravityBonus = 2

          const proximityBonus = this.colorProximityDelta(colors, idx, width, height)

          let chainSetupDelta = 0
          if (this.params.seekChains) {
            const newChainPotential = this.countChainSetups(colors, width, height)
            chainSetupDelta = newChainPotential - baselineChainPotential
          }

          score = (
            pairDelta * 8 +
            flatDelta * this.params.flattenWeight +
            gravityBonus * 3 +
            proximityBonus * 5 +
            chainSetupDelta * 15
          ) * this.params.setupWeight

          const garbageNear = this.countNearGarbage(idx, idx + 1, isGarbage, width, height)
          score += garbageNear * this.params.garbageWeight * 0.3 * this.params.setupWeight
        } else {
          // In critical danger, non-tower non-match moves get worst score
          score = -Infinity
        }
      }

      // Undo swap
      colors[idx] = c1
      colors[idx + 1] = c2

      if (score > bestScore) {
        bestScore = score
        bestIndex = idx
      }
    }

    // Miss chance — randomly skip a match (not setup moves, never in danger)
    if (bestScore >= MATCH_TIER && Math.random() < effectiveMissChance) {
      return null
    }

    // Play the best move if it's an improvement
    if (bestScore > 0 && bestIndex >= 0) {
      const primaryAction: AIAction = { type: 'swap', index: bestIndex }

      // Burst moves: queue follow-up swaps for rapid pressure
      if (this.params.burstMoves > 1 && bestScore >= MATCH_TIER) {
        const c1 = colors[bestIndex]
        const c2 = colors[bestIndex + 1]
        colors[bestIndex] = c2
        colors[bestIndex + 1] = c1

        // Find up to (burstMoves - 1) follow-up moves
        for (let burst = 1; burst < this.params.burstMoves; burst++) {
          let followUpScore = -Infinity
          let followUpIndex = -1

          for (const { x, y } of positions) {
            const idx = x + y * width
            if (idx === bestIndex) continue
            if (this.moveQueue.some(m => m.index === idx)) continue
            if (!this.canSwap(blocks, idx, width)) continue

            const fc1 = colors[idx]
            const fc2 = colors[idx + 1]
            if (fc1 === fc2) continue

            colors[idx] = fc2
            colors[idx + 1] = fc1

            const fMatches = this.findMatches(colors, width, height)
            if (fMatches.length > 0) {
              let fScore = MATCH_TIER + fMatches.length * 10
              // Prefer combos for follow-ups (rapid pressure)
              if (fMatches.length >= 4) fScore += (fMatches.length - 3) * 30
              if (this.params.seekChains) {
                const fChain = this.evaluateChainDepth(colors, fMatches, width, height)
                fScore += fChain * this.params.chainWeight * 40
              }
              if (fScore > followUpScore) {
                followUpScore = fScore
                followUpIndex = idx
              }
            }

            colors[idx] = fc1
            colors[idx + 1] = fc2
          }

          if (followUpIndex >= 0) {
            this.moveQueue.push({ type: 'swap', index: followUpIndex })
            // Simulate this swap for next burst iteration
            const f1 = colors[followUpIndex]
            const f2 = colors[followUpIndex + 1]
            colors[followUpIndex] = f2
            colors[followUpIndex + 1] = f1
          } else {
            break
          }
        }

        // Undo all simulated swaps
        colors[bestIndex] = c1
        colors[bestIndex + 1] = c2
        for (const m of this.moveQueue) {
          if (m.index !== undefined) {
            const t = colors[m.index]
            colors[m.index] = colors[m.index + 1]
            colors[m.index + 1] = t
          }
        }
      }

      return primaryAction
    }

    // ── Stack height management ──
    // Raise when below target height AND safe to do so
    // NEVER raise when: in danger, garbage near top, columns very uneven, lots of garbage on board
    if (
      !inDanger &&
      !garbageNearTop &&
      !hasTower &&
      stackHeight < this.params.targetHeight &&
      garbageCount < width * 2
    ) {
      return { type: 'addRow' }
    }

    return null
  }

  // ── Count adjacent same-color pairs (setup quality metric) ──

  private countPairs(colors: (string | null)[], width: number, height: number): number {
    let pairs = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const c = colors[x + y * width]
        if (!c) continue
        if (x + 1 < width && colors[x + 1 + y * width] === c) pairs++
        if (y + 1 < height && colors[x + (y + 1) * width] === c) pairs++
      }
    }
    return pairs
  }

  // ── Flatness: negative sum of squared height diffs (higher = flatter) ──

  private computeFlatness(colHeights: number[], width: number): number {
    let penalty = 0
    for (let x = 0; x < width - 1; x++) {
      const diff = colHeights[x] - colHeights[x + 1]
      penalty += diff * diff
    }
    return -penalty
  }

  // ── Chain setup detection: count vertical patterns like A-B-A ──

  private countChainSetups(colors: (string | null)[], width: number, height: number): number {
    let setups = 0
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height - 2; y++) {
        const top = colors[x + y * width]
        const mid = colors[x + (y + 1) * width]
        const bot = colors[x + (y + 2) * width]
        if (top && bot && top === bot && mid && mid !== top) {
          setups++
        }
        if (top && !mid && bot && top === bot) {
          setups += 2
        }
      }
      for (let y = 0; y < height - 3; y++) {
        const top = colors[x + y * width]
        const bot = colors[x + (y + 3) * width]
        if (top && bot && top === bot) {
          const m1 = colors[x + (y + 1) * width]
          const m2 = colors[x + (y + 2) * width]
          if (m1 && m2 && m1 !== top && m2 !== top) {
            setups++
          }
        }
      }
    }
    return setups
  }

  // ── Color proximity after swap ──

  private colorProximityDelta(colors: (string | null)[], idx: number, width: number, height: number): number {
    let delta = 0
    for (const pos of [idx, idx + 1]) {
      const c = colors[pos]
      if (!c) continue
      const x = pos % width
      const y = (pos - x) / width
      if (x > 0 && colors[pos - 1] === c) delta++
      if (x < width - 1 && colors[pos + 1] === c) delta++
      if (y > 0 && colors[pos - width] === c) delta++
      if (y < height - 1 && colors[pos + width] === c) delta++
    }
    return delta
  }

  // ── Garbage adjacency for matched blocks ──

  private countGarbageAdjacency(matches: number[], isGarbage: Uint8Array, width: number, height: number): number {
    let count = 0
    for (const idx of matches) {
      const x = idx % width
      const y = (idx - x) / width
      if (y > 0 && isGarbage[idx - width]) count++
      if (y < height - 1 && isGarbage[idx + width]) count++
      if (x > 0 && isGarbage[idx - 1]) count++
      if (x < width - 1 && isGarbage[idx + 1]) count++
    }
    return count
  }

  // ── Near-garbage for setup moves ──

  private countNearGarbage(idx1: number, idx2: number, isGarbage: Uint8Array, width: number, height: number): number {
    let count = 0
    for (const idx of [idx1, idx2]) {
      const x = idx % width
      const y = (idx - x) / width
      if (y > 0 && isGarbage[idx - width]) count++
      if (y < height - 1 && isGarbage[idx + width]) count++
      if (x > 0 && isGarbage[idx - 1]) count++
      if (x < width - 1 && isGarbage[idx + 1]) count++
    }
    return count
  }

  // ── Chain depth: simulate clear → gravity → match cascades ──

  private evaluateChainDepth(colors: (string | null)[], matches: number[], width: number, height: number): number {
    const copy = colors.slice()
    let currentMatches = matches
    let depth = 0

    while (currentMatches.length > 0) {
      for (const idx of currentMatches) copy[idx] = null

      // Gravity
      for (let x = 0; x < width; x++) {
        let writeY = height - 1
        for (let y = height - 1; y >= 0; y--) {
          const c = copy[x + y * width]
          if (c !== null) {
            copy[x + writeY * width] = c
            if (writeY !== y) copy[x + y * width] = null
            writeY--
          }
        }
      }

      currentMatches = this.findMatches(copy, width, height)
      if (currentMatches.length > 0) depth++
      if (depth >= this.params.maxChainLookahead) break
    }

    return depth
  }

  // ── Board busy: any block mid-animation? ──

  private isBoardBusy(blocks: Block[]): boolean {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i]
      if (b.flashTimer >= 0 || b.floatTimer > 0 || b.swapTimer !== 0) {
        return true
      }
    }
    return false
  }

  // ── Can two adjacent blocks swap? ──

  private canSwap(blocks: Block[], idx: number, width: number): boolean {
    const b1 = blocks[idx]
    const b2 = blocks[idx + 1]
    if (!b1 || !b2) return false
    if (!b1.color && !b2.color) return false
    if (b1.flashTimer >= 0 || b2.flashTimer >= 0) return false
    if (b1.floatTimer > 0 || b2.floatTimer > 0) return false
    if (b1.garbage || b2.garbage) return false
    if (b1.swapTimer !== 0 || b2.swapTimer !== 0) return false

    const above1 = idx - width >= 0 ? blocks[idx - width] : undefined
    const above2 = idx + 1 - width >= 0 ? blocks[idx + 1 - width] : undefined
    if (above1 && above1.floatTimer > 0) return false
    if (above2 && above2.floatTimer > 0) return false

    return true
  }

  // ── Find runs of 3+ same color ──

  private findMatches(colors: (string | null)[], width: number, height: number): number[] {
    const matched = new Set<number>()

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width - 2; x++) {
        const c = colors[x + y * width]
        if (!c) continue
        if (c === colors[x + 1 + y * width] && c === colors[x + 2 + y * width]) {
          let end = x + 2
          while (end + 1 < width && colors[end + 1 + y * width] === c) end++
          for (let i = x; i <= end; i++) matched.add(i + y * width)
        }
      }
    }

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height - 2; y++) {
        const c = colors[x + y * width]
        if (!c) continue
        if (c === colors[x + (y + 1) * width] && c === colors[x + (y + 2) * width]) {
          let end = y + 2
          while (end + 1 < height && colors[x + (end + 1) * width] === c) end++
          for (let i = y; i <= end; i++) matched.add(x + i * width)
        }
      }
    }

    return Array.from(matched)
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
}
