import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../stores/gameStore'
import { useMatchStore } from '../../stores/matchStore'
import { CPU_RIVALS } from '../../lib/cpuRivals'
import { Button } from '../ui/Button'
import { CharacterFace } from '../CharacterFace'
import { CHARACTERS } from '../../characters'

export function VsGameOverOverlay({ onRematch }: { onRematch?: () => void }) {
  const isGameOver = useGameStore((s) => s.isGameOver)
  const finalScore = useGameStore((s) => s.finalScore)
  const blocksCleared = useGameStore((s) => s.blocksCleared)
  const maxChain = useGameStore((s) => s.maxChain)
  const maxCombo = useGameStore((s) => s.maxCombo)
  const result = useMatchStore((s) => s.result)
  const opponentScore = useMatchStore((s) => s.opponentScore)
  const opponentDisconnected = useMatchStore((s) => s.opponentDisconnected)
  const cpuDifficulty = useMatchStore((s) => s.cpuDifficulty)
  const navigate = useNavigate()

  // Score count-up
  const [displayScore, setDisplayScore] = useState(0)
  const rafRef = useRef<number>(0)

  // Double-click guard
  const [actionTaken, setActionTaken] = useState(false)

  // Random characters
  const [charA, charB] = useMemo(() => {
    const shuffled = [...CHARACTERS].sort(() => Math.random() - 0.5)
    return [shuffled[0], shuffled[1]]
  }, [isGameOver]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isGameOver) { setDisplayScore(0); setActionTaken(false); return }
    const start = performance.now()
    const duration = 1000
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * finalScore))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isGameOver, finalScore])

  const handleRematch = useCallback(() => {
    if (actionTaken) return
    setActionTaken(true)
    if (onRematch) {
      onRematch()
    } else {
      useGameStore.getState().reset()
      useMatchStore.getState().requestRematch()
      navigate('/lobby')
    }
  }, [actionTaken, onRematch, navigate])

  const handleMenu = useCallback(() => {
    if (actionTaken) return
    setActionTaken(true)
    useMatchStore.getState().cleanup()
    navigate('/')
  }, [actionTaken, navigate])

  // Show overlay when game is over AND match result is determined
  if (!(isGameOver || result)) return null
  if (!result) return null

  const isWin = result === 'win'

  const rival = cpuDifficulty ? CPU_RIVALS[cpuDifficulty] : null

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl z-20 pointer-events-auto">
      <div className="text-center p-6 gameover-slide-up max-w-md w-full">
        {/* Title with flanking faces */}
        <div className="flex items-center justify-center gap-3 mb-1">
          <div className="gameover-face-left">
            <div className="gameover-face-spin">
              <CharacterFace character={charA} expression={isWin ? 'excited' : 'dead'} size={52} />
            </div>
          </div>
          <h2
            className={`text-4xl font-black bg-gradient-to-r ${
              isWin
                ? 'from-yellow-300 via-amber-200 to-pink-300'
                : 'from-gray-400 to-gray-500'
            } bg-clip-text text-transparent`}
            style={{
              textShadow: isWin
                ? '0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.25)'
                : '0 0 20px rgba(150,150,150,0.3)',
            }}
          >
            {isWin ? 'Victory!' : 'Defeat'}
          </h2>
          <div className="gameover-face-right">
            <div className="gameover-face-spin">
              <CharacterFace character={charB} expression={isWin ? 'excited' : 'dead'} size={52} />
            </div>
          </div>
        </div>

        {rival && (
          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
            vs {rival.name}
          </div>
        )}

        {opponentDisconnected && (
          <div className="text-white/50 text-sm mb-2">
            {rival?.name ?? 'Opponent'} disconnected
          </div>
        )}

        {/* Score comparison */}
        <div className="bg-white/8 border border-white/10 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-center gap-6 mb-2">
            <div className="text-center">
              <div className="text-xs text-white/40 uppercase">You</div>
              <div className="text-3xl font-black bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                {displayScore.toLocaleString()}
              </div>
            </div>
            <div className="text-white/20 font-black text-sm">vs</div>
            <div className="text-center">
              <div className="text-xs text-white/40 uppercase">{rival?.name ?? 'Opponent'}</div>
              <div className="text-3xl font-black bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                {opponentScore.toLocaleString()}
              </div>
            </div>
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
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button onClick={handleRematch} variant="primary" size="lg">
            Rematch
          </Button>
          <Button onClick={handleMenu} variant="ghost" size="lg">
            Back to Menu
          </Button>
        </div>
      </div>
    </div>
  )
}
