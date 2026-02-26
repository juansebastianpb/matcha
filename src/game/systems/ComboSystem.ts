import { COMBO_BONUS_PER_GROUP } from '../constants'

export class ComboSystem {
  private maxCombo = 0
  private currentCombo = 0

  setCombo(groupCount: number): void {
    this.currentCombo = groupCount
    if (groupCount > this.maxCombo) {
      this.maxCombo = groupCount
    }
  }

  getCombo(): number {
    return this.currentCombo
  }

  getMaxCombo(): number {
    return this.maxCombo
  }

  getBonus(): number {
    if (this.currentCombo > 1) {
      return this.currentCombo * COMBO_BONUS_PER_GROUP
    }
    return 0
  }

  reset(): void {
    this.currentCombo = 0
  }

  fullReset(): void {
    this.currentCombo = 0
    this.maxCombo = 0
  }
}
