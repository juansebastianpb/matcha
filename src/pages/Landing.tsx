import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { CHARACTERS } from '../characters'
import { CharacterFace } from '../components/CharacterFace'
import { CPU_RIVALS } from '../lib/cpuRivals'
import { useMatchStore } from '../stores/matchStore'
import { initChallengeOnce, setNavigateToGame } from '../services/challengeWidget'
import type { AIDifficulty } from '../game/ai/PuzzleAI'
import type { Expression } from '../characters'

const HERO_BLOCKS: { size: number; color: string; opacity: number; delay: string; top?: string; left?: string; right?: string; bottom?: string }[] = [
  { size: 40, color: '#FD79A8', opacity: 0.12, delay: '0s',   top: '12%', left: '12%' },
  { size: 32, color: '#74B9FF', opacity: 0.10, delay: '1.2s', top: '20%', right: '15%' },
  { size: 48, color: '#FFEAA7', opacity: 0.14, delay: '0.6s', bottom: '18%', left: '8%' },
  { size: 36, color: '#55EFC4', opacity: 0.10, delay: '2s',   bottom: '25%', right: '12%' },
  { size: 28, color: '#DDA0DD', opacity: 0.12, delay: '1.8s', top: '35%', left: '20%' },
  { size: 44, color: '#F5F0E8', opacity: 0.11, delay: '0.3s', top: '15%', left: '35%' },
  { size: 34, color: '#74B9FF', opacity: 0.09, delay: '2.5s', bottom: '30%', right: '25%' },
  { size: 38, color: '#FD79A8', opacity: 0.10, delay: '1.5s', top: '55%', right: '18%' },
  { size: 26, color: '#55EFC4', opacity: 0.13, delay: '3.2s', bottom: '12%', left: '28%' },
  { size: 42, color: '#FFEAA7', opacity: 0.11, delay: '0.9s', top: '60%', left: '6%' },
  { size: 30, color: '#DDA0DD', opacity: 0.10, delay: '2.8s', bottom: '15%', right: '35%' },
  { size: 36, color: '#F5F0E8', opacity: 0.12, delay: '1.0s', top: '8%',  right: '30%' },
]

const HERO_FACES: { charIdx: number; expression: Expression; size: number; opacity: number; delay: string; top?: string; left?: string; right?: string; bottom?: string }[] = [
  // Row 1 — top edge (3 faces spread across)
  { charIdx: 0, expression: 'happy',     size: 64, opacity: 0.6, delay: '0s',    top: '8%',  left: '18%' },
  { charIdx: 1, expression: 'dreamy',    size: 56, opacity: 0.5, delay: '0.5s',  top: '5%',  left: '42%' },
  { charIdx: 2, expression: 'cheeky',    size: 60, opacity: 0.7, delay: '1s',    top: '6%',  right: '8%' },

  // Row 2 — flanking the title (left + right, vertically centered)
  { charIdx: 5, expression: 'surprised', size: 56, opacity: 0.55, delay: '2.5s', top: '35%', left: '6%' },
  { charIdx: 4, expression: 'cheeky',    size: 50, opacity: 0.5, delay: '0.8s',  top: '58%', left: '30%' },
  { charIdx: 3, expression: 'happy',     size: 48, opacity: 0.5, delay: '1.5s',  top: '32%', right: '6%' },
  { charIdx: 4, expression: 'excited',   size: 56, opacity: 0.55, delay: '2s',   top: '25%', right: '28%' },

  // Row 3 — below title area, spread wide
  { charIdx: 3, expression: 'surprised', size: 56, opacity: 0.55, delay: '2.8s', bottom: '25%', left: '12%' },
  { charIdx: 5, expression: 'happy',     size: 60, opacity: 0.6, delay: '1.2s',  bottom: '28%', right: '12%' },

  // Row 4 — bottom edge (3 faces spread across)
  { charIdx: 0, expression: 'scared',    size: 52, opacity: 0.5, delay: '3s',    bottom: '8%', left: '20%' },
  { charIdx: 2, expression: 'excited',   size: 52, opacity: 0.55, delay: '3.5s', bottom: '6%', left: '52%' },
  { charIdx: 1, expression: 'sleepy',    size: 50, opacity: 0.5, delay: '2.2s',  bottom: '10%', right: '10%' },
]

export function Landing() {
  const [showModeSelect, setShowModeSelect] = useState(false)
  const navigate = useNavigate()
  const handleCpuMatch = (difficulty: AIDifficulty) => {
    useMatchStore.getState().startCpuMatch(difficulty)
    navigate('/vs')
  }

  // Init Challenge SDK in background — button is rendered by <challenge-button> custom element
  useEffect(() => {
    initChallengeOnce()
      .then(() => {
        setNavigateToGame(() => navigate('/challenge'))
      })
      .catch(() => {
        // Challenge not available
      })
    return () => setNavigateToGame(null)
  }, [navigate])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] overflow-x-hidden">
      {/* Hero */}
      <section className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Background glow orbs */}
        <div className="absolute top-1/3 left-1/3 w-56 h-56 rounded-full bg-pink-400/15 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 rounded-full bg-amber-300/10 blur-[90px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-violet-400/8 blur-[100px] pointer-events-none" />

        {/* Floating puzzle blocks */}
        {HERO_BLOCKS.map((b, i) => (
          <div
            key={`block-${i}`}
            className="absolute hero-block pointer-events-none"
            style={{
              top: b.top, left: b.left, right: b.right, bottom: b.bottom,
              width: b.size, height: b.size,
              backgroundColor: b.color,
              borderRadius: b.size * 0.25,
              opacity: b.opacity,
              animationDelay: b.delay,
            }}
          />
        ))}

        {/* Floating character faces */}
        {HERO_FACES.map((f, i) => (
          <div
            key={i}
            className="absolute hero-face pointer-events-none"
            style={{ top: f.top, left: f.left, right: f.right, bottom: f.bottom, opacity: f.opacity, animationDelay: f.delay }}
          >
            <CharacterFace character={CHARACTERS[f.charIdx]} expression={f.expression} size={f.size} />
          </div>
        ))}

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h1 className="text-6xl md:text-8xl font-black mb-6">
            <span className="bg-gradient-to-r from-pink-300 via-amber-200 to-yellow-200 bg-clip-text text-transparent drop-shadow-lg">
              Swingi
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/60 mb-10 max-w-lg mx-auto">
            A kawaii block-swapping puzzle game. Match colors, build chains, and chase high scores!
          </p>
          {!showModeSelect ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-4 justify-center">
                <Button size="lg" onClick={() => setShowModeSelect(true)}>Single Player</Button>
                <Link to="/lobby">
                  <Button size="lg" variant="secondary">Multiplayer</Button>
                </Link>
              </div>
              {/* @ts-expect-error challenge-button is a custom element */}
              <challenge-button variant="play" size="lg" full-width class="w-full max-w-xs"></challenge-button>
            </div>
          ) : (
            <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl backdrop-blur-sm p-5 max-w-xs w-full mx-auto">
              <h2 className="text-xl font-black text-center mb-4">
                <span className="bg-gradient-to-r from-pink-300 via-amber-200 to-yellow-200 bg-clip-text text-transparent">
                  Single Player
                </span>
              </h2>

              <Link to="/play">
                <Button size="lg" className="w-full">Endless</Button>
              </Link>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs uppercase tracking-wider">VS CPU</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((diff) => {
                  const rival = CPU_RIVALS[diff]
                  return (
                    <button
                      key={diff}
                      onClick={() => handleCpuMatch(diff)}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.15] hover:bg-white/[0.06] hover:border-white/[0.25] transition-colors cursor-pointer backdrop-blur-sm"
                    >
                      <CharacterFace character={CHARACTERS[rival.characterIndex]} expression="happy" size={34} />
                      <span className="text-white/70 text-xs font-bold capitalize">{diff}</span>
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setShowModeSelect(false)}
                className="w-full text-center text-white/30 text-sm mt-4 hover:text-white/50 transition-colors cursor-pointer"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </section>

      {/* How to Play — visual */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-16">
            <span className="bg-gradient-to-r from-pink-300 via-amber-200 to-yellow-200 bg-clip-text text-transparent">
              How to Play
            </span>
          </h2>

          <div className="space-y-20">
            {/* Swap */}
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12">
              <div className="shrink-0 scale-[0.7] sm:scale-[0.85] md:scale-100 origin-center">
                <div className="flex items-center gap-4">
                  <FaceGrid cells={[
                    [1, 0, 2],
                    [2, 1, 0],
                    [0, 2, 1],
                  ]} highlight={[[1,1],[1,2]]} />
                  <div className="text-xl text-white/20">→</div>
                  <FaceGrid cells={[
                    [1, 0, 2],
                    [2, 0, 1],
                    [0, 2, 1],
                  ]} highlight={[[1,1],[1,2]]} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Swap</h3>
                <p className="text-white/50 text-sm">Move a cursor over two side-by-side blocks and press swap to switch them.</p>
              </div>
            </div>

            {/* Match */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-6 md:gap-12">
              <div className="shrink-0 scale-[0.7] sm:scale-[0.85] md:scale-100 origin-center">
                <div className="flex items-center gap-4">
                  <FaceGrid cells={[
                    [1, 0, 1],
                    [2, 2, 2],
                    [0, 1, 0],
                  ]} match={[[1,0],[1,1],[1,2]]} />
                  <div className="text-xl text-white/20">→</div>
                  <div className="relative">
                    <FaceGrid cells={[
                      [1, 0, 1],
                      [-1, -1, -1],
                      [0, 1, 0],
                    ]} />
                    {/* Success indicator over cleared row */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5" style={{ top: CELL_SIZE + GAP + 8 }}>
                      <span className="text-amber-300 text-base font-black">+100</span>
                      <svg width="22" height="22" viewBox="0 0 14 14" className="text-amber-300">
                        <path d="M7 0L8.6 4.8H13.7L9.5 7.8L11.1 12.6L7 9.6L2.9 12.6L4.5 7.8L0.3 4.8H5.4Z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:text-right">
                <h3 className="text-xl font-bold mb-1">Match</h3>
                <p className="text-white/50 text-sm">Line up 3 or more of the same character in a row or column and they disappear. You earn 10 points per block cleared.</p>
              </div>
            </div>

            {/* Chain */}
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12">
              <div className="shrink-0 scale-[0.7] sm:scale-[0.85] md:scale-100 origin-center">
                <div className="flex items-start gap-4">
                  {/* Before: gap in the middle, blocks above need to fall */}
                  <div className="relative">
                    <FaceGrid cells={[
                      [1, 2, 0],
                      [1, 0, 2],
                      [-1, -1, -1],
                      [1, 0, 2],
                    ]} highlight={[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]]} />
                    {/* Down arrow on the right side showing fall direction */}
                    <div className="absolute pointer-events-none flex flex-col items-center" style={{ right: -22, top: 8, bottom: '50%' }}>
                      <svg width="16" height="50" viewBox="0 0 16 50" className="text-amber-300">
                        <path d="M8 2V42M8 42L3 35M8 42L13 35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </div>
                  </div>
                  <div className="self-center text-xl text-white/20">→</div>
                  {/* After: blocks fell, new column match formed */}
                  <div className="relative">
                    <FaceGrid cells={[
                      [-1, -1, -1],
                      [1, 2, 0],
                      [1, 0, 2],
                      [1, 0, 2],
                    ]} match={[[1,0],[2,0],[3,0]]} />
                    {/* Combo label */}
                    <div className="absolute -top-3 -right-3 bg-pink-300 text-gray-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">
                      2x combo!
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Chain</h3>
                <p className="text-white/50 text-sm">When blocks disappear, the ones above fall down. If they land and form a new match, that's a chain — each one adds a bigger bonus.</p>
              </div>
            </div>

            {/* Rising */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-6 md:gap-12">
              <div className="shrink-0 scale-[0.7] sm:scale-[0.85] md:scale-100 origin-center">
                <div className="flex items-start gap-4">
                  {/* Before: grid + incoming row below */}
                  <div>
                    <FaceGrid cells={[
                      [-1, -1, -1],
                      [1, 2, 0],
                      [0, 1, 2],
                    ]} />
                    {/* Incoming row preview */}
                    <div className="flex justify-center gap-1 mt-2 px-2">
                      {[2, 0, 1].map((idx, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-center rounded-md animate-pulse"
                          style={{
                            width: 36, height: 36,
                            backgroundColor: `${GRID_CHARS[idx].color}30`,
                            border: `1.5px dashed ${GRID_CHARS[idx].color}88`,
                          }}
                        >
                          <CharacterFace character={GRID_CHARS[idx]} expression="happy" size={26} />
                        </div>
                      ))}
                    </div>
                    {/* Up arrow under incoming row */}
                    <div className="flex justify-center mt-1.5">
                      <svg width="18" height="18" viewBox="0 0 18 18" className="text-amber-300">
                        <path d="M9 15V3M9 3L4 8M9 3L14 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </div>
                  </div>
                  {/* Arrow between grids — vertically centered to the grid area */}
                  <div className="self-center text-xl text-white/20 -mt-8">→</div>
                  {/* After: full grid with new row highlighted */}
                  <FaceGrid cells={[
                    [1, 2, 0],
                    [0, 1, 2],
                    [2, 0, 1],
                  ]} highlight={[[2,0],[2,1],[2,2]]} />
                </div>
              </div>
              <div className="md:text-right">
                <h3 className="text-xl font-bold mb-1">Rising</h3>
                <p className="text-white/50 text-sm">New rows of blocks keep pushing up from the bottom. If the stack reaches the top, it's game over. Clear blocks to make room.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Controls */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-14">
            <span className="bg-gradient-to-r from-pink-300 via-amber-200 to-yellow-200 bg-clip-text text-transparent">
              Controls
            </span>
          </h2>
          {/* Mobile: simple list of mobile controls only */}
          <div className="md:hidden space-y-4">
            <div className="flex items-center gap-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4">
              <MoveIcon />
              <div className="flex-1">
                <div className="font-bold text-base">Move</div>
                <div className="text-white/40 text-sm">Tap a block to select it</div>
              </div>
              <TapIcon />
            </div>
            <div className="flex items-center gap-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4">
              <SwapIcon />
              <div className="flex-1">
                <div className="font-bold text-base">Swap</div>
                <div className="text-white/40 text-sm">Tap the highlighted block</div>
              </div>
              <TapSwapIcon />
            </div>
          </div>

          {/* Desktop: full table with all controls */}
          <div className="hidden md:block max-w-4xl mx-auto rounded-2xl bg-white/[0.04] border border-white/[0.06] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1.2fr_1fr_1fr] text-center text-sm font-bold text-white/30 uppercase tracking-wider border-b border-white/[0.06] py-4 px-8">
              <div>Action</div>
              <div>Desktop</div>
              <div>Mobile</div>
            </div>
            {/* Move */}
            <div className="grid grid-cols-[1.2fr_1fr_1fr] items-center border-b border-white/[0.06] py-6 px-8">
              <div className="flex items-center gap-4">
                <MoveIcon />
                <div>
                  <div className="font-bold text-base">Move</div>
                  <div className="text-white/40 text-sm">Select blocks</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1.5">
                  {['←','→','↑','↓'].map(k => <Key key={k} label={k} />)}
                </div>
                <span className="text-white/25 text-xs">or click a block</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <TapIcon />
                <span className="text-white/40 text-xs">Tap a block</span>
              </div>
            </div>
            {/* Swap */}
            <div className="grid grid-cols-[1.2fr_1fr_1fr] items-center border-b border-white/[0.06] py-6 px-8">
              <div className="flex items-center gap-4">
                <SwapIcon />
                <div>
                  <div className="font-bold text-base">Swap</div>
                  <div className="text-white/40 text-sm">Switch two blocks</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1.5">
                  <Key label="Space" /><Key label="X" />
                </div>
                <span className="text-white/25 text-xs">or click highlighted</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <TapSwapIcon />
                <span className="text-white/40 text-xs">Tap highlighted</span>
              </div>
            </div>
            {/* Speed up */}
            <div className="grid grid-cols-[1.2fr_1fr_1fr] items-center py-6 px-8">
              <div className="flex items-center gap-4">
                <RiseIcon />
                <div>
                  <div className="font-bold text-base">Speed up</div>
                  <div className="text-white/40 text-sm">Push row early</div>
                </div>
              </div>
              <div className="flex justify-center">
                <Key label="Z" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-white/20 text-sm">—</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scoring */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">
            <span className="bg-gradient-to-r from-pink-300 via-amber-200 to-yellow-200 bg-clip-text text-transparent">
              Scoring
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '10', label: 'Points per block you clear', color: 'text-pink-300' },
              { value: '4+', label: 'Blocks at once = combo bonus', color: 'text-amber-300' },
              { value: '+50', label: 'Bonus for your 1st chain', color: 'text-yellow-200' },
              { value: '+1800', label: 'Bonus at 12th chain!', color: 'text-emerald-300' },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <div className={`text-4xl md:text-5xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-white/50 text-sm mt-2">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-sm text-center mt-6 max-w-xl mx-auto">
            Every block you clear earns 10 points. Clear 4+ at once for a combo bonus. Chain reactions — where falling blocks create new matches — stack massive bonuses that keep growing.
          </p>
        </div>
      </section>

      {/* Meet the Crew */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-14">
            <span className="bg-gradient-to-r from-pink-300 via-amber-200 to-yellow-200 bg-clip-text text-transparent">
              Meet the Crew
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {CHARACTERS.map((c) => {
              const expr: Expression[] = ['sleepy', 'surprised', 'cheeky', 'dreamy', 'excited', 'scared', 'dead']
              return (
                <div key={c.id} className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex sm:flex-col items-center sm:text-center min-w-0 gap-3 sm:gap-0">
                  <CharacterFace character={c} expression="happy" size={48} className="shrink-0 sm:hidden" />
                  <CharacterFace character={c} expression="happy" size={72} className="mx-auto mb-3 hidden sm:block" />
                  <div className="flex-1 min-w-0 sm:flex-none">
                    <div className="font-bold text-sm mb-1">{c.name}</div>
                    <div className="text-white/40 text-xs leading-relaxed">{c.bio}</div>
                  </div>
                  <div className="hidden sm:flex justify-center flex-nowrap overflow-hidden mt-3">
                    {expr.map((e) => (
                      <CharacterFace key={e} character={c} expression={e} size={44} className="shrink-0" />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 rounded-full bg-pink-400/10 blur-[80px]" />
        </div>
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <div className="flex justify-center gap-2 mb-6">
            {[0, 2, 5, 1, 4].map((idx) => (
              <CharacterFace key={idx} character={CHARACTERS[idx]} expression="excited" size={48} />
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            <span className="bg-gradient-to-r from-pink-300 via-amber-200 to-yellow-200 bg-clip-text text-transparent">
              Ready to play?
            </span>
          </h2>
          <p className="text-white/50 mb-8">
            Jump in and see how high you can score.
          </p>
          <Link to="/play">
            <Button size="lg">Play Now</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

// ── Controls helpers ──────────────────────────────────────────

function Key({ label }: { label: string }) {
  const isWide = label.length > 2
  return (
    <div
      className={`${isWide ? 'px-4' : 'w-11'} h-11 flex items-center justify-center rounded-lg bg-white/[0.08] border border-white/[0.15] text-white/80 text-sm font-bold shadow-[0_3px_0_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]`}
    >
      {label}
    </div>
  )
}

function IconBubble({ children, color = 'pink' }: { children: React.ReactNode; color?: string }) {
  const bg = color === 'pink' ? 'bg-pink-300/15' : color === 'amber' ? 'bg-amber-300/15' : 'bg-emerald-300/15'
  return (
    <div className={`w-11 h-11 flex items-center justify-center rounded-xl ${bg}`}>
      {children}
    </div>
  )
}

function MoveIcon() {
  return (
    <IconBubble color="amber">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L9 16M2 9L16 9" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 2L6 5M9 2L12 5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 16L6 13M9 16L12 13" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 9L5 6M2 9L5 12" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 9L13 6M16 9L13 12" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconBubble>
  )
}

function SwapIcon() {
  return (
    <IconBubble color="pink">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M4 7L14 7" stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 7L11 4M14 7L11 10" stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 12L4 12" stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" />
        <path d="M4 12L7 9M4 12L7 15" stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconBubble>
  )
}

function RiseIcon() {
  return (
    <IconBubble color="green">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 14V4" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 4L5 8M9 4L13 8" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="4" y1="16" x2="14" y2="16" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </IconBubble>
  )
}

function TapIcon() {
  return <span className="text-2xl leading-none">{'\u{1F446}'}</span>
}

function TapSwapIcon() {
  return <span className="text-2xl leading-none">{'\u{1F446}'}</span>
}

// Character indices used in grids: 0=Pip, 1=Lumi, 2=Fizz. -1 = empty.
const GRID_CHARS = [CHARACTERS[0], CHARACTERS[1], CHARACTERS[2]]
const FACE_SIZE = 44
const CELL_SIZE = 50
const GAP = 4

function FaceGrid({
  cells,
  highlight,
  match,
}: {
  cells: number[][]
  highlight?: [number, number][]
  match?: [number, number][]
}) {
  const rows = cells.length
  const cols = cells[0].length
  const has = (list: [number, number][] | undefined, r: number, c: number) =>
    list?.some(([lr, lc]) => lr === r && lc === c)

  return (
    <div
      className="inline-grid rounded-xl bg-white/[0.04] p-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
        gap: GAP,
      }}
    >
      {cells.flat().map((charIdx, i) => {
        const r = Math.floor(i / cols)
        const c = i % cols
        const hl = has(highlight, r, c)
        const mt = has(match, r, c)
        const empty = charIdx < 0
        const ch = !empty ? GRID_CHARS[charIdx] : undefined

        return (
          <div
            key={i}
            className="flex items-center justify-center rounded-lg"
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundColor: empty
                ? 'rgba(255,255,255,0.03)'
                : `${ch!.color}40`,
              borderRadius: 10,
              boxShadow: mt
                ? `0 0 14px ${ch!.color}99, inset 0 0 8px ${ch!.color}55`
                : hl
                ? '0 0 12px rgba(251,191,36,0.6)'
                : 'none',
              outline: mt
                ? `2.5px solid ${ch!.color}`
                : hl
                ? '2.5px solid #fbbf24'
                : '2px solid transparent',
              transform: hl ? 'scale(1.08)' : 'none',
              zIndex: hl || mt ? 10 : 0,
            }}
          >
            {ch && (
              <CharacterFace
                character={ch}
                expression={mt ? 'excited' : 'happy'}
                size={FACE_SIZE}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
