import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AuroraBackground } from './components/AuroraBackground'
import { FloatingNotes } from './components/FloatingNotes'
import { Sidebar, MobileBar, MobileTopBar } from './components/Nav'
import { UpdatePrompt } from './components/UpdatePrompt'
import { Help } from './components/Help'
import { Celebration } from './components/Celebration'
import { InstallPrompt } from './components/InstallPrompt'
import { VersionBadge } from './components/VersionBadge'
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
  logout,
} from './spotify/auth'
import { getCurrentUser } from './spotify/api'
import { playerController } from './spotify/player'
import { useCloudSync } from './sync/sync'
import { IS_SPOTIFY_CONFIGURED } from './config'

export function App() {
  const view = useNav((s) => s.view)
  const setAuth = useSession((s) => s.setAuth)
  const setUser = useSession((s) => s.setUser)
  const [authError, setAuthError] = useState<string | null>(null)

  // Cloud sync (no-op until Supabase is configured): pulls + merges progress on
  // login and keeps it synced across devices, tied to the Spotify account.
  useCloudSync()

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
      } catch (e) {
        if (cancelled) return
        // We have a token but the profile call failed. The most common cause
        // is the Spotify app being in "Development Mode": only accounts added
        // to the app's allow-list can use it. Surface that clearly instead of
        // silently bouncing back to the connect screen.
        setAuth('loggedout')
        logout()
        const msg = (e as Error).message
        if (/\b403\b/.test(msg)) {
          setAuthError(
            'Esta conta do Spotify ainda não tem acesso ao app. ' +
              'Peça para adicionar o seu e-mail do Spotify na lista de usuários ' +
              '(Spotify Developer Dashboard → o app → Settings → User Management).',
          )
        } else {
          setAuthError('Não consegui carregar seu perfil do Spotify. Tente conectar novamente.')
        }
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

      <UpdatePrompt />
      <InstallPrompt />
      <Help />
      <Celebration />
      <VersionBadge />

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
      className="pt-safe fixed inset-x-0 top-3 z-[90] mx-auto w-[92vw] max-w-md px-1"
    >
      <div className="glass-strong flex items-start gap-3 rounded-2xl px-5 py-4 text-sm shadow-2xl">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-400/20 text-rose-300">
          !
        </span>
        <span className="flex-1 leading-relaxed">{message}</span>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="shrink-0 text-mist/60 hover:text-cream"
        >
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
