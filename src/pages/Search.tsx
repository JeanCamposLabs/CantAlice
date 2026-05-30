import { useEffect, useRef, useState } from 'react'
import { Search as SearchIcon, X, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { searchTracks, type SpotifyTrack } from '../spotify/api'
import { useSession } from '../store/useSession'
import { TrackCard } from '../components/TrackCard'
import { ConnectGate, EmptyState } from '../components/States'

// A few gentle starting points for someone learning English through music.
const SUGGESTIONS = [
  'The Beatles',
  'Adele',
  'Ed Sheeran',
  'Coldplay',
  'Frank Sinatra',
  'Taylor Swift',
  'John Legend',
  'ABBA',
]

export function SearchPage() {
  const auth = useSession((s) => s.auth)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced search.
  useEffect(() => {
    if (auth !== 'loggedin') return
    const q = query.trim()
    if (!q) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const handle = setTimeout(async () => {
      try {
        const r = await searchTracks(q)
        setResults(r)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 380)
    return () => clearTimeout(handle)
  }, [query, auth])

  useEffect(() => {
    if (auth === 'loggedin') inputRef.current?.focus()
  }, [auth])

  if (auth !== 'loggedin') {
    return <ConnectGate feature="buscar e tocar músicas" />
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl">
          O que vamos <span className="text-glow">cantar</span> hoje?
        </h1>
        <p className="mt-2 text-mist/70">Busque qualquer música em inglês e comece a praticar.</p>
      </div>

      {/* Search bar */}
      <div className="glass flex items-center gap-3 rounded-2xl px-5 py-4">
        <SearchIcon className="shrink-0 text-mist/60" size={22} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setTouched(true)
          }}
          placeholder="Ex.: Yesterday, Someone Like You, Perfect…"
          className="w-full bg-transparent text-lg outline-none placeholder:text-mist/40"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="rounded-full p-1 text-mist/60 hover:text-cream"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Suggestions before any search */}
      {!touched && !query && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="mb-3 flex items-center gap-2 text-sm text-mist/60">
            <Sparkles size={16} /> Sugestões para começar
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s)
                  setTouched(true)
                }}
                className="btn-ghost text-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Results */}
      {loading && <ResultsSkeleton />}

      {!loading && results.length > 0 && (
        <motion.div
          layout
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          <AnimatePresence>
            {results.map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading && touched && query && results.length === 0 && (
        <EmptyState
          icon={<SearchIcon size={32} />}
          title="Nada encontrado"
          description="Tente outro nome de música ou artista."
        />
      )}
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="glass rounded-3xl p-3">
          <div className="skeleton aspect-square w-full rounded-2xl" />
          <div className="skeleton mt-3 h-4 w-3/4 rounded" />
          <div className="skeleton mt-2 h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )
}
