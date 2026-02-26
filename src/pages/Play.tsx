import { useState, useCallback } from 'react'
import { PhaserGame } from '../game/PhaserGame'
import { ScoreDisplay } from '../components/game-ui/ScoreDisplay'
import { TimerDisplay } from '../components/game-ui/TimerDisplay'
import { ChainIndicator } from '../components/game-ui/ChainIndicator'
import { GameOverOverlay } from '../components/game-ui/GameOverOverlay'
import { useGameStore } from '../stores/gameStore'

export function Play() {
  const [gameKey, setGameKey] = useState(0)
  const isPlaying = useGameStore((s) => s.isPlaying)

  const handlePlayAgain = useCallback(() => {
    useGameStore.getState().reset()
    setGameKey((k) => k + 1)
  }, [])

  return (
    <div className="py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Score + Timer bar */}
        <div className="flex justify-between items-start mb-4 px-2">
          <ScoreDisplay />
          <TimerDisplay />
        </div>

        {/* Game container */}
        <div className="relative">
          <PhaserGame key={gameKey} onRestart={handlePlayAgain} />
          <ChainIndicator />
          <GameOverOverlay onPlayAgain={handlePlayAgain} />
        </div>

        {/* Controls hint */}
        {isPlaying && (
          <div className="text-center mt-4 text-white/30 text-sm">
            Tap a block to select, then tap an adjacent block to swap
          </div>
        )}
      </div>
    </div>
  )
}
