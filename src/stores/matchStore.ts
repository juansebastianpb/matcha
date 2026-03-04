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
  opponentChallengePlayerId: string | null
  opponentChallengeEmail: string | null

  // Actions
  findMatch: () => Promise<void>
  cancelSearch: () => void
  createRoom: (roomCodeOverride?: string) => Promise<void>
  joinRoom: (code: string) => Promise<void>
  startCpuMatch: (difficulty: AIDifficulty) => void
  startChallengeMatch: () => void
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
  isChallengeMatch: false,
  challengeMatchId: null,
  opponentChallengePlayerId: null,
  opponentChallengeEmail: null,

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

  startChallengeMatch: () => {
    set({ isChallengeMatch: true })
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
      // Only store cancel if we're still searching (callback may have already fired)
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

      // Listen for Challenge info from opponent
      channel.onChallengeInfo((payload) => {
        set({
          opponentChallengePlayerId: payload.challengePlayerId,
          opponentChallengeEmail: payload.challengeEmail,
        })
      })

      // Listen for guest joining (they send "ready")
      channel.onOpponentReady(async () => {
        const state = get()
        if (state.mode !== 'waiting') return

        // If Challenge match, send our Challenge info and wait for opponent's
        if (state.isChallengeMatch) {

          const challengeState = useChallengeStore.getState()
          if (challengeState.playerId && challengeState.playerEmail) {
            channel.sendChallengeInfo({
              challengePlayerId: challengeState.playerId,
              challengeEmail: challengeState.playerEmail,
            })
          }

          // Wait for opponent's Challenge info (poll briefly)
          let attempts = 0
          while (!get().opponentChallengePlayerId && attempts < 30) {
            await new Promise(r => setTimeout(r, 200))
            attempts++
          }

          const opponentId = get().opponentChallengePlayerId
          if (!opponentId || !challengeState.playerId) {
            set({ error: 'Failed to exchange Challenge info', mode: 'idle' })
            return
          }

          // Create paired match via Edge Function
          try {
            const result = await callEdgeFunction('challenge-create-match', {
              player1Id: challengeState.playerId,
              player2Id: opponentId,
              gameMatchId: state.roomCode,
            })
            const challengeMatchId = result.matchId as string
            set({ challengeMatchId })
            useChallengeStore.getState().setChallengeMatchId(challengeMatchId)

            // Include challengeMatchId in match_start payload
            const hostSeed = Math.floor(Math.random() * 2147483647)
            const guestSeed = Math.floor(Math.random() * 2147483647)
            const startAt = Date.now() + 6000
            channel.sendMatchStart({ hostSeed, guestSeed, startAt, challengeMatchId })
            set({ opponentConnected: true, mode: 'countdown', startAt, localSeed: hostSeed, remoteSeed: guestSeed })
          } catch (err) {
            set({ error: (err as Error).message, mode: 'idle' })
          }
          return
        }

        // Host generates seeds and broadcasts match_start
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

      // Listen for Challenge info from opponent
      channel.onChallengeInfo((payload) => {
        set({
          opponentChallengePlayerId: payload.challengePlayerId,
          opponentChallengeEmail: payload.challengeEmail,
        })
      })

      // Listen for match_start from host
      channel.onMatchStart(async (payload) => {
        // If Challenge match, store the challengeMatchId from host
        if (payload.challengeMatchId) {

          set({ challengeMatchId: payload.challengeMatchId })
          useChallengeStore.getState().setChallengeMatchId(payload.challengeMatchId)
        }

        // Guest uses guestSeed locally, hostSeed for remote
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

      // If Challenge match, send our Challenge info before ready
      if (get().isChallengeMatch) {
        const challengeState = useChallengeStore.getState()
        if (challengeState.playerId && challengeState.playerEmail) {
          channel.sendChallengeInfo({
            challengePlayerId: challengeState.playerId,
            challengeEmail: challengeState.playerEmail,
          })
        }
      }

      // Tell the host we're here
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

    if (!channel) return

    // Clear stale callbacks from the previous game round
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
      challengeMatchId: null,
    })

    const startMatch = async () => {
      const state = get()
      // If Challenge match, create new paired match before starting
      if (state.isChallengeMatch) {
        try {

          const challengeState = useChallengeStore.getState()
          const opponentId = state.opponentChallengePlayerId
          if (!challengeState.playerId || !opponentId) {
            set({ error: 'Challenge player info missing', mode: 'idle' })
            return
          }
          const result = await callEdgeFunction('challenge-create-match', {
            player1Id: challengeState.playerId,
            player2Id: opponentId,
            gameMatchId: state.roomCode,
          })
          const challengeMatchId = result.matchId as string
          set({ challengeMatchId })
          useChallengeStore.getState().setChallengeMatchId(challengeMatchId)

          const hostSeed = Math.floor(Math.random() * 2147483647)
          const guestSeed = Math.floor(Math.random() * 2147483647)
          const startAt = Date.now() + 6000
          channel.sendMatchStart({ hostSeed, guestSeed, startAt, challengeMatchId })
          set({ mode: 'countdown', startAt, localSeed: hostSeed, remoteSeed: guestSeed })
        } catch (err) {
          set({ error: (err as Error).message })
        }
        return
      }

      const hostSeed = Math.floor(Math.random() * 2147483647)
      const guestSeed = Math.floor(Math.random() * 2147483647)
      const startAt = Date.now() + 6000
      channel.sendMatchStart({ hostSeed, guestSeed, startAt })
      set({ mode: 'countdown', startAt, localSeed: hostSeed, remoteSeed: guestSeed })
    }

    // Listen for opponent's ready signal
    channel.onOpponentReady(() => {
      const state = get()
      if (state.mode !== 'ready_check') return
      set({ opponentConnected: true })
      if (state.localReady && state.role === 'host') {
        startMatch()
      }
    })

    // Guest listens for match_start
    if (role === 'guest') {
      channel.onMatchStart(async (payload) => {
        const state = get()
        if (state.mode !== 'ready_check') return

        if (payload.challengeMatchId) {

          set({ challengeMatchId: payload.challengeMatchId })
          useChallengeStore.getState().setChallengeMatchId(payload.challengeMatchId)
        }

        set({
          mode: 'countdown',
          opponentConnected: true,
          startAt: payload.startAt,
          localSeed: payload.guestSeed,
          remoteSeed: payload.hostSeed,
        })
      })
    }

    // Re-register disconnect handler
    channel.onOpponentDisconnect(() => {
      get().setOpponentDisconnected()
    })
  },

  confirmReady: () => {
    const { channel, opponentConnected, role, mode, isChallengeMatch } = get()
    if (!channel || mode !== 'ready_check') return

    set({ localReady: true })
    channel.sendReady()

    // If opponent already signaled ready and I'm host, start match
    if (opponentConnected && role === 'host') {
      if (isChallengeMatch) {
        // Challenge match: create paired match async, then start
        const doStart = async () => {
          try {
  
            const challengeState = useChallengeStore.getState()
            const opponentId = get().opponentChallengePlayerId
            if (!challengeState.playerId || !opponentId) {
              set({ error: 'Challenge player info missing', mode: 'idle' })
              return
            }
            const result = await callEdgeFunction('challenge-create-match', {
              player1Id: challengeState.playerId,
              player2Id: opponentId,
              gameMatchId: get().roomCode,
            })
            const challengeMatchId = result.matchId as string
            set({ challengeMatchId })
            useChallengeStore.getState().setChallengeMatchId(challengeMatchId)

            const hostSeed = Math.floor(Math.random() * 2147483647)
            const guestSeed = Math.floor(Math.random() * 2147483647)
            const startAt = Date.now() + 6000
            channel.sendMatchStart({ hostSeed, guestSeed, startAt, challengeMatchId })
            set({ mode: 'countdown', startAt, localSeed: hostSeed, remoteSeed: guestSeed })
          } catch (err) {
            set({ error: (err as Error).message })
          }
        }
        doStart()
      } else {
        const hostSeed = Math.floor(Math.random() * 2147483647)
        const guestSeed = Math.floor(Math.random() * 2147483647)
        const startAt = Date.now() + 6000
        channel.sendMatchStart({ hostSeed, guestSeed, startAt })
        set({ mode: 'countdown', startAt, localSeed: hostSeed, remoteSeed: guestSeed })
      }
    }
  },

  setPlaying: () => set({ mode: 'playing' }),

  setFinished: (result: 'win' | 'lose') => {
    set({ mode: 'finished', result })

    // Settle Challenge match (host settles, guest is fallback)
    const { isChallengeMatch, challengeMatchId, role, opponentChallengePlayerId } = get()
    if (isChallengeMatch && challengeMatchId) {
      const settle = async () => {
        try {

          const challengeState = useChallengeStore.getState()
          useChallengeStore.getState().setSettling(true)

          const winnerId = result === 'win'
            ? challengeState.playerId
            : opponentChallengePlayerId

          await callEdgeFunction('challenge-settle-match', {
            matchId: challengeMatchId,
            winnerId,
          })
          useChallengeStore.getState().setSettling(false)
        } catch (err) {
          console.error('Challenge settle error:', err)

          useChallengeStore.getState().setSettling(false)
          useChallengeStore.getState().setError((err as Error).message)
        }
      }

      if (role === 'host') {
        settle()
      } else {
        // Guest settles as fallback after a delay (give host time)
        setTimeout(settle, 5000)
      }
    }
  },

  setOpponentScore: (score: number) => set({ opponentScore: score }),

  setOpponentDisconnected: () => {
    const { mode } = get()
    if (mode === 'finished') return // already resolved
    set({ opponentDisconnected: true })
    // If playing and opponent disconnects, claim victory
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
      isChallengeMatch: false,
      challengeMatchId: null,
      opponentChallengePlayerId: null,
      opponentChallengeEmail: null,
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
      isChallengeMatch: false,
      challengeMatchId: null,
      opponentChallengePlayerId: null,
      opponentChallengeEmail: null,
    })
  },
}))
