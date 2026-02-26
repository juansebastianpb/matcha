export function HowToPlay() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black text-center mb-8">How to Play</h1>

        <div className="space-y-8">
          <Section
            title="The Basics"
            items={[
              'The grid is filled with colorful blocks that slowly rise from the bottom.',
              'Tap a block to select it, then tap an adjacent block to swap them horizontally.',
              'Match 3 or more blocks of the same color in a row or column to clear them.',
            ]}
          />

          <Section
            title="Chains"
            items={[
              'When blocks clear, gravity pulls blocks down to fill the gaps.',
              'If falling blocks create new matches, that\'s a chain!',
              'Chain multiplier doubles each level: x1, x2, x4, x8...',
              'Building chains is the key to high scores.',
            ]}
          />

          <Section
            title="Combos"
            items={[
              'A combo happens when one swap creates multiple match groups.',
              'Each extra group in a combo adds 50 bonus points.',
            ]}
          />

          <Section
            title="Rising Blocks"
            items={[
              'New rows of blocks rise from the bottom continuously.',
              'Rising pauses during chain cascades, giving you a breather.',
              'If blocks reach the top, you get a 3-second penalty pause and lose 100 points.',
            ]}
          />

          <Section
            title="Scoring"
            items={[
              'Base: 10 points per block cleared',
              'Chain multiplier: 2^(chain level - 1)',
              'Combo bonus: groups beyond the first add 50 points each',
              'Top-out penalty: -100 points',
            ]}
          />

          <Section
            title="Game Modes"
            items={[
              'Free Play: 90-second timed rounds. Play as many as you want!',
              'Competitive: $2 entry, 1v1 score battles. Highest score wins the pot.',
            ]}
          />
        </div>
      </div>
    </div>
  )
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/5 p-6">
      <h2 className="text-lg font-bold mb-3 text-green-400">{title}</h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-white/60 text-sm flex gap-2">
            <span className="text-green-400/60 shrink-0">-</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
