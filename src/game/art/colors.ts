export interface TilePalette {
  fill: number
  border: number
  highlight: number
  hex: string
}

export const TILE_PALETTES: TilePalette[] = [
  // Yellow - Happy
  { fill: 0xffeaa7, border: 0xf0d48a, highlight: 0xfff3c4, hex: '#FFEAA7' },
  // Blue - Sleepy
  { fill: 0x74b9ff, border: 0x5a9fd4, highlight: 0xa0d2ff, hex: '#74B9FF' },
  // Pink - Surprised
  { fill: 0xfd79a8, border: 0xd4608a, highlight: 0xffa0c0, hex: '#FD79A8' },
  // Green - Cheeky
  { fill: 0x55efc4, border: 0x40c9a2, highlight: 0x80ffd8, hex: '#55EFC4' },
  // Purple - Dreamy
  { fill: 0xdda0dd, border: 0xbb80bb, highlight: 0xeec0ee, hex: '#DDA0DD' },
  // Orange - Excited
  { fill: 0xfdcb6e, border: 0xd4a950, highlight: 0xffe098, hex: '#FDCB6E' },
]
