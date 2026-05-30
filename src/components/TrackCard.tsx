import { Play, Check, Plus, GraduationCap, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import type { SpotifyTrack } from '../spotify/api'
import { useLibrary } from '../store/useLibrary'
import { useNav } from '../store/useNav'
import { useSession } from '../store/useSession'
import { AlbumArt } from './AlbumArt'

/**
 * A song result card. Shows album art, lets Alice open the karaoke view, and
 * save the track as "want to learn" or "already know".
 */
export function TrackCard({ track }: { track: SpotifyTrack }) {
  const status = useLibrary((s) => s.songs[track.id]?.status ?? null)
  const addSong = useLibrary((s) => s.addSong)
  const go = useNav((s) => s.go)
  const setActiveTrack = useSession((s) => s.setActiveTrack)

  const image = track.album.images?.[0]?.url ?? null
  const artists = track.artists.map((a) => a.name).join(', ')

  const open = () => {
    setActiveTrack(track)
    go('song', track.id)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass group flex flex-col overflow-hidden rounded-3xl p-3"
    >
      <button
        onClick={open}
        className="relative aspect-square w-full overflow-hidden rounded-2xl"
      >
        <AlbumArt
          src={image}
          alt={`Capa de ${track.name}`}
          imgClassName="transition-transform duration-500 group-hover:scale-105"
          fallbackIcon={<Sparkles size={28} />}
        />
        <span className="absolute inset-0 bg-gradient-to-t from-night-900/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute bottom-3 right-3 grid h-12 w-12 translate-y-2 place-items-center rounded-full bg-cream text-night-900 opacity-0 shadow-xl transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Play size={22} className="ml-0.5" fill="currentColor" />
        </span>
      </button>

      <div className="mt-3 px-1">
        <h3 className="truncate font-display text-lg leading-snug">{track.name}</h3>
        <p className="truncate text-sm text-mist/70">{artists}</p>
      </div>

      <div className="mt-3 flex gap-2 px-1 pb-1">
        <SaveButton
          active={status === 'learning'}
          onClick={() => addSong(track, 'learning')}
          icon={status === 'learning' ? Check : Plus}
          label="Quero aprender"
        />
        <SaveButton
          active={status === 'known'}
          onClick={() => addSong(track, 'known')}
          icon={status === 'known' ? Check : GraduationCap}
          label="Já sei"
          tone="known"
        />
      </div>
    </motion.div>
  )
}

function SaveButton({
  active,
  onClick,
  icon: Icon,
  label,
  tone = 'learning',
}: {
  active: boolean
  onClick: () => void
  icon: typeof Plus
  label: string
  tone?: 'learning' | 'known'
}) {
  const activeBg =
    tone === 'known'
      ? 'bg-gold/20 text-gold border-gold/40'
      : 'bg-rose-400/20 text-rose-300 border-rose-400/40'
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
        active ? activeBg : 'border-white/10 text-mist/70 hover:border-white/25 hover:text-cream'
      }`}
    >
      <Icon size={15} strokeWidth={2.4} />
      <span className="truncate">{label}</span>
    </button>
  )
}
