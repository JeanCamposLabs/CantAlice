import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Volume2, PartyPopper, Eye } from 'lucide-react'
import { useLibrary, selectReviewQueue, type ReviewItem } from '../store/useLibrary'
import { previewIntervals, formatInterval, type Rating } from '../srs/fsrs'
import { speak, canSpeak } from '../lib/speak'

/** Highlight occurrences of `word` (stem match) inside an example phrase. */
function emphasize(text: string, word: string) {
  const re = new RegExp(`(\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*)`, 'i')
  const parts = text.split(re)
  if (parts.length === 1) return text
  return parts.map((p, i) =>
    re.test(p) ? (
      <strong key={i} className="text-glow">
        {p}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

/** Blank out the target word in an example so it can be produced from context. */
function cloze(text: string, word: string) {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'i')
  return text.replace(re, '_____')
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z'-]/gi, '')

const RATINGS: { rating: Rating; label: string; cls: string }[] = [
  { rating: 1, label: 'Errei', cls: 'bg-rose-500/25 text-rose-200 hover:bg-rose-500/35' },
  { rating: 2, label: 'Difícil', cls: 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30' },
  { rating: 3, label: 'Bom', cls: 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30' },
  { rating: 4, label: 'Fácil', cls: 'bg-sky-500/20 text-sky-200 hover:bg-sky-500/30' },
]

export function ReviewSession({ onExit }: { onExit: () => void }) {
  const reviewCard = useLibrary((s) => s.reviewCard)

  // Snapshot the queue at session start; "Errei" cards are re-queued in-session.
  const [queue, setQueue] = useState<ReviewItem[]>(() => selectReviewQueue(useLibrary.getState()))
  const [pos, setPos] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [typed, setTyped] = useState('')
  const [reviewed, setReviewed] = useState(0)

  const item = queue[pos]
  const curKey = item?.key
  // Live SRS state so the interval previews reflect any in-session re-grading.
  const liveState = useLibrary((s) =>
    curKey && item ? s.vocab[curKey]?.srs?.[item.dir] : undefined,
  )

  const intervals = useMemo(
    () => (item ? previewIntervals(liveState ?? item.state) : null),
    [item, liveState],
  )

  if (!item) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto flex max-w-md flex-col items-center gap-5 py-10 text-center"
      >
        <span className="grid h-20 w-20 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
          <PartyPopper size={36} />
        </span>
        <h2 className="font-display text-3xl">
          {reviewed > 0 ? 'Revisão concluída! 🎉' : 'Nada para revisar agora'}
        </h2>
        <p className="text-mist/70">
          {reviewed > 0
            ? `Você revisou ${reviewed} ${reviewed === 1 ? 'cartão' : 'cartões'} hoje. Volte amanhã para fixar de vez. 💛`
            : 'Guarde palavras nas músicas e elas aparecem aqui para revisar no momento certo.'}
        </p>
        <button onClick={onExit} className="btn-primary">
          Voltar ao vocabulário
        </button>
      </motion.div>
    )
  }

  const { word, dir } = item
  const hasExample = Boolean(word.example?.text)

  const grade = (rating: Rating) => {
    reviewCard(item.key, dir, rating)
    setRevealed(false)
    setTyped('')
    if (rating === 1) {
      // Re-queue the missed card a few positions later in this session.
      setQueue((q) => {
        const next = [...q]
        const [cur] = next.splice(pos, 1)
        next.splice(Math.min(next.length, pos + 5), 0, cur)
        return next
      })
      // pos now points at the following card already.
    } else {
      setReviewed((n) => n + 1)
      setPos((p) => p + 1)
    }
  }

  const reveal = () => setRevealed(true)
  const typedCorrect = revealed && dir === 'rev' && norm(typed) === norm(word.word)

  const remaining = queue.length - pos
  const progress = queue.length ? (pos / queue.length) * 100 : 0

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-mist/55">
        <span>{remaining} restantes</span>
        <button onClick={onExit} className="hover:text-cream">
          Sair
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg,#b478ff,#ff8fb1)' }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${item.key}:${dir}:${pos}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.22 }}
          className="glass-strong flex min-h-[20rem] flex-col items-center justify-center gap-4 rounded-3xl p-7 text-center"
        >
          <span className="rounded-full bg-white/8 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-mist/55">
            {dir === 'fwd' ? 'Reconhecer · EN → PT' : 'Produzir · PT → EN'}
          </span>

          {dir === 'fwd' ? (
            <FwdCard word={word} revealed={revealed} hasExample={hasExample} />
          ) : (
            <RevCard
              word={word}
              revealed={revealed}
              hasExample={hasExample}
              typed={typed}
              setTyped={setTyped}
              typedCorrect={typedCorrect}
              onEnter={reveal}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      {!revealed ? (
        <button onClick={reveal} className="btn-primary justify-center py-3 text-base">
          <Eye size={18} /> Mostrar resposta
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map(({ rating, label, cls }) => (
            <button
              key={rating}
              onClick={() => grade(rating)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-2 py-3 text-sm font-semibold transition-colors ${cls}`}
            >
              {label}
              <span className="text-[0.65rem] font-normal opacity-80">
                {intervals ? formatInterval(intervals[rating]) : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// — Recognition: see the English (in context), recall the Portuguese —
function FwdCard({
  word,
  revealed,
  hasExample,
}: {
  word: ReviewItem['word']
  revealed: boolean
  hasExample: boolean
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="font-display text-5xl text-glow">{word.word}</span>
        {canSpeak && (
          <button
            onClick={() => speak(word.word)}
            title="Ouvir"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/8 text-aurora-3 hover:bg-white/15"
          >
            <Volume2 size={18} />
          </button>
        )}
      </div>

      {hasExample && (
        <p className="max-w-md text-lg leading-snug text-mist/85">
          {emphasize(word.example!.text, word.word)}
        </p>
      )}

      {!revealed ? (
        <span className="text-sm text-mist/45">O que significa em português?</span>
      ) : (
        <div className="mt-1 flex flex-col items-center gap-1 border-t border-white/10 pt-3">
          <span className="font-display text-3xl text-rose-300">{word.translation}</span>
          {hasExample && (
            <span className="text-base italic text-rose-300/70">{word.example!.translation}</span>
          )}
        </div>
      )}
    </>
  )
}

// — Production: see the Portuguese meaning + context, produce the English —
function RevCard({
  word,
  revealed,
  hasExample,
  typed,
  setTyped,
  typedCorrect,
  onEnter,
}: {
  word: ReviewItem['word']
  revealed: boolean
  hasExample: boolean
  typed: string
  setTyped: (v: string) => void
  typedCorrect: boolean
  onEnter: () => void
}) {
  return (
    <>
      <span className="font-display text-4xl text-cream">{word.translation}</span>
      {hasExample && (
        <p className="max-w-md text-lg italic leading-snug text-mist/75">
          {revealed
            ? emphasize(word.example!.text, word.word)
            : word.example!.translation}
        </p>
      )}
      {hasExample && !revealed && (
        <p className="max-w-md text-base leading-snug text-mist/50">
          {cloze(word.example!.text, word.word)}
        </p>
      )}

      {!revealed ? (
        <>
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onEnter()}
            placeholder="palavra em inglês…"
            className="mt-1 w-56 rounded-2xl border border-white/12 bg-white/5 px-4 py-2.5 text-center text-lg outline-none placeholder:text-mist/35 focus:border-aurora-3/50"
          />
          <span className="text-sm text-mist/45">Como se diz em inglês?</span>
        </>
      ) : (
        <div className="mt-1 flex flex-col items-center gap-1 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-4xl text-glow">{word.word}</span>
            {canSpeak && (
              <button
                onClick={() => speak(word.word)}
                title="Ouvir"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/8 text-aurora-3 hover:bg-white/15"
              >
                <Volume2 size={16} />
              </button>
            )}
          </div>
          {typed.trim() && (
            <span className={`text-sm ${typedCorrect ? 'text-emerald-300' : 'text-rose-300/80'}`}>
              {typedCorrect ? 'Você acertou! 🎉' : `Você escreveu: ${typed}`}
            </span>
          )}
        </div>
      )}
    </>
  )
}
