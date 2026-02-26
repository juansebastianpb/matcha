import { useState, useEffect } from 'react'
import { getLeaderboard, type ScoreEntry } from '../services/scores'

export function useLeaderboard(period: 'all' | 'weekly' | 'daily' = 'all') {
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getLeaderboard(period)
      .then(setScores)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [period])

  return { scores, loading }
}
