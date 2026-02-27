import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-center">
        <Link to="/" className="text-xl font-black">
          <span className="bg-gradient-to-r from-pink-300 via-amber-200 to-yellow-200 bg-clip-text text-transparent">
            Swingi
          </span>
        </Link>
      </div>
    </header>
  )
}
