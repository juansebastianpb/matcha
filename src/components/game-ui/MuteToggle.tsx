import { useState, useCallback } from 'react'
import { isMuted, setMuted, startMusic } from '../../game/audio/SoundManager'
import { useGameStore } from '../../stores/gameStore'

export function MuteToggle() {
  const [muted, setMutedLocal] = useState(() => isMuted())

  const toggle = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).blur()
    const next = !isMuted()
    setMuted(next)
    setMutedLocal(next)

    // When unmuting during active gameplay, restart music
    if (!next && useGameStore.getState().isPlaying) {
      startMusic()
    }
  }, [])

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white/60 hover:text-white hover:bg-black/50 active:scale-90 transition-all pointer-events-auto"
      aria-label={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M15.54 8.46a5 5 0 010 7.07" />
          <path d="M19.07 4.93a10 10 0 010 14.14" />
        </svg>
      )}
    </button>
  )
}
