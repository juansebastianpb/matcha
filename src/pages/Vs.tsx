import { useState, useEffect, useRef, useCallback } from 'react'
import { VsPhaserGame } from '../game/VsPhaserGame'
import { VsScoreDisplay, MobileRivalScore, MobilePlayerScore } from '../components/game-ui/VsScoreDisplay'
import { CelebrationOverlay } from '../components/game-ui/CelebrationOverlay'
import { CountdownOverlay } from '../components/game-ui/CountdownOverlay'
import { HypeOverlay } from '../components/game-ui/HypeOverlay'
import { VsGameOverOverlay } from '../components/game-ui/VsGameOverOverlay'
import { SideDecorations } from '../components/game-ui/SideDecorations'
import { MuteToggle } from '../components/game-ui/MuteToggle'
import { stopMusic } from '../game/audio/SoundManager'
import { useGameStore } from '../stores/gameStore'
import { useMatchStore } from '../stores/matchStore'
import { VS_GAME_WIDTH, VS_GAME_HEIGHT, VS_MOBILE_GAME_WIDTH, VS_MOBILE_GAME_HEIGHT } from '../game/vs-constants'

const isMobile = window.innerWidth < 768

export function Vs() {
  // Clear stale state from any previous game immediately on mount
  const didReset = useRef(false)
  if (!didReset.current) {
    didReset.current = true
    useGameStore.getState().reset()
  }

  const [gameKey, setGameKey] = useState(0)
  const mode = useMatchStore((s) => s.mode)
  const rematchPending = useRef(false)

  const handleRematch = useCallback(() => {
    const { cpuDifficulty } = useMatchStore.getState()
    useMatchStore.getState().requestRematch()
    if (cpuDifficulty) {
      // CPU: restart in-place immediately
      useGameStore.getState().reset()
      setGameKey((k) => k + 1)
    } else {
      // Multiplayer: stay on page, overlay shows "Waiting..."
      // Game re-mounts when countdown starts (via useEffect below)
      rematchPending.current = true
    }
  }, [])

  // Re-mount VsPhaserGame when rematch countdown starts
  useEffect(() => {
    if (mode === 'countdown' && rematchPending.current) {
      rematchPending.current = false
      useGameStore.getState().reset()
      setGameKey((k) => k + 1)
    }
  }, [mode])
  const [canvasWidth, setCanvasWidth] = useState<number | null>(null)
  const gameContainerRef = useRef<HTMLDivElement>(null)

  const gameWidth = isMobile ? VS_MOBILE_GAME_WIDTH : VS_GAME_WIDTH
  const gameHeight = isMobile ? VS_MOBILE_GAME_HEIGHT : VS_GAME_HEIGHT

  // Observe game container size and compute the Phaser canvas width
  // using the same FIT logic Phaser uses: scale = min(W/gameW, H/gameH)
  useEffect(() => {
    const el = gameContainerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        const scale = Math.min(width / gameWidth, height / gameHeight)
        setCanvasWidth(Math.round(gameWidth * scale))
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [gameWidth, gameHeight])

  // Stop music on unmount
  useEffect(() => {
    return () => stopMusic()
  }, [])

  if (isMobile) {
    return (
      <div className="h-full relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <SideDecorations />
        </div>

        {/* Mute toggle — upper right */}
        <div className="absolute top-2 right-3 z-20">
          <MuteToggle />
        </div>

        {/* Celebration effects */}
        <CelebrationOverlay />

        {/* Main content — minimal side padding on mobile */}
        <div className="h-full flex flex-col items-center px-1 py-1 relative z-10">
          <div className="flex-1 min-h-0 w-full flex flex-col items-center gap-1.5 overflow-visible">
            {/* Rival score above canvas */}
            <div
              className="shrink-0"
              style={{
                width: canvasWidth ? `${canvasWidth}px` : '100%',
                visibility: canvasWidth ? 'visible' : 'hidden',
              }}
            >
              <MobileRivalScore />
            </div>

            {/* Game canvas */}
            <div ref={gameContainerRef} className="relative flex-1 min-h-0 w-full overflow-visible">
              <VsPhaserGame key={gameKey} mobile />

              {/* Overlays */}
              <div
                className="absolute inset-y-0 z-30 pointer-events-none"
                style={{
                  width: canvasWidth ? `${canvasWidth}px` : '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="relative w-full h-full">
                  <CountdownOverlay />
                  <HypeOverlay />
                  <VsGameOverOverlay onRematch={handleRematch} />
                </div>
              </div>
            </div>

            {/* Player score below canvas */}
            <div
              className="shrink-0"
              style={{
                width: canvasWidth ? `${canvasWidth}px` : '100%',
                visibility: canvasWidth ? 'visible' : 'hidden',
              }}
            >
              <MobilePlayerScore />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <SideDecorations />
      </div>

      {/* Mute toggle — upper right */}
      <div className="absolute top-2 right-3 z-20">
        <MuteToggle />
      </div>

      {/* Celebration effects */}
      <CelebrationOverlay />

      {/* Main content */}
      <div className="h-full flex flex-col items-center px-4 py-1 relative z-10">
        {/* Shared container — score bar + game use the same width context */}
        <div className="flex-1 min-h-0 w-full max-w-4xl flex flex-col items-center gap-1 overflow-visible">
          {/* Score bar */}
          <div
            className="shrink-0"
            style={{
              width: canvasWidth ? `${canvasWidth}px` : '100%',
              visibility: canvasWidth ? 'visible' : 'hidden',
            }}
          >
            <VsScoreDisplay />
          </div>

          {/* Game container — Phaser canvas is centered inside */}
          <div ref={gameContainerRef} className="relative flex-1 min-h-0 w-full overflow-visible">
            <VsPhaserGame key={gameKey} />

            {/* Overlays — constrained to canvas width so they don't bleed outside the boards */}
            <div
              className="absolute inset-y-0 z-30 pointer-events-none"
              style={{
                width: canvasWidth ? `${canvasWidth}px` : '100%',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <div className="relative w-full h-full">
                <CountdownOverlay />
                <HypeOverlay />
                <VsGameOverOverlay onRematch={handleRematch} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
