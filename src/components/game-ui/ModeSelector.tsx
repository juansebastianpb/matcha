import { Button } from '../ui/Button'

interface ModeSelectorProps {
  onFreePlay: () => void
  onCompetitive?: () => void
}

export function ModeSelector({ onFreePlay, onCompetitive }: ModeSelectorProps) {
  return (
    <div className="flex gap-3">
      <Button onClick={onFreePlay} variant="primary">
        Free Play
      </Button>
      {onCompetitive && (
        <Button onClick={onCompetitive} variant="secondary">
          Play for $2
        </Button>
      )}
    </div>
  )
}
