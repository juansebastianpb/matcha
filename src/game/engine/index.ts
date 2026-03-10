// Game engine adapted from panel-league (MIT)
// Provides state caching, event replay, and effect emission

import { ScoringStepper } from './stepper'
import type { GameState, GameEvent, GameEffect, GameOptions } from './types'

export type { GameState, GameEvent, GameEffect, GameOptions } from './types'
export type { Block } from './types'

// Cache a snapshot every N ticks to reduce JSON.stringify calls.
// Rollback replays at most CACHE_INTERVAL-1 extra ticks from the nearest snapshot.
const CACHE_INTERVAL = 4
// Maximum number of cached snapshots to keep
const MAX_CACHE_SIZE = 32
// Prune deduplication set when it exceeds this size
const MAX_EFFECTS_SET_SIZE = 512

export class GameEngine {
  stepper: ScoringStepper
  width: number
  height: number

  private _time: number
  private eventsByTime: Record<number, GameEvent[]>
  private initialStateJSON: string
  private statesByTime: Map<number, string>
  private lastValidTime: number | null
  private effects: Set<string>
  private listeners: Array<{
    type: string
    callback: (effect: GameEffect) => void
    triggered: boolean
  }>

  constructor(options: GameOptions = {}) {
    this.stepper = new ScoringStepper()
    this.width = options.width ?? 6
    this.height = options.height ?? 12

    const state = this.stepper.initializeState(options)
    this._time = state.time
    this.eventsByTime = {}
    this.initialStateJSON = JSON.stringify(state)
    this.statesByTime = new Map()
    this.lastValidTime = null
    this.effects = new Set()
    this.listeners = []
  }

  get initialState(): GameState {
    const state: GameState = JSON.parse(this.initialStateJSON)
    this.stepper.postProcess(state)
    return state
  }

  get currentState(): GameState {
    --this._time
    return this.step()
  }

  get time(): number {
    return this._time
  }

  set time(value: number) {
    const state = this.statesByTime.get(value)
    if (!state) {
      this.invalidateCache()
    } else {
      this.lastValidTime = value
    }
    this._time = value
  }

  step(): GameState {
    let state: GameState

    if (this.lastValidTime === null) {
      const stateJSON = this.initialStateJSON
      state = JSON.parse(stateJSON)
      this.statesByTime.set(state.time, stateJSON)
      this.lastValidTime = state.time
    } else {
      // Find the nearest cached state at or before lastValidTime
      let restoreTime = this.lastValidTime
      while (!this.statesByTime.has(restoreTime) && restoreTime > 0) {
        --restoreTime
      }
      const stateJSON = this.statesByTime.get(restoreTime)
      if (!stateJSON) {
        // Fall back to initial state
        state = JSON.parse(this.initialStateJSON)
        restoreTime = state.time
        this.statesByTime.set(restoreTime, this.initialStateJSON)
      } else {
        state = JSON.parse(stateJSON)
      }
      this.lastValidTime = restoreTime
    }

    ++this._time
    for (let instant = this.lastValidTime!; instant < this._time; ++instant) {
      const events = this.eventsByTime[instant] || []
      const effects = this.stepper.step(state, events)
      this.emitEffects(instant, effects)

      // Cache snapshots at intervals or when events occurred (for precise rollback)
      const nextTime = instant + 1
      if (events.length > 0 || nextTime % CACHE_INTERVAL === 0) {
        this.statesByTime.set(nextTime, JSON.stringify(state))
      }
    }
    this.lastValidTime = this._time

    // Evict old cache entries beyond MAX_CACHE_SIZE
    if (this.statesByTime.size > MAX_CACHE_SIZE) {
      const cutoff = this._time - MAX_CACHE_SIZE * CACHE_INTERVAL
      for (const key of this.statesByTime.keys()) {
        if (key < cutoff) this.statesByTime.delete(key)
        else break
      }
    }

    // Prune old events and effects to prevent unbounded growth
    this.pruneOldData()

    this.stepper.postProcess(state)
    return state
  }

  get lastValidState(): string | null {
    if (this.lastValidTime === null) {
      return this.initialStateJSON
    }
    return this.statesByTime.get(this.lastValidTime) ?? null
  }

  invalidateCache(): void {
    this.lastValidTime = null
    this.statesByTime = new Map()
  }

  addEvent(event: GameEvent): void {
    const events = this.eventsByTime[event.time] || []
    events.push(event)
    this.eventsByTime[event.time] = events
    if (this.lastValidTime === null) return
    this.lastValidTime = Math.min(this.lastValidTime, event.time)
    if (!this.statesByTime.has(this.lastValidTime)) {
      // Find the nearest cached state before the event
      let restoreTime = this.lastValidTime
      while (restoreTime > 0 && !this.statesByTime.has(restoreTime)) {
        --restoreTime
      }
      if (this.statesByTime.has(restoreTime)) {
        this.lastValidTime = restoreTime
      } else {
        this.invalidateCache()
      }
    }
  }

  on(type: string, callback: (effect: GameEffect) => void): void {
    this.listeners.push({ type, callback, triggered: false })
  }

  removeAllListeners(): void {
    this.listeners.length = 0
  }

  private pruneOldData(): void {
    const cutoff = this._time - MAX_CACHE_SIZE * CACHE_INTERVAL
    if (cutoff <= 0) return

    // Prune old events
    for (const key of Object.keys(this.eventsByTime)) {
      const numKey = Number(key)
      if (numKey < cutoff) {
        delete this.eventsByTime[numKey]
      }
    }

    // Prune effects deduplication set when it gets large
    if (this.effects.size > MAX_EFFECTS_SET_SIZE) {
      this.effects.clear()
    }
  }

  private emitEffects(time: number, effects: GameEffect[]): void {
    this.listeners.forEach((listener) => {
      listener.triggered = false
    })
    effects.forEach((effect) => {
      effect.time = time
      const effectJSON = JSON.stringify(effect)
      if (!this.effects.has(effectJSON)) {
        this.effects.add(effectJSON)
        this.emitEffect(effect)
      }
    })
  }

  private emitEffect(effect: GameEffect): void {
    const listeners = this.listeners.filter((l) => l.type === effect.type)
    listeners.forEach((listener) => {
      if (listener.triggered) return
      listener.triggered = true
      listener.callback(effect)
    })
  }
}
