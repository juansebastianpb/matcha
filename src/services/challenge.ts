// Challenge Widget + SDK integration wrapper

export interface ChallengeMatch {
  matchId: string
  opponentId: string
  entryFee: number
}

interface PostMatchHandlers {
  onRematchStarting?: (data: { matchId: string }) => void
  onNewOpponent?: () => void
}

let postMatchHandlers: PostMatchHandlers = {}

export function setPostMatchHandlers(handlers: PostMatchHandlers): void {
  postMatchHandlers = handlers
}

export function getPostMatchHandlers(): PostMatchHandlers {
  return postMatchHandlers
}

export function showWin(data: { matchId: string; opponent: { email: string }; profit: number }): void {
  console.log('Challenge showWin:', data)
  if (window.Challenge?.showWin) {
    window.Challenge.showWin(data)
  }
}

export function showLose(data: { matchId: string; opponent: { email: string }; loss: number }): void {
  console.log('Challenge showLose:', data)
  if (window.Challenge?.showLose) {
    window.Challenge.showLose(data)
  }
}

export function loadChallengeWidget(): Promise<void> {
  return new Promise((resolve) => {
    console.log('Challenge widget loading (placeholder)')
    resolve()
  })
}

export function openChallengeWidget(): void {
  console.log('Challenge widget open (placeholder)')
  if (window.Challenge?.open) {
    window.Challenge.open()
  }
}

export function submitScore(matchId: string, score: number): Promise<void> {
  console.log('Challenge score submit (placeholder):', matchId, score)
  return Promise.resolve()
}

// TypeScript declarations for Challenge widget on window
declare global {
  interface Window {
    Challenge?: {
      init?: (config: Record<string, unknown>) => void
      open?: () => void
      close?: () => void
      showWin?: (data: Record<string, unknown>) => void
      showLose?: (data: Record<string, unknown>) => void
    }
  }
}
