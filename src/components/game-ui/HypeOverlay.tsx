import { useEffect, useRef, useState } from 'react'
import { useGameStore, type HypeEvent } from '../../stores/gameStore'

interface HypeItem extends HypeEvent {
  startTime: number
}

const HYPE_DURATION = 1200 // total animation ms
const STARTUP_SUPPRESS_MS = 2000

export function HypeOverlay() {
  const [items, setItems] = useState<HypeItem[]>([])
  const hypeEvent = useGameStore((s) => s.hypeEvent)
  const isPlaying = useGameStore((s) => s.isPlaying)
  const gameStartTime = useRef(Date.now())

  // Clear all items when a new game starts
  useEffect(() => {
    if (isPlaying) {
      gameStartTime.current = Date.now()
      setItems([])
    }
  }, [isPlaying])

  useEffect(() => {
    if (!hypeEvent) return
    // Suppress hype during startup
    if (Date.now() - gameStartTime.current < STARTUP_SUPPRESS_MS) return
    const item: HypeItem = { ...hypeEvent, startTime: Date.now() }
    setItems((prev) => [...prev, item])

    const timer = setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    }, HYPE_DURATION)

    return () => clearTimeout(timer)
  }, [hypeEvent])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-30">
      {items.map((item) => (
        <HypeText key={item.id} item={item} />
      ))}
    </div>
  )
}

function HypeText({ item }: { item: HypeItem }) {
  const [phase, setPhase] = useState<'enter' | 'float'>('enter')

  useEffect(() => {
    const timer = setTimeout(() => setPhase('float'), 200)
    return () => clearTimeout(timer)
  }, [])

  const isGold = item.color === '#FFD700'

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ overflow: 'visible' }}
    >
      <div
        className={`hype-text ${phase === 'enter' ? 'hype-enter' : 'hype-float'}`}
        style={{
          fontSize: `${item.fontSize}px`,
          color: item.color,
          textShadow: `
            0 0 20px ${isGold ? '#FFD700' : 'rgba(255,255,255,0.6)'},
            0 0 40px ${isGold ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.3)'},
            3px 3px 0 #000,
            -1px -1px 0 #000,
            1px -1px 0 #000,
            -1px 1px 0 #000
          `,
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontWeight: 900,
          whiteSpace: 'nowrap',
          WebkitTextStroke: '2px rgba(0,0,0,0.3)',
        }}
      >
        {item.text}
      </div>
    </div>
  )
}
