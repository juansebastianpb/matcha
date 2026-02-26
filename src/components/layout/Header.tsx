import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="border-b border-white/10 bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <span className="text-2xl">🍵</span>
          <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
            Matcha
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/play" className="text-white/70 hover:text-white transition-colors text-sm font-medium">
            Play
          </Link>
          <Link to="/leaderboard" className="text-white/70 hover:text-white transition-colors text-sm font-medium">
            Leaderboard
          </Link>
          <Link to="/how-to-play" className="text-white/70 hover:text-white transition-colors text-sm font-medium">
            How to Play
          </Link>
        </nav>
      </div>
    </header>
  )
}
