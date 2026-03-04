import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { useMatchStore } from '../../stores/matchStore'
import { CPU_RIVALS } from '../../lib/cpuRivals'
import { CharacterFace } from '../CharacterFace'
import { CHARACTERS } from '../../characters'
import { VS_GRID_WIDTH, VS_GAME_WIDTH, VS_GRID_OFFSET_X } from '../../game/vs-constants'

const WARM_THEME = {
  bg: 'bg-gradient-to-b from-amber-100 to-orange-100',
  border: 'border-orange-300',
  shadow: 'shadow-[0_4px_0_0_rgb(234,179,8)]',
  label: 'text-orange-800/70',
  scoreGradient: 'from-orange-500 to-amber-500',
}

const COOL_THEME = {
  bg: 'bg-gradient-to-b from-sky-100 to-blue-100',
  border: 'border-blue-300',
  shadow: 'shadow-[0_4px_0_0_rgb(96,165,250)]',
  label: 'text-blue-800/70',
  scoreGradient: 'from-blue-500 to-sky-500',
}

function KawaiiScoreboard({
  score,
  label,
  characterIndex,
  pulsing,
  theme,
}: {
  score: number
  label: string
  characterIndex: number
  pulsing: boolean
  theme: typeof WARM_THEME
}) {
  const character = CHARACTERS[characterIndex]

  return (
    <div
      className={`rounded-2xl border-[3px] ${theme.border} ${theme.bg} ${theme.shadow} px-4 py-2 flex items-center gap-3 w-full`}
    >
      <CharacterFace character={character} expression="happy" size={44} className="kawaii-face-bounce" />
      <div className="flex flex-col">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.label}`}>
          {label}
        </span>
        <span
          className={`text-xl font-black tabular-nums bg-gradient-to-r ${theme.scoreGradient} bg-clip-text text-transparent transition-transform duration-200 ease-out`}
          style={{ transform: pulsing ? 'scale(1.15)' : 'scale(1)' }}
        >
          {score.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

function VsBadge() {
  return (
    <div
      className="vs-text-swing text-2xl font-black bg-gradient-to-r from-pink-400 via-amber-300 to-pink-400 bg-[length:200%_100%] bg-clip-text text-transparent select-none"
      style={{
        WebkitTextStroke: '1px rgba(0,0,0,0.1)',
      }}
    >
      VS
    </div>
  )
}

function usePulse(value: number) {
  const [pulsing, setPulsing] = useState(false)
  const prev = useRef(value)
  useEffect(() => {
    if (value !== prev.current) {
      prev.current = value
      setPulsing(true)
      const id = setTimeout(() => setPulsing(false), 200)
      return () => clearTimeout(id)
    }
  }, [value])
  return pulsing
}

/** Compact rival score bar for mobile — shown above the canvas */
export function MobileRivalScore() {
  const opponentScore = useMatchStore((s) => s.opponentScore)
  const cpuDifficulty = useMatchStore((s) => s.cpuDifficulty)
  const rival = cpuDifficulty ? CPU_RIVALS[cpuDifficulty] : null
  const pulsing = usePulse(opponentScore)

  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border-[2px] border-blue-300/60 bg-gradient-to-r from-sky-50 to-blue-50 px-3 py-1 shadow-sm w-full">
      <span className="text-xs font-bold text-blue-800/70 uppercase tracking-wider">
        {rival?.name ?? 'Opp'}
      </span>
      <span
        className="text-sm font-black tabular-nums bg-gradient-to-r from-blue-500 to-sky-500 bg-clip-text text-transparent transition-transform duration-200 ease-out"
        style={{ transform: pulsing ? 'scale(1.15)' : 'scale(1)' }}
      >
        {opponentScore.toLocaleString()}
      </span>
    </div>
  )
}

/** Compact player score bar for mobile — shown below the canvas */
export function MobilePlayerScore() {
  const displayScore = useGameStore((s) => s.displayScore)
  const pulsing = usePulse(displayScore)

  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border-[2px] border-orange-300/60 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1 shadow-sm w-full">
      <span className="text-xs font-bold text-orange-800/70 uppercase tracking-wider">
        You
      </span>
      <span
        className="text-sm font-black tabular-nums bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent transition-transform duration-200 ease-out"
        style={{ transform: pulsing ? 'scale(1.15)' : 'scale(1)' }}
      >
        {displayScore.toLocaleString()}
      </span>
    </div>
  )
}

export function VsScoreDisplay() {
  const displayScore = useGameStore((s) => s.displayScore)
  const opponentScore = useMatchStore((s) => s.opponentScore)
  const cpuDifficulty = useMatchStore((s) => s.cpuDifficulty)
  const rival = cpuDifficulty ? CPU_RIVALS[cpuDifficulty] : null

  const localPulsing = usePulse(displayScore)
  const remotePulsing = usePulse(opponentScore)

  // Match the visual board backgrounds in VsGameScene (4px padding around grid)
  const BOARD_BG_PAD = 4
  const visualBoardWidth = VS_GRID_WIDTH + BOARD_BG_PAD * 2
  const visualBoardOffset = VS_GRID_OFFSET_X - BOARD_BG_PAD
  const boardPct = `${(visualBoardWidth / VS_GAME_WIDTH) * 100}%`
  const offsetPct = `${(visualBoardOffset / VS_GAME_WIDTH) * 100}%`

  return (
    <div className="relative flex items-end w-full">
      <div style={{ width: boardPct, marginLeft: offsetPct, flexShrink: 0 }}>
        <KawaiiScoreboard
          score={displayScore}
          label="You"
          characterIndex={0}
          pulsing={localPulsing}
          theme={WARM_THEME}
        />
      </div>
      <div className="flex-1" />
      <div style={{ width: boardPct, marginRight: offsetPct, flexShrink: 0 }}>
        <KawaiiScoreboard
          score={opponentScore}
          label={rival?.name ?? 'Opponent'}
          characterIndex={rival?.characterIndex ?? 2}
          pulsing={remotePulsing}
          theme={COOL_THEME}
        />
      </div>
      {/* VS badge floats centered, overlapping the gap */}
      <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
        <VsBadge />
      </div>
    </div>
  )
}
