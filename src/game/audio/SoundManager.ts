// Sound manager — HTML Audio for file-based SFX + music

let muted = false

// --- Audio pool for low-latency SFX ---
// Pre-create multiple Audio elements per sound so overlapping plays work

interface SfxPool {
  elements: HTMLAudioElement[]
  index: number
}

const sfxPools = new Map<string, SfxPool>()

function createPool(url: string, size: number, volume: number): SfxPool {
  const elements: HTMLAudioElement[] = []
  for (let i = 0; i < size; i++) {
    const el = new Audio(url)
    el.volume = volume
    el.preload = 'auto'
    elements.push(el)
  }
  const pool = { elements, index: 0 }
  sfxPools.set(url, pool)
  return pool
}

function playSfx(url: string): void {
  if (muted) return
  const pool = sfxPools.get(url)
  if (!pool) return

  const el = pool.elements[pool.index]
  pool.index = (pool.index + 1) % pool.elements.length

  el.currentTime = 0
  el.play().catch(() => { /* autoplay blocked — ignore */ })
}

function playSfxPitched(url: string, rate: number): void {
  if (muted) return
  const pool = sfxPools.get(url)
  if (!pool) return

  const el = pool.elements[pool.index]
  pool.index = (pool.index + 1) % pool.elements.length

  el.currentTime = 0
  el.playbackRate = rate
  el.play().catch(() => {})
}

// --- Music ---

const MUSIC_TRACKS = ['/audio/track1.mp3', '/audio/track2.mp3']
let musicEl: HTMLAudioElement | null = null

// --- Initialize: create pools (call early, elements preload automatically) ---

let initialized = false

export function initAudio(): void {
  if (initialized) return
  initialized = true

  createPool('/audio/tick.wav', 4, 0.4)
  createPool('/audio/match.wav', 4, 0.85)
  createPool('/audio/chain.wav', 4, 0.8)
  createPool('/audio/land.wav', 6, 0.15)
  createPool('/audio/swoosh.mp3', 3, 0.6)
  createPool('/audio/bubble.wav', 1, 0.7)
  createPool('/audio/trailer.mp3', 1, 0.9)
  createPool('/audio/boom.mp3', 1, 1.0)
  createPool('/audio/impact.mp3', 3, 0.7)
}

// --- SFX ---

export function playSwap(): void {
  playSfxPitched('/audio/tick.wav', 0.5)
}

export function playMatch(): void {
  playSfx('/audio/match.wav')
}

export function playChain(chainNumber: number): void {
  const rate = 1 + (chainNumber - 1) * 0.12
  playSfxPitched('/audio/chain.wav', rate)
}

export function playLand(): void {
  playSfx('/audio/land.wav')
}

export function playBubble(): void {
  playSfx('/audio/bubble.wav')
}

export function playTrailer(): void {
  playSfx('/audio/trailer.mp3')
}

export function playBoom(): void {
  playSfx('/audio/boom.mp3')
}

export function playRowPush(): void {
  playSfx('/audio/swoosh.mp3')
}

// --- Countdown (synthesized via Web Audio API) ---

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

/** Short percussive beep for 3, 2, 1 */
export function playCountdownTick(): void {
  if (muted) return
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.value = 660
  gain.gain.setValueAtTime(0.45, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.12)
}

/** Rising bright tone for GO! */
export function playCountdownGo(): void {
  if (muted) return
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15)
  gain.gain.setValueAtTime(0.5, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.25)
}

/** Heavy thud for garbage slab landing (sub-bass hit + noise burst) */
export function playGarbageLand(): void {
  if (muted) return
  const ctx = getAudioCtx()
  const now = ctx.currentTime

  // Sub-bass hit
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(80, now)
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.15)
  oscGain.gain.setValueAtTime(0.5, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  osc.start(now)
  osc.stop(now + 0.2)

  // Noise burst for impact texture
  const bufferSize = ctx.sampleRate * 0.08
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.6
  }
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer
  const noiseGain = ctx.createGain()
  noise.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noiseGain.gain.setValueAtTime(0.25, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
  noise.start(now)
  noise.stop(now + 0.1)
}

/** Metal impact sound for incoming garbage */
export function playIncomingGarbage(): void {
  playSfx('/audio/impact.mp3')
}

// --- Music ---

export function startMusic(): void {
  if (muted) return
  stopMusic()

  const trackUrl = MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)]
  musicEl = new Audio(trackUrl)
  musicEl.loop = true
  musicEl.volume = 0.25
  musicEl.play().catch(() => {
    // Autoplay blocked — start on first user interaction
    const resume = () => {
      musicEl?.play().catch(() => {})
      document.removeEventListener('pointerdown', resume)
      document.removeEventListener('keydown', resume)
    }
    document.addEventListener('pointerdown', resume, { once: true })
    document.addEventListener('keydown', resume, { once: true })
  })
}

export function stopMusic(): void {
  if (musicEl) {
    musicEl.pause()
    musicEl.currentTime = 0
    musicEl = null
  }
}

// --- Mute ---

export function setMuted(value: boolean): void {
  muted = value
  if (value) stopMusic()
  try {
    localStorage.setItem('matcha_muted', value ? '1' : '0')
  } catch { /* ignore */ }
}

export function isMuted(): boolean {
  return muted
}

// Initialize mute state from localStorage
try {
  muted = localStorage.getItem('matcha_muted') === '1'
} catch { /* ignore */ }
