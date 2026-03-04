import { useState, useCallback, useEffect } from 'react'
import { PhaserGame } from '../game/PhaserGame'
import { ScoreDisplay } from '../components/game-ui/ScoreDisplay'
import { stopMusic } from '../game/audio/SoundManager'

import { CelebrationOverlay } from '../components/game-ui/CelebrationOverlay'
import { ChainIndicator } from '../components/game-ui/ChainIndicator'
import { GameOverOverlay } from '../components/game-ui/GameOverOverlay'
import { CountdownOverlay } from '../components/game-ui/CountdownOverlay'
import { HypeOverlay } from '../components/game-ui/HypeOverlay'
import { SideDecorations } from '../components/game-ui/SideDecorations'
import { MuteToggle } from '../components/game-ui/MuteToggle'
import { useGameStore } from '../stores/gameStore'

export function Play() {
  const [gameKey, setGameKey] = useState(0)
  const isPlaying = useGameStore((s) => s.isPlaying)

  // Stop music immediately when leaving the page (browser back, route change, etc.)
  useEffect(() => {
    return () => stopMusic()
  }, [])

  const handlePlayAgain = useCallback(() => {
    useGameStore.getState().reset()
    setGameKey((k) => k + 1)
  }, [])

  return (
    <div className="h-full relative overflow-hidden">
      {/* Side face decorations — full viewport layer behind game */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <SideDecorations />
      </div>

      {/* Full-screen celebration effects */}
      <CelebrationOverlay />

      {/* Main game content */}
      <div className="h-full flex flex-col items-center px-4 py-2 relative z-10">
        {/* Score bar + mute toggle */}
        <div className="flex items-center w-full max-w-2xl px-2 shrink-0">
          <div className="w-8" />
          <div className="flex-1 flex justify-center">
            <ScoreDisplay />
          </div>
          <MuteToggle />
        </div>

        {/* Game container — fills remaining height */}
        <div className="relative flex-1 min-h-0 w-full max-w-2xl mt-1 overflow-visible">
          <PhaserGame key={gameKey} onRestart={handlePlayAgain} />
          <ChainIndicator />
          <CountdownOverlay />
          <HypeOverlay />
          <GameOverOverlay onPlayAgain={handlePlayAgain} />
        </div>

        {/* Controls hint */}
        {isPlaying && (
          <div className="text-center py-1 text-white/30 text-xs shrink-0">
            Tap to move cursor, tap cursor to swap
          </div>
        )}
      </div>
    </div>
  )
}
