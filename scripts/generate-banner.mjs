/**
 * Generate a 1200×400 banner with all characters and the Swingi logo.
 * Run: node scripts/generate-banner.mjs
 */
import { Resvg } from '@resvg/resvg-js'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')

const F = '#2d3436'
const BG = '#1a1b2e'

function darken(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const d = (v) => Math.round(v * (1 - amount)).toString(16).padStart(2, '0')
  return `#${d(r)}${d(g)}${d(b)}`
}

const CHARACTERS = [
  { id: 0, name: 'pip', color: '#FFEAA7' },
  { id: 1, name: 'lumi', color: '#74B9FF' },
  { id: 2, name: 'fizz', color: '#FD79A8' },
  { id: 3, name: 'koko', color: '#55EFC4' },
  { id: 4, name: 'nyx', color: '#DDA0DD' },
  { id: 5, name: 'blaze', color: '#F5F0E8' },
]

function behindTraits(id, color, darker) {
  switch (id) {
    case 0:
      return `
        <circle cx="12" cy="10" r="8" fill="${color}" />
        <circle cx="12" cy="10" r="5" fill="${darker}" />
        <circle cx="48" cy="10" r="8" fill="${color}" />
        <circle cx="48" cy="10" r="5" fill="${darker}" />
      `
    case 2:
      return `
        <polygon points="8,18 14,0 22,16" fill="${color}" />
        <polygon points="10,16 14,4 20,15" fill="${darker}" />
        <polygon points="38,16 46,0 52,18" fill="${color}" />
        <polygon points="40,15 46,4 50,16" fill="${darker}" />
      `
    default:
      return ''
  }
}

function frontTraits(id, color, darker) {
  switch (id) {
    case 1:
      return `
        <line x1="30" y1="6" x2="30" y2="-2" stroke="${darker}" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="30" cy="-4" r="4" fill="white" opacity="0.7" />
        <circle cx="30" cy="-4" r="2.5" fill="${color}" />
      `
    case 2:
      return `
        <line x1="6" y1="32" x2="16" y2="34" stroke="${F}" stroke-width="1.5" opacity="0.3" stroke-linecap="round" />
        <line x1="7" y1="36" x2="16" y2="36" stroke="${F}" stroke-width="1.5" opacity="0.3" stroke-linecap="round" />
        <line x1="44" y1="34" x2="54" y2="32" stroke="${F}" stroke-width="1.5" opacity="0.3" stroke-linecap="round" />
        <line x1="44" y1="36" x2="53" y2="36" stroke="${F}" stroke-width="1.5" opacity="0.3" stroke-linecap="round" />
      `
    case 3:
      return `
        <line x1="30" y1="6" x2="30" y2="-1" stroke="#40c9a2" stroke-width="2" stroke-linecap="round" />
        <ellipse cx="35" cy="-2" rx="7" ry="4" fill="#40c9a2" transform="rotate(-20 35 -2)" />
        <ellipse cx="25" cy="-1" rx="6" ry="3.5" fill="#55efc4" transform="rotate(20 25 -1)" />
      `
    case 4:
      return `
        <path d="M18,8 Q14,-2 10,-4" stroke="${darker}" stroke-width="4" fill="none" stroke-linecap="round" />
        <path d="M42,8 Q46,-2 50,-4" stroke="${darker}" stroke-width="4" fill="none" stroke-linecap="round" />
        <circle cx="10" cy="-4" r="2.5" fill="${color}" />
        <circle cx="50" cy="-4" r="2.5" fill="${color}" />
      `
    case 5:
      return `
        <path d="M20,8 L22,-1 L26,6 L30,-5 L34,6 L38,-1 L40,8" fill="#f5f0e8" opacity="0.8" />
        <path d="M22,7 L25,0 L28,6 L30,-2 L32,6 L35,0 L38,7" fill="#f5f0e8" opacity="0.9" />
      `
    default:
      return ''
  }
}

function happyFace(id) {
  switch (id) {
    case 0:
      return `
        <circle cx="21" cy="25" r="5" fill="${F}" />
        <circle cx="39" cy="25" r="5" fill="${F}" />
        <circle cx="22.5" cy="23.5" r="2" fill="white" />
        <circle cx="40.5" cy="23.5" r="2" fill="white" />
        <path d="M22,37 Q30,46 38,37" stroke="${F}" stroke-width="3" fill="none" stroke-linecap="round" />
        <circle cx="14" cy="35" r="5" fill="#ffb8b8" opacity="0.35" />
        <circle cx="46" cy="35" r="5" fill="#ffb8b8" opacity="0.35" />
      `
    case 1:
      return `
        <circle cx="21" cy="27" r="3" fill="${F}" />
        <circle cx="39" cy="27" r="3" fill="${F}" />
        <line x1="17" y1="20" x2="25" y2="19" stroke="${F}" stroke-width="2" opacity="0.6" stroke-linecap="round" />
        <line x1="35" y1="19" x2="43" y2="20" stroke="${F}" stroke-width="2" opacity="0.6" stroke-linecap="round" />
        <path d="M25,38 Q30,42 35,38" stroke="${F}" stroke-width="2.5" fill="none" stroke-linecap="round" />
      `
    case 2:
      return `
        <circle cx="21" cy="25" r="5" fill="${F}" />
        <circle cx="22.5" cy="23.5" r="2" fill="white" />
        <path d="M34,26 Q39,22 44,26" stroke="${F}" stroke-width="3" fill="none" stroke-linecap="round" />
        <path d="M20,37 Q30,44 40,37" stroke="${F}" stroke-width="3" fill="none" stroke-linecap="round" />
        <polygon points="35,37 37,37 36,42" fill="white" />
      `
    case 3:
      return `
        <circle cx="22" cy="26" r="2.5" fill="${F}" />
        <circle cx="38" cy="26" r="2.5" fill="${F}" />
        <path d="M25,38 Q30,41 35,38" stroke="${F}" stroke-width="2.5" fill="none" stroke-linecap="round" />
      `
    case 4:
      return `
        <path d="M16,27 Q21,22 26,27 Q21,30 16,27 Z" fill="${F}" />
        <path d="M34,27 Q39,22 44,27 Q39,30 34,27 Z" fill="${F}" />
        <line x1="15" y1="26" x2="13" y2="24" stroke="${F}" stroke-width="2" opacity="0.7" stroke-linecap="round" />
        <line x1="45" y1="26" x2="47" y2="24" stroke="${F}" stroke-width="2" opacity="0.7" stroke-linecap="round" />
        <path d="M24,38 Q32,42 38,36" stroke="${F}" stroke-width="2.5" fill="none" stroke-linecap="round" />
      `
    case 5:
      return `
        <circle cx="21" cy="24" r="7" fill="${F}" />
        <circle cx="39" cy="24" r="7" fill="${F}" />
        <circle cx="23" cy="22" r="3" fill="white" />
        <circle cx="41" cy="22" r="3" fill="white" />
        <path d="M18,37 Q30,48 42,37" stroke="${F}" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <line x1="26" y1="40" x2="34" y2="40" stroke="white" stroke-width="1.5" opacity="0.5" stroke-linecap="round" />
      `
    default:
      return ''
  }
}

function characterSvg(char) {
  const darker = darken(char.color, 0.15)
  return `
    ${behindTraits(char.id, char.color, darker)}
    <circle cx="31" cy="32" r="26" fill="black" opacity="0.1" />
    <circle cx="30" cy="30" r="26" fill="${char.color}" />
    <ellipse cx="25" cy="20" rx="13" ry="7" fill="white" opacity="0.25" />
    ${frontTraits(char.id, char.color, darker)}
    ${happyFace(char.id)}
  `
}

// Layout: 1200×400, characters arranged 3 left + logo center + 3 right
// Character face viewBox is -4,-10 68,68 → effective ~68×68 units
// We'll place characters at size ~110px, centered vertically at y=200

const W = 1200
const H = 400
const charSize = 120
const charY = (H - charSize) / 2 + 10 // slightly below center to leave room for logo

// 3 characters on the left, 3 on the right, logo in the center
// Left group: Pip, Lumi, Fizz at x = 80, 200, 320
// Right group: Koko, Nyx, Blaze at x = 760, 880, 1000
// Logo centered at x=600

const leftChars = [CHARACTERS[0], CHARACTERS[1], CHARACTERS[2]]
const rightChars = [CHARACTERS[3], CHARACTERS[4], CHARACTERS[5]]

const leftPositions = [60, 180, 300]
const rightPositions = [780, 900, 1020]

// Slight vertical offsets for playful arrangement
const yOffsets = [-15, 10, -5]

let charElements = ''

leftChars.forEach((char, i) => {
  const x = leftPositions[i]
  const y = charY + yOffsets[i]
  charElements += `<g transform="translate(${x}, ${y})">
    <svg width="${charSize}" height="${charSize}" viewBox="-4 -10 68 68" overflow="visible">
      ${characterSvg(char)}
    </svg>
  </g>\n`
})

rightChars.forEach((char, i) => {
  const x = rightPositions[i]
  const y = charY + yOffsets[i]
  charElements += `<g transform="translate(${x}, ${y})">
    <svg width="${charSize}" height="${charSize}" viewBox="-4 -10 68 68" overflow="visible">
      ${characterSvg(char)}
    </svg>
  </g>\n`
})

// Swingi logo — gradient text from pink-300 (#f9a8d4) via amber-200 (#fde68a) to yellow-200 (#fef08a)
const logoSvg = `
  <defs>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f9a8d4" />
      <stop offset="50%" stop-color="#fde68a" />
      <stop offset="100%" stop-color="#fef08a" />
    </linearGradient>
  </defs>
  <text
    x="${W / 2}"
    y="${H / 2 + 18}"
    text-anchor="middle"
    font-family="'Nunito', 'Arial Rounded MT Bold', 'Helvetica Rounded', sans-serif"
    font-weight="900"
    font-size="82"
    fill="url(#logoGrad)"
  >Swingi</text>
`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${BG}" />

  <!-- Characters -->
  ${charElements}

  <!-- Logo -->
  ${logoSvg}
</svg>`

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: {
    fontFiles: ['/tmp/Nunito-Black.ttf'],
    loadSystemFonts: true,
  },
})
const pngData = resvg.render()
const pngBuffer = pngData.asPng()
const outPath = join(outDir, 'banner.png')
writeFileSync(outPath, pngBuffer)
console.log(`✓ ${outPath} (${W}×${H})`)
