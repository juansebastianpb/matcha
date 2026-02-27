import { create } from 'zustand'

export interface HypeEvent {
  text: string
  color: string
  fontSize: number
  id: number
}

export interface CelebrationEvent {
  intensity: number // 1-5 scale
  type: 'combo' | 'chain'
  id: number
}

interface GameState {
  score: number
  displayScore: number
  time: number
  chain: number
  maxChain: number
  maxCombo: number
  blocksCleared: number
  finalScore: number
  isPlaying: boolean
  isGameOver: boolean
  excitement: number
  eventPulse: number
  countdown: number | null
  hypeEvent: HypeEvent | null
  celebrationEvent: CelebrationEvent | null

  setCountdown: (v: number | null) => void
  setScore: (score: number) => void
  tickDisplayScore: () => void
  setTime: (time: number) => void
  setChain: (chain: number) => void
  setMaxChain: (maxChain: number) => void
  setMaxCombo: (maxCombo: number) => void
  setBlocksCleared: (count: number) => void
  setFinalScore: (score: number) => void
  setPlaying: (playing: boolean) => void
  setGameOver: (over: boolean) => void
  setExcitement: (level: number) => void
  emitHype: (text: string, color: string, fontSize: number) => void
  emitCelebration: (type: 'combo' | 'chain', intensity: number) => void
  reset: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  score: 0,
  displayScore: 0,
  time: 90,
  chain: 0,
  maxChain: 0,
  maxCombo: 0,
  blocksCleared: 0,
  finalScore: 0,
  isPlaying: false,
  isGameOver: false,
  excitement: 0,
  eventPulse: 0,
  countdown: null,
  hypeEvent: null,
  celebrationEvent: null,

  setCountdown: (v) => set({ countdown: v }),
  setScore: (score) => set({ score }),
  tickDisplayScore: () => {
    const { score, displayScore } = get()
    if (displayScore === score) return
    const diff = score - displayScore
    const step = Math.max(1, Math.ceil(Math.abs(diff) * 0.15))
    const next = diff > 0
      ? Math.min(displayScore + step, score)
      : Math.max(displayScore - step, score)
    set({ displayScore: next })
  },
  setTime: (time) => set({ time }),
  setChain: (chain) => set({ chain }),
  setMaxChain: (maxChain) => set({ maxChain }),
  setMaxCombo: (maxCombo) => set({ maxCombo }),
  setBlocksCleared: (count) => set({ blocksCleared: count }),
  setFinalScore: (score) => set({ finalScore: score }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setGameOver: (over) => set({ isGameOver: over }),
  setExcitement: (level) => set((s) => ({ excitement: level, eventPulse: s.eventPulse + 1 })),
  emitHype: (text, color, fontSize) =>
    set((s) => ({ hypeEvent: { text, color, fontSize, id: (s.hypeEvent?.id ?? 0) + 1 } })),
  emitCelebration: (type, intensity) =>
    set((s) => ({ celebrationEvent: { type, intensity, id: (s.celebrationEvent?.id ?? 0) + 1 } })),
  reset: () =>
    set({
      score: 0,
      displayScore: 0,
      time: 90,
      chain: 0,
      maxChain: 0,
      maxCombo: 0,
      blocksCleared: 0,
      finalScore: 0,
      isPlaying: false,
      isGameOver: false,
      excitement: 0,
      eventPulse: 0,
      countdown: null,
      hypeEvent: null,
      celebrationEvent: null,
    }),
}))
