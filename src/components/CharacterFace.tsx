/**
 * SVG kawaii face renderer.
 *
 * Each CHARACTER has unique physical traits (ears, horns, accessories).
 * Each EXPRESSION changes the eyes + mouth shared across all characters.
 * = 6 characters x 8 expressions = 48 visually distinct faces.
 */
import type { Character, Expression } from '../characters'
import { GARBAGE_BLOCK } from '../characters'

const F = '#2d3436'

interface Props {
  character: Character
  expression?: Expression
  size?: number
  className?: string
}

export function CharacterFace({ character, expression = 'happy', size = 60, className }: Props) {
  const darker = darken(character.color, 0.15)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      overflow="visible"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Behind-body features (ears, etc.) */}
      <BehindTraits id={character.id} color={character.color} darker={darker} />
      {/* Shadow */}
      <circle cx="31" cy="32" r="26" fill="black" opacity="0.1" />
      {/* Body */}
      <circle cx="30" cy="30" r="26" fill={character.color} />
      {/* Highlight */}
      <ellipse cx="25" cy="20" rx="13" ry="7" fill="white" opacity="0.25" />
      {/* On-top features (horns, antenna, leaf, etc.) */}
      <FrontTraits id={character.id} color={character.color} darker={darker} />
      {/* Expression */}
      <ExpressionFace expr={expression} charId={character.id} />
    </svg>
  )
}

// ── Character-unique physical traits ───────────────────────────

// Pip (0):   Round bear ears
// Lumi (1):  Antenna with glowing tip
// Fizz (2):  Cat ears + whiskers
// Koko (3):  Leaf sprout on top
// Nyx (4):   Curved devil horns
// Blaze (5): Flame crown

function BehindTraits({ id, color, darker }: { id: number; color: string; darker: string }) {
  switch (id) {
    case 0: // Pip — round bear ears
      return (
        <>
          <circle cx="12" cy="10" r="8" fill={color} />
          <circle cx="12" cy="10" r="5" fill={darker} />
          <circle cx="48" cy="10" r="8" fill={color} />
          <circle cx="48" cy="10" r="5" fill={darker} />
        </>
      )
    case 2: // Fizz — pointy cat ears
      return (
        <>
          <polygon points="8,18 14,0 22,16" fill={color} />
          <polygon points="10,16 14,4 20,15" fill={darker} />
          <polygon points="38,16 46,0 52,18" fill={color} />
          <polygon points="40,15 46,4 50,16" fill={darker} />
        </>
      )
    default:
      return null
  }
}

function FrontTraits({ id, color, darker }: { id: number; color: string; darker: string }) {
  switch (id) {
    case 0: // Pip — already has ears behind, add rosy inner ear effect
      return null
    case 1: // Lumi — antenna with glowing orb
      return (
        <>
          <line x1="30" y1="6" x2="30" y2="-2" stroke={darker} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="30" cy="-4" r="4" fill="white" opacity="0.7" />
          <circle cx="30" cy="-4" r="2.5" fill={color} />
        </>
      )
    case 2: // Fizz — whiskers
      return (
        <>
          <line x1="6" y1="32" x2="16" y2="34" stroke={F} strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
          <line x1="7" y1="36" x2="16" y2="36" stroke={F} strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
          <line x1="44" y1="34" x2="54" y2="32" stroke={F} strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
          <line x1="44" y1="36" x2="53" y2="36" stroke={F} strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
        </>
      )
    case 3: // Koko — leaf sprout
      return (
        <>
          <line x1="30" y1="6" x2="30" y2="-1" stroke="#40c9a2" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="35" cy="-2" rx="7" ry="4" fill="#40c9a2" transform="rotate(-20 35 -2)" />
          <ellipse cx="25" cy="-1" rx="6" ry="3.5" fill="#55efc4" transform="rotate(20 25 -1)" />
        </>
      )
    case 4: // Nyx — curved horns
      return (
        <>
          <path d="M18,8 Q14,-2 10,-4" stroke={darker} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M42,8 Q46,-2 50,-4" stroke={darker} strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="10" cy="-4" r="2.5" fill={color} />
          <circle cx="50" cy="-4" r="2.5" fill={color} />
        </>
      )
    case 5: // Blaze — flame crown
      return (
        <>
          <path d="M20,8 L22,-1 L26,6 L30,-5 L34,6 L38,-1 L40,8" fill="#f5f0e8" opacity="0.8" />
          <path d="M22,7 L25,0 L28,6 L30,-2 L32,6 L35,0 L38,7" fill="#f5f0e8" opacity="0.9" />
        </>
      )
    default:
      return null
  }
}

// ── Expressions (per-character variants) ──────────────────────

function ExpressionFace({ expr, charId }: { expr: Expression; charId: number }) {
  switch (expr) {
    case 'happy': return <HappyFace c={charId} />
    case 'sleepy': return <SleepyFace c={charId} />
    case 'surprised': return <SurprisedFace c={charId} />
    case 'cheeky': return <CheekyFace c={charId} />
    case 'dreamy': return <DreamyFace c={charId} />
    case 'excited': return <ExcitedFace c={charId} />
    case 'scared': return <ScaredFace c={charId} />
    case 'dead': return <DeadFace c={charId} />
  }
}

function HappyFace({ c }: { c: number }) {
  switch (c) {
    case 0: // Pip — round dot eyes with shine, U-smile, blush
      return (
        <>
          <circle cx="21" cy="25" r="5" fill={F} />
          <circle cx="39" cy="25" r="5" fill={F} />
          <circle cx="22.5" cy="23.5" r="2" fill="white" />
          <circle cx="40.5" cy="23.5" r="2" fill="white" />
          <path d="M22,37 Q30,46 38,37" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="14" cy="35" r="5" fill="#ffb8b8" opacity="0.35" />
          <circle cx="46" cy="35" r="5" fill="#ffb8b8" opacity="0.35" />
        </>
      )
    case 1: // Lumi — small contemplative dots, raised brows, gentle arc
      return (
        <>
          <circle cx="21" cy="27" r="3" fill={F} />
          <circle cx="39" cy="27" r="3" fill={F} />
          <line x1="17" y1="20" x2="25" y2="19" stroke={F} strokeWidth="2" opacity="0.6" strokeLinecap="round" />
          <line x1="35" y1="19" x2="43" y2="20" stroke={F} strokeWidth="2" opacity="0.6" strokeLinecap="round" />
          <path d="M25,38 Q30,42 35,38" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )
    case 2: // Fizz — one open dot + one squinty, fang grin
      return (
        <>
          <circle cx="21" cy="25" r="5" fill={F} />
          <circle cx="22.5" cy="23.5" r="2" fill="white" />
          <path d="M34,26 Q39,22 44,26" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M20,37 Q30,44 40,37" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <polygon points="35,37 37,37 36,42" fill="white" />
        </>
      )
    case 3: // Koko — tiny relaxed dots, flat gentle smile
      return (
        <>
          <circle cx="22" cy="26" r="2.5" fill={F} />
          <circle cx="38" cy="26" r="2.5" fill={F} />
          <path d="M25,38 Q30,41 35,38" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )
    case 4: // Nyx — half-moon lidded eyes + lash lines, smirk
      return (
        <>
          <path d="M16,27 Q21,22 26,27 Q21,30 16,27 Z" fill={F} />
          <path d="M34,27 Q39,22 44,27 Q39,30 34,27 Z" fill={F} />
          <line x1="15" y1="26" x2="13" y2="24" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <line x1="45" y1="26" x2="47" y2="24" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <path d="M24,38 Q32,42 38,36" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )
    default: // Blaze (5) — BIG round eyes + big shine, WIDE open smile + tooth line
      return (
        <>
          <circle cx="21" cy="24" r="7" fill={F} />
          <circle cx="39" cy="24" r="7" fill={F} />
          <circle cx="23" cy="22" r="3" fill="white" />
          <circle cx="41" cy="22" r="3" fill="white" />
          <path d="M18,37 Q30,48 42,37" stroke={F} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <line x1="26" y1="40" x2="34" y2="40" stroke="white" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
        </>
      )
  }
}

function SleepyFace({ c }: { c: number }) {
  switch (c) {
    case 0: // Pip — closed arc eyes, tiny O mouth, zzZ
      return (
        <>
          <path d="M16,26 Q21,30 26,26" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M34,26 Q39,30 44,26" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="30" cy="38" rx="3" ry="2" fill={F} />
          <text x="42" y="18" fontSize="12" fill={F} opacity="0.5" fontWeight="900" fontFamily="sans-serif">Z</text>
          <text x="48" y="12" fontSize="8" fill={F} opacity="0.3" fontWeight="900" fontFamily="sans-serif">Z</text>
        </>
      )
    case 1: // Lumi — flat line eyes, barely-there mouth, zzZ
      return (
        <>
          <line x1="16" y1="26" x2="26" y2="26" stroke={F} strokeWidth="3" strokeLinecap="round" />
          <line x1="34" y1="26" x2="44" y2="26" stroke={F} strokeWidth="3" strokeLinecap="round" />
          <line x1="27" y1="38" x2="33" y2="38" stroke={F} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          <text x="42" y="18" fontSize="12" fill={F} opacity="0.5" fontWeight="900" fontFamily="sans-serif">Z</text>
          <text x="48" y="12" fontSize="8" fill={F} opacity="0.3" fontWeight="900" fontFamily="sans-serif">Z</text>
        </>
      )
    case 2: // Fizz — flat line eyes, fang peeking out
      return (
        <>
          <line x1="16" y1="26" x2="26" y2="26" stroke={F} strokeWidth="3" strokeLinecap="round" />
          <line x1="34" y1="26" x2="44" y2="26" stroke={F} strokeWidth="3" strokeLinecap="round" />
          <line x1="26" y1="38" x2="34" y2="38" stroke={F} strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
          <polygon points="33,38 35,38 34,42" fill="white" />
        </>
      )
    case 3: // Koko — tiny barely-open dots, no mouth
      return (
        <>
          <circle cx="22" cy="26" r="1.5" fill={F} opacity="0.6" />
          <circle cx="38" cy="26" r="1.5" fill={F} opacity="0.6" />
        </>
      )
    case 4: // Nyx — heavy closed arcs with lashes, flat line
      return (
        <>
          <path d="M16,27 Q21,30 26,27" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M34,27 Q39,30 44,27" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <line x1="15" y1="27" x2="13" y2="25" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <line x1="45" y1="27" x2="47" y2="25" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <line x1="26" y1="39" x2="34" y2="39" stroke={F} strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
        </>
      )
    default: // Blaze (5) — droopy half-closed eyes, small frown
      return (
        <>
          <line x1="16" y1="27" x2="26" y2="27" stroke={F} strokeWidth="3" strokeLinecap="round" />
          <path d="M16,27 Q21,24 26,27" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <line x1="34" y1="27" x2="44" y2="27" stroke={F} strokeWidth="3" strokeLinecap="round" />
          <path d="M34,27 Q39,24 44,27" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M24,40 Q30,37 36,40" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )
  }
}

function SurprisedFace({ c }: { c: number }) {
  switch (c) {
    case 0: // Pip — huge round eyes + shine, O mouth
      return (
        <>
          <circle cx="21" cy="25" r="7" fill={F} />
          <circle cx="39" cy="25" r="7" fill={F} />
          <circle cx="23" cy="23" r="3" fill="white" />
          <circle cx="41" cy="23" r="3" fill="white" />
          <ellipse cx="30" cy="40" rx="5" ry="4" fill={F} />
          <ellipse cx="30" cy="40" rx="3" ry="2.5" fill="#e17055" />
        </>
      )
    case 1: // Lumi — wide open eyes, raised brows, small O
      return (
        <>
          <circle cx="21" cy="25" r="5" fill={F} />
          <circle cx="39" cy="25" r="5" fill={F} />
          <circle cx="22.5" cy="23.5" r="2" fill="white" />
          <circle cx="40.5" cy="23.5" r="2" fill="white" />
          <line x1="17" y1="17" x2="25" y2="17" stroke={F} strokeWidth="2" opacity="0.6" strokeLinecap="round" />
          <line x1="35" y1="17" x2="43" y2="17" stroke={F} strokeWidth="2" opacity="0.6" strokeLinecap="round" />
          <ellipse cx="30" cy="40" rx="3" ry="2.5" fill={F} />
        </>
      )
    case 2: // Fizz — both eyes wide open, big O + fang
      return (
        <>
          <circle cx="21" cy="25" r="6" fill={F} />
          <circle cx="39" cy="25" r="6" fill={F} />
          <circle cx="23" cy="23" r="2.5" fill="white" />
          <circle cx="41" cy="23" r="2.5" fill="white" />
          <ellipse cx="30" cy="40" rx="5" ry="4" fill={F} />
          <ellipse cx="30" cy="40" rx="3" ry="2.5" fill="#e17055" />
          <polygon points="34,36 36,36 35,40" fill="white" />
        </>
      )
    case 3: // Koko — slightly bigger dots, small O
      return (
        <>
          <circle cx="22" cy="26" r="3.5" fill={F} />
          <circle cx="38" cy="26" r="3.5" fill={F} />
          <ellipse cx="30" cy="40" rx="3" ry="2" fill={F} />
        </>
      )
    case 4: // Nyx — wide eyes, lashes raised, O mouth
      return (
        <>
          <circle cx="21" cy="25" r="6" fill={F} />
          <circle cx="39" cy="25" r="6" fill={F} />
          <circle cx="22.5" cy="23.5" r="2.5" fill="white" />
          <circle cx="40.5" cy="23.5" r="2.5" fill="white" />
          <line x1="15" y1="22" x2="13" y2="19" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <line x1="45" y1="22" x2="47" y2="19" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <ellipse cx="30" cy="40" rx="4" ry="3" fill={F} />
          <ellipse cx="30" cy="40" rx="2.5" ry="2" fill="#e17055" />
        </>
      )
    default: // Blaze (5) — enormous eyes, giant O mouth
      return (
        <>
          <circle cx="21" cy="24" r="8" fill={F} />
          <circle cx="39" cy="24" r="8" fill={F} />
          <circle cx="24" cy="21" r="3.5" fill="white" />
          <circle cx="42" cy="21" r="3.5" fill="white" />
          <ellipse cx="30" cy="41" rx="7" ry="5" fill={F} />
          <ellipse cx="30" cy="41" rx="5" ry="3.5" fill="#e17055" />
        </>
      )
  }
}

function CheekyFace({ c }: { c: number }) {
  switch (c) {
    case 0: // Pip — one open dot + one wink, tongue out
      return (
        <>
          <circle cx="21" cy="25" r="5" fill={F} />
          <circle cx="22.5" cy="23.5" r="2" fill="white" />
          <path d="M34,26 Q39,20 44,26" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M22,37 Q30,43 38,36" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="37" cy="41" rx="5" ry="4" fill="#e17055" />
        </>
      )
    case 1: // Lumi — side-looking dots, raised brow, small smirk
      return (
        <>
          <circle cx="23" cy="27" r="3" fill={F} />
          <circle cx="41" cy="27" r="3" fill={F} />
          <line x1="17" y1="19" x2="25" y2="20" stroke={F} strokeWidth="2" opacity="0.6" strokeLinecap="round" />
          <line x1="35" y1="21" x2="43" y2="20" stroke={F} strokeWidth="2" opacity="0.6" strokeLinecap="round" />
          <path d="M26,38 Q33,41 38,37" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )
    case 2: // Fizz — both winking (^^), big tongue out
      return (
        <>
          <path d="M16,28 Q21,20 26,28" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M34,28 Q39,20 44,28" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M20,37 Q30,44 40,37" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="30" cy="43" rx="6" ry="4" fill="#e17055" />
        </>
      )
    case 3: // Koko — looking to the side, one-sided smile
      return (
        <>
          <circle cx="24" cy="26" r="2.5" fill={F} />
          <circle cx="40" cy="26" r="2.5" fill={F} />
          <path d="M25,39 Q30,41 35,37" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )
    case 4: // Nyx — one lidded eye + one open dot, knowing smirk + tongue
      return (
        <>
          <path d="M16,27 Q21,23 26,27 Q21,29 16,27 Z" fill={F} />
          <line x1="15" y1="26" x2="13" y2="24" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <circle cx="39" cy="25" r="5" fill={F} />
          <circle cx="40.5" cy="23.5" r="2" fill="white" />
          <path d="M24,38 Q32,42 38,36" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <ellipse cx="37" cy="40" rx="4" ry="3" fill="#e17055" />
        </>
      )
    default: // Blaze (5) — one dot + one star, huge side grin
      return (
        <>
          <circle cx="21" cy="24" r="7" fill={F} />
          <circle cx="23" cy="22" r="3" fill="white" />
          <circle cx="39" cy="24" r="7" fill={F} />
          <StarPupil x={40} y={23} s={5} />
          <path d="M18,37 Q30,46 42,35" stroke={F} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </>
      )
  }
}

function DreamyFace({ c }: { c: number }) {
  switch (c) {
    case 0: // Pip — heart eyes, gentle smile, sparkles
      return (
        <>
          <Heart x={21} y={25} s={8} />
          <Heart x={39} y={25} s={8} />
          <path d="M24,38 Q30,42 36,38" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <Sparkle x={12} y={16} s={4} />
          <Sparkle x={49} y={14} s={3} />
        </>
      )
    case 1: // Lumi — upward-gazing dots, soft U-smile, sparkle
      return (
        <>
          <circle cx="21" cy="23" r="3" fill={F} />
          <circle cx="39" cy="23" r="3" fill={F} />
          <path d="M24,37 Q30,42 36,37" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <Sparkle x={49} y={14} s={3} />
        </>
      )
    case 2: // Fizz — heart eyes, small content smile
      return (
        <>
          <Heart x={21} y={25} s={8} />
          <Heart x={39} y={25} s={8} />
          <path d="M26,38 Q30,41 34,38" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )
    case 3: // Koko — closed happy arcs (^_^), blush, sparkle
      return (
        <>
          <path d="M17,28 Q22,22 27,28" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M33,28 Q38,22 43,28" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="16" cy="34" r="4" fill="#ffb8b8" opacity="0.35" />
          <circle cx="44" cy="34" r="4" fill="#ffb8b8" opacity="0.35" />
          <Sparkle x={49} y={14} s={3} />
        </>
      )
    case 4: // Nyx — half-lidded with stars inside, curve smile
      return (
        <>
          <path d="M16,27 Q21,22 26,27 Q21,30 16,27 Z" fill={F} />
          <path d="M34,27 Q39,22 44,27 Q39,30 34,27 Z" fill={F} />
          <StarPupil x={21} y={26} s={3} />
          <StarPupil x={39} y={26} s={3} />
          <line x1="15" y1="26" x2="13" y2="24" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <line x1="45" y1="26" x2="47" y2="24" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <path d="M24,38 Q30,42 36,38" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )
    default: // Blaze (5) — big heart eyes, wide happy smile, sparkles
      return (
        <>
          <Heart x={21} y={24} s={11} />
          <Heart x={39} y={24} s={11} />
          <path d="M18,37 Q30,48 42,37" stroke={F} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <Sparkle x={10} y={14} s={4} />
          <Sparkle x={50} y={12} s={3.5} />
        </>
      )
  }
}

function ExcitedFace({ c }: { c: number }) {
  switch (c) {
    case 0: // Pip — big eyes with stars, D-shaped open mouth
      return (
        <>
          <circle cx="21" cy="24" r="6" fill={F} />
          <circle cx="39" cy="24" r="6" fill={F} />
          <StarPupil x={22} y={23} s={4.5} />
          <StarPupil x={40} y={23} s={4.5} />
          <path d="M20,36 Q30,48 40,36 Z" fill={F} />
          <path d="M22,37 Q30,46 38,37 Z" fill="#e17055" />
        </>
      )
    case 1: // Lumi — wide eyes with star pupils, open smile
      return (
        <>
          <circle cx="21" cy="25" r="5" fill={F} />
          <circle cx="39" cy="25" r="5" fill={F} />
          <StarPupil x={22} y={24} s={3.5} />
          <StarPupil x={40} y={24} s={3.5} />
          <path d="M22,37 Q30,45 38,37 Z" fill={F} />
          <path d="M24,38 Q30,43 36,38 Z" fill="#e17055" />
        </>
      )
    case 2: // Fizz — huge eyes with stars, open mouth + fang
      return (
        <>
          <circle cx="21" cy="24" r="7" fill={F} />
          <circle cx="39" cy="24" r="7" fill={F} />
          <StarPupil x={22} y={23} s={5} />
          <StarPupil x={40} y={23} s={5} />
          <path d="M20,36 Q30,48 40,36 Z" fill={F} />
          <path d="M22,37 Q30,46 38,37 Z" fill="#e17055" />
          <polygon points="35,36 37,36 36,40" fill="white" />
        </>
      )
    case 3: // Koko — actual open eyes (rare!), genuine smile
      return (
        <>
          <circle cx="22" cy="26" r="4" fill={F} />
          <circle cx="38" cy="26" r="4" fill={F} />
          <circle cx="23" cy="25" r="1.5" fill="white" />
          <circle cx="39" cy="25" r="1.5" fill="white" />
          <path d="M22,37 Q30,44 38,37" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )
    case 4: // Nyx — big eyes with stars, lashes, open grin
      return (
        <>
          <circle cx="21" cy="24" r="6" fill={F} />
          <circle cx="39" cy="24" r="6" fill={F} />
          <StarPupil x={22} y={23} s={4.5} />
          <StarPupil x={40} y={23} s={4.5} />
          <line x1="15" y1="22" x2="13" y2="19" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <line x1="45" y1="22" x2="47" y2="19" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <path d="M20,36 Q30,48 40,36 Z" fill={F} />
          <path d="M22,37 Q30,46 38,37 Z" fill="#e17055" />
        </>
      )
    default: // Blaze (5) — enormous star eyes, massive D-mouth
      return (
        <>
          <circle cx="21" cy="23" r="8" fill={F} />
          <circle cx="39" cy="23" r="8" fill={F} />
          <StarPupil x={22} y={22} s={6} />
          <StarPupil x={40} y={22} s={6} />
          <path d="M16,35 Q30,52 44,35 Z" fill={F} />
          <path d="M18,36 Q30,50 42,36 Z" fill="#e17055" />
        </>
      )
  }
}

function ScaredFace({ c }: { c: number }) {
  switch (c) {
    case 0: // Pip — round white eyes with shine + tiny pupils, zigzag mouth, sweat
      return (
        <>
          <circle cx="21" cy="25" r="7" fill="white" stroke={F} strokeWidth="2" />
          <circle cx="39" cy="25" r="7" fill="white" stroke={F} strokeWidth="2" />
          <circle cx="23" cy="27" r="2.5" fill={F} />
          <circle cx="41" cy="27" r="2.5" fill={F} />
          <circle cx="18" cy="22" r="2.5" fill="white" opacity="0.6" />
          <circle cx="36" cy="22" r="2.5" fill="white" opacity="0.6" />
          <path d="M20,40 L25,37 L30,40 L35,37 L40,40" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="48" cy="18" rx="3" ry="5" fill="#74b9ff" opacity="0.6" />
        </>
      )
    case 1: // Lumi — small white eyes + worried brows, wavy mouth, double sweat
      return (
        <>
          <circle cx="21" cy="27" r="4.5" fill="white" stroke={F} strokeWidth="2" />
          <circle cx="39" cy="27" r="4.5" fill="white" stroke={F} strokeWidth="2" />
          <circle cx="22" cy="28" r="1.5" fill={F} />
          <circle cx="40" cy="28" r="1.5" fill={F} />
          <line x1="16" y1="20" x2="25" y2="22" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <line x1="35" y1="22" x2="44" y2="20" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <path d="M22,39 Q26,42 30,39 Q34,36 38,39" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <ellipse cx="48" cy="16" rx="2.5" ry="4" fill="#74b9ff" opacity="0.6" />
          <ellipse cx="46" cy="22" rx="2" ry="3" fill="#74b9ff" opacity="0.6" />
        </>
      )
    case 2: // Fizz — one big white eye + one squinty, jagged mouth, sweat
      return (
        <>
          <circle cx="21" cy="25" r="7" fill="white" stroke={F} strokeWidth="2" />
          <circle cx="23" cy="27" r="2.5" fill={F} />
          <path d="M34,26 Q39,23 44,26" stroke={F} strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="39" cy="27" r="1.5" fill={F} />
          <path d="M20,39 L24,37 L27,41 L30,36 L33,41 L36,37 L40,39" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="48" cy="18" rx="3" ry="5" fill="#74b9ff" opacity="0.6" />
        </>
      )
    case 3: // Koko — slightly bigger white dots, flat frown (still chill), single sweat
      return (
        <>
          <circle cx="22" cy="26" r="4" fill="white" stroke={F} strokeWidth="1.5" />
          <circle cx="38" cy="26" r="4" fill="white" stroke={F} strokeWidth="1.5" />
          <circle cx="23" cy="27" r="1.5" fill={F} />
          <circle cx="39" cy="27" r="1.5" fill={F} />
          <path d="M25,40 Q30,38 35,40" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <ellipse cx="46" cy="20" rx="2" ry="3.5" fill="#74b9ff" opacity="0.5" />
        </>
      )
    case 4: // Nyx — white eyes with lashes, zigzag, tear drop
      return (
        <>
          <circle cx="21" cy="25" r="6" fill="white" stroke={F} strokeWidth="2" />
          <circle cx="39" cy="25" r="6" fill="white" stroke={F} strokeWidth="2" />
          <circle cx="22" cy="27" r="2" fill={F} />
          <circle cx="40" cy="27" r="2" fill={F} />
          <line x1="15" y1="22" x2="13" y2="20" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <line x1="45" y1="22" x2="47" y2="20" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <path d="M22,40 L26,37 L30,40 L34,37 L38,40" stroke={F} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="14" cy="33" rx="2.5" ry="4" fill="#74b9ff" opacity="0.7" />
        </>
      )
    default: // Blaze (5) — HUGE white eyes with big shine + big pupils, rectangle mouth + teeth, sweat drops
      return (
        <>
          <circle cx="21" cy="24" r="9" fill="white" stroke={F} strokeWidth="2" />
          <circle cx="39" cy="24" r="9" fill="white" stroke={F} strokeWidth="2" />
          <circle cx="24" cy="27" r="3.5" fill={F} />
          <circle cx="42" cy="27" r="3.5" fill={F} />
          <circle cx="18" cy="20" r="3.5" fill="white" opacity="0.6" />
          <circle cx="36" cy="20" r="3.5" fill="white" opacity="0.6" />
          <rect x="20" y="37" width="20" height="8" fill={F} />
          <rect x="22" y="37" width="4" height="3" fill="white" />
          <rect x="27" y="37" width="4" height="3" fill="white" />
          <rect x="32" y="37" width="4" height="3" fill="white" />
          <ellipse cx="48" cy="14" rx="3" ry="5" fill="#74b9ff" opacity="0.6" />
          <ellipse cx="50" cy="22" rx="2" ry="3.5" fill="#74b9ff" opacity="0.6" />
        </>
      )
  }
}

function DeadFace({ c }: { c: number }) {
  switch (c) {
    case 0: // Pip — X eyes, flat line, tongue out
      return (
        <>
          <line x1="15" y1="20" x2="27" y2="30" stroke={F} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="27" y1="20" x2="15" y2="30" stroke={F} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="33" y1="20" x2="45" y2="30" stroke={F} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="45" y1="20" x2="33" y2="30" stroke={F} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="22" y1="40" x2="38" y2="40" stroke={F} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="35" cy="44" rx="4" ry="3" fill="#e17055" />
        </>
      )
    case 1: // Lumi — spiral eyes, flat line
      return (
        <>
          <SpiralEye cx={21} cy={25} r={6} />
          <SpiralEye cx={39} cy={25} r={6} />
          <line x1="24" y1="40" x2="36" y2="40" stroke={F} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )
    case 2: // Fizz — X eyes, tongue out sideways + fang
      return (
        <>
          <line x1="15" y1="20" x2="27" y2="30" stroke={F} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="27" y1="20" x2="15" y2="30" stroke={F} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="33" y1="20" x2="45" y2="30" stroke={F} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="45" y1="20" x2="33" y2="30" stroke={F} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="22" y1="40" x2="38" y2="40" stroke={F} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="40" cy="43" rx="5" ry="3" fill="#e17055" />
          <polygon points="34,40 36,40 35,44" fill="white" />
        </>
      )
    case 3: // Koko — circle eyes (O_O), flat mouth
      return (
        <>
          <circle cx="22" cy="26" r="4" fill="none" stroke={F} strokeWidth="2.5" />
          <circle cx="38" cy="26" r="4" fill="none" stroke={F} strokeWidth="2.5" />
          <line x1="25" y1="40" x2="35" y2="40" stroke={F} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )
    case 4: // Nyx — spiral eyes, tongue out, lashes still visible
      return (
        <>
          <SpiralEye cx={21} cy={25} r={6} />
          <SpiralEye cx={39} cy={25} r={6} />
          <line x1="15" y1="22" x2="13" y2="20" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <line x1="45" y1="22" x2="47" y2="20" stroke={F} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
          <line x1="22" y1="40" x2="38" y2="40" stroke={F} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="35" cy="44" rx="4" ry="3" fill="#e17055" />
        </>
      )
    default: // Blaze (5) — flat line eyes (—_—), flat mouth
      return (
        <>
          <line x1="14" y1="25" x2="28" y2="25" stroke={F} strokeWidth="4" strokeLinecap="round" />
          <line x1="32" y1="25" x2="46" y2="25" stroke={F} strokeWidth="4" strokeLinecap="round" />
          <line x1="20" y1="40" x2="40" y2="40" stroke={F} strokeWidth="3" strokeLinecap="round" />
        </>
      )
  }
}

// ── SVG helpers ────────────────────────────────────────────────

function SpiralEye({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const turns = 2.5
  const steps = 30
  let d = `M${cx},${cy}`
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const angle = turns * Math.PI * 2 * t
    const sr = r * t
    d += ` L${(cx + Math.cos(angle) * sr).toFixed(1)},${(cy + Math.sin(angle) * sr).toFixed(1)}`
  }
  return <path d={d} stroke={F} strokeWidth="2" fill="none" strokeLinecap="round" />
}

function Heart({ x, y, s }: { x: number; y: number; s: number }) {
  const hs = s / 2
  return (
    <g fill="#e84393">
      <circle cx={x - hs * 0.5} cy={y - hs * 0.3} r={hs * 0.65} />
      <circle cx={x + hs * 0.5} cy={y - hs * 0.3} r={hs * 0.65} />
      <polygon points={`${x - hs},${y} ${x + hs},${y} ${x},${y + hs * 0.9}`} />
    </g>
  )
}

function Sparkle({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g opacity="0.8">
      <line x1={x - s} y1={y} x2={x + s} y2={y} stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1={x} y1={y - s} x2={x} y2={y + s} stroke="white" strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

function StarPupil({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g>
      <line x1={x - s} y1={y} x2={x + s} y2={y} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={x} y1={y - s} x2={x} y2={y + s} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={x - s * 0.6} y1={y - s * 0.6} x2={x + s * 0.6} y2={y + s * 0.6} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1={x + s * 0.6} y1={y - s * 0.6} x2={x - s * 0.6} y2={y + s * 0.6} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  )
}

// ── Garbage face (metallic slab face for UI) ──────────────────

export function GarbageFace({ size = 60, className }: { size?: number; className?: string }) {
  const darker = darken(GARBAGE_BLOCK.color, 0.15)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      overflow="visible"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shadow */}
      <circle cx="31" cy="32" r="26" fill="black" opacity="0.15" />
      {/* Metallic body */}
      <circle cx="30" cy="30" r="26" fill={GARBAGE_BLOCK.color} />
      {/* Border */}
      <circle cx="30" cy="30" r="26" fill="none" stroke={darker} strokeWidth="2" />
      {/* Highlight */}
      <ellipse cx="25" cy="20" rx="13" ry="7" fill="white" opacity="0.15" />
      {/* Corner rivets */}
      {[[16, 16], [44, 16], [16, 44], [44, 44]].map(([rx, ry], i) => (
        <g key={i}>
          <circle cx={rx} cy={ry} r="3" fill={darker} />
          <circle cx={rx} cy={ry} r="2" fill={GARBAGE_BLOCK.color} />
          <circle cx={rx - 0.5} cy={ry - 0.5} r="0.8" fill="white" opacity="0.4" />
        </g>
      ))}
      {/* Angry eyes */}
      {/* Left eye */}
      <ellipse cx="21" cy="28" rx="7" ry="5.5" fill="#e8e0d0" />
      <ellipse cx="21" cy="28" rx="7" ry="5.5" fill="none" stroke={F} strokeWidth="1" opacity="0.5" />
      <circle cx="20" cy="29" r="3" fill="#882222" />
      <circle cx="20" cy="29" r="1.5" fill="#110808" />
      <circle cx="21" cy="28" r="1" fill="white" opacity="0.7" />
      {/* Left angry eyelid */}
      <polygon points="13,22 29,26 29,20 13,20" fill={GARBAGE_BLOCK.color} />
      <line x1="14" y1="23" x2="28" y2="26" stroke={darker} strokeWidth="1.5" />
      {/* Right eye */}
      <ellipse cx="39" cy="28" rx="7" ry="5.5" fill="#e8e0d0" />
      <ellipse cx="39" cy="28" rx="7" ry="5.5" fill="none" stroke={F} strokeWidth="1" opacity="0.5" />
      <circle cx="40" cy="29" r="3" fill="#882222" />
      <circle cx="40" cy="29" r="1.5" fill="#110808" />
      <circle cx="41" cy="28" r="1" fill="white" opacity="0.7" />
      {/* Right angry eyelid */}
      <polygon points="47,22 31,26 31,20 47,20" fill={GARBAGE_BLOCK.color} />
      <line x1="46" y1="23" x2="32" y2="26" stroke={darker} strokeWidth="1.5" />
      {/* Flat menacing mouth */}
      <line x1="22" y1="40" x2="38" y2="40" stroke={F} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ── Color utility ──────────────────────────────────────────────

function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const d = (v: number) => Math.round(v * (1 - amount)).toString(16).padStart(2, '0')
  return `#${d(r)}${d(g)}${d(b)}`
}
