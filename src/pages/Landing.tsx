import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function Landing() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-6xl mb-4">🍵</div>
          <h1 className="text-5xl md:text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              Matcha
            </span>
          </h1>
          <p className="text-xl text-white/60 mb-8 max-w-lg mx-auto">
            A kawaii block-swapping puzzle game. Match colors, build chains, and chase high scores!
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/play">
              <Button size="lg">Play Now</Button>
            </Link>
            <Link to="/how-to-play">
              <Button variant="secondary" size="lg">How to Play</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10 text-white/80">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🔄"
              title="Swap"
              desc="Tap two adjacent blocks to swap them horizontally. Line up 3 or more of the same color."
            />
            <FeatureCard
              icon="✨"
              title="Chain"
              desc="Gravity fills gaps after clears. New matches from falling blocks create chains with multiplied scores."
            />
            <FeatureCard
              icon="🏆"
              title="Compete"
              desc="90 seconds per round. Climb the leaderboard or play head-to-head for real money."
            />
          </div>
        </div>
      </section>

      {/* Tiles preview */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6 text-white/80">Meet the Crew</h2>
          <div className="flex justify-center gap-4 flex-wrap">
            {[
              { color: '#FFEAA7', name: 'Happy' },
              { color: '#74B9FF', name: 'Sleepy' },
              { color: '#FD79A8', name: 'Surprised' },
              { color: '#55EFC4', name: 'Cheeky' },
              { color: '#DDA0DD', name: 'Dreamy' },
              { color: '#FDCB6E', name: 'Excited' },
            ].map((tile) => (
              <div key={tile.name} className="text-center">
                <div
                  className="w-14 h-14 rounded-full shadow-lg mb-2 mx-auto"
                  style={{ backgroundColor: tile.color }}
                />
                <span className="text-xs text-white/40">{tile.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/5">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-white/50 text-sm">{desc}</p>
    </div>
  )
}
