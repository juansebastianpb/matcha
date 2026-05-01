import { useMatchStore } from '../stores/matchStore'
import { debug } from '../lib/debug'

export interface ChallengeReadyData {
  userId: string
  email: string
  balance: number
  entryFee: number
  token: string
}

export interface ChallengeOpponent {
  id: string
  email: string
  username: string
  skillRating: number
}

export interface ChallengeMatchData {
  matchId: string
  opponent: ChallengeOpponent
  isRematch: boolean
  roundNumber: number
}

export interface ChallengeConfig {
  gameId: string
  apiKey?: string
  entryFee?: number
  mode?: 'versus' | 'score'
  matchmaking?: 'skill' | 'fifo' | false
  showButton?: boolean
  onReady?: (data: ChallengeReadyData) => void
  onMatchStart?: (data: ChallengeMatchData) => void
  onCancel?: (data: { userId: string }) => void
  onError?: (error: unknown) => void
}

interface ChallengeWidget {
  init(config: ChallengeConfig): void
  open(): void
  close(): void
  renderButton(
    selector: string,
    options?: { fullWidth?: boolean; variant?: string; size?: string },
  ): void
  updateScore(score: number): void
  gameEnded(data: { matchId: string; score: number; opponent?: ChallengeOpponent; gameData?: Record<string, unknown> }): void
  showWin(data: { matchId: string; opponent: ChallengeOpponent; profit?: number }): void
  showLose(data: { matchId: string; opponent: ChallengeOpponent; loss?: number }): void
  showDraw(data: { matchId: string; opponent: ChallengeOpponent }): void
  settle(data: { matchId: string; winnerId?: string; gameData?: Record<string, unknown> }): void
  setPostMatchHandlers(handlers: {
    onMatchStarting?: (data: { matchId: string }) => void
    onNewOpponent?: () => void
  }): void
}

declare global {
  interface Window {
    Challenge?: ChallengeWidget
  }
}

const CHALLENGE_SCRIPT_URL =
  import.meta.env.VITE_CHALLENGE_WIDGET_URL ||
  'https://api.withchallenge.com/widget/dist/challenge-widget.js'

const CHALLENGE_GAME_ID = import.meta.env.VITE_CHALLENGE_GAME_ID || ''

// --- Shared state ---

let _userData: ChallengeReadyData | null = null
let _matchData: ChallengeMatchData | null = null
let _readyRetryInterval: ReturnType<typeof setInterval> | null = null

// Navigation callback — set by whichever page is active
let _navigateToGame: (() => void) | null = null

export function setNavigateToGame(fn: (() => void) | null) {
  debug('Challenge', `setNavigateToGame — ${fn ? 'SET' : 'CLEARED'}`)
  _navigateToGame = fn
}

export function getChallengeUserData(): ChallengeReadyData | null {
  return _userData
}

export function getChallengeMatchData(): ChallengeMatchData | null {
  return _matchData
}

// --- Supabase channel setup (runs outside React) ---

async function setupSupabaseChannel(matchData: ChallengeMatchData) {
  if (!_userData) {
    console.error('[Challenge] No user data when setting up channel')
    return
  }

  const isHost = _userData.email < matchData.opponent.email
  const roomCode = matchData.matchId

  debug('Challenge', 'Setting up Supabase channel', { isHost, roomCode, myEmail: _userData.email, opponentEmail: matchData.opponent.email })

  try {
    if (isHost) {
      await useMatchStore.getState().createRoom(roomCode)
    } else {
      await useMatchStore.getState().joinRoom(roomCode)
      // Both players join at the same time (unlike lobby flow where host waits).
      // Retry 'ready' signal until host responds with seeds.
      if (_readyRetryInterval) clearInterval(_readyRetryInterval)
      _readyRetryInterval = setInterval(() => {
        const { mode, channel } = useMatchStore.getState()
        if (mode === 'countdown' || mode === 'playing' || mode === 'finished') {
          clearInterval(_readyRetryInterval!)
          _readyRetryInterval = null
          return
        }
        debug('Challenge', 'Retrying ready signal...')
        channel?.sendReady()
      }, 500)
    }
  } catch (err) {
    console.error('[Challenge] Supabase channel setup failed:', err)
  }
}

export function cleanupChallengeRetry() {
  if (_readyRetryInterval) {
    clearInterval(_readyRetryInterval)
    _readyRetryInterval = null
  }
}

// --- Script loading ---

let scriptLoadPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.Challenge) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = CHALLENGE_SCRIPT_URL
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Challenge widget'))
    document.head.appendChild(script)
  })

  return scriptLoadPromise
}

// --- Single init ---

let initPromise: Promise<void> | null = null

export function initChallengeOnce(): Promise<void> {
  if (initPromise) return initPromise

  if (!CHALLENGE_GAME_ID) {
    return Promise.reject(new Error('VITE_CHALLENGE_GAME_ID not set'))
  }

  initPromise = loadScript().then(() => {
    const challenge = window.Challenge
    if (!challenge) throw new Error('Challenge widget not available')

    challenge.init({
      gameId: CHALLENGE_GAME_ID,
      entryFee: 2,
      mode: 'versus',
      matchmaking: 'skill',
      showButton: false,
      onReady: (data) => {
        _userData = data
        debug('Challenge', 'onReady', { userId: data.userId, email: data.email })
      },
      onMatchStart: (data) => {
        _matchData = data
        debug('Challenge', 'onMatchStart', {
          matchId: data.matchId,
          opponent: data.opponent.email,
          hasNavigateFn: !!_navigateToGame,
        })
        setupSupabaseChannel(data)
        if (_navigateToGame) {
          _navigateToGame()
        } else {
          console.error('[Challenge] onMatchStart fired but _navigateToGame is null — player will not navigate!')
        }
      },
      onCancel: () => {
        _matchData = null
        debug('Challenge', 'onCancel')
      },
      onError: (err) => {
        console.error('[Challenge] Error:', err)
      },
    })
  })

  return initPromise
}

export function getChallenge(): ChallengeWidget | null {
  return window.Challenge ?? null
}

// --- Server-side settlement (versus mode) ---
// Sends settle request to matcha's serverless function (api/challenge/settle.ts), which
// authenticates the caller and forwards to Challenge backend with the server-only API key.
// Pass winnerId=null (or omit) to settle as a draw.

export interface SettleResult {
  ok: boolean
  alreadySettled?: boolean
  error?: string
}

export async function settleMatch(
  matchId: string,
  winnerId: string | null,
  gameData?: Record<string, unknown>
): Promise<SettleResult> {
  if (!_userData?.token) {
    return { ok: false, error: 'Not authenticated' }
  }

  try {
    debug('Challenge', 'Settling match via matcha server', { matchId, winnerId })
    const res = await fetch('/api/challenge/settle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${_userData.token}`,
      },
      body: JSON.stringify({ matchId, winnerId, gameData }),
    })
    const data = (await res.json().catch(() => null)) as { error?: string; alreadySettled?: boolean } | null

    if (res.ok) {
      debug('Challenge', 'Match settled', data)
      return { ok: true, alreadySettled: !!data?.alreadySettled }
    }

    console.error('[Challenge] Settlement failed:', res.status, data)
    return { ok: false, error: data?.error || `HTTP ${res.status}` }
  } catch (err) {
    console.error('[Challenge] Settlement request failed:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}
