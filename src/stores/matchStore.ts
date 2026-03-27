import { create } from 'zustand'
import { debug } from '../lib/debug'
import { createRoom, joinRoom, searchMatch } from '../services/matchmaking'
import { createMatchChannel } from '../services/matchChannel'
import type { MatchChannel } from '../services/matchChannel'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { AIDifficulty } from '../game/ai/PuzzleAI'

export type MatchMode = 'idle' | 'searching' | 'creating' | 'waiting' | 'joining' | 'ready_check' | 'countdown' | 'playing' | 'finished'
export type MatchResult = 'win' | 'lose' | 'draw' | null

interface MatchState {
  mode: MatchMode
  roomCode: string | null
  role: 'host' | 'guest' | null
  rawChannel: RealtimeChannel | null
  channel: MatchChannel | null
  opponentConnected: boolean
  opponentDisconnected: boolean
  opponentScore: number
  result: MatchResult
  error: string | null
  isAutoMatch: boolean
  localReady: boolean
  cancelSearchFn: (() => void) | null
  cpuDifficulty: AIDifficulty | null

  // Sync
  startAt: number | null
  localSeed: number | null
  remoteSeed: number | null

  // Actions
  findMatch: () => Promise<void>
  cancelSearch: () => void
  createRoom: (roomCodeOverride?: string) => Promise<void>
  joinRoom: (code: string) => Promise<void>
  startCpuMatch: (difficulty: AIDifficulty) => void
  requestRematch: () => void
  confirmReady: () => void
  setPlaying: () => void
  setFinished: (result: 'win' | 'lose') => void
  setOpponentScore: (score: number) => void
  setOpponentDisconnected: () => void
  cleanup: () => void
  reset: () => void
}

export const useMatchStore = create<MatchState>((set, get) => ({
  mode: 'idle',
  roomCode: null,
  role: null,
  rawChannel: null,
  channel: null,
  opponentConnected: false,
  opponentDisconnected: false,
  opponentScore: 0,
  result: null,
  error: null,
  isAutoMatch: false,
  localReady: false,
  cancelSearchFn: null,
  startAt: null,
  localSeed: null,
  remoteSeed: null,
  cpuDifficulty: null,
  startCpuMatch: (difficulty: AIDifficulty) => {
    const localSeed = Math.floor(Math.random() * 2147483647)
    const remoteSeed = Math.floor(Math.random() * 2147483647)
    const startAt = Date.now() + 3600
    set({
      mode: 'countdown',
      role: 'host',
      channel: null,
      rawChannel: null,
      opponentConnected: true,
      cpuDifficulty: difficulty,
      localSeed,
      remoteSeed,
      startAt,
      error: null,
      result: null,
      opponentScore: 0,
      opponentDisconnected: false,
    })
  },

  findMatch: async () => {
    try {
      set({ mode: 'searching', isAutoMatch: true, error: null })
      const cancel = await searchMatch((roomCode, role) => {
        const state = get()
        if (state.mode !== 'searching') return
        set({ cancelSearchFn: null })
        if (role === 'host') {
          state.createRoom(roomCode)
        } else {
          state.joinRoom(roomCode)
        }
      })
      if (get().mode === 'searching') {
        set({ cancelSearchFn: cancel })
      }
    } catch (err) {
      set({ mode: 'idle', isAutoMatch: false, error: (err as Error).message })
    }
  },

  cancelSearch: () => {
    const { cancelSearchFn } = get()
    if (cancelSearchFn) cancelSearchFn()
    set({ mode: 'idle', isAutoMatch: false, cancelSearchFn: null })
  },

  createRoom: async (roomCodeOverride?: string) => {
    try {
      set({ mode: 'creating', error: null })
      const handle = await createRoom(roomCodeOverride)
      const channel = createMatchChannel(handle.channel)

      // Set mode to 'waiting' BEFORE registering the ready callback,
      // so the guard doesn't reject early ready signals from the guest
      set({
        mode: 'waiting',
        roomCode: handle.roomCode,
        role: 'host',
        rawChannel: handle.channel,
        channel,
      })

      channel.onOpponentReady(() => {
        const state = get()
        if (state.mode !== 'waiting') return

        const hostSeed = Math.floor(Math.random() * 2147483647)
        const guestSeed = Math.floor(Math.random() * 2147483647)
        const startAt = Date.now() + 6000

        channel.sendMatchStart({ hostSeed, guestSeed, startAt })
        set({ opponentConnected: true, mode: 'countdown', startAt, localSeed: hostSeed, remoteSeed: guestSeed })
      })
    } catch (err) {
      set({ mode: 'idle', error: (err as Error).message })
    }
  },

  joinRoom: async (code: string) => {
    try {
      set({ mode: 'joining', error: null })
      const handle = await joinRoom(code)
      const channel = createMatchChannel(handle.channel)

      channel.onMatchStart((payload) => {
        set({
          mode: 'countdown',
          opponentConnected: true,
          startAt: payload.startAt,
          localSeed: payload.guestSeed,
          remoteSeed: payload.hostSeed,
        })
      })

      set({
        roomCode: handle.roomCode,
        role: 'guest',
        rawChannel: handle.channel,
        channel,
      })

      channel.sendReady()
    } catch (err) {
      set({ mode: 'idle', error: (err as Error).message })
    }
  },

  requestRematch: () => {
    const { channel, role, cpuDifficulty, mode } = get()

    // Only allow rematch from finished state
    if (mode !== 'finished') return

    // CPU mode: skip network, restart directly
    if (cpuDifficulty) {
      const localSeed = Math.floor(Math.random() * 2147483647)
      const remoteSeed = Math.floor(Math.random() * 2147483647)
      const startAt = Date.now() + 3600
      set({
        mode: 'countdown',
        opponentConnected: true,
        opponentDisconnected: false,
        opponentScore: 0,
        result: null,
        error: null,
        localSeed,
        remoteSeed,
        startAt,
      })
      return
    }

    if (!channel) return

    // Regular multiplayer rematch — clicking Rematch IS the ready signal
    channel.resetCallbacks()

    set({
      mode: 'ready_check',
      opponentConnected: false,
      opponentDisconnected: false,
      opponentScore: 0,
      result: null,
      error: null,
      localReady: true,
      startAt: null,
      localSeed: null,
      remoteSeed: null,
    })

    const startMatch = () => {
      const hostSeed = Math.floor(Math.random() * 2147483647)
      const guestSeed = Math.floor(Math.random() * 2147483647)
      const startAt = Date.now() + 6000
      channel.sendMatchStart({ hostSeed, guestSeed, startAt })
      set({ mode: 'countdown', startAt, localSeed: hostSeed, remoteSeed: guestSeed })
    }

    // Register listeners BEFORE sending ready
    channel.onOpponentReady(() => {
      const state = get()
      if (state.mode !== 'ready_check') return
      set({ opponentConnected: true })
      if (state.role === 'host') {
        startMatch()
      }
      // Re-send ready in case opponent missed our first one
      // (they may have clicked rematch after we sent ours)
      channel.sendReady()
    })

    if (role === 'guest') {
      channel.onMatchStart((payload) => {
        const state = get()
        if (state.mode !== 'ready_check') return
        set({
          mode: 'countdown',
          opponentConnected: true,
          startAt: payload.startAt,
          localSeed: payload.guestSeed,
          remoteSeed: payload.hostSeed,
        })
      })
    }

    channel.onOpponentDisconnect(() => {
      get().setOpponentDisconnected()
    })

    // Send ready after listeners are registered
    channel.sendReady()

    // Retry ready after 2s in case both players clicked simultaneously
    // and both missed each other's first ready event
    setTimeout(() => {
      if (get().mode === 'ready_check') {
        channel.sendReady()
      }
    }, 2000)
  },

  confirmReady: () => {
    const { channel, opponentConnected, role, mode } = get()
    if (!channel || mode !== 'ready_check') return

    set({ localReady: true })
    channel.sendReady()

    if (opponentConnected && role === 'host') {
      const hostSeed = Math.floor(Math.random() * 2147483647)
      const guestSeed = Math.floor(Math.random() * 2147483647)
      const startAt = Date.now() + 6000
      channel.sendMatchStart({ hostSeed, guestSeed, startAt })
      set({ mode: 'countdown', startAt, localSeed: hostSeed, remoteSeed: guestSeed })
    }
  },

  setPlaying: () => set({ mode: 'playing' }),

  setFinished: (result: 'win' | 'lose' | 'draw') => {
    const { mode } = get()
    if (mode === 'finished') {
      debug('MatchStore', `setFinished(${result}) SKIPPED — already finished`)
      return
    }
    debug('MatchStore', `setFinished(${result}) — was mode=${mode}`)
    set({ mode: 'finished', result })
  },

  setOpponentScore: (score: number) => set({ opponentScore: score }),

  setOpponentDisconnected: () => {
    const { mode } = get()
    debug('MatchStore', `setOpponentDisconnected — mode=${mode}`)
    if (mode === 'finished') return
    set({ opponentDisconnected: true })
    if (mode === 'playing' || mode === 'countdown') {
      debug('MatchStore', `opponent disconnected during ${mode} → auto-win`)
      get().setFinished('win')
    }
  },

  cleanup: () => {
    const { channel, rawChannel, cancelSearchFn } = get()
    if (cancelSearchFn) cancelSearchFn()
    if (channel) {
      channel.sendDisconnect()
      channel.destroy()
    }
    if (rawChannel) rawChannel.unsubscribe()
    set({
      mode: 'idle',
      roomCode: null,
      role: null,
      rawChannel: null,
      channel: null,
      opponentConnected: false,
      opponentDisconnected: false,
      opponentScore: 0,
      result: null,
      error: null,
      isAutoMatch: false,
      localReady: false,
      cancelSearchFn: null,
      startAt: null,
      localSeed: null,
      remoteSeed: null,
      cpuDifficulty: null,
    })
  },

  reset: () => {
    const { channel, rawChannel, cancelSearchFn } = get()
    if (cancelSearchFn) cancelSearchFn()
    if (channel) channel.destroy()
    if (rawChannel) rawChannel.unsubscribe()
    set({
      mode: 'idle',
      roomCode: null,
      role: null,
      rawChannel: null,
      channel: null,
      opponentConnected: false,
      opponentDisconnected: false,
      opponentScore: 0,
      result: null,
      error: null,
      isAutoMatch: false,
      localReady: false,
      cancelSearchFn: null,
      startAt: null,
      localSeed: null,
      remoteSeed: null,
      cpuDifficulty: null,
    })
  },
}))
