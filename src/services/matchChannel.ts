import type { RealtimeChannel } from '@supabase/supabase-js'
import { debug } from '../lib/debug'

export interface GameEventPayload {
  type: string
  index?: number
  time?: number
}

export interface GarbagePayload {
  x: number
  width: number
  height: number
}

export interface MatchStartPayload {
  hostSeed: number
  guestSeed: number
  startAt: number  // timestamp ms
}

export interface MatchChannel {
  sendEvent(event: GameEventPayload): void
  sendGarbage(slab: GarbagePayload): void
  sendGameOver(): void
  sendReady(): void
  sendMatchStart(payload: MatchStartPayload): void
  sendDisconnect(): void

  onOpponentEvent(cb: (event: GameEventPayload) => void): void
  onOpponentGarbage(cb: (slab: GarbagePayload) => void): void
  onOpponentGameOver(cb: () => void): void
  onOpponentReady(cb: () => void): void
  onMatchStart(cb: (payload: MatchStartPayload) => void): void
  onOpponentDisconnect(cb: () => void): void

  resetCallbacks(): void
  destroy(): void
}

export function createMatchChannel(channel: RealtimeChannel): MatchChannel {
  let eventCallbacks: ((event: GameEventPayload) => void)[] = []
  let garbageCallbacks: ((slab: GarbagePayload) => void)[] = []
  let gameOverCallbacks: (() => void)[] = []
  let readyCallbacks: (() => void)[] = []
  let matchStartCallbacks: ((payload: MatchStartPayload) => void)[] = []
  let disconnectCallbacks: (() => void)[] = []
  let destroyed = false

  // Register Supabase listeners once. They delegate to the callback arrays,
  // so resetCallbacks() effectively silences them without needing to
  // unregister from Supabase (which doesn't support selective .off()).
  channel.on('broadcast', { event: 'input' }, ({ payload }) => {
    if (destroyed) return
    eventCallbacks.forEach(cb => cb(payload as GameEventPayload))
  })

  channel.on('broadcast', { event: 'garbage' }, ({ payload }) => {
    if (destroyed) return
    debug('MC', '← recv garbage', payload)
    garbageCallbacks.forEach(cb => cb(payload as GarbagePayload))
  })

  channel.on('broadcast', { event: 'game_over' }, () => {
    if (destroyed) return
    debug('MC', '← recv game_over')
    gameOverCallbacks.forEach(cb => cb())
  })

  channel.on('broadcast', { event: 'ready' }, () => {
    if (destroyed) return
    debug('MC', '← recv ready')
    readyCallbacks.forEach(cb => cb())
  })

  channel.on('broadcast', { event: 'match_start' }, ({ payload }) => {
    if (destroyed) return
    debug('MC', '← recv match_start', payload)
    matchStartCallbacks.forEach(cb => cb(payload as MatchStartPayload))
  })

  channel.on('broadcast', { event: 'disconnect' }, () => {
    if (destroyed) return
    debug('MC', '← recv disconnect')
    disconnectCallbacks.forEach(cb => cb())
  })

  return {
    sendEvent(event: GameEventPayload) {
      if (destroyed) return
      channel.send({ type: 'broadcast', event: 'input', payload: event })
    },

    sendGarbage(slab: GarbagePayload) {
      if (destroyed) return
      debug('MC', '→ send garbage', slab)
      channel.send({ type: 'broadcast', event: 'garbage', payload: slab })
    },

    sendGameOver() {
      if (destroyed) return
      debug('MC', '→ send game_over')
      channel.send({ type: 'broadcast', event: 'game_over', payload: {} })
    },

    sendReady() {
      if (destroyed) return
      channel.send({ type: 'broadcast', event: 'ready', payload: {} })
    },

    sendMatchStart(payload: MatchStartPayload) {
      if (destroyed) return
      channel.send({ type: 'broadcast', event: 'match_start', payload })
    },

    sendDisconnect() {
      if (destroyed) return
      channel.send({ type: 'broadcast', event: 'disconnect', payload: {} })
    },

    onOpponentEvent(cb) { if (!destroyed) eventCallbacks.push(cb) },
    onOpponentGarbage(cb) { if (!destroyed) garbageCallbacks.push(cb) },
    onOpponentGameOver(cb) { if (!destroyed) gameOverCallbacks.push(cb) },
    onOpponentReady(cb) { if (!destroyed) readyCallbacks.push(cb) },
    onMatchStart(cb) { if (!destroyed) matchStartCallbacks.push(cb) },
    onOpponentDisconnect(cb) { if (!destroyed) disconnectCallbacks.push(cb) },

    resetCallbacks() {
      eventCallbacks = []
      garbageCallbacks = []
      gameOverCallbacks = []
      readyCallbacks = []
      matchStartCallbacks = []
      disconnectCallbacks = []
    },

    destroy() {
      destroyed = true
      this.resetCallbacks()
      channel.unsubscribe()
    },
  }
}
