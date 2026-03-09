import type { RealtimeChannel } from '@supabase/supabase-js'

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
  const eventCallbacks: ((event: GameEventPayload) => void)[] = []
  const garbageCallbacks: ((slab: GarbagePayload) => void)[] = []
  const gameOverCallbacks: (() => void)[] = []
  const readyCallbacks: (() => void)[] = []
  const matchStartCallbacks: ((payload: MatchStartPayload) => void)[] = []
  const disconnectCallbacks: (() => void)[] = []

  channel.on('broadcast', { event: 'input' }, ({ payload }) => {
    eventCallbacks.forEach(cb => cb(payload as GameEventPayload))
  })

  channel.on('broadcast', { event: 'garbage' }, ({ payload }) => {
    garbageCallbacks.forEach(cb => cb(payload as GarbagePayload))
  })

  channel.on('broadcast', { event: 'game_over' }, () => {
    gameOverCallbacks.forEach(cb => cb())
  })

  channel.on('broadcast', { event: 'ready' }, () => {
    readyCallbacks.forEach(cb => cb())
  })

  channel.on('broadcast', { event: 'match_start' }, ({ payload }) => {
    matchStartCallbacks.forEach(cb => cb(payload as MatchStartPayload))
  })

  channel.on('broadcast', { event: 'disconnect' }, () => {
    disconnectCallbacks.forEach(cb => cb())
  })

  return {
    sendEvent(event: GameEventPayload) {
      channel.send({ type: 'broadcast', event: 'input', payload: event })
    },

    sendGarbage(slab: GarbagePayload) {
      channel.send({ type: 'broadcast', event: 'garbage', payload: slab })
    },

    sendGameOver() {
      channel.send({ type: 'broadcast', event: 'game_over', payload: {} })
    },

    sendReady() {
      channel.send({ type: 'broadcast', event: 'ready', payload: {} })
    },

    sendMatchStart(payload: MatchStartPayload) {
      channel.send({ type: 'broadcast', event: 'match_start', payload })
    },

    sendDisconnect() {
      channel.send({ type: 'broadcast', event: 'disconnect', payload: {} })
    },

    onOpponentEvent(cb) { eventCallbacks.push(cb) },
    onOpponentGarbage(cb) { garbageCallbacks.push(cb) },
    onOpponentGameOver(cb) { gameOverCallbacks.push(cb) },
    onOpponentReady(cb) { readyCallbacks.push(cb) },
    onMatchStart(cb) { matchStartCallbacks.push(cb) },
    onOpponentDisconnect(cb) { disconnectCallbacks.push(cb) },

    resetCallbacks() {
      eventCallbacks.length = 0
      garbageCallbacks.length = 0
      gameOverCallbacks.length = 0
      readyCallbacks.length = 0
      matchStartCallbacks.length = 0
      disconnectCallbacks.length = 0
    },

    destroy() {
      this.resetCallbacks()
      channel.unsubscribe()
    },
  }
}
