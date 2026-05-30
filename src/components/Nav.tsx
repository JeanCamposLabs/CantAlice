import { Home, Search, Library, BookHeart, LogOut, LogIn, HelpCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNav, type View } from '../store/useNav'
import { useSession } from '../store/useSession'
import { useUI } from '../store/useUI'
import { Brand } from './Brand'
import { beginLogin, logout } from '../spotify/auth'
import { IS_SPOTIFY_CONFIGURED } from '../config'

const ITEMS: { view: View; label: string; icon: typeof Home }[] = [
  { view: 'home', label: 'Início', icon: Home },
  { view: 'search', label: 'Buscar', icon: Search },
  { view: 'library', label: 'Minhas músicas', icon: Library },
  { view: 'vocab', label: 'Vocabulário', icon: BookHeart },
]

function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
  vertical,
}: {
  label: string
  icon: typeof Home
  active: boolean
  onClick: () => void
  vertical?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center gap-3 rounded-2xl font-medium transition-colors ${
        vertical ? 'px-4 py-3 w-full' : 'flex-col gap-1 px-3 py-2 text-[0.66rem]'
      } ${active ? 'text-cream' : 'text-mist/70 hover:text-cream'}`}
    >
      {active && (
        <motion.span
          layoutId={vertical ? 'nav-pill' : 'nav-pill-mobile'}
          className="absolute inset-0 -z-10 rounded-2xl"
          style={{ background: 'color-mix(in oklab, white 10%, transparent)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
      <Icon size={vertical ? 20 : 22} strokeWidth={active ? 2.5 : 2} />
      <span className={vertical ? 'text-[0.95rem]' : ''}>{label}</span>
      {active && vertical && (
        <span className="ml-auto h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_12px] shadow-rose-400" />
      )}
    </button>
  )
}

function AccountControl({ vertical, compact }: { vertical?: boolean; compact?: boolean }) {
  const { auth, user } = useSession()

  if (!IS_SPOTIFY_CONFIGURED) return null

  // Compact variant for the mobile top bar: just an avatar + logout.
  if (compact) {
    if (auth !== 'loggedin') {
      return (
        <button onClick={() => beginLogin()} className="btn-primary px-4 py-2 text-sm">
          <LogIn size={16} />
          Conectar
        </button>
      )
    }
    return (
      <button
        onClick={logout}
        title="Sair do Spotify"
        className="flex items-center gap-2 rounded-full bg-white/8 py-1 pl-1 pr-3"
      >
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-aurora-2/40 text-xs font-semibold">
            {(user?.displayName ?? 'A')[0]}
          </span>
        )}
        <LogOut size={15} className="text-mist/70" />
      </button>
    )
  }

  if (auth === 'loggedin') {
    return (
      <div className={vertical ? 'mt-2' : ''}>
        <div className="flex items-center gap-3 rounded-2xl px-3 py-2">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white/15"
            />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-full bg-aurora-2/40 text-sm font-semibold">
              {(user?.displayName ?? 'A')[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user?.displayName ?? 'Conectada'}</div>
            <div className="text-[0.7rem] text-mist/60">
              {user?.product === 'premium' ? 'Spotify Premium' : 'Spotify'}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="rounded-xl p-2 text-mist/60 transition-colors hover:bg-white/10 hover:text-cream"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <button onClick={() => beginLogin()} className="btn-primary w-full">
      <LogIn size={18} />
      Conectar Spotify
    </button>
  )
}

export function Sidebar() {
  const { view, go } = useNav()
  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col gap-2 border-r border-white/5 px-5 py-7 lg:flex">
      <div className="px-2">
        <Brand />
      </div>
      <nav className="mt-8 flex flex-col gap-1">
        {ITEMS.map((item) => (
          <NavButton
            key={item.view}
            {...item}
            vertical
            active={view === item.view}
            onClick={() => go(item.view)}
          />
        ))}
      </nav>
      <div className="mt-auto">
        <button
          onClick={useUI.getState().openHelp}
          className="mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-medium text-mist/70 transition-colors hover:bg-white/5 hover:text-cream"
        >
          <HelpCircle size={20} />
          <span className="text-[0.95rem]">Ajuda &amp; dicas</span>
        </button>
        <AccountControl vertical />
        <p className="mt-4 px-3 text-[0.68rem] leading-relaxed text-mist/40">
          Feito com carinho para a Alice aprender inglês cantando. 🎶
        </p>
      </div>
    </aside>
  )
}

export function MobileBar() {
  const { view, go } = useNav()
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div className="glass-strong mx-3 mb-3 flex items-center justify-around rounded-3xl px-2 py-1.5">
        {ITEMS.map((item) => (
          <NavButton
            key={item.view}
            {...item}
            active={view === item.view}
            onClick={() => go(item.view)}
          />
        ))}
      </div>
    </nav>
  )
}

export function MobileTopBar() {
  return (
    <header className="pt-safe sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-night-900/60 px-5 py-4 backdrop-blur-xl lg:hidden">
      <Brand compact />
      <div className="flex items-center gap-1">
        <button
          onClick={useUI.getState().openHelp}
          aria-label="Ajuda e dicas"
          className="rounded-full p-2 text-mist/60 transition-colors hover:bg-white/10 hover:text-cream"
        >
          <HelpCircle size={20} />
        </button>
        <AccountControl compact />
      </div>
    </header>
  )
}
