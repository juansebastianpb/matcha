import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { VsPhaserGame } from '../game/VsPhaserGame'
import { VsScoreDisplay, MobileRivalScore, MobilePlayerScore } from '../components/game-ui/VsScoreDisplay'
import { CelebrationOverlay } from '../components/game-ui/CelebrationOverlay'
import { CountdownOverlay } from '../components/game-ui/CountdownOverlay'
import { HypeOverlay } from '../components/game-ui/HypeOverlay'
import { SideDecorations } from '../components/game-ui/SideDecorations'
import { MuteToggle } from '../components/game-ui/MuteToggle'
import { Button } from '../components/ui/Button'
import { CharacterFace } from '../components/CharacterFace'
import { CHARACTERS } from '../characters'
import { stopMusic } from '../game/audio/SoundManager'
import { useGameStore } from '../stores/gameStore'
import { useMatchStore } from '../stores/matchStore'
import { VS_GAME_WIDTH, VS_GAME_HEIGHT, VS_MOBILE_GAME_WIDTH, VS_MOBILE_GAME_HEIGHT } from '../game/vs-constants'
import {
  initChallengeOnce,
  getChallenge,
  getChallengeUserData,
  setNavigateToGame,
  getChallengeMatchData,
  cleanupChallengeRetry,
} from '../services/challengeWidget'
import { debug } from '../lib/debug'

const isMobile = window.innerWidth < 768

export function ChallengePage() {
  // Clear stale state from any previous game immediately on mount
  const didReset = useRef(false)
  if (!didReset.current) {
    didReset.current = true
    useGameStore.getState().reset()
    useMatchStore.getState().cleanup()
  }

  const navigate = useNavigate()
  const [gameKey, setGameKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const resultReportedRef = useRef(false)
  const [setupTimedOut, setSetupTimedOut] = useState(false)

  // Canvas sizing (same as Vs.tsx)
  const [canvasWidth, setCanvasWidth] = useState<number | null>(null)
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameWidth = isMobile ? VS_MOBILE_GAME_WIDTH : VS_GAME_WIDTH
  const gameHeight = isMobile ? VS_MOBILE_GAME_HEIGHT : VS_GAME_HEIGHT

  // Watch matchStore mode — the Supabase channel setup is handled in challengeWidget.ts
  // We just wait for 'countdown' which means seeds are exchanged and we can start the game.
  const matchMode = useMatchStore((s) => s.mode)
  const gameReady = matchMode === 'countdown' || matchMode === 'playing' || matchMode === 'finished'

  // Initialize Challenge (idempotent) and update navigation target
  useEffect(() => {
    initChallengeOnce()
      .then(() => {
        setNavigateToGame(() => navigate('/challenge'))

        const challenge = getChallenge()
        if (challenge) {
          challenge.setPostMatchHandlers({
            onMatchStarting: () => {
              resultReportedRef.current = false
              setSetupTimedOut(false)
              useGameStore.getState().reset()
              useMatchStore.getState().cleanup()
              setGameKey((k) => k + 1)
            },
            onNewOpponent: () => {
              resultReportedRef.current = false
              setSetupTimedOut(false)
              useGameStore.getState().reset()
              useMatchStore.getState().cleanup()
            },
          })
        }
      })
      .catch(() => {
        setError('Failed to load Challenge. Set VITE_CHALLENGE_GAME_ID in your .env file.')
      })

    return () => {
      // Don't clear navigateToGame — Landing.tsx will set its own on mount
    }
  }, [navigate])

  // Report result to Challenge when game ends (versus mode)
  // Winner settles directly via Challenge.settle() — no server endpoint needed
  const isGameOver = useGameStore((s) => s.isGameOver)
  const matchResult = useMatchStore((s) => s.result)

  useEffect(() => {
    if (!isGameOver || !matchResult || resultReportedRef.current) return

    const challenge = getChallenge()
    const matchData = getChallengeMatchData()
    const userData = getChallengeUserData()
    if (!challenge || !matchData || !userData) return

    resultReportedRef.current = true
    debug('Challenge', `Reporting result: ${matchResult}, matchId=${matchData.matchId}, userId=${userData.userId}, opponent=${matchData.opponent.email}`)

    const gameData = {
      blocksCleared: useGameStore.getState().blocksCleared,
      maxChain: useGameStore.getState().maxChain,
      maxCombo: useGameStore.getState().maxCombo,
    }

    if (matchResult === 'win') {
      // Winner settles the match directly via widget
      challenge.settle({
        matchId: matchData.matchId,
        winnerId: userData.userId,
        gameData,
      })
    } else if (matchResult === 'draw') {
      // Draw — only one player settles to avoid double-settlement.
      // Use deterministic tiebreaker (lower userId settles).
      const iSettler = userData.userId < matchData.opponent.email
      if (iSettler) {
        challenge.settle({
          matchId: matchData.matchId,
          gameData,
        })
      }
      // The other player waits — the widget shows the draw screen
      // automatically when it receives the settlement via WebSocket.
    } else {
      challenge.showLose({ matchId: matchData.matchId, opponent: matchData.opponent })
    }
  }, [isGameOver, matchResult])

  // Setup timeout — if channel handshake doesn't complete in 20s, show error
  useEffect(() => {
    if (gameReady || error) return
    const timer = setTimeout(() => setSetupTimedOut(true), 20_000)
    return () => clearTimeout(timer)
  }, [gameReady, error])

  // Canvas size observer (only when game is rendering)
  useEffect(() => {
    if (!gameReady) return
    const el = gameContainerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        const scale = Math.min(width / gameWidth, height / gameHeight)
        setCanvasWidth(Math.round(gameWidth * scale))
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [gameReady, gameWidth, gameHeight])

  // Stop music on unmount — don't cleanup matchStore here because
  // React 18 strict mode double-mounts in dev, which would destroy
  // the Supabase channel set up by challengeWidget.ts before it can
  // complete the handshake. Cleanup happens via explicit "Back to Menu".
  useEffect(() => {
    return () => {
      stopMusic()
    }
  }, [])

  const handleSetupFail = useCallback(() => {
    cleanupChallengeRetry()
    useMatchStore.getState().cleanup()
    navigate('/')
  }, [navigate])

  // --- Waiting for Supabase channel + seed exchange ---
  if (!gameReady) {
    return (
      <div className="h-full relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <SideDecorations />
        </div>
        <div className="h-full flex items-center justify-center px-4 relative z-10">
          {error || setupTimedOut ? (
            <div className="text-center">
              <div className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-3 mb-3">
                {error || 'Failed to connect to opponent. Please try again.'}
              </div>
              <Button onClick={handleSetupFail} variant="ghost" size="lg">
                Back to Menu
              </Button>
            </div>
          ) : (
            <div className="text-white/50 text-sm animate-pulse">
              Setting up match...
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Game phase (same layout as Vs.tsx, with Challenge game over overlay) ---

  if (isMobile) {
    return (
      <div className="h-full relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <SideDecorations />
        </div>
        <div className="absolute top-2 right-3 z-20">
          <MuteToggle />
        </div>
        <CelebrationOverlay />
        <div className="h-full flex flex-col items-center px-1 py-1 relative z-10">
          <div className="flex-1 min-h-0 w-full flex flex-col items-center gap-1.5 overflow-visible">
            <div
              className="shrink-0"
              style={{
                width: canvasWidth ? `${canvasWidth}px` : '100%',
                visibility: canvasWidth ? 'visible' : 'hidden',
              }}
            >
              <MobileRivalScore />
            </div>
            <div ref={gameContainerRef} className="relative flex-1 min-h-0 w-full overflow-visible">
              <VsPhaserGame key={gameKey} mobile />
              <div
                className="absolute inset-y-0 z-30 pointer-events-none"
                style={{
                  width: canvasWidth ? `${canvasWidth}px` : '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="relative w-full h-full">
                  <CountdownOverlay />
                  <HypeOverlay />
                  <ChallengeGameOverOverlay />
                </div>
              </div>
            </div>
            <div
              className="shrink-0"
              style={{
                width: canvasWidth ? `${canvasWidth}px` : '100%',
                visibility: canvasWidth ? 'visible' : 'hidden',
              }}
            >
              <MobilePlayerScore />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0">
        <SideDecorations />
      </div>
      <div className="absolute top-2 right-3 z-20">
        <MuteToggle />
      </div>
      <CelebrationOverlay />
      <div className="h-full flex flex-col items-center px-4 py-1 relative z-10">
        <div className="flex-1 min-h-0 w-full max-w-4xl flex flex-col items-center gap-1 overflow-visible">
          <div
            className="shrink-0"
            style={{
              width: canvasWidth ? `${canvasWidth}px` : '100%',
              visibility: canvasWidth ? 'visible' : 'hidden',
            }}
          >
            <VsScoreDisplay />
          </div>
          <div ref={gameContainerRef} className="relative flex-1 min-h-0 w-full overflow-visible">
            <VsPhaserGame key={gameKey} />
            <div
              className="absolute inset-y-0 z-30 pointer-events-none"
              style={{
                width: canvasWidth ? `${canvasWidth}px` : '100%',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <div className="relative w-full h-full">
                <CountdownOverlay />
                <HypeOverlay />
                <ChallengeGameOverOverlay />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Challenge-specific game over overlay ---

function ChallengeGameOverOverlay() {
  const isGameOver = useGameStore((s) => s.isGameOver)
  const finalScore = useGameStore((s) => s.finalScore)
  const blocksCleared = useGameStore((s) => s.blocksCleared)
  const maxChain = useGameStore((s) => s.maxChain)
  const maxCombo = useGameStore((s) => s.maxCombo)
  const result = useMatchStore((s) => s.result)
  const opponentScore = useMatchStore((s) => s.opponentScore)
  const navigate = useNavigate()

  const [displayScore, setDisplayScore] = useState(0)
  const rafRef = useRef<number>(0)
  const [actionTaken, setActionTaken] = useState(false)

  const [charA, charB] = useMemo(() => {
    const shuffled = [...CHARACTERS].sort(() => Math.random() - 0.5)
    return [shuffled[0], shuffled[1]]
  }, [isGameOver]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isGameOver) {
      setDisplayScore(0)
      setActionTaken(false)
      return
    }
    const start = performance.now()
    const duration = 1000
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * finalScore))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isGameOver, finalScore])

  const handleMenu = useCallback(() => {
    if (actionTaken) return
    setActionTaken(true)
    cleanupChallengeRetry()
    useMatchStore.getState().cleanup()
    navigate('/')
  }, [actionTaken, navigate])

  if (!(isGameOver || result)) return null
  if (!result) return null

  const isWin = result === 'win'

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl z-20 pointer-events-auto">
      <div className="text-center p-3 sm:p-6 gameover-slide-up max-w-md w-full">
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1">
          <div className="gameover-face-left">
            <div className="gameover-face-spin">
              <CharacterFace character={charA} expression={isWin ? 'excited' : 'dead'} size={36} className="sm:hidden" />
              <CharacterFace character={charA} expression={isWin ? 'excited' : 'dead'} size={52} className="hidden sm:block" />
            </div>
          </div>
          <h2
            className={`text-2xl sm:text-4xl font-black bg-gradient-to-r ${
              isWin
                ? 'from-yellow-300 via-amber-200 to-pink-300'
                : 'from-gray-400 to-gray-500'
            } bg-clip-text text-transparent`}
            style={{
              textShadow: isWin
                ? '0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.25)'
                : '0 0 20px rgba(150,150,150,0.3)',
            }}
          >
            {isWin ? 'Victory!' : 'Defeat'}
          </h2>
          <div className="gameover-face-right">
            <div className="gameover-face-spin">
              <CharacterFace character={charB} expression={isWin ? 'excited' : 'dead'} size={36} className="sm:hidden" />
              <CharacterFace character={charB} expression={isWin ? 'excited' : 'dead'} size={52} className="hidden sm:block" />
            </div>
          </div>
        </div>

        <div className="bg-white/8 border border-white/10 rounded-xl p-2.5 sm:p-4 mb-3 sm:mb-4">
          <div className="flex items-center justify-center gap-3 sm:gap-6 mb-1 sm:mb-2">
            <div className="text-center">
              <div className="text-[10px] sm:text-xs text-white/40 uppercase">You</div>
              <div className="text-xl sm:text-3xl font-black bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                {displayScore.toLocaleString()}
              </div>
            </div>
            <div className="text-white/20 font-black text-xs sm:text-sm">vs</div>
            <div className="text-center">
              <div className="text-[10px] sm:text-xs text-white/40 uppercase">Opponent</div>
              <div className="text-xl sm:text-3xl font-black bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                {opponentScore.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm mt-2 sm:mt-3">
            <div className="gameover-stat-pop" style={{ animationDelay: '0ms' }}>
              <div className="text-white/40">Cleared</div>
              <div className="font-bold text-white">{blocksCleared}</div>
            </div>
            <div className="gameover-stat-pop" style={{ animationDelay: '100ms' }}>
              <div className="text-white/40">Chain</div>
              <div className="font-bold text-yellow-300">{maxChain}x</div>
            </div>
            <div className="gameover-stat-pop" style={{ animationDelay: '200ms' }}>
              <div className="text-white/40">Combo</div>
              <div className="font-bold text-pink-300">{maxCombo}x</div>
            </div>
          </div>
        </div>

        <p className="text-white/40 text-xs mb-3">
          Challenge is settling the match...
        </p>

        <Button onClick={handleMenu} variant="ghost" size="lg">
          Back to Menu
        </Button>
      </div>
    </div>
  )
}
