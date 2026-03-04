import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { CharacterFace } from '../components/CharacterFace'
import { CHARACTERS } from '../characters'
import { SideDecorations } from '../components/game-ui/SideDecorations'
import { useMatchStore } from '../stores/matchStore'
import { useChallengeStore } from '../stores/challengeStore'

export function Lobby() {
  const navigate = useNavigate()
  const mode = useMatchStore((s) => s.mode)
  const roomCode = useMatchStore((s) => s.roomCode)
  const error = useMatchStore((s) => s.error)
  const isAutoMatch = useMatchStore((s) => s.isAutoMatch)
  const localReady = useMatchStore((s) => s.localReady)
  const isChallengeMatch = useMatchStore((s) => s.isChallengeMatch)
  const entryFee = useChallengeStore((s) => s.entryFee)
  const [joinCode, setJoinCode] = useState('')
  const [showJoinInput, setShowJoinInput] = useState(false)

  // Random character for the waiting animation
  const [waitChar] = useState(() => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)])

  // Navigate to /vs when countdown starts
  useEffect(() => {
    if (mode === 'countdown') {
      const timer = setTimeout(() => navigate('/vs'), 500)
      return () => clearTimeout(timer)
    }
  }, [mode, navigate])

  // Cleanup on unmount if still idle
  useEffect(() => {
    return () => {
      const { mode } = useMatchStore.getState()
      if (mode === 'idle' || mode === 'creating' || mode === 'searching') {
        useMatchStore.getState().cleanup()
      }
    }
  }, [])

  const handleFindMatch = () => {
    useMatchStore.getState().findMatch()
  }

  const handleCancelSearch = () => {
    useMatchStore.getState().cancelSearch()
  }

  const handleConfirmReady = () => {
    useMatchStore.getState().confirmReady()
  }

  const handleCreate = () => {
    useMatchStore.getState().createRoom()
  }

  const handleJoin = () => {
    if (joinCode.length !== 4) return
    useMatchStore.getState().joinRoom(joinCode)
  }

  const handleCancel = () => {
    useMatchStore.getState().cleanup()
    setShowJoinInput(false)
    setJoinCode('')
  }

  return (
    <div className="h-full relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <SideDecorations />
      </div>

      <div className="h-full flex items-center justify-center px-4 relative z-10">
        <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl backdrop-blur-sm p-8 max-w-sm w-full">
          <h2 className="text-2xl font-black text-center mb-2">
            <span className={`bg-gradient-to-r ${isChallengeMatch ? 'from-emerald-300 via-green-200 to-emerald-400' : 'from-pink-300 via-amber-200 to-yellow-200'} bg-clip-text text-transparent`}>
              {isChallengeMatch ? 'Cash Match' : 'Multiplayer'}
            </span>
          </h2>
          {isChallengeMatch && (
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-sm font-bold px-3 py-1 rounded-full">
                ${entryFee.toFixed(2)} entry
              </span>
            </div>
          )}
          {!isChallengeMatch && <div className="mb-4" />}

          {error && (
            <div className="text-red-400 text-sm text-center mb-4 bg-red-400/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Initial state */}
          {(mode === 'idle') && !showJoinInput && (
            <div className="space-y-3">
              <Button onClick={handleFindMatch} size="lg" className="w-full">
                Find Match
              </Button>
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <Button onClick={handleCreate} variant="secondary" size="lg" className="w-full">
                Create Room
              </Button>
              <Button onClick={() => setShowJoinInput(true)} variant="ghost" size="lg" className="w-full">
                Join Room
              </Button>
              <p className="text-white/30 text-xs text-center mt-4">
                Best on desktop — two boards are small on mobile
              </p>
            </div>
          )}

          {/* Join input */}
          {(mode === 'idle') && showJoinInput && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">Room Code</label>
                <input
                  type="text"
                  maxLength={4}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCD"
                  autoFocus
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-center text-2xl font-black text-white tracking-[0.3em] placeholder:text-white/20 outline-none focus:border-pink-300/50 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleCancel} variant="ghost" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleJoin} disabled={joinCode.length !== 4} className="flex-1">
                  Join
                </Button>
              </div>
            </div>
          )}

          {/* Searching for match */}
          {mode === 'searching' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center py-2">
                <div className="animate-bounce">
                  <CharacterFace character={waitChar} expression="excited" size={64} />
                </div>
              </div>
              <div className="text-white/50 text-sm animate-pulse">
                Searching for opponent...
              </div>
              <Button onClick={handleCancelSearch} variant="ghost" size="sm" className="mt-2">
                Cancel
              </Button>
            </div>
          )}

          {/* Ready check (rematch) */}
          {mode === 'ready_check' && (
            <div className="text-center space-y-4">
              {!isAutoMatch && roomCode && (
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-wider mb-2">Room Code</div>
                  <div className="text-6xl font-black tracking-[0.2em] bg-gradient-to-r from-pink-300 via-amber-200 to-yellow-200 bg-clip-text text-transparent">
                    {roomCode}
                  </div>
                </div>
              )}
              {!localReady ? (
                <Button onClick={handleConfirmReady} size="lg" className="w-full">
                  Ready
                </Button>
              ) : (
                <>
                  <div className="flex justify-center py-2">
                    <div className="animate-bounce">
                      <CharacterFace character={waitChar} expression="excited" size={64} />
                    </div>
                  </div>
                  <div className="text-white/30 text-xs animate-pulse">
                    Waiting for opponent...
                  </div>
                </>
              )}
              <Button onClick={handleCancel} variant="ghost" size="sm" className="mt-2">
                Leave Room
              </Button>
            </div>
          )}

          {/* Creating */}
          {mode === 'creating' && (
            <div className="text-center py-4">
              <div className="text-white/50 text-sm">
                {isAutoMatch ? 'Connecting to opponent...' : 'Creating room...'}
              </div>
            </div>
          )}

          {/* Waiting for opponent */}
          {mode === 'waiting' && roomCode && (
            <div className="text-center space-y-4">
              {!isAutoMatch && (
                <>
                  <div>
                    <div className="text-xs text-white/50 uppercase tracking-wider mb-2">Room Code</div>
                    <div className="text-6xl font-black tracking-[0.2em] bg-gradient-to-r from-pink-300 via-amber-200 to-yellow-200 bg-clip-text text-transparent">
                      {roomCode}
                    </div>
                  </div>
                  <p className="text-white/50 text-sm">
                    Share this code with your friend
                  </p>
                </>
              )}
              <div className="flex justify-center py-2">
                <div className="animate-bounce">
                  <CharacterFace character={waitChar} expression="excited" size={64} />
                </div>
              </div>
              <div className="text-white/30 text-xs animate-pulse">
                {isAutoMatch ? 'Connecting to opponent...' : 'Waiting for opponent...'}
              </div>
              <Button onClick={handleCancel} variant="ghost" size="sm" className="mt-2">
                Cancel
              </Button>
            </div>
          )}

          {/* Joining */}
          {mode === 'joining' && (
            <div className="text-center py-4">
              <div className="text-white/50 text-sm">
                {isAutoMatch ? 'Connecting to opponent...' : 'Joining room...'}
              </div>
            </div>
          )}

          {/* Countdown — transitioning to game */}
          {mode === 'countdown' && (
            <div className="text-center py-4 space-y-3">
              <div className="flex justify-center gap-4">
                <div className="countdown-face-in-left">
                  <CharacterFace character={CHARACTERS[0]} expression="excited" size={56} />
                </div>
                <div className="text-4xl font-black text-white/80 self-center">VS</div>
                <div className="countdown-face-in-right">
                  <CharacterFace character={CHARACTERS[2]} expression="excited" size={56} />
                </div>
              </div>
              <div className="text-white/50 text-sm animate-pulse">
                Match starting...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
