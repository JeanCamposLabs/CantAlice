import { Sparkles, GraduationCap, BookHeart, Search, Music2, Heart, Play, Flame } from 'lucide-react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useSession } from '../store/useSession'
import {
  useLibrary,
  selectSongs,
  selectVocab,
  currentStreak,
  type SavedSong,
} from '../store/useLibrary'
import { useNav } from '../store/useNav'
import { beginLogin } from '../spotify/auth'
import { getTrack } from '../spotify/api'
import { AlbumArt } from '../components/AlbumArt'
import { IS_SPOTIFY_CONFIGURED } from '../config'
import { greeting, plural } from '../lib/format'
import { SetupNotice } from '../components/States'
import { Brand } from '../components/Brand'

export function HomePage() {
  const auth = useSession((s) => s.auth)
  const user = useSession((s) => s.user)

  if (!IS_SPOTIFY_CONFIGURED) {
    return (
      <div className="space-y-8 pt-6">
        <Hero name="Alice" />
        <SetupNotice />
      </div>
    )
  }

  if (auth !== 'loggedin') {
    return <Welcome />
  }

  return <Dashboard name={user?.displayName?.split(' ')[0] || 'Alice'} />
}

// — Logged-out welcome (the "front door") —
function Welcome() {
  return (
    <div className="flex min-h-[78vh] flex-col items-center justify-center gap-10 py-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-6"
      >
        <Brand />
        <h1 className="max-w-3xl font-display text-5xl leading-[1.05] sm:text-7xl">
          Aprenda inglês <span className="text-glow">cantando</span> as músicas que você ama.
        </h1>
        <p className="max-w-xl text-lg text-mist/75">
          Olá, Alice! 💛 Toque suas músicas favoritas do Spotify, acompanhe a letra
          sincronizada, veja a tradução e guarde as palavras novas — tudo num só lugar.
        </p>
        <button onClick={() => beginLogin()} className="btn-primary text-lg">
          <Music2 size={20} /> Conectar com o Spotify
        </button>
        <p className="text-sm text-mist/45">É grátis e seguro — usamos o login oficial do Spotify.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7 }}
        className="grid w-full max-w-4xl gap-4 sm:grid-cols-3"
      >
        <Feature
          icon={<Music2 />}
          title="Cante junto"
          text="Letras que acompanham a música, linha por linha, como um karaokê."
        />
        <Feature
          icon={<BookHeart />}
          title="Entenda tudo"
          text="Tradução para o português e toque em qualquer palavra para aprender."
        />
        <Feature
          icon={<GraduationCap />}
          title="Acompanhe o progresso"
          text="Guarde o que já sabe, o que quer aprender e seu vocabulário."
        />
      </motion.div>
    </div>
  )
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="glass rounded-3xl p-6 text-left">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-rose-400/15 text-rose-300">
        {icon}
      </div>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-1 text-sm text-mist/70">{text}</p>
    </div>
  )
}

// — Logged-in dashboard —
function Dashboard({ name }: { name: string }) {
  const learning = useLibrary(useShallow((s) => selectSongs(s, 'learning')))
  const known = useLibrary(useShallow((s) => selectSongs(s, 'known')))
  const vocab = useLibrary(useShallow(selectVocab))
  const streak = useLibrary(currentStreak)
  const go = useNav((s) => s.go)

  const recent = [...learning, ...known]
    .filter((s) => s.lastPracticedAt)
    .sort((a, b) => (b.lastPracticedAt ?? 0) - (a.lastPracticedAt ?? 0))
    .slice(0, 4)

  return (
    <div className="space-y-10 pt-2">
      <Hero name={name} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<Sparkles />}
          value={learning.length}
          label="Aprendendo"
          tone="rose"
          onClick={() => go('library')}
        />
        <StatCard
          icon={<GraduationCap />}
          value={known.length}
          label="Já sei cantar"
          tone="gold"
          onClick={() => go('library')}
        />
        <StatCard
          icon={<BookHeart />}
          value={vocab.length}
          label="Palavras"
          tone="aurora"
          onClick={() => go('vocab')}
        />
        <StatCard
          icon={<Flame />}
          value={streak}
          label={`${plural(streak, 'dia', 'dias')} seguidos`}
          tone="flame"
          onClick={() => go('search')}
        />
      </div>

      {/* Continue practising */}
      {recent.length > 0 && (
        <section>
          <SectionTitle>Continue de onde parou</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((s) => (
              <ContinueCard key={s.id} song={s} />
            ))}
          </div>
        </section>
      )}

      {/* Empty / first-run nudge */}
      {learning.length === 0 && known.length === 0 && (
        <div className="glass flex flex-col items-center gap-4 rounded-3xl p-10 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-rose-400/15 text-rose-300">
            <Heart size={30} />
          </div>
          <h3 className="font-display text-2xl">Vamos começar?</h3>
          <p className="max-w-md text-mist/70">
            Busque uma música em inglês que você adora. Que tal um clássico dos Beatles ou da Adele?
          </p>
          <button onClick={() => go('search')} className="btn-primary">
            <Search size={18} /> Buscar minha primeira música
          </button>
        </div>
      )}

      {/* Want to learn preview */}
      {learning.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle>Quero aprender</SectionTitle>
            <button onClick={() => go('library')} className="text-sm text-rose-300 hover:underline">
              ver todas
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {learning.slice(0, 4).map((s) => (
              <ContinueCard key={s.id} song={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Hero({ name }: { name: string }) {
  return (
    <div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm uppercase tracking-[0.25em] text-mist/50"
      >
        {greeting(name)}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mt-2 font-display text-4xl sm:text-5xl"
      >
        Pronta para <span className="text-glow">cantar</span>?
      </motion.h1>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 font-display text-2xl">{children}</h2>
}

const TONES = {
  rose: 'from-rose-400/25 to-rose-400/5 text-rose-300',
  gold: 'from-gold/25 to-gold/5 text-gold',
  aurora: 'from-aurora-1/25 to-aurora-1/5 text-aurora-1',
  flame: 'from-peach/25 to-peach/5 text-peach',
} as const

function StatCard({
  icon,
  value,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode
  value: number
  label: string
  tone: keyof typeof TONES
  onClick: () => void
}) {
  return (
    <motion.button
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={`glass flex flex-col gap-2 rounded-3xl bg-gradient-to-br p-5 text-left ${TONES[tone]}`}
    >
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10">{icon}</span>
      </div>
      <div className="mt-1 font-display text-4xl text-cream">{value}</div>
      <div className="text-sm text-mist/70">{label}</div>
    </motion.button>
  )
}

function ContinueCard({ song }: { song: SavedSong }) {
  const go = useNav((s) => s.go)
  const setActiveTrack = useSession((s) => s.setActiveTrack)

  const open = async () => {
    go('song', song.id)
    try {
      setActiveTrack(await getTrack(song.id))
    } catch {
      /* page will refetch */
    }
  }

  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={open}
      className="glass group flex items-center gap-4 rounded-2xl p-3 text-left"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
        <AlbumArt src={song.image} alt={`Capa de ${song.name}`} fallbackIcon={<Music2 />} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{song.name}</div>
        <div className="truncate text-sm text-mist/60">{song.artist}</div>
      </div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-cream transition-colors group-hover:bg-rose-400 group-hover:text-night-900">
        <Play size={18} className="ml-0.5" fill="currentColor" />
      </span>
    </motion.button>
  )
}
