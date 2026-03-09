import { create } from 'zustand'
import { createRoom, joinRoom, searchMatch } from '../services/matchmaking'
import { createMatchChannel } from '../services/matchChannel'
import type { MatchChannel } from '../services/matchChannel'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { AIDifficulty } from '../game/ai/PuzzleAI'
import { supabase } from '../services/supabase'
import { useChallengeStore } from './challengeStore'

export type MatchMode = 'idle' | 'searching' | 'creating' | 'waiting' | 'joining' | 'ready_check' | 'countdown' | 'playing' | 'finished'
export type MatchResult = 'win' | 'lose' | null

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

  // Challenge
  isChallengeMatch: boolean
  challengeMatchId: string | null
  opponentChallengeEmail: string | null

  // Actions
  findMatch: () => Promise<void>
  cancelSearch: () => void
  createRoom: (roomCodeOverride?: string) => Promise<void>
  joinRoom: (code: string) => Promise<void>
  startCpuMatch: (difficulty: AIDifficulty) => void
  startChallengeMatch: (matchId: string, opponentEmail?: string | null) => Promise<void>
  requestRematch: () => void
  confirmReady: () => void
  setPlaying: () => void
  setFinished: (result: 'win' | 'lose') => void
  setOpponentScore: (score: number) => void
  setOpponentDisconnected: () => void
  cleanup: () => void
  reset: () => void
}

async function callEdgeFunction(name: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) throw new Error(error.message || `Edge function ${name} failed`)
  return data as Record<string, unknown>
}

const initialChallengeState = {
  isChallengeMatch: false,
  challengeMatchId: null as string | null,
  opponentChallengeEmail: null as string | null,
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
  ...initialChallengeState,

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

  // Called by Challenge widget's onRematchStarting callback with the matchId
  startChallengeMatch: async (matchId: string, opponentEmail?: string | null) => {
    try {
      useChallengeStore.getState().setChallengeMatchId(matchId)

      // Subscribe to a shared Supabase channel using matchId as the room key
      const handle = await joinRoom(matchId)
      const channel = createMatchChannel(handle.channel)

      // Determine role: alphabetically lower email is host
      const myEmail = useChallengeStore.getState().playerEmail ?? ''
      const theirEmail = opponentEmail ?? ''
      const isHost = myEmail < theirEmail

      set({
        isChallengeMatch: true,
        challengeMatchId: matchId,
        opponentChallengeEmail: opponentEmail ?? null,
        mode: 'waiting',
        role: isHost ? 'host' : 'guest',
        channel,
        rawChannel: handle.channel,
        opponentConnected: false,
        cpuDifficulty: null,
        localSeed: null,
        remoteSeed: null,
        startAt: null,
        error: null,
        result: null,
        opponentScore: 0,
        opponentDisconnected: false,
      })

      if (isHost) {
        // Host: wait for guest's ready signal, then broadcast seeds
        channel.onOpponentReady(() => {
          const hostSeed = Math.floor(Math.random() * 2147483647)
          const guestSeed = Math.floor(Math.random() * 2147483647)
          const startAt = Date.now() + 4000
          channel.sendMatchStart({ hostSeed, guestSeed, startAt })
          set({
            mode: 'countdown',
            opponentConnected: true,
            localSeed: hostSeed,
            remoteSeed: guestSeed,
            startAt,
          })
        })
        // Send ready so guest knows host is here too
        channel.sendReady()
      } else {
        // Guest: listen for match_start from host, then use those seeds
        channel.onMatchStart((payload) => {
          set({
            mode: 'countdown',
            opponentConnected: true,
            localSeed: payload.guestSeed,
            remoteSeed: payload.hostSeed,
            startAt: payload.startAt,
          })
        })
        // Tell host we're ready
        channel.sendReady()
      }
    } catch (err) {
      set({ mode: 'idle', error: (err as Error).message })
    }
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

      channel.onOpponentReady(() => {
        const state = get()
        if (state.mode !== 'waiting') return

        const hostSeed = Math.floor(Math.random() * 2147483647)
        const guestSeed = Math.floor(Math.random() * 2147483647)
        const startAt = Date.now() + 6000

        channel.sendMatchStart({ hostSeed, guestSeed, startAt })
        set({ opponentConnected: true, mode: 'countdown', startAt, localSeed: hostSeed, remoteSeed: guestSeed })
      })

      set({
        mode: 'waiting',
        roomCode: handle.roomCode,
        role: 'host',
        rawChannel: handle.channel,
        channel,
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
    const { channel, role, cpuDifficulty } = get()

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

    // Challenge match: rematch is handled by the widget via onRematchStarting.
    // Don't do anything here — the widget will call startChallengeMatch with a new matchId.
    if (get().isChallengeMatch) return

    if (!channel) return

    // Regular multiplayer rematch
    channel.resetCallbacks()

    set({
      mode: 'ready_check',
      opponentConnected: false,
      opponentDisconnected: false,
      opponentScore: 0,
      result: null,
      error: null,
      localReady: false,
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

    channel.onOpponentReady(() => {
      const state = get()
      if (state.mode !== 'ready_check') return
      set({ opponentConnected: true })
      if (state.localReady && state.role === 'host') {
        startMatch()
      }
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

  setFinished: (result: 'win' | 'lose') => {
    set({ mode: 'finished', result })

    const { isChallengeMatch, challengeMatchId } = get()
    if (!isChallengeMatch || !challengeMatchId) return

    // Settle via Edge Function — only one player needs to call this (host).
    // Settlement is idempotent so both calling is safe.
    const settle = async () => {
      try {
        const challengeState = useChallengeStore.getState()
        useChallengeStore.getState().setSettling(true)

        const winnerId = result === 'win'
          ? challengeState.playerId
          : null // Let the opponent's settle call declare them winner

        if (winnerId) {
          await callEdgeFunction('challenge-settle-match', {
            matchId: challengeMatchId,
            winnerId,
          })
        }
        useChallengeStore.getState().setSettling(false)
      } catch (err) {
        console.error('Challenge settle error:', err)
        useChallengeStore.getState().setSettling(false)
        useChallengeStore.getState().setError((err as Error).message)
      }
    }

    settle()
  },

  setOpponentScore: (score: number) => set({ opponentScore: score }),

  setOpponentDisconnected: () => {
    const { mode } = get()
    if (mode === 'finished') return
    set({ opponentDisconnected: true })
    if (mode === 'playing' || mode === 'countdown') {
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
      ...initialChallengeState,
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
      ...initialChallengeState,
    })
  },
}))
