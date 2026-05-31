import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { BookmarkPlus, BookmarkCheck, Loader2, Volume2 } from 'lucide-react'
import { translate } from '../lyrics/translate'
import { useLibrary } from '../store/useLibrary'
import { speak, canSpeak } from '../lib/speak'

export interface WordSelection {
  word: string
  /** Bounding rect of the tapped word, in viewport coordinates. */
  rect: DOMRect
  songName: string | null
}

/**
 * A small floating card that translates a single tapped word and lets Alice
 * save it to her vocabulary. Positioned just above the tapped word.
 */
export function WordPopover({
  selection,
  onClose,
}: {
  selection: WordSelection
  onClose: () => void
}) {
  const [translation, setTranslation] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const hasWord = useLibrary((s) => s.hasWord(selection.word))
  const addWord = useLibrary((s) => s.addWord)
  const removeWord = useLibrary((s) => s.removeWord)

  const cleanWord = selection.word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setTranslation(null)
    translate(cleanWord).then((t) => {
      if (alive) {
        setTranslation(t)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [cleanWord])

  // Close on outside click / escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Position: centered above the word, clamped to the viewport.
  const width = 240
  const left = Math.min(
    Math.max(12, selection.rect.left + selection.rect.width / 2 - width / 2),
    window.innerWidth - width - 12,
  )
  const top = selection.rect.top - 12

  return createPortal(
    <>
      {/* Click-away layer */}
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong fixed z-50 -translate-y-full rounded-2xl p-4 shadow-2xl"
        style={{ left, top, width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs uppercase tracking-[0.18em] text-mist/50">Inglês</div>
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl text-cream">{cleanWord}</span>
          {canSpeak && (
            <button
              onClick={() => speak(cleanWord)}
              title="Ouvir pronúncia"
              className="grid h-8 w-8 place-items-center rounded-full bg-white/8 text-aurora-3 transition-colors hover:bg-white/15"
            >
              <Volume2 size={16} />
            </button>
          )}
        </div>

        <div className="mt-2 min-h-[1.75rem] text-lg text-rose-300">
          {loading ? (
            <span className="flex items-center gap-2 text-mist/60">
              <Loader2 size={16} className="animate-spin" /> traduzindo…
            </span>
          ) : (
            translation
          )}
        </div>

        <button
          disabled={loading}
          onClick={() =>
            hasWord
              ? removeWord(cleanWord)
              : addWord(cleanWord, translation ?? '', selection.songName)
          }
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
            hasWord
              ? 'bg-gold/20 text-gold'
              : 'bg-rose-400/20 text-rose-200 hover:bg-rose-400/30'
          }`}
        >
          {hasWord ? (
            <>
              <BookmarkCheck size={16} /> Guardada
            </>
          ) : (
            <>
              <BookmarkPlus size={16} /> Guardar palavra
            </>
          )}
        </button>

        {/* Little pointer */}
        <span
          className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45"
          style={{
            background: 'color-mix(in oklab, var(--color-night-700) 78%, transparent)',
            borderRight: '1px solid rgba(255,255,255,0.12)',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
          }}
        />
      </motion.div>
    </>,
    document.body,
  )
}
