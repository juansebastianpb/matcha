import { POINTS_PER_BLOCK, TOPOUT_PENALTY } from '../constants'
import { ChainSystem } from './ChainSystem'
import { ComboSystem } from './ComboSystem'

export class ScoreSystem {
  private score = 0
  private blocksCleared = 0
  private chain: ChainSystem
  private combo: ComboSystem

  constructor(chain: ChainSystem, combo: ComboSystem) {
    this.chain = chain
    this.combo = combo
  }

  addClear(blockCount: number, groupCount: number): number {
    this.blocksCleared += blockCount
    this.combo.setCombo(groupCount)

    const basePoints = blockCount * POINTS_PER_BLOCK
    const multiplier = this.chain.getMultiplier()
    const comboBonus = this.combo.getBonus()
    const points = basePoints * multiplier + comboBonus

    this.score += points
    return points
  }

  applyTopoutPenalty(): void {
    this.score = Math.max(0, this.score + TOPOUT_PENALTY)
  }

  getScore(): number {
    return this.score
  }

  getBlocksCleared(): number {
    return this.blocksCleared
  }

  reset(): void {
    this.score = 0
    this.blocksCleared = 0
  }
}
