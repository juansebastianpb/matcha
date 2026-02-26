import { useGameStore } from '../../stores/gameStore'

export function TimerDisplay() {
  const time = useGameStore((s) => s.time)

  const minutes = Math.floor(Math.ceil(time) / 60)
  const seconds = Math.ceil(time) % 60
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`

  const progress = time / 90
  const color = progress > 0.5 ? 'text-green-400' : progress > 0.2 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="text-center">
      <div className="text-xs text-white/50 uppercase tracking-wider font-medium">Time</div>
      <div className={`text-3xl font-bold tabular-nums ${color}`}>
        {formatted}
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress > 0.5 ? 'bg-green-400' : progress > 0.2 ? 'bg-yellow-400' : 'bg-red-400'
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
