import { useChallengeStore } from '../stores/challengeStore'
import { useMatchStore } from '../stores/matchStore'

const CHALLENGE_GAME_ID = import.meta.env.VITE_CHALLENGE_GAME_ID || ''
const CHALLENGE_API_KEY = import.meta.env.VITE_CHALLENGE_API_KEY || ''
const CHALLENGE_API_BASE = 'https://challenge-backend-production-4835.up.railway.app'

export function initChallenge(): void {
  if (!CHALLENGE_GAME_ID) return

  // The widget script may still be initializing — poll until ready
  const tryInit = () => {
    if (!window.Challenge?.init) {
      setTimeout(tryInit, 100)
      return
    }
    doInit()
  }

  tryInit()
}

function doInit(): void {
  window.Challenge!.init({
    gameId: CHALLENGE_GAME_ID,
    apiKey: CHALLENGE_API_KEY,
    apiBase: CHALLENGE_API_BASE,
    entryFee: 2,
    useChallengeLobby: true,
    mode: 'versus',
    showButton: false,
    onReady: (player: ChallengePlayer) => {
      useChallengeStore.getState().setPlayerInfo(player.userId, player.email)
    },
    onClose: () => {
      // Widget overlay closed by user
    },
    onOpponentScore: ({ score }: { userId: string; score: number }) => {
      useMatchStore.getState().setOpponentScore(score)
    },
  })

}

export function setupPostMatchHandlers(handlers: {
  onRematchStarting: (data: { matchId: string; roundNumber: number; opponent: ChallengeOpponent }) => void
  onNewOpponent: () => void
}): void {
  if (!window.Challenge?.setPostMatchHandlers) return
  window.Challenge.setPostMatchHandlers(handlers)
}


export function openWidget(): void {
  window.Challenge?.open?.()
}

export function closeWidget(): void {
  window.Challenge?.close?.()
}

export async function isAuthenticated(): Promise<boolean> {
  return window.Challenge?.isAuthenticated?.() ?? false
}

export async function getBalance(): Promise<number | null> {
  return window.Challenge?.getBalance?.() ?? null
}

// TypeScript declarations for Challenge widget on window
interface ChallengePlayer {
  userId: string
  email: string
  token: string
  balance: number
  entryFee: number
}

interface ChallengeOpponent {
  email: string
  username?: string
}

interface ChallengeInitConfig {
  gameId: string
  apiKey?: string
  apiBase: string
  entryFee: number
  useChallengeLobby?: boolean
  mode?: 'versus' | 'score'
  showButton?: boolean
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  buttonText?: string
  onReady?: (player: ChallengePlayer) => void
  onClose?: () => void
  onOpponentScore?: (data: { userId: string; score: number }) => void
}

declare global {
  interface Window {
    Challenge?: {
      init: (config: ChallengeInitConfig) => void
      open: () => void
      close: () => void
      showButton: () => void
      hideButton: () => void
      renderButton: (selector: string, options?: Record<string, unknown>) => void
      showMatchFound: (data: { matchId: string; opponent: ChallengeOpponent; entryFee: number; onGameStart: () => void }) => void
      showWin: (data: { matchId: string; opponent: { email: string; username?: string }; profit: number }) => void
      showLose: (data: { matchId: string; opponent: { email: string; username?: string }; loss: number }) => void
      showDraw: (data: { matchId: string; opponent: { email: string; username?: string } }) => void
      gameEnded: (data: { matchId: string; score: number; opponent?: ChallengeOpponent; gameData?: Record<string, unknown> }) => void
      setPostMatchHandlers: (handlers: {
        onRematchStarting?: (data: { matchId: string; roundNumber: number; opponent: ChallengeOpponent }) => void
        onNewOpponent?: () => void
      }) => void
      updateScore: (score: number) => void
      isAuthenticated: () => Promise<boolean>
      getBalance: () => Promise<number>
      getUser: () => Promise<{ userId: string; email: string } | null>
      checkReadyStatus: () => Promise<{ ready: boolean; reason?: string }>
    }
  }
}
