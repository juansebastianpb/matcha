import { useState } from 'react'

export function useChallenge() {
  const [isReady, setIsReady] = useState(false)
  const [isMatched] = useState(false)

  return {
    isReady,
    isMatched,
    loadWidget: () => setIsReady(true),
    openWidget: () => console.log('Open challenge widget'),
  }
}
