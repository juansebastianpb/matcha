import { CHARACTERS } from '../../characters'

export interface TilePalette {
  fill: number
  border: number
  highlight: number
  hex: string
}

export const TILE_PALETTES: TilePalette[] = CHARACTERS.map((c) => ({
  fill: c.fill,
  border: c.border,
  highlight: c.highlight,
  hex: c.color,
}))
