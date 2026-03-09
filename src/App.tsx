import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Landing } from './pages/Landing'
import { Play } from './pages/Play'
import { Leaderboard } from './pages/Leaderboard'
import { HowToPlay } from './pages/HowToPlay'
import { Profile } from './pages/Profile'
import { Lobby } from './pages/Lobby'
import { Vs } from './pages/Vs'
import { useChallenge } from './hooks/useChallenge'

function AppRoutes() {
  useChallenge()

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/play" element={<Play />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/vs" element={<Vs />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/how-to-play" element={<HowToPlay />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
