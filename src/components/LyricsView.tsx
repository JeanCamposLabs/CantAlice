import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { LyricsResult, LyricLine } from '../lyrics/lrclib'
import { activeLineIndex } from '../lyrics/lrclib'
import { translate } from '../lyrics/translate'
import { useLibrary } from '../store/useLibrary'
import { WordPopover, type WordSelection } from './WordPopover'

interface Props {
  lyrics: LyricsResult
  songName: string | null
  /** True only when we have real-time position (Spotify) AND synced lyrics. */
  isSynced: boolean
  getPosition: () => number
  onSeekToLine?: (ms: number) => void
}

// Highlight a line slightly *before* its timestamp so Alice can breathe in.
const LEAD_MS = 350

export function LyricsView({ lyrics, songName, isSynced, getPosition, onSeekToLine }: Props) {
  const showTranslations = useLibrary((s) => s.showTranslations)
  const largeLyrics = useLibrary((s) => s.largeLyrics)

  const lines: LyricLine[] = useMemo(() => {
    if (lyrics.synced) return lyrics.synced
    if (lyrics.plain) return lyrics.plain.map((text) => ({ timeMs: -1, text }))
    return []
  }, [lyrics])

  const [activeIdx, setActiveIdx] = useState(-1)
  const [translations, setTranslations] = useState<Record<number, string>>({})
  const [selection, setSelection] = useState<WordSelection | null>(null)
  const pendingRef = useRef<Set<number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  // Stable per-row ref registrar — keeps LyricLineRow's props referentially
  // stable so React.memo can skip the lines whose state didn't change.
  const registerRef = useCallback((i: number, el: HTMLDivElement | null) => {
    lineRefs.current[i] = el
  }, [])

  // — Track the active line via the live position (Spotify only) —
  useEffect(() => {
    if (!isSynced) {
      setActiveIdx(-1)
      return
    }
    let raf = 0
    const loop = () => {
      const idx = activeLineIndex(lines, getPosition() + LEAD_MS)
      setActiveIdx((prev) => (prev !== idx ? idx : prev))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [isSynced, lines, getPosition])

  // — Auto-scroll the active line to the vertical centre of the container —
  useEffect(() => {
    if (!isSynced || activeIdx < 0) return
    const container = containerRef.current
    const el = lineRefs.current[activeIdx]
    if (!container || !el) return
    const target = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2
    container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }, [activeIdx, isSynced])

  // — Lazily translate the current window of lines (Spotify mode) —
  const ensureTranslated = useCallback(
    (i: number) => {
      if (!showTranslations || i < 0 || i >= lines.length) return
      // pendingRef is permanent (we never delete), so it alone dedupes both
      // in-flight and completed lines — no need to depend on `translations`.
      if (pendingRef.current.has(i)) return
      const text = lines[i].text.trim()
      if (!text) return
      pendingRef.current.add(i)
      translate(text).then((t) => setTranslations((prev) => ({ ...prev, [i]: t })))
    },
    [showTranslations, lines],
  )

  useEffect(() => {
    if (!isSynced) return
    for (let i = activeIdx; i <= activeIdx + 3; i++) ensureTranslated(i)
  }, [activeIdx, isSynced, ensureTranslated])

  // — Static mode: translate the whole song progressively in the background —
  useEffect(() => {
    if (isSynced || !showTranslations || lines.length === 0) return
    let cancelled = false
    ;(async () => {
      for (let i = 0; i < lines.length; i++) {
        if (cancelled) break
        const text = lines[i].text.trim()
        if (!text) continue
        const t = await translate(text)
        if (cancelled) break
        setTranslations((prev) => (prev[i] !== undefined ? prev : { ...prev, [i]: t }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isSynced, showTranslations, lines])

  const onWordClick = useCallback(
    (word: string, line: string, e: React.MouseEvent<HTMLButtonElement>) => {
      setSelection({ word, rect: e.currentTarget.getBoundingClientRect(), songName, line })
    },
    [songName],
  )

  if (lines.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-y-auto px-1 pb-32 pt-4 sm:px-4"
      style={{ scrollPaddingTop: '40%' }}
    >
      <div className="mx-auto max-w-2xl space-y-1">
        {lines.map((line, i) => (
          <LyricLineRow
            key={i}
            registerRef={registerRef}
            line={line}
            index={i}
            isSynced={isSynced}
            large={largeLyrics}
            state={i === activeIdx ? 'active' : i < activeIdx ? 'past' : 'future'}
            translation={showTranslations ? translations[i] : undefined}
            onWordClick={onWordClick}
            onSeek={onSeekToLine}
          />
        ))}
      </div>

      {selection && (
        <WordPopover selection={selection} onClose={() => setSelection(null)} />
      )}
    </div>
  )
}

// — A single lyric line, with tappable words and optional translation —
type LineState = 'active' | 'past' | 'future'

const LyricLineRow = memo(function LyricLineRow({
  registerRef,
  line,
  index,
  isSynced,
  large,
  state,
  translation,
  onWordClick,
  onSeek,
}: {
  registerRef: (index: number, el: HTMLDivElement | null) => void
  line: LyricLine
  index: number
  isSynced: boolean
  large: boolean
  state: LineState
  translation?: string
  onWordClick: (word: string, line: string, e: React.MouseEvent<HTMLButtonElement>) => void
  onSeek?: (ms: number) => void
}) {
  // Tokenise into words + whitespace so we can make words individually tappable.
  const tokens = useMemo(() => line.text.match(/(\s+|[^\s]+)/g) ?? [], [line.text])

  const ref = useCallback((el: HTMLDivElement | null) => registerRef(index, el), [registerRef, index])
  const seek = isSynced && onSeek ? () => onSeek(line.timeMs) : undefined

  const isBlank = line.text.trim() === ''

  // Visual emphasis by karaoke state. In "large" mode we lift the contrast of
  // the non-active lines so everything stays easy to read at a distance.
  const stateClass = !isSynced
    ? 'text-cream/90'
    : state === 'active'
      ? 'text-cream'
      : state === 'past'
        ? large
          ? 'text-mist/55'
          : 'text-mist/35'
        : large
          ? 'text-mist/75'
          : 'text-mist/55'

  if (isBlank) return <div ref={ref} className="h-5" aria-hidden />

  return (
    <motion.div
      ref={ref}
      animate={{
        scale: isSynced && state === 'active' ? 1.0 : 0.985,
        opacity: 1,
      }}
      className={`group relative rounded-2xl px-3 py-2 transition-colors ${
        isSynced && state === 'active' ? 'bg-white/5' : ''
      }`}
    >
      {/* Seek affordance */}
      {seek && (
        <button
          onClick={seek}
          title="Pular para este trecho"
          className="absolute -left-1 top-1/2 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-mist/40 hover:text-rose-300 group-hover:grid"
        >
          ►
        </button>
      )}

      <p
        className={`font-display leading-relaxed transition-all duration-300 ${
          large ? 'text-3xl sm:text-[2.5rem]' : 'text-2xl sm:text-[1.7rem]'
        } ${stateClass} ${
          isSynced && state === 'active' ? 'drop-shadow-[0_2px_20px_rgba(255,143,177,0.35)]' : ''
        }`}
      >
        {tokens.map((tok, ti) =>
          /\s+/.test(tok) ? (
            <span key={ti}>{tok}</span>
          ) : (
            <button
              key={ti}
              onClick={(e) => {
                e.stopPropagation()
                onWordClick(tok, line.text, e)
              }}
              className="rounded-md decoration-rose-400/40 underline-offset-4 transition-colors hover:bg-rose-400/15 hover:text-rose-200 hover:underline"
            >
              {tok}
            </button>
          ),
        )}
      </p>

      {translation && (
        <p
          className={`mt-0.5 px-0.5 italic ${
            large ? 'text-lg text-rose-300/90 sm:text-2xl' : 'text-base text-rose-300/80 sm:text-lg'
          }`}
        >
          {translation}
        </p>
      )}
    </motion.div>
  )
})
