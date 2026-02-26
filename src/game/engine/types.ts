// Engine types adapted from panel-league (MIT)

export interface Block {
  color: string | null
  flashTimer: number
  floatTimer: number
  swapTimer: number
  chaining: boolean
  garbage: boolean
  matching?: boolean
  preventMatching?: boolean
  slab?: GarbageSlab
  shocking?: boolean
}

export interface GarbageSlab {
  x: number
  y: number
  width: number
  height: number
  flashTime: number
  flashTimer: number
  uuid?: string
}

export interface GameState {
  time: number
  width: number
  height: number
  flashTime: number
  floatTime: number
  swapTime: number
  garbageFlashTime: number
  chainNumber: number
  initialRows: number
  RNG: string
  nextRow: Block[] | null
  blocks: Block[]
  blockTypes: string[]
  addRowWhileActive: boolean
  garbage: GarbageSlab[]
  dirty: boolean
  score: number
  scoringSystem: string
}

export interface GameEvent {
  time: number
  type: 'swap' | 'addRow' | 'addGarbage' | 'clearAll' | 'refill'
  player?: number
  index?: number
  slab?: { x: number; width: number; height: number; uuid?: string }
}

export interface GameEffect {
  type: 'addRow' | 'gameOver' | 'matchMade' | 'chainMatchMade' | 'chainDone' | 'blockLanded' | 'flashDone'
  time?: number
  player?: number
  chainNumber?: number
  indices?: number[]
  index?: number
}

export interface GameOptions {
  width?: number
  height?: number
  flashTime?: number
  floatTime?: number
  swapTime?: number
  garbageFlashTime?: number
  initialRows?: number
  blockTypes?: string[]
  addRowWhileActive?: boolean
  scoringSystem?: string
  colors?: (string | null)[]
}
