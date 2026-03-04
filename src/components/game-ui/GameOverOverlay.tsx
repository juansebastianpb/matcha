import { useEffect, useRef, useState, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { Button } from '../ui/Button'
import { CharacterFace } from '../CharacterFace'
import { CHARACTERS } from '../../characters'

interface GameOverOverlayProps {
  onPlayAgain: () => void
}

export function GameOverOverlay({ onPlayAgain }: GameOverOverlayProps) {
  const isGameOver = useGameStore((s) => s.isGameOver)
  const finalScore = useGameStore((s) => s.finalScore)
  const blocksCleared = useGameStore((s) => s.blocksCleared)
  const maxChain = useGameStore((s) => s.maxChain)
  const maxCombo = useGameStore((s) => s.maxCombo)

  // Score count-up animation
  const [displayScore, setDisplayScore] = useState(0)
  const rafRef = useRef<number>(0)

  // Pick 2 random characters once per game-over
  const [charA, charB] = useMemo(() => {
    const shuffled = [...CHARACTERS].sort(() => Math.random() - 0.5)
    return [shuffled[0], shuffled[1]]
  }, [isGameOver]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isGameOver) {
      setDisplayScore(0)
      return
    }
    const start = performance.now()
    const duration = 1000
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out: fast start, slows at end
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * finalScore))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isGameOver, finalScore])

  if (!isGameOver) return null

  // Personal best check
  const bestScore = parseInt(localStorage.getItem('matcha_best_score') || '0', 10)
  const isNewBest = finalScore > bestScore
  if (isNewBest) {
    localStorage.setItem('matcha_best_score', finalScore.toString())
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl z-20">
      <div className="text-center p-4 sm:p-6 gameover-slide-up">
        {/* Title with flanking character faces */}
        <div className="flex items-center justify-center gap-3 mb-1">
          <div className="gameover-face-left">
            <div className="gameover-face-spin">
              <CharacterFace character={charA} expression="dead" size={52} />
            </div>
          </div>
          <h2
            className="text-4xl font-black bg-gradient-to-r from-pink-300 via-amber-200 to-yellow-200 bg-clip-text text-transparent"
            style={{ textShadow: '0 0 20px rgba(253,121,168,0.5), 0 0 40px rgba(253,121,168,0.25)' }}
          >
            Game Over!
          </h2>
          <div className="gameover-face-right">
            <div className="gameover-face-spin">
              <CharacterFace character={charB} expression="dead" size={52} />
            </div>
          </div>
        </div>

        {isNewBest && (
          <div
            className="text-yellow-300 font-bold text-sm mb-3 animate-pulse"
            style={{ textShadow: '0 0 12px #FFD700' }}
          >
            New Personal Best!
          </div>
        )}

        <div className="bg-white/8 border border-white/10 rounded-xl p-4 mb-4 space-y-2">
          <div className="text-4xl font-black bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
            {displayScore.toLocaleString()}
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm mt-3">
            <div className="gameover-stat-pop" style={{ animationDelay: '0ms' }}>
              <div className="text-white/40">Cleared</div>
              <div className="font-bold text-white">{blocksCleared}</div>
            </div>
            <div className="gameover-stat-pop" style={{ animationDelay: '100ms' }}>
              <div className="text-white/40">Best Chain</div>
              <div className="font-bold text-yellow-300">{maxChain}x</div>
            </div>
            <div className="gameover-stat-pop" style={{ animationDelay: '200ms' }}>
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
