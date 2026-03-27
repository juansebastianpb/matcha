import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { Landing } from './pages/Landing'
import { Play } from './pages/Play'
import { Leaderboard } from './pages/Leaderboard'
import { HowToPlay } from './pages/HowToPlay'
import { Profile } from './pages/Profile'
import { Lobby } from './pages/Lobby'
import { Vs } from './pages/Vs'
import { ChallengePage } from './pages/ChallengePage'
function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ErrorBoundary><Landing /></ErrorBoundary>} />
        <Route path="/play" element={<ErrorBoundary><Play /></ErrorBoundary>} />
        <Route path="/lobby" element={<ErrorBoundary fallbackMessage="Matchmaking error"><Lobby /></ErrorBoundary>} />
        <Route path="/vs" element={<ErrorBoundary fallbackMessage="Game error"><Vs /></ErrorBoundary>} />
        <Route path="/challenge" element={<ErrorBoundary fallbackMessage="Challenge error"><ChallengePage /></ErrorBoundary>} />
        <Route path="/leaderboard" element={<ErrorBoundary><Leaderboard /></ErrorBoundary>} />
        <Route path="/how-to-play" element={<HowToPlay />} />
        <Route path="/profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
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
