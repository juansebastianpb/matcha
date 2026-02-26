import { useState } from 'react'

type Period = 'all' | 'weekly' | 'daily'

// Placeholder data until Supabase is connected
const PLACEHOLDER_SCORES = [
  { rank: 1, username: 'PuzzleMaster', score: 12450, date: '2024-01-15' },
  { rank: 2, username: 'ChainKing', score: 10200, date: '2024-01-15' },
  { rank: 3, username: 'ComboQueen', score: 9800, date: '2024-01-14' },
  { rank: 4, username: 'BlockBuster', score: 8650, date: '2024-01-14' },
  { rank: 5, username: 'MatchaPro', score: 7300, date: '2024-01-13' },
]

export function Leaderboard() {
  const [period, setPeriod] = useState<Period>('all')

  return (
    <div className="py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black text-center mb-8">Leaderboard</h1>

        {/* Period tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {(['all', 'weekly', 'daily'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-green-400/20 text-green-400'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {p === 'all' ? 'All Time' : p === 'weekly' ? 'This Week' : 'Today'}
            </button>
          ))}
        </div>

        {/* Scores table */}
        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                <th className="py-3 px-4 text-left">#</th>
                <th className="py-3 px-4 text-left">Player</th>
                <th className="py-3 px-4 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDER_SCORES.map((entry) => (
                <tr key={entry.rank} className="border-b border-white/5 last:border-0">
                  <td className="py-3 px-4 font-bold text-white/60">
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                  </td>
                  <td className="py-3 px-4 font-medium">{entry.username}</td>
                  <td className="py-3 px-4 text-right font-bold tabular-nums text-yellow-300">
                    {entry.score.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-white/20 text-xs mt-4">
          Leaderboard data is placeholder. Connect Supabase to see real scores.
        </p>
      </div>
    </div>
  )
}
