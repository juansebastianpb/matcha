import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createVsGameConfig, createVsMobileGameConfig } from './config'
import { useMatchStore } from '../stores/matchStore'
import type { VsGameScene } from './scenes/VsGameScene'

export function VsPhaserGame({ mobile = false }: { mobile?: boolean }) {
  const gameRef = useRef<Phaser.Game | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const config = mobile
      ? createVsMobileGameConfig('vs-phaser-container')
      : createVsGameConfig('vs-phaser-container')
    const game = new Phaser.Game(config)
    game.registry.set('mobile', mobile)
    gameRef.current = game

    // Wire up network events once the scene is active
    const wireOnReady = () => {
      const scene = game.scene.getScene('VsGameScene') as VsGameScene | null
      if (scene && scene.scene.isActive()) {
        wireNetworkToScene(scene)
      } else {
        game.events.on('step', function checkScene() {
          const s = game.scene.getScene('VsGameScene') as VsGameScene | null
          if (s && s.scene.isActive()) {
            wireNetworkToScene(s)
            game.events.off('step', checkScene)
          }
        })
      }
    }

    game.events.once('ready', wireOnReady)

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [mobile])

  return (
    <div className="relative w-full h-full">
      <div
        id="vs-phaser-container"
        ref={containerRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}

function wireNetworkToScene(scene: VsGameScene): void {
  const channel = useMatchStore.getState().channel
  if (!channel) return

  channel.onOpponentEvent((event) => {
    scene.applyOpponentEvent(event)
  })

  channel.onOpponentGarbage((slab) => {
    scene.applyIncomingGarbage(slab)
  })

  channel.onOpponentGameOver(() => {
    scene.applyOpponentGameOver()
  })

  channel.onOpponentDisconnect(() => {
    useMatchStore.getState().setOpponentDisconnected()
  })
}
