import { useGameStore } from '../../stores/gameStore'

export function ChainIndicator() {
  const chain = useGameStore((s) => s.chain)

  if (chain <= 1) return null

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-bounce">
      <div className="text-2xl font-black text-yellow-300 drop-shadow-lg">
        {chain}x CHAIN!
      </div>
    </div>
  )
}
