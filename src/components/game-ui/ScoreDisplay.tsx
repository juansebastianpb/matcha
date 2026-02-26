import { useGameStore } from '../../stores/gameStore'

export function ScoreDisplay() {
  const score = useGameStore((s) => s.score)

  return (
    <div className="text-center">
      <div className="text-xs text-white/50 uppercase tracking-wider font-medium">Score</div>
      <div className="text-3xl font-bold tabular-nums bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
        {score.toLocaleString()}
      </div>
    </div>
  )
}
