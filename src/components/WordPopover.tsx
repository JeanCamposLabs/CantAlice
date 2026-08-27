import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { BookmarkPlus, BookmarkCheck, Loader2, Volume2 } from 'lucide-react'
import { translate } from '../lyrics/translate'
import { fetchExample, type Example } from '../lyrics/examples'
import { useLibrary } from '../store/useLibrary'
import { speak, canSpeak } from '../lib/speak'
import { SpeakableText } from './SpeakableText'
import { SpeechCheck } from './SpeechCheck'
import { useLangName } from '../lib/useLangName'

export interface WordSelection {
  word: string
  /** Bounding rect of the tapped word, in viewport coordinates. */
  rect: DOMRect
  songName: string | null
  /** The lyric line the word was tapped in (used as an example fallback). */
  line?: string
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
  const [example, setExample] = useState<Example | null>(null)
  const [exampleLoading, setExampleLoading] = useState(true)
  const hasWord = useLibrary((s) => s.hasWord(selection.word))
  const addWord = useLibrary((s) => s.addWord)
  const removeWord = useLibrary((s) => s.removeWord)
  const setWordExample = useLibrary((s) => s.setWordExample)

  const cleanWord = selection.word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
  const langName = useLangName()
  const langLabel = langName.charAt(0).toUpperCase() + langName.slice(1)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setTranslation(null)
    translate(cleanWord, { premium: true }).then((t) => {
      if (alive) {
        setTranslation(t)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [cleanWord])

  // Fetch a real-world example phrase (Reverso-Context style) for the word.
  useEffect(() => {
    let alive = true
    setExampleLoading(true)
    setExample(null)
    fetchExample(cleanWord).then((ex) => {
      if (!alive) return
      setExample(ex)
      setExampleLoading(false)
      // If the word is already saved without an example, fill it in.
      if (ex) setWordExample(cleanWord, ex)
    })
    return () => {
      alive = false
    }
  }, [cleanWord, setWordExample])

  // Close on outside click / escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Position: centered on the word, clamped to the viewport. Prefer above the
  // word (it doesn't cover the next lyric line); go below when the space above
  // can't fit a typical card and below has more room. Whichever side, the card
  // is capped to the available space and scrolls inside itself, so it can
  // never be clipped off-screen — not even on a short landscape viewport.
  const width = 280
  const left = Math.min(
    Math.max(12, selection.rect.left + selection.rect.width / 2 - width / 2),
    window.innerWidth - width - 12,
  )
  const spaceAbove = selection.rect.top - 16
  const spaceBelow = window.innerHeight - selection.rect.bottom - 16
  const below = spaceAbove < 340 && spaceBelow > spaceAbove
  // Exactly the room the chosen side has — a floor here would push the card
  // back off-screen on a short landscape viewport.
  const maxHeight = below ? spaceBelow : spaceAbove
  const top = below ? selection.rect.bottom + 12 : selection.rect.top - 12

  return createPortal(
    <>
      {/* Click-away layer */}
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: below ? -8 : 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={`glass-strong fixed z-50 rounded-2xl shadow-2xl ${below ? '' : '-translate-y-full'}`}
        style={{ left, top, width }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* The scroll lives on an inner wrapper so the pointer below, which
            sticks out of the card, is never clipped by the overflow. */}
        <div className="overflow-y-auto p-4" style={{ maxHeight }}>
        <div className="text-xs uppercase tracking-[0.18em] text-mist/50">{langLabel}</div>
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

        <div className="mt-2 flex justify-center">
          <SpeechCheck target={cleanWord} label="Falar" />
        </div>

        {/* Real-world example phrase (Reverso-Context style) */}
        <div className="mt-3 rounded-xl bg-white/5 px-3 py-2">
          <div className="text-[0.65rem] uppercase tracking-[0.18em] text-mist/45">Exemplo</div>
          {exampleLoading ? (
            <span className="mt-1 flex items-center gap-2 text-sm text-mist/50">
              <Loader2 size={14} className="animate-spin" /> buscando frase…
            </span>
          ) : example ? (
            <>
              <p className="mt-0.5 text-sm leading-snug text-mist/85">
                <SpeakableText text={example.text} highlight={cleanWord} />
              </p>
              <p className="mt-0.5 text-sm italic leading-snug text-rose-300/80">
                {example.translation}
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-mist/50">Sem frase de exemplo desta vez.</p>
          )}
        </div>

        <button
          disabled={loading}
          onClick={() =>
            hasWord
              ? removeWord(cleanWord)
              : addWord(cleanWord, translation ?? '', selection.songName, example)
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
        </div>

        {/* Little pointer, on whichever edge faces the word */}
        <span
          className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 ${
            below ? '-top-1.5' : '-bottom-1.5'
          }`}
          style={{
            background: 'color-mix(in oklab, var(--color-night-700) 78%, transparent)',
            ...(below
              ? {
                  borderLeft: '1px solid rgba(255,255,255,0.12)',
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                }
              : {
                  borderRight: '1px solid rgba(255,255,255,0.12)',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                }),
          }}
        />
      </motion.div>
    </>,
    document.body,
  )
}
