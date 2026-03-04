import { create } from 'zustand'

interface ChallengeState {
  playerId: string | null
  playerEmail: string | null
  entryFee: number
  challengeMatchId: string | null
  isSettling: boolean
  isAuthenticated: boolean
  balance: number | null
  error: string | null

  setPlayerInfo: (playerId: string, playerEmail: string) => void
  setChallengeMatchId: (id: string) => void
  setSettling: (settling: boolean) => void
  setError: (error: string) => void
  reset: () => void
}

export const useChallengeStore = create<ChallengeState>((set) => ({
  playerId: null,
  playerEmail: null,
  entryFee: 2.00,
  challengeMatchId: null,
  isSettling: false,
  isAuthenticated: false,
  balance: null,
  error: null,

  setPlayerInfo: (playerId, playerEmail) =>
    set({ playerId, playerEmail, isAuthenticated: true }),

  setChallengeMatchId: (id) =>
    set({ challengeMatchId: id }),

  setSettling: (settling) =>
    set({ isSettling: settling }),

  setError: (error) =>
    set({ error }),

  reset: () =>
    set({
      playerId: null,
      playerEmail: null,
      entryFee: 2.00,
      challengeMatchId: null,
      isSettling: false,
      isAuthenticated: false,
      balance: null,
      error: null,
    }),
}))
