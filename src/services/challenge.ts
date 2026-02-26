// Challenge Widget + SDK integration wrapper
// Will be fully implemented in Phase 8

export interface ChallengeMatch {
  matchId: string
  opponentId: string
  entryFee: number
}

export function loadChallengeWidget(): Promise<void> {
  return new Promise((resolve) => {
    console.log('Challenge widget loading (placeholder)')
    resolve()
  })
}

export function openChallengeWidget(): void {
  console.log('Challenge widget open (placeholder)')
}

export function submitScore(matchId: string, score: number): Promise<void> {
  console.log('Challenge score submit (placeholder):', matchId, score)
  return Promise.resolve()
}
