import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { createGameConfig } from './config'

interface PhaserGameProps {
  onRestart?: () => void
}

export function PhaserGame(_props: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const config = createGameConfig('phaser-container')
    const game = new Phaser.Game(config)
    gameRef.current = game

    // Wait for Phaser to finish its initial scale calculation
    game.events.once('ready', () => {
      requestAnimationFrame(() => setReady(true))
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div className="relative w-full h-full">
      <div
        id="phaser-container"
        ref={containerRef}
        className={`w-full h-full transition-opacity duration-150 ${ready ? 'opacity-100' : 'opacity-0'}`}
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}
