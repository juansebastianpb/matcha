import { useEffect, useRef, useState } from 'react'
import { useGameStore, type CelebrationEvent } from '../../stores/gameStore'

const COLORS = [
  '#FFD700', '#FF6B6B', '#74b9ff', '#55efc4', '#fd79a8',
  '#ffeaa7', '#dda0dd', '#ff9ff3', '#48dbfb', '#ff6348',
  '#7bed9f', '#eccc68', '#ff7979', '#badc58', '#f8a5c2',
]

type PieceShape = 'rect' | 'square' | 'circle' | 'ribbon'

interface ConfettiPiece {
  id: number
  x: number
  y: number
  color: string
  size: number
  angle: number
  tx: number
  ty: number
  spin: number
  duration: number
  delay: number
  shape: PieceShape
}

const SHAPES: PieceShape[] = ['rect', 'square', 'circle', 'ribbon']

function randomShape(): PieceShape {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)]
}

function shapeStyle(shape: PieceShape, size: number) {
  switch (shape) {
    case 'square':
      return { width: size, height: size, borderRadius: '2px' }
    case 'circle':
      return { width: size, height: size, borderRadius: '50%' }
    case 'ribbon':
      return { width: size * 0.5, height: size * 2.5, borderRadius: '1px' }
    case 'rect':
    default:
      return { width: size, height: size * 1.6, borderRadius: '1px' }
  }
}

let nextId = 0

function generatePieces(event: CelebrationEvent): ConfettiPiece[] {
  const { intensity } = event
  const W = window.innerWidth
  const H = window.innerHeight
  const pieces: ConfettiPiece[] = []

  // --- 1. Top rain: confetti falls from across the full width ---
  const rainCount = 12 + intensity * 10
  for (let i = 0; i < rainCount; i++) {
    pieces.push({
      id: nextId++,
      x: Math.random() * W,
      y: -15 - Math.random() * 40,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 7,
      angle: Math.random() * 360,
      tx: (Math.random() - 0.5) * 300,
      ty: H * 0.5 + Math.random() * H * 0.4,
      spin: (Math.random() - 0.5) * 900,
      duration: 2000 + Math.random() * 1500,
      delay: Math.random() * 400,
      shape: randomShape(),
    })
  }

  // --- 2. Corner cannons: shoot up from bottom-left and bottom-right ---
  const cannonCount = 8 + intensity * 6
  for (let i = 0; i < cannonCount; i++) {
    const fromLeft = i % 2 === 0
    const sx = fromLeft ? W * 0.05 + Math.random() * 40 : W * 0.95 - Math.random() * 40
    const dir = fromLeft ? 1 : -1
    pieces.push({
      id: nextId++,
      x: sx,
      y: H + 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 7 + Math.random() * 8,
      angle: Math.random() * 360,
      tx: dir * (80 + Math.random() * W * 0.35),
      ty: -(H * 0.35 + Math.random() * H * 0.4),
      spin: dir * (300 + Math.random() * 700),
      duration: 1800 + Math.random() * 1200,
      delay: Math.random() * 250,
      shape: randomShape(),
    })
  }

  // --- 3. Side sweeps (intensity 2+): enter from edges ---
  if (intensity >= 2) {
    const sweepCount = 6 + intensity * 5
    for (let i = 0; i < sweepCount; i++) {
      const fromLeft = i % 2 === 0
      const sx = fromLeft ? -10 : W + 10
      const dir = fromLeft ? 1 : -1
      pieces.push({
        id: nextId++,
        x: sx,
        y: H * 0.15 + Math.random() * H * 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        angle: Math.random() * 360,
        tx: dir * (150 + Math.random() * 350),
        ty: 60 + Math.random() * 200,
        spin: dir * (200 + Math.random() * 600),
        duration: 1600 + Math.random() * 1400,
        delay: Math.random() * 300,
        shape: randomShape(),
      })
    }
  }

  // --- 4. Extra top blizzard (intensity 3+) ---
  if (intensity >= 3) {
    const blizzardCount = intensity * 12
    for (let i = 0; i < blizzardCount; i++) {
      pieces.push({
        id: nextId++,
        x: Math.random() * W,
        y: -20 - Math.random() * 80,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 5 + Math.random() * 8,
        angle: Math.random() * 360,
        tx: (Math.random() - 0.5) * 400,
        ty: H * 0.6 + Math.random() * H * 0.4,
        spin: (Math.random() - 0.5) * 1080,
        duration: 2200 + Math.random() * 2000,
        delay: Math.random() * 600,
        shape: randomShape(),
      })
    }
  }

  // --- 5. Mega corner explosions (intensity 4+) ---
  if (intensity >= 4) {
    const megaCount = intensity * 8
    for (let i = 0; i < megaCount; i++) {
      const corner = i % 4
      const sx = corner < 2 ? W * 0.02 : W * 0.98
      const sy = corner % 2 === 0 ? H + 5 : -5
      const dirX = corner < 2 ? 1 : -1
      const dirY = corner % 2 === 0 ? -1 : 1
      pieces.push({
        id: nextId++,
        x: sx,
        y: sy,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 8 + Math.random() * 10,
        angle: Math.random() * 360,
        tx: dirX * (100 + Math.random() * W * 0.4),
        ty: dirY * (100 + Math.random() * H * 0.4),
        spin: (Math.random() - 0.5) * 1200,
        duration: 2000 + Math.random() * 1500,
        delay: Math.random() * 400,
        shape: randomShape(),
      })
    }
  }

  return pieces
}

export function CelebrationOverlay() {
  const [batches, setBatches] = useState<{ pieces: ConfettiPiece[]; batchId: number }[]>([])
  const celebrationEvent = useGameStore((s) => s.celebrationEvent)
  const mountTime = useRef(Date.now())
  const isPlaying = useGameStore((s) => s.isPlaying)

  // Reset mount clock when a new game starts
  useEffect(() => {
    if (isPlaying) {
      mountTime.current = Date.now()
      setBatches([])
    }
  }, [isPlaying])

  useEffect(() => {
    if (!celebrationEvent) return
    // Suppress celebrations during the first 2 seconds of a game
    if (Date.now() - mountTime.current < 2000) return
    const pieces = generatePieces(celebrationEvent)
    const batchId = celebrationEvent.id

    setBatches((prev) => [...prev, { pieces, batchId }])

    // Clean up after the longest piece finishes
    const maxLife = pieces.reduce((m, p) => Math.max(m, p.duration + p.delay), 0)
    const timer = setTimeout(() => {
      setBatches((prev) => prev.filter((b) => b.batchId !== batchId))
    }, maxLife + 100)

    return () => clearTimeout(timer)
  }, [celebrationEvent])

  if (batches.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {batches.map((batch) =>
        batch.pieces.map((p) => (
          <div
            key={p.id}
            className="confetti-piece"
            style={{
              left: p.x,
              top: p.y,
              ...shapeStyle(p.shape, p.size),
              backgroundColor: p.color,
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              '--spin': `${p.spin}deg`,
              '--r0': `${p.angle}deg`,
              animationDuration: `${p.duration}ms`,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties}
          />
        ))
      )}
    </div>
  )
}
