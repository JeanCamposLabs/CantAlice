import { useState } from 'react'
import {
  BookHeart,
  Trash2,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  List,
  Layers,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useLibrary, selectVocab, type VocabWord } from '../store/useLibrary'
import { EmptyState } from '../components/States'

export function VocabularyPage() {
  const words = useLibrary(useShallow(selectVocab))
  const [mode, setMode] = useState<'list' | 'cards'>('list')

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">Vocabulário</h1>
          <p className="mt-2 text-mist/70">
            {words.length === 0
              ? 'As palavras que você guardar das músicas aparecem aqui.'
              : `${words.length} ${words.length === 1 ? 'palavra guardada' : 'palavras guardadas'}.`}
          </p>
        </div>

        {words.length > 0 && (
          <div className="glass inline-flex rounded-2xl p-1.5">
            <ModeButton active={mode === 'list'} onClick={() => setMode('list')} icon={List}>
              Lista
            </ModeButton>
            <ModeButton active={mode === 'cards'} onClick={() => setMode('cards')} icon={Layers}>
              Praticar
            </ModeButton>
          </div>
        )}
      </div>

      {words.length === 0 ? (
        <EmptyState
          icon={<BookHeart size={32} />}
          title="Seu caderninho está vazio"
          description="Enquanto canta, toque em qualquer palavra da letra para ver a tradução e guardá-la aqui."
        />
      ) : mode === 'list' ? (
        <WordList words={words} />
      ) : (
        <Flashcards words={words} />
      )}
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof List
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
        active ? 'text-night-900' : 'text-mist/70 hover:text-cream'
      }`}
    >
      {active && (
        <motion.span
          layoutId="vocab-mode"
          className="absolute inset-0 -z-10 rounded-xl"
          style={{ background: 'linear-gradient(105deg, #b478ff, #ff8fb1)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
      <Icon size={16} />
      {children}
    </button>
  )
}

function WordList({ words }: { words: VocabWord[] }) {
  const removeWord = useLibrary((s) => s.removeWord)
  return (
    <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence>
        {words.map((w) => (
          <motion.div
            key={w.word.toLowerCase()}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass group flex items-start gap-3 rounded-2xl p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl text-cream">{w.word}</div>
              <div className="text-rose-300">{w.translation}</div>
              {w.songName && (
                <div className="mt-1 truncate text-xs text-mist/45">de “{w.songName}”</div>
              )}
            </div>
            <button
              onClick={() => removeWord(w.word)}
              className="rounded-lg p-1.5 text-mist/40 opacity-0 transition-all hover:bg-white/10 hover:text-rose-300 group-hover:opacity-100"
              title="Remover palavra"
            >
              <Trash2 size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

function Flashcards({ words }: { words: VocabWord[] }) {
  const [order, setOrder] = useState(() => words.map((_, i) => i))
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)

  // Guard against the deck shrinking (word removed elsewhere).
  const safeOrder = order.filter((i) => i < words.length)
  const index = safeOrder[Math.min(pos, safeOrder.length - 1)] ?? 0
  const card = words[index]

  const shuffle = () => {
    const next = [...words.map((_, i) => i)]
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[next[i], next[j]] = [next[j], next[i]]
    }
    setOrder(next)
    setPos(0)
    setFlipped(false)
  }

  const move = (delta: number) => {
    setFlipped(false)
    setPos((p) => (p + delta + safeOrder.length) % safeOrder.length)
  }

  if (!card) return null

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
      <div className="text-sm text-mist/50">
        {pos + 1} / {safeOrder.length}
      </div>

      {/* Flip card */}
      <div
        className="relative h-72 w-full cursor-pointer"
        style={{ perspective: '1400px' }}
        onClick={() => setFlipped((f) => !f)}
      >
        <motion.div
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Front: English */}
          <div
            className="glass-strong absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl p-8 text-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-xs uppercase tracking-[0.25em] text-mist/50">Inglês</span>
            <span className="font-display text-5xl text-glow">{card.word}</span>
            <span className="mt-2 text-sm text-mist/50">toque para ver a tradução</span>
          </div>
          {/* Back: Portuguese */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl p-8 text-center"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(135deg, rgba(255,143,177,0.25), rgba(180,120,255,0.25))',
              border: '1px solid rgba(255,255,255,0.14)',
            }}
          >
            <span className="text-xs uppercase tracking-[0.25em] text-mist/60">Português</span>
            <span className="font-display text-4xl text-cream">{card.translation}</span>
            {card.songName && (
              <span className="mt-2 text-sm text-mist/50">de “{card.songName}”</span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button onClick={() => move(-1)} className="btn-ghost p-3" title="Anterior">
          <ChevronLeft size={20} />
        </button>
        <button onClick={() => setFlipped((f) => !f)} className="btn-ghost px-5" title="Virar">
          <RotateCcw size={18} /> Virar
        </button>
        <button onClick={() => move(1)} className="btn-ghost p-3" title="Próxima">
          <ChevronRight size={20} />
        </button>
        <button onClick={shuffle} className="btn-ghost p-3" title="Embaralhar">
          <Shuffle size={18} />
        </button>
      </div>
    </div>
  )
}
