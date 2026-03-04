import type { AIDifficulty } from '../game/ai/PuzzleAI'

export interface CpuRival {
  name: string
  characterIndex: number
}

export const CPU_RIVALS: Record<AIDifficulty, CpuRival> = {
  easy:   { name: 'Pip',  characterIndex: 0 },
  medium: { name: 'Koko', characterIndex: 3 },
  hard:   { name: 'Nyx',  characterIndex: 4 },
}
