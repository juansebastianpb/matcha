import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'

const CANVAS_SCALE = Math.max(2, Math.ceil(window.devicePixelRatio || 1))

// ─── Colors matching TILE_PALETTES ────────────────────────────
const FACE_COLORS = [
  { bg: '#FFEAA7', border: '#f0d48a' },
  { bg: '#74B9FF', border: '#5a9fd4' },
  { bg: '#FD79A8', border: '#d4608a' },
  { bg: '#55EFC4', border: '#40c9a2' },
  { bg: '#DDA0DD', border: '#bb80bb' },
  { bg: '#F5F0E8', border: '#ddd8d0' },
]

// ─── Seeded random for deterministic layout ──────────────────
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ─── Generate a dense grid of face specs covering full background ──
interface FaceItem {
  x: number       // % from left
  y: number       // % from top
  type: number    // 0-5 face type
  size: number    // px
  baseOpacity: number
  floatDelay: number
  floatDuration: number
  rotation: number // slight tilt degrees
}

function generateFaceGrid(): FaceItem[] {
  const rand = seededRandom(42)
  const items: FaceItem[] = []

  // Dense grid: ~7 columns × ~8 rows = 56 faces covering the whole background
  const cols = 7
  const rows = 8
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Skip the center columns (where the game is) — roughly cols 2,3,4
      // But keep some with extra low opacity for depth behind game
      const isCenterCol = c >= 2 && c <= 4
      if (isCenterCol && rand() > 0.3) continue // skip most center faces

      const baseX = (c / (cols - 1)) * 100
      const baseY = (r / (rows - 1)) * 100
      // Jitter position so it doesn't look like a grid
      const x = baseX + (rand() - 0.5) * 12
      const y = baseY + (rand() - 0.5) * 10

      const size = isCenterCol
        ? 16 + rand() * 12   // tiny behind game
        : 20 + rand() * 32   // 20-52px in margins

      const baseOpacity = isCenterCol
        ? 0.04 + rand() * 0.06  // very faint behind game
        : 0.08 + rand() * 0.18  // dim in margins (0.08–0.26)

      items.push({
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
        type: Math.floor(rand() * 6),
        size,
        baseOpacity,
        floatDelay: rand() * 5,
        floatDuration: 3 + rand() * 4,
        rotation: (rand() - 0.5) * 20,
      })
    }
  }
  return items
}

// ─── Bokeh / light orb specs — dense coverage ────────────────
interface BokehItem {
  x: number
  y: number
  size: number
  color: string
  baseOpacity: number
  floatDelay: number
  floatDuration: number
}

function generateBokeh(): BokehItem[] {
  const rand = seededRandom(99)
  const items: BokehItem[] = []
  const count = 20

  for (let i = 0; i < count; i++) {
    items.push({
      x: rand() * 100,
      y: rand() * 100,
      size: 30 + rand() * 80,
      color: FACE_COLORS[Math.floor(rand() * 6)].bg,
      baseOpacity: 0.03 + rand() * 0.05,
      floatDelay: rand() * 8,
      floatDuration: 6 + rand() * 6,
    })
  }
  return items
}

// ─── Tiny ambient stars ──────────────────────────────────────
interface StarItem {
  x: number
  y: number
  size: number
  delay: number
  duration: number
}

function generateStars(): StarItem[] {
  const rand = seededRandom(77)
  const items: StarItem[] = []
  const count = 25

  for (let i = 0; i < count; i++) {
    items.push({
      x: rand() * 100,
      y: rand() * 100,
      size: 1.5 + rand() * 2.5,
      delay: rand() * 5,
      duration: 1.8 + rand() * 2.5,
    })
  }
  return items
}

// ─── Canvas face drawing ─────────────────────────────────────

function drawFace(ctx: CanvasRenderingContext2D, size: number, typeIndex: number) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 2
  const color = FACE_COLORS[typeIndex]

  ctx.clearRect(0, 0, size, size)

  // Shadow
  ctx.globalAlpha = 0.12
  ctx.fillStyle = '#000'
  ctx.beginPath(); ctx.arc(cx + 1, cy + 2, r, 0, Math.PI * 2); ctx.fill()

  // Main circle
  ctx.globalAlpha = 1
  const grad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.1, cx, cy, r)
  grad.addColorStop(0, lighten(color.bg, 25))
  grad.addColorStop(0.7, color.bg)
  grad.addColorStop(1, color.border)
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()

  // Border
  ctx.strokeStyle = color.border
  ctx.lineWidth = Math.max(0.8, size / 50)
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()

  // Highlight
  ctx.globalAlpha = 0.45
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.08, cy - r * 0.32, r * 0.38, r * 0.2, -0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // Eyes + mouth
  const eyeY = cy - r * 0.12
  const sp = r * 0.32
  const lw = Math.max(0.6, size / 50)

  drawEyes(ctx, cx, eyeY, sp, r, typeIndex, lw)
  drawMouth(ctx, cx, cy, r, typeIndex, lw)
}

function lighten(hex: string, pct: number): string {
  const num = parseInt(hex.slice(1), 16)
  const rv = Math.min(255, ((num >> 16) & 0xff) + pct)
  const g = Math.min(255, ((num >> 8) & 0xff) + pct)
  const b = Math.min(255, (num & 0xff) + pct)
  return `rgb(${rv},${g},${b})`
}

function drawEyes(ctx: CanvasRenderingContext2D, cx: number, eyeY: number, sp: number, r: number, typeIndex: number, lw: number) {
  const er = r * 0.12
  ctx.fillStyle = '#2d3436'

  switch (typeIndex) {
    case 0: { // Happy
      ctx.beginPath(); ctx.arc(cx - sp, eyeY, er, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + sp, eyeY, er, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(cx - sp + 1, eyeY - 1, er * 0.4, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + sp + 1, eyeY - 1, er * 0.4, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 1: { // Sleepy
      ctx.strokeStyle = '#2d3436'; ctx.lineWidth = lw
      ctx.beginPath(); ctx.arc(cx - sp, eyeY, er, Math.PI + 0.3, -0.3); ctx.stroke()
      ctx.beginPath(); ctx.arc(cx + sp, eyeY, er, Math.PI + 0.3, -0.3); ctx.stroke()
      break
    }
    case 2: { // Surprised
      const big = er * 1.3
      ctx.beginPath(); ctx.arc(cx - sp, eyeY, big, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + sp, eyeY, big, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(cx - sp + 1, eyeY - 1.5, big * 0.4, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + sp + 1, eyeY - 1.5, big * 0.4, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 3: { // Cheeky
      ctx.beginPath(); ctx.arc(cx - sp, eyeY, er, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(cx - sp + 1, eyeY - 1, er * 0.4, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#2d3436'; ctx.lineWidth = lw
      ctx.beginPath(); ctx.arc(cx + sp, eyeY, er, Math.PI + 0.3, -0.3); ctx.stroke()
      break
    }
    case 4: { // Dreamy
      const sm = er * 0.9
      ctx.beginPath(); ctx.arc(cx - sp, eyeY, sm, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + sp, eyeY, sm, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(cx - sp + 0.5, eyeY - 0.5, sm * 0.35, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + sp + 0.5, eyeY - 0.5, sm * 0.35, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#2d3436'; ctx.lineWidth = Math.max(0.5, lw * 0.7)
      ctx.beginPath(); ctx.moveTo(cx - sp - 3, eyeY - 3.5); ctx.lineTo(cx - sp - 1, eyeY - 1.5); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx + sp + 3, eyeY - 3.5); ctx.lineTo(cx + sp + 1, eyeY - 1.5); ctx.stroke()
      break
    }
    case 5: { // Excited
      const big = er * 1.2
      ctx.beginPath(); ctx.arc(cx - sp, eyeY, big, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + sp, eyeY, big, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(cx - sp + 1.5, eyeY - 1.5, big * 0.4, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + sp + 1.5, eyeY - 1.5, big * 0.4, 0, Math.PI * 2); ctx.fill()
      break
    }
  }
}

function drawMouth(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, typeIndex: number, lw: number) {
  ctx.strokeStyle = '#2d3436'
  ctx.lineWidth = lw

  switch (typeIndex) {
    case 0:
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.1, r * 0.25, 0.2, Math.PI - 0.2); ctx.stroke()
      ctx.fillStyle = 'rgba(255,184,184,0.3)'
      ctx.beginPath(); ctx.arc(cx - r * 0.5, cy + r * 0.15, r * 0.1, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + r * 0.5, cy + r * 0.15, r * 0.1, 0, Math.PI * 2); ctx.fill()
      break
    case 1:
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.2, r * 0.15, 0.2, Math.PI - 0.2); ctx.stroke()
      break
    case 2:
      ctx.fillStyle = '#2d3436'
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.25, r * 0.1, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#e17055'
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.25, r * 0.06, 0, Math.PI * 2); ctx.fill()
      break
    case 3:
      ctx.beginPath(); ctx.arc(cx + 2, cy + r * 0.12, r * 0.2, 0.2, Math.PI * 0.7); ctx.stroke()
      ctx.fillStyle = '#e17055'
      ctx.beginPath(); ctx.arc(cx + r * 0.12, cy + r * 0.3, r * 0.07, 0, Math.PI * 2); ctx.fill()
      break
    case 4:
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.15, r * 0.18, 0.3, Math.PI - 0.3); ctx.stroke()
      break
    case 5:
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.05, r * 0.3, 0.1, Math.PI - 0.1); ctx.stroke()
      break
  }
}

// ─── Face Bubble Component ───────────────────────────────────

function FaceBubble({ item, excitement }: { item: FaceItem; excitement: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawFace(ctx, item.size * CANVAS_SCALE, item.type)
  }, [item.size, item.type])

  useEffect(() => { redraw() }, [redraw])

  const color = FACE_COLORS[item.type]

  // Excitement drives opacity, scale, and glow
  // Base: very dim. Excited: bright and enlarged.
  const exciteBoost = Math.min(excitement / 5, 1) // 0 → 1
  const opacity = item.baseOpacity + exciteBoost * (0.85 - item.baseOpacity) // ramp up to ~0.85
  const scale = 1 + exciteBoost * 0.35 // up to 1.35x
  const glowPx = exciteBoost * 20
  const glowAlpha = exciteBoost * 0.6

  const animClass = excitement >= 3 ? 'sd-bounce' : 'sd-float'

  return (
    <div
      className={`absolute ${animClass}`}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: item.size,
        height: item.size,
        animationDelay: `${item.floatDelay}s`,
        animationDuration: excitement >= 3 ? '0.6s' : `${item.floatDuration}s`,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
      }}
    >
      <canvas
        ref={canvasRef}
        width={item.size * CANVAS_SCALE}
        height={item.size * CANVAS_SCALE}
        style={{
          width: item.size,
          height: item.size,
          borderRadius: '50%',
          opacity,
          transform: `scale(${scale})`,
          transition: 'opacity 0.4s ease-out, transform 0.4s ease-out, box-shadow 0.4s ease-out, filter 0.4s ease-out',
          boxShadow: glowPx > 0
            ? `0 0 ${glowPx}px ${glowPx / 2}px rgba(${hexToRgb(color.bg)},${glowAlpha})`
            : 'none',
          filter: excitement >= 3
            ? `brightness(1.3) drop-shadow(0 0 ${excitement * 3}px ${color.bg})`
            : 'none',
        }}
      />
    </div>
  )
}

function hexToRgb(hex: string): string {
  const num = parseInt(hex.slice(1), 16)
  return `${(num >> 16) & 0xff},${(num >> 8) & 0xff},${num & 0xff}`
}

// ─── Bokeh orb ───────────────────────────────────────────────

function BokehOrb({ item, excitement }: { item: BokehItem; excitement: number }) {
  const boost = Math.min(excitement / 5, 1)
  const opacity = item.baseOpacity + boost * 0.15
  return (
    <div
      className="absolute sd-float rounded-full"
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: item.size,
        height: item.size,
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(circle, ${item.color}, transparent 70%)`,
        opacity,
        animationDelay: `${item.floatDelay}s`,
        animationDuration: `${item.floatDuration}s`,
        transition: 'opacity 0.5s ease-out',
        filter: 'blur(2px)',
      }}
    />
  )
}

// ─── Ambient star ────────────────────────────────────────────

function AmbientStar({ item, excitement }: { item: StarItem; excitement: number }) {
  const boost = Math.min(excitement / 5, 1)
  const baseGlow = 0.25 + boost * 0.6
  return (
    <div
      className="absolute sd-twinkle rounded-full"
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: item.size,
        height: item.size,
        transform: 'translate(-50%, -50%)',
        background: '#fff',
        boxShadow: `0 0 ${item.size + 2}px ${item.size}px rgba(255,255,255,${baseGlow})`,
        animationDelay: `${item.delay}s`,
        animationDuration: `${item.duration}s`,
        transition: 'box-shadow 0.4s ease-out',
      }}
    />
  )
}

// ─── Main component ──────────────────────────────────────────

export function SideDecorations() {
  const excitement = useGameStore((s) => s.excitement)
  const eventPulse = useGameStore((s) => s.eventPulse)

  const faces = useMemo(() => generateFaceGrid(), [])
  const bokehs = useMemo(() => generateBokeh(), [])
  const stars = useMemo(() => generateStars(), [])

  // Decay excitement over time
  useEffect(() => {
    if (excitement <= 0) return
    const timer = setTimeout(() => {
      const current = useGameStore.getState().excitement
      if (current > 0) {
        useGameStore.setState({ excitement: Math.max(0, current - 1) })
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [excitement, eventPulse])

  return (
    <div className="w-full h-full relative overflow-hidden">
      <style>{`
        @keyframes sdFloat {
          0%, 100% { transform: translate(-50%,-50%) translateY(0); }
          50% { transform: translate(-50%,-50%) translateY(-7px); }
        }
        @keyframes sdBounce {
          0%, 100% { transform: translate(-50%,-50%) translateY(0) scale(1) rotate(0deg); }
          20% { transform: translate(-50%,-50%) translateY(-8px) scale(1.08) rotate(-3deg); }
          40% { transform: translate(-50%,-50%) translateY(-1px) scale(0.97) rotate(2deg); }
          60% { transform: translate(-50%,-50%) translateY(-10px) scale(1.1) rotate(-2deg); }
          80% { transform: translate(-50%,-50%) translateY(-2px) scale(0.98) rotate(1deg); }
        }
        @keyframes sdTwinkle {
          0%, 100% { opacity: 0.15; transform: translate(-50%,-50%) scale(0.7); }
          50% { opacity: 1; transform: translate(-50%,-50%) scale(1.3); }
        }
        .sd-float { animation: sdFloat 3s ease-in-out infinite; }
        .sd-bounce { animation: sdBounce 0.6s ease-in-out infinite; }
        .sd-twinkle { animation: sdTwinkle 2.5s ease-in-out infinite; }
      `}</style>

      {/* Layer 1: Bokeh orbs */}
      {bokehs.map((b, i) => (
        <BokehOrb key={`b${i}`} item={b} excitement={excitement} />
      ))}

      {/* Layer 2: Twinkling stars */}
      {stars.map((s, i) => (
        <AmbientStar key={`s${i}`} item={s} excitement={excitement} />
      ))}

      {/* Layer 3: Dense face grid */}
      {faces.map((f, i) => (
        <FaceBubble key={`f${i}`} item={f} excitement={excitement} />
      ))}
    </div>
  )
}
