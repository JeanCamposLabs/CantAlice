import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AuroraBackground } from './components/AuroraBackground'
import { FloatingNotes } from './components/FloatingNotes'
import { Sidebar, MobileBar, MobileTopBar } from './components/Nav'
import { HomePage } from './pages/Home'
import { SearchPage } from './pages/Search'
import { LibraryPage } from './pages/Library'
import { VocabularyPage } from './pages/Vocabulary'
import { KaraokePage } from './pages/Karaoke'
import { useNav } from './store/useNav'
import { useSession } from './store/useSession'
import {
  handleRedirectCallback,
  isLoggedIn,
  getValidAccessToken,
} from './spotify/auth'
import { getCurrentUser } from './spotify/api'
import { playerController } from './spotify/player'
import { IS_SPOTIFY_CONFIGURED } from './config'

export function App() {
  const view = useNav((s) => s.view)
  const setAuth = useSession((s) => s.setAuth)
  const setUser = useSession((s) => s.setUser)
  const [authError, setAuthError] = useState<string | null>(null)

  // — Bootstrap: handle OAuth return, restore session, init player —
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await handleRedirectCallback()
      } catch (e) {
        if (!cancelled) setAuthError((e as Error).message)
      }

      if (!isLoggedIn()) {
        if (!cancelled) setAuth('loggedout')
        return
      }

      // Validate the token & load the profile.
      const token = await getValidAccessToken()
      if (!token) {
        if (!cancelled) setAuth('loggedout')
        return
      }
      try {
        const user = await getCurrentUser()
        if (cancelled) return
        setUser(user)
        setAuth('loggedin')
        // Premium accounts get the full Web Playback SDK device.
        if (user.product === 'premium') playerController.init()
      } catch {
        if (!cancelled) setAuth('loggedout')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [setAuth, setUser])

  return (
    <>
      <AuroraBackground />
      <FloatingNotes />

      {authError && <ErrorBanner message={authError} onClose={() => setAuthError(null)} />}

      <div className="mx-auto flex min-h-dvh w-full max-w-[1400px]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          <main className="flex-1 px-5 pb-28 pt-6 sm:px-8 lg:px-10 lg:pb-12 lg:pt-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <Page view={view} />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <MobileBar />

      {!IS_SPOTIFY_CONFIGURED && <ConfigBadge />}
    </>
  )
}

function Page({ view }: { view: ReturnType<typeof useNav.getState>['view'] }) {
  switch (view) {
    case 'home':
      return <HomePage />
    case 'search':
      return <SearchPage />
    case 'library':
      return <LibraryPage />
    case 'vocab':
      return <VocabularyPage />
    case 'song':
      return <KaraokePage />
    default:
      return <HomePage />
  }
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-x-0 top-4 z-[60] mx-auto w-fit max-w-[92vw]"
    >
      <div className="glass-strong flex items-center gap-3 rounded-full px-5 py-3 text-sm">
        <span>{message}</span>
        <button onClick={onClose} className="text-mist/60 hover:text-cream">
          ✕
        </button>
      </div>
    </motion.div>
  )
}

function ConfigBadge() {
  return (
    <div className="fixed bottom-4 right-4 z-50 hidden rounded-full bg-gold/20 px-4 py-2 text-xs text-gold lg:block">
      ⚙︎ Configure o Spotify Client ID — veja o README
    </div>
  )
}
