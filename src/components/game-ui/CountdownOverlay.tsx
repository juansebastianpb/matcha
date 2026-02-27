import { useEffect, useState, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { CharacterFace } from '../CharacterFace'
import { CHARACTERS } from '../../characters'
import type { Expression } from '../../characters'
import { playCountdownTick, playCountdownGo } from '../../game/audio/SoundManager'

interface Step {
  display: string
  color: string
  word: string | null
  expressions: Expression[]
}

const STEPS: Step[] = [
  { display: '3', color: '#FFEAA7', word: 'Get Ready!', expressions: ['excited', 'surprised'] },
  { display: '2', color: '#A29BFE', word: 'Almost...', expressions: ['cheeky', 'dreamy'] },
  { display: '1', color: '#FFA502', word: 'Here we go!', expressions: ['scared', 'surprised'] },
  { display: 'GO!', color: '#00E676', word: null, expressions: ['excited', 'happy'] },
]

// Radial glow config per step (index 0=step3, 1=step2, 2=step1, 3=GO!)
const GLOW_CONFIG = [
  { opacity: 0.3, size: 200 },
  { opacity: 0.4, size: 250 },
  { opacity: 0.5, size: 300 },
  { opacity: 0.6, size: 350 },
]

const STEP_DURATION = 900

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function CountdownOverlay() {
  const countdown = useGameStore((s) => s.countdown)
  const [phase, setPhase] = useState<'show' | 'exit'>('show')

  // Map countdown value to step index: 3->0, 2->1, 1->2, 0->3
  const stepIndex = countdown !== null ? 3 - countdown : -1
  const step = stepIndex >= 0 && stepIndex < STEPS.length ? STEPS[stepIndex] : null

  // Pick random faces for each step change
  const faces = useMemo(() => {
    if (!step) return null
    const leftChar = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]
    const rightChar = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]
    const leftExpr = pickRandom(step.expressions)
    const rightExpr = pickRandom(step.expressions)
    return { leftChar, rightChar, leftExpr, rightExpr }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown])

  // Drive the countdown sequence
  useEffect(() => {
    if (countdown === null) return

    setPhase('show')

    // Play countdown sound
    if (countdown > 0) {
      playCountdownTick()
    } else {
      playCountdownGo()
    }

    const exitTimer = setTimeout(() => {
      setPhase('exit')
    }, STEP_DURATION - 200)

    const nextTimer = setTimeout(() => {
      if (countdown > 0) {
        useGameStore.getState().setCountdown(countdown - 1)
      } else {
        // GO! finished — unfreeze
        useGameStore.getState().setCountdown(null)
      }
    }, STEP_DURATION)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(nextTimer)
    }
  }, [countdown])

  if (countdown === null || !step || !faces) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/20 rounded-2xl" />

      <div className="relative flex items-center gap-4">
        {/* Left face */}
        <div
          className={phase === 'show' ? 'countdown-face-left' : 'opacity-0'}
        >
          <CharacterFace
            character={faces.leftChar}
            expression={faces.leftExpr}
            size={56}
          />
        </div>

        {/* Number + word */}
        <div className="relative flex flex-col items-center">
          {/* Radial intensity blob */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: `${GLOW_CONFIG[stepIndex].size}px`,
              height: `${GLOW_CONFIG[stepIndex].size}px`,
              background: `radial-gradient(circle, ${step.color} 0%, transparent 70%)`,
              opacity: phase === 'show' ? GLOW_CONFIG[stepIndex].opacity : 0,
              animation: 'countdown-glow-pulse 600ms ease-in-out infinite',
              pointerEvents: 'none',
              transition: 'opacity 180ms ease-out',
            }}
          />
          <div
            key={countdown}
            className={phase === 'show' ? 'countdown-pop' : 'countdown-out'}
            style={{
              fontSize: step.display === 'GO!' ? '100px' : '120px',
              fontWeight: 900,
              color: step.color,
              textShadow: `
                0 0 30px ${step.color},
                0 0 60px ${step.color}44,
                3px 3px 0 #000,
                -1px -1px 0 #000,
                1px -1px 0 #000,
                -1px 1px 0 #000
              `,
              lineHeight: 1,
              WebkitTextStroke: '2px rgba(0,0,0,0.3)',
            }}
          >
            {step.display}
          </div>
          {step.word && (
            <div
              className={phase === 'show' ? 'countdown-pop' : 'countdown-out'}
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: step.color,
                textShadow: `
                  0 0 15px ${step.color},
                  2px 2px 0 #000,
                  -1px -1px 0 #000
                `,
                marginTop: '4px',
              }}
            >
              {step.word}
            </div>
          )}
        </div>

        {/* Right face */}
        <div
          className={phase === 'show' ? 'countdown-face-right' : 'opacity-0'}
        >
          <CharacterFace
            character={faces.rightChar}
            expression={faces.rightExpr}
            size={56}
          />
        </div>
      </div>
    </div>
  )
}
