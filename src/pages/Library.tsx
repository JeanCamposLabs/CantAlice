import { useState } from 'react'
import { Play, Trash2, GraduationCap, Sparkles, Music2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { AlbumArt } from '../components/AlbumArt'
import { useUI } from '../store/useUI'
import {
  useLibrary,
  selectSongs,
  type SavedSong,
  type SongStatus,
} from '../store/useLibrary'
import { useNav } from '../store/useNav'
import { useSession } from '../store/useSession'
import { getTrack } from '../spotify/api'
import { EmptyState } from '../components/States'
import { formatTime } from '../lib/format'
import { useLang } from '../lib/useLangName'

const tabs = (learner: string): { key: SongStatus; label: string; hint: string }[] => [
  { key: 'learning', label: 'Quero aprender', hint: `músicas que a ${learner} está praticando` },
  { key: 'known', label: 'Já sei cantar', hint: `músicas que a ${learner} já domina` },
]

export function LibraryPage() {
  const [tab, setTab] = useState<SongStatus>('learning')
  const TABS = tabs(useLang().learner)
  const learning = useLibrary(useShallow((s) => selectSongs(s, 'learning')))
  const known = useLibrary(useShallow((s) => selectSongs(s, 'known')))
  const go = useNav((s) => s.go)

  const songs = tab === 'learning' ? learning : known

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl">Minhas músicas</h1>
        <p className="mt-2 text-mist/70">Sua coleção pessoal — para aprender e para celebrar.</p>
      </div>

      {/* Tabs */}
      <div className="glass inline-flex rounded-2xl p-1.5">
        {TABS.map((t) => {
          const count = t.key === 'learning' ? learning.length : known.length
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                active ? 'text-night-900' : 'text-mist/70 hover:text-cream'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="lib-tab"
                  className="absolute inset-0 -z-10 rounded-xl"
                  style={{ background: 'linear-gradient(105deg, #ffc4a3, #ff8fb1)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              {t.label}
              <span className={`ml-2 text-xs ${active ? 'text-night-900/70' : 'text-mist/40'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {songs.length === 0 ? (
        <EmptyState
          icon={tab === 'learning' ? <Sparkles size={32} /> : <GraduationCap size={32} />}
          title={tab === 'learning' ? 'Nenhuma música ainda' : 'Conte suas conquistas'}
          description={
            tab === 'learning'
              ? 'Busque uma música e toque em “Quero aprender” para guardá-la aqui.'
              : 'Quando dominar uma música, marque como “Já sei” — elas aparecerão aqui.'
          }
          action={
            <button onClick={() => go('search')} className="btn-primary">
              <Music2 size={18} /> Buscar músicas
            </button>
          }
        />
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence>
            {songs.map((song) => (
              <SongRow key={song.id} song={song} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}

function SongRow({ song }: { song: SavedSong }) {
  const go = useNav((s) => s.go)
  const setActiveTrack = useSession((s) => s.setActiveTrack)
  const removeSong = useLibrary((s) => s.removeSong)
  const setStatus = useLibrary((s) => s.setStatus)
  const celebrate = useUI((s) => s.celebrate)

  const open = async () => {
    // We stored a lightweight snapshot; re-fetch the full track for playback.
    go('song', song.id)
    try {
      const track = await getTrack(song.id)
      setActiveTrack(track)
    } catch {
      /* Karaoke page will retry from the id. */
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass group flex items-center gap-4 rounded-2xl p-3"
    >
      <button onClick={open} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <AlbumArt src={song.image} alt={`Capa de ${song.name}`} fallbackIcon={<Music2 />} />
        <span className="absolute inset-0 grid place-items-center bg-night-900/55 opacity-0 transition-opacity group-hover:opacity-100">
          <Play size={22} className="ml-0.5 text-cream" fill="currentColor" />
        </span>
      </button>

      <button onClick={open} className="min-w-0 flex-1 text-left">
        <h3 className="truncate font-display text-lg">{song.name}</h3>
        <p className="truncate text-sm text-mist/70">{song.artist}</p>
        {song.practiceCount > 0 && (
          <p className="mt-0.5 text-xs text-mist/45">
            praticada {song.practiceCount}×
          </p>
        )}
      </button>

      <span className="hidden text-sm text-mist/50 sm:block">{formatTime(song.durationMs)}</span>

      <div className="flex items-center gap-1.5">
        {song.status === 'learning' ? (
          <button
            onClick={() => {
              setStatus(song.id, 'known')
              celebrate('Mais uma que você já sabe cantar!')
            }}
            title="Marcar como já sei"
            className="rounded-xl px-3 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold/15"
          >
            <GraduationCap size={18} />
          </button>
        ) : (
          <button
            onClick={() => setStatus(song.id, 'learning')}
            title="Voltar para aprender"
            className="rounded-xl px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-400/15"
          >
            <Sparkles size={18} />
          </button>
        )}
        <button
          onClick={() => removeSong(song.id)}
          title="Remover"
          className="rounded-xl p-2 text-mist/50 transition-colors hover:bg-white/10 hover:text-rose-300"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  )
}
