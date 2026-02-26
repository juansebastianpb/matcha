import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createGameConfig } from './config'

interface PhaserGameProps {
  onRestart?: () => void
}

export function PhaserGame(_props: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const config = createGameConfig('phaser-container')
    gameRef.current = new Phaser.Game(config)

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div className="relative">
      <div
        id="phaser-container"
        ref={containerRef}
        className="rounded-xl overflow-hidden shadow-2xl"
      />
    </div>
  )
}
