export function Profile() {
  const bestScore = parseInt(localStorage.getItem('matcha_best_score') || '0', 10)

  return (
    <div className="py-12 px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="w-20 h-20 rounded-full bg-green-400/20 flex items-center justify-center text-3xl mx-auto mb-4">
          🍵
        </div>
        <h1 className="text-2xl font-bold mb-1">Guest Player</h1>
        <p className="text-white/40 text-sm mb-8">Sign in to save your scores and climb the leaderboard</p>

        <div className="bg-white/5 rounded-2xl border border-white/5 p-6">
          <h2 className="font-bold mb-4 text-white/60">Your Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Best Score" value={bestScore > 0 ? bestScore.toLocaleString() : '-'} />
            <StatCard label="Games Played" value="-" />
          </div>
        </div>

        <p className="text-white/20 text-xs mt-6">
          Full profiles and stats coming soon with Supabase integration.
        </p>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}
