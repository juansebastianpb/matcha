// Game engine adapted from panel-league (MIT)
// Provides state caching, event replay, and effect emission

import { ScoringStepper } from './stepper'
import type { GameState, GameEvent, GameEffect, GameOptions } from './types'

export type { GameState, GameEvent, GameEffect, GameOptions } from './types'
export type { Block } from './types'

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
      const stateJSON = this.statesByTime.get(this.lastValidTime)
      if (!stateJSON) throw new Error('Unexpected cache miss')
      state = JSON.parse(stateJSON)
    }

    ++this._time
    for (let instant = this.lastValidTime!; instant < this._time; ++instant) {
      const events = this.eventsByTime[instant] || []
      const effects = this.stepper.step(state, events)
      this.emitEffects(instant, effects)
      this.statesByTime.set(instant + 1, JSON.stringify(state))
    }
    this.lastValidTime = this._time
    this.statesByTime.delete(this.lastValidTime - 128) // cache size

    this.stepper.postProcess(state)
    return state
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
      this.invalidateCache()
    }
  }

  on(type: string, callback: (effect: GameEffect) => void): void {
    this.listeners.push({ type, callback, triggered: false })
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
