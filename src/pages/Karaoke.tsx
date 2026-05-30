import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  GraduationCap,
  Sparkles,
  Languages,
  Loader2,
  MicVocal,
  Crown,
  Disc3,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useNav } from '../store/useNav'
import { useSession } from '../store/useSession'
import { useLibrary } from '../store/useLibrary'
import { getTrack, type SpotifyTrack } from '../spotify/api'
import { fetchLyrics, type LyricsResult } from '../lyrics/lrclib'
import { useKaraokePlayback } from '../hooks/useKaraokePlayback'
import { LyricsView } from '../components/LyricsView'
import { PlayerControls } from '../components/PlayerControls'
import { AlbumArt } from '../components/AlbumArt'
import { ConnectGate, EmptyState } from '../components/States'

type LyricsStatus = 'idle' | 'loading' | 'done' | 'notfound'

export function KaraokePage() {
  const auth = useSession((s) => s.auth)
  const isPremium = useSession((s) => s.isPremium)
  const activeTrack = useSession((s) => s.activeTrack)
  const setActiveTrack = useSession((s) => s.setActiveTrack)
  const trackId = useNav((s) => s.trackId)
  const go = useNav((s) => s.go)

  const [track, setTrack] = useState<SpotifyTrack | null>(
    activeTrack && activeTrack.id === trackId ? activeTrack : null,
  )

  // If we arrived via a deep link / refresh, fetch the track by id.
  useEffect(() => {
    if (track && track.id === trackId) return
    if (activeTrack && activeTrack.id === trackId) {
      setTrack(activeTrack)
      return
    }
    if (!trackId || auth !== 'loggedin') return
    let alive = true
    getTrack(trackId)
      .then((t) => {
        if (alive) {
          setTrack(t)
          setActiveTrack(t)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [trackId, auth, activeTrack, track, setActiveTrack])

  if (auth !== 'loggedin') {
    return <ConnectGate feature="cantar junto com letras sincronizadas" />
  }

  if (!track) {
    return (
      <div className="grid place-items-center py-32 text-mist/60">
        <Loader2 className="animate-spin" size={32} />
      </div>
    )
  }

  return <KaraokeStage track={track} isPremium={isPremium} onBack={() => go('search')} />
}

function KaraokeStage({
  track,
  isPremium,
  onBack,
}: {
  track: SpotifyTrack
  isPremium: boolean
  onBack: () => void
}) {
  const playback = useKaraokePlayback(track, isPremium)
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null)
  const [status, setStatus] = useState<LyricsStatus>('idle')

  const status_ = useLibrary((s) => s.songs[track.id]?.status ?? null)
  const addSong = useLibrary((s) => s.addSong)
  const setSongStatus = useLibrary((s) => s.setStatus)
  const markPracticed = useLibrary((s) => s.markPracticed)
  const showTranslations = useLibrary((s) => s.showTranslations)
  const toggleTranslations = useLibrary((s) => s.toggleTranslations)

  const practicedFor = useRef<string | null>(null)

  // Fetch lyrics whenever the track changes.
  useEffect(() => {
    let alive = true
    setStatus('loading')
    setLyrics(null)
    fetchLyrics({
      track: track.name,
      artist: track.artists[0]?.name ?? '',
      album: track.album.name,
      durationMs: track.durationMs,
    })
      .then((res) => {
        if (!alive) return
        if (res && (res.synced || res.plain)) {
          setLyrics(res)
          setStatus('done')
        } else {
          setStatus('notfound')
        }
      })
      .catch(() => alive && setStatus('notfound'))
    return () => {
      alive = false
    }
  }, [track])

  // Count a practice session once per opened track.
  useEffect(() => {
    if (practicedFor.current === track.id) return
    practicedFor.current = track.id
    if (useLibrary.getState().songs[track.id]) markPracticed(track.id)
  }, [track.id, markPracticed])

  const isSynced = playback.mode === 'spotify' && !!lyrics?.synced
  const image = track.album.images?.[0]?.url ?? null
  const artists = track.artists.map((a) => a.name).join(', ')

  return (
    <div className="lg:flex lg:h-[calc(100dvh-5.5rem)] lg:gap-10">
      {/* — Left: cover, meta, controls — */}
      <div className="lg:flex lg:w-[22rem] lg:shrink-0 lg:flex-col">
        <button
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-2 text-sm text-mist/70 transition-colors hover:text-cream"
        >
          <ArrowLeft size={18} /> Voltar
        </button>

        <div className="flex items-center gap-4 lg:flex-col lg:items-stretch lg:gap-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-3xl shadow-2xl sm:w-36 lg:w-full"
          >
            <AlbumArt src={image} alt={`Capa de ${track.name}`} fallbackIcon={<Disc3 size={48} />} />
            {playback.isPlaying && (
              <motion.div
                className="absolute inset-0 rounded-3xl ring-2 ring-rose-400/60"
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
            )}
          </motion.div>

          <div className="min-w-0 lg:mt-5">
            <h1 className="truncate font-display text-2xl leading-tight sm:text-3xl lg:whitespace-normal">
              {track.name}
            </h1>
            <p className="mt-1 truncate text-mist/70">{artists}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 lg:mt-8">
          <PlayerControls playback={playback} />
          {playback.error && (
            <p className="mt-3 text-center text-sm text-rose-300">{playback.error}</p>
          )}
        </div>

        {/* Mode notice */}
        <ModeNotice mode={playback.mode} isPremium={isPremium} hasSynced={!!lyrics?.synced} />

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-2 lg:mt-auto lg:pt-6">
          <button onClick={toggleTranslations} className="btn-ghost flex-1 text-sm">
            <Languages size={16} />
            {showTranslations ? 'Tradução: ligada' : 'Tradução: desligada'}
          </button>

          {status_ === 'known' ? (
            <button
              onClick={() => setSongStatus(track.id, 'learning')}
              className="btn-ghost text-sm text-rose-300"
            >
              <Sparkles size={16} /> Aprendendo
            </button>
          ) : status_ === 'learning' ? (
            <button
              onClick={() => setSongStatus(track.id, 'known')}
              className="btn-ghost text-sm text-gold"
            >
              <GraduationCap size={16} /> Já sei!
            </button>
          ) : (
            <button onClick={() => addSong(track, 'learning')} className="btn-ghost text-sm">
              <Sparkles size={16} /> Quero aprender
            </button>
          )}
        </div>
      </div>

      {/* — Right: lyrics — */}
      <div className="mt-8 min-w-0 flex-1 lg:mt-0">
        <div className="glass relative h-[58vh] overflow-hidden rounded-3xl lg:h-full">
          {/* top/bottom fade masks */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-night-800/80 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-night-800/90 to-transparent" />

          {status === 'loading' && <LyricsSkeleton />}

          {status === 'notfound' && (
            <div className="grid h-full place-items-center p-6">
              <EmptyState
                icon={<MicVocal size={32} />}
                title="Letra não encontrada"
                description="Não achei a letra desta música, mas você ainda pode ouvir e cantar de ouvido. Tente outra versão da música pela busca."
              />
            </div>
          )}

          {status === 'done' && lyrics && (
            <LyricsView
              lyrics={lyrics}
              songName={track.name}
              isSynced={isSynced}
              getPosition={playback.getPosition}
              onSeekToLine={(ms) => playback.seek(ms)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ModeNotice({
  mode,
  isPremium,
  hasSynced,
}: {
  mode: 'spotify' | 'preview' | 'unavailable'
  isPremium: boolean
  hasSynced: boolean
}) {
  if (mode === 'spotify') {
    return (
      <p className="mt-4 flex items-center gap-2 text-xs text-mist/55">
        <MicVocal size={14} className="text-rose-300" />
        {hasSynced
          ? 'Letras sincronizadas — acompanhe a linha destacada.'
          : 'Tocando a música completa pelo Spotify.'}
      </p>
    )
  }
  if (mode === 'preview') {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-gold/10 p-3 text-xs text-gold/90">
        <Crown size={16} className="mt-0.5 shrink-0" />
        <span>
          {isPremium
            ? 'Conectando ao player do Spotify… enquanto isso, prévia de 30s.'
            : 'Modo prévia (30s). Com o Spotify Premium, toque a música inteira com a letra sincronizada.'}
        </span>
      </div>
    )
  }
  return (
    <div className="mt-4 rounded-2xl bg-white/5 p-3 text-xs text-mist/60">
      Esta música não tem prévia disponível. Você ainda pode ler e aprender a letra.
    </div>
  )
}

function LyricsSkeleton() {
  return (
    <div className="space-y-4 p-8">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-7 rounded-xl"
          style={{ width: `${50 + ((i * 13) % 45)}%` }}
        />
      ))}
    </div>
  )
}
