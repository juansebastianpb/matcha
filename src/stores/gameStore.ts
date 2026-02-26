import { create } from 'zustand'

interface GameState {
  score: number
  time: number
  chain: number
  maxChain: number
  maxCombo: number
  blocksCleared: number
  finalScore: number
  isPlaying: boolean
  isGameOver: boolean

  setScore: (score: number) => void
  setTime: (time: number) => void
  setChain: (chain: number) => void
  setMaxChain: (maxChain: number) => void
  setMaxCombo: (maxCombo: number) => void
  setBlocksCleared: (count: number) => void
  setFinalScore: (score: number) => void
  setPlaying: (playing: boolean) => void
  setGameOver: (over: boolean) => void
  reset: () => void
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  time: 90,
  chain: 0,
  maxChain: 0,
  maxCombo: 0,
  blocksCleared: 0,
  finalScore: 0,
  isPlaying: false,
  isGameOver: false,

  setScore: (score) => set({ score }),
  setTime: (time) => set({ time }),
  setChain: (chain) => set({ chain }),
  setMaxChain: (maxChain) => set({ maxChain }),
  setMaxCombo: (maxCombo) => set({ maxCombo }),
  setBlocksCleared: (count) => set({ blocksCleared: count }),
  setFinalScore: (score) => set({ finalScore: score }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setGameOver: (over) => set({ isGameOver: over }),
  reset: () =>
    set({
      score: 0,
      time: 90,
      chain: 0,
      maxChain: 0,
      maxCombo: 0,
      blocksCleared: 0,
      finalScore: 0,
      isPlaying: false,
      isGameOver: false,
    }),
}))
