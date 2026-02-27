import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'

export function ScoreDisplay() {
  const displayScore = useGameStore((s) => s.displayScore)
  const [pulsing, setPulsing] = useState(false)
  const prevScore = useRef(displayScore)

  useEffect(() => {
    if (displayScore !== prevScore.current) {
      prevScore.current = displayScore
      setPulsing(true)
      const id = setTimeout(() => setPulsing(false), 200)
      return () => clearTimeout(id)
    }
  }, [displayScore])

  return (
    <div className="text-center">
      <div className="text-xs text-white/50 uppercase tracking-wider font-medium">Score</div>
      <div
        className="text-3xl font-bold tabular-nums bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent transition-transform duration-200 ease-out"
        style={{ transform: pulsing ? 'scale(1.15)' : 'scale(1)' }}
      >
        {displayScore.toLocaleString()}
      </div>
    </div>
  )
}
