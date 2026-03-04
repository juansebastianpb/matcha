/**
 * Centralized character & expression definitions.
 * Single source of truth — used by both the React UI and the Phaser game.
 */

// ── Expressions ────────────────────────────────────────────────
// Every character can show every expression.

export type Expression =
  | 'happy'
  | 'sleepy'
  | 'surprised'
  | 'cheeky'
  | 'dreamy'
  | 'excited'
  | 'scared'
  | 'dead'

export const EXPRESSIONS: Expression[] = [
  'happy',
  'sleepy',
  'surprised',
  'cheeky',
  'dreamy',
  'excited',
  'scared',
  'dead',
]

// ── Characters ─────────────────────────────────────────────────

export interface Character {
  id: number
  name: string
  bio: string
  color: string   // web hex
  fill: number    // Phaser hex
  border: number  // Phaser hex
  highlight: number // Phaser hex
}

export const CHARACTERS: Character[] = [
  {
    id: 0,
    name: 'Pip',
    bio: 'Optimist with zero survival instincts.',
    color: '#FFEAA7',
    fill: 0xffeaa7,
    border: 0xf0d48a,
    highlight: 0xfff3c4,
  },
  {
    id: 1,
    name: 'Lumi',
    bio: "Overthinks everything. Still hasn't decided.",
    color: '#74B9FF',
    fill: 0x74b9ff,
    border: 0x5a9fd4,
    highlight: 0xa0d2ff,
  },
  {
    id: 2,
    name: 'Fizz',
    bio: 'Acts first. Thinks maybe later.',
    color: '#FD79A8',
    fill: 0xfd79a8,
    border: 0xd4608a,
    highlight: 0xffa0c0,
  },
  {
    id: 3,
    name: 'Koko',
    bio: 'Unbothered. Unmatched. Unaware.',
    color: '#55EFC4',
    fill: 0x55efc4,
    border: 0x40c9a2,
    highlight: 0x80ffd8,
  },
  {
    id: 4,
    name: 'Nyx',
    bio: 'Predicted this. Predicted everything.',
    color: '#DDA0DD',
    fill: 0xdda0dd,
    border: 0xbb80bb,
    highlight: 0xeec0ee,
  },
  {
    id: 5,
    name: 'Blaze',
    bio: 'Treats every moment like a season finale.',
    color: '#F5F0E8',
    fill: 0xf5f0e8,
    border: 0xddd8d0,
    highlight: 0xfcfaf7,
  },
]

// ── Garbage block (not a playable tile) ─────────────────────

export const GARBAGE_BLOCK = {
  name: 'Garbage',
  color: '#9ba4b5',
  fill: 0x9ba4b5,
  border: 0x7d879a,
  highlight: 0xc5cdd8,
  eyeColor: 0x2d3436,
}
