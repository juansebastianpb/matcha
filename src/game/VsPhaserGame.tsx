import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createVsGameConfig, createVsMobileGameConfig } from './config'
import { useMatchStore } from '../stores/matchStore'
import type { VsGameScene } from './scenes/VsGameScene'

export function VsPhaserGame({ mobile = false }: { mobile?: boolean }) {
  const gameRef = useRef<Phaser.Game | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        wireNetworkToScene(scene, pollingRef, timeoutRef)
      } else {
        game.events.on('step', function checkScene() {
          const s = game.scene.getScene('VsGameScene') as VsGameScene | null
          if (s && s.scene.isActive()) {
            wireNetworkToScene(s, pollingRef, timeoutRef)
            game.events.off('step', checkScene)
          }
        })
      }
    }

    game.events.once('ready', wireOnReady)

    return () => {
      // Clear any active polling/timeout before destroying
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
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

function wireNetworkToScene(
  scene: VsGameScene,
  pollingRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
): void {
  const wire = () => {
    const { channel, mode } = useMatchStore.getState()
    console.log('[Matcha] wireNetworkToScene', { hasChannel: !!channel, mode })
    if (!channel) return false

    channel.onOpponentEvent((event) => {
      if (!scene.scene.isActive()) return
      scene.applyOpponentEvent(event)
    })

    channel.onOpponentGarbage((slab) => {
      if (!scene.scene.isActive()) return
      scene.applyIncomingGarbage(slab)
    })

    channel.onOpponentGameOver(() => {
      if (!scene.scene.isActive()) return
      scene.applyOpponentGameOver()
    })

    channel.onOpponentDisconnect(() => {
      useMatchStore.getState().setOpponentDisconnected()
    })
    return true
  }

  // Try immediately; if channel isn't ready yet, poll until it is
  if (wire()) return
  console.log('[Matcha] Channel not ready, polling...')
  pollingRef.current = setInterval(() => {
    if (wire()) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      pollingRef.current = null
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, 100)
  // Stop polling after 10s
  timeoutRef.current = setTimeout(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = null
    timeoutRef.current = null
  }, 10000)
}
