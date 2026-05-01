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

export interface GameOverPayload {
  score: number
}

export interface MatchFinalScorePayload {
  score: number
}

export interface MatchChannel {
  sendEvent(event: GameEventPayload): void
  sendGarbage(slab: GarbagePayload): void
  sendGameOver(payload: GameOverPayload): void
  sendMatchFinalScore(payload: MatchFinalScorePayload): void
  sendReady(): void
  sendMatchStart(payload: MatchStartPayload): void
  sendDisconnect(): void

  onOpponentEvent(cb: (event: GameEventPayload) => void): void
  onOpponentGarbage(cb: (slab: GarbagePayload) => void): void
  onOpponentGameOver(cb: (payload: GameOverPayload) => void): void
  onOpponentMatchFinalScore(cb: (payload: MatchFinalScorePayload) => void): void
  onOpponentReady(cb: () => void): void
  onMatchStart(cb: (payload: MatchStartPayload) => void): void
  onOpponentDisconnect(cb: () => void): void

  resetCallbacks(): void
  destroy(): void
}

export function createMatchChannel(channel: RealtimeChannel): MatchChannel {
  let eventCallbacks: ((event: GameEventPayload) => void)[] = []
  let garbageCallbacks: ((slab: GarbagePayload) => void)[] = []
  let gameOverCallbacks: ((payload: GameOverPayload) => void)[] = []
  let matchFinalScoreCallbacks: ((payload: MatchFinalScorePayload) => void)[] = []
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

  channel.on('broadcast', { event: 'game_over' }, ({ payload }) => {
    if (destroyed) return
    // Backwards compat: older clients send empty payload, default score to 0.
    const p = (payload as Partial<GameOverPayload>) || {}
    const gameOverPayload: GameOverPayload = { score: typeof p.score === 'number' ? p.score : 0 }
    debug('MC', '← recv game_over', gameOverPayload)
    gameOverCallbacks.forEach(cb => cb(gameOverPayload))
  })

  channel.on('broadcast', { event: 'match_final_score' }, ({ payload }) => {
    if (destroyed) return
    const p = (payload as Partial<MatchFinalScorePayload>) || {}
    const finalPayload: MatchFinalScorePayload = { score: typeof p.score === 'number' ? p.score : 0 }
    debug('MC', '← recv match_final_score', finalPayload)
    matchFinalScoreCallbacks.forEach(cb => cb(finalPayload))
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

    sendGameOver(payload: GameOverPayload) {
      if (destroyed) return
      debug('MC', '→ send game_over', payload)
      channel.send({ type: 'broadcast', event: 'game_over', payload })
    },

    sendMatchFinalScore(payload: MatchFinalScorePayload) {
      if (destroyed) return
      debug('MC', '→ send match_final_score', payload)
      channel.send({ type: 'broadcast', event: 'match_final_score', payload })
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
    onOpponentMatchFinalScore(cb) { if (!destroyed) matchFinalScoreCallbacks.push(cb) },
    onOpponentReady(cb) { if (!destroyed) readyCallbacks.push(cb) },
    onMatchStart(cb) { if (!destroyed) matchStartCallbacks.push(cb) },
    onOpponentDisconnect(cb) { if (!destroyed) disconnectCallbacks.push(cb) },

    resetCallbacks() {
      eventCallbacks = []
      garbageCallbacks = []
      gameOverCallbacks = []
      matchFinalScoreCallbacks = []
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
