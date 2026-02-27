import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'

export function Layout() {
  const { pathname } = useLocation()
  const isPlay = pathname === '/play'

  return (
    <div className="h-dvh flex flex-col bg-[#1a1b2e] text-white overflow-hidden">
      <Header />
      <main className={isPlay ? 'flex-1 min-h-0' : 'flex-1 overflow-y-auto'}>
        <Outlet />
        {!isPlay && <Footer />}
      </main>
    </div>
  )
}
