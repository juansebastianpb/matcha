export class ChainSystem {
  private chainLevel = 0
  private active = false

  startChain(): void {
    this.chainLevel = 1
    this.active = true
  }

  increment(): void {
    if (this.active) {
      this.chainLevel++
    }
  }

  getLevel(): number {
    return this.chainLevel
  }

  getMultiplier(): number {
    if (this.chainLevel <= 1) return 1
    return Math.pow(2, this.chainLevel - 1)
  }

  isActive(): boolean {
    return this.active
  }

  reset(): void {
    this.chainLevel = 0
    this.active = false
  }
}
