import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { initChallenge, setupPostMatchHandlers } from '../services/challenge'
import { useMatchStore } from '../stores/matchStore'
import { useGameStore } from '../stores/gameStore'

export function useChallenge() {
  const navigate = useNavigate()
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    initChallenge()

    setupPostMatchHandlers({
      onRematchStarting: ({ matchId, opponent }) => {
        // Reset game state and start a new Challenge match in-place
        useGameStore.getState().reset()
        useMatchStore.getState().startChallengeMatch(matchId, opponent?.email ?? null)
        navigate('/vs')
      },
      onNewOpponent: () => {
        // Player wants a different opponent — full reset
        useGameStore.getState().reset()
        useMatchStore.getState().cleanup()
        navigate('/')
      },
    })
  }, [navigate])

  // Fallback: listen for GAME_START event in case the callback chain fails
  useEffect(() => {
    const handleGameStart = (event: CustomEvent) => {
      const { type, data } = event.detail || {}
      if (type === 'CHALLENGE_GAME_START' && data?.matchId) {
        // Only navigate if not already on /vs
        if (window.location.pathname !== '/vs') {
          useGameStore.getState().reset()
          useMatchStore.getState().startChallengeMatch(data.matchId, data.opponent?.email ?? null)
          navigate('/vs')
        }
      }
    }
    window.addEventListener('challenge-message', handleGameStart as EventListener)
    return () => window.removeEventListener('challenge-message', handleGameStart as EventListener)
  }, [navigate])
}
