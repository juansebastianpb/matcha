import { useGameStore } from '../../stores/gameStore'
import { Button } from '../ui/Button'

interface GameOverOverlayProps {
  onPlayAgain: () => void
}

export function GameOverOverlay({ onPlayAgain }: GameOverOverlayProps) {
  const isGameOver = useGameStore((s) => s.isGameOver)
  const finalScore = useGameStore((s) => s.finalScore)
  const blocksCleared = useGameStore((s) => s.blocksCleared)
  const maxChain = useGameStore((s) => s.maxChain)
  const maxCombo = useGameStore((s) => s.maxCombo)

  if (!isGameOver) return null

  // Personal best check
  const bestScore = parseInt(localStorage.getItem('matcha_best_score') || '0', 10)
  const isNewBest = finalScore > bestScore
  if (isNewBest) {
    localStorage.setItem('matcha_best_score', finalScore.toString())
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl z-20">
      <div className="text-center p-6">
        <h2 className="text-3xl font-black text-white mb-1">Time's Up!</h2>
        {isNewBest && (
          <div className="text-yellow-300 font-bold text-sm mb-3 animate-pulse">
            New Personal Best!
          </div>
        )}

        <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-2">
          <div className="text-4xl font-black bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
            {finalScore.toLocaleString()}
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm mt-3">
            <div>
              <div className="text-white/40">Cleared</div>
              <div className="font-bold text-white">{blocksCleared}</div>
            </div>
            <div>
              <div className="text-white/40">Best Chain</div>
              <div className="font-bold text-yellow-300">{maxChain}x</div>
            </div>
            <div>
              <div className="text-white/40">Best Combo</div>
              <div className="font-bold text-pink-300">{maxCombo}x</div>
            </div>
          </div>

          {bestScore > 0 && !isNewBest && (
            <div className="text-white/40 text-xs mt-2">
              Personal Best: {bestScore.toLocaleString()}
            </div>
          )}
        </div>

        <Button onClick={onPlayAgain} variant="primary" size="lg">
          Play Again
        </Button>
      </div>
    </div>
  )
}
