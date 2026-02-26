import { ROUND_DURATION } from '../constants'

export class TimerSystem {
  private remaining: number = ROUND_DURATION
  private running = false

  start(): void {
    this.remaining = ROUND_DURATION
    this.running = true
  }

  update(delta: number): void {
    if (!this.running) return
    this.remaining -= delta / 1000
    if (this.remaining <= 0) {
      this.remaining = 0
      this.running = false
    }
  }

  getRemaining(): number {
    return Math.max(0, this.remaining)
  }

  getFormattedTime(): string {
    const total = Math.ceil(this.remaining)
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  isRunning(): boolean {
    return this.running
  }

  isExpired(): boolean {
    return this.remaining <= 0
  }

  getProgress(): number {
    return this.remaining / ROUND_DURATION
  }
}
