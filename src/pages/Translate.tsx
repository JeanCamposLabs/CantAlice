import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Languages, ArrowRight, Volume2, Loader2, BookmarkPlus, BookmarkCheck } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { translate } from '../lyrics/translate'
import { fetchExamples, type Example } from '../lyrics/examples'
import { useLibrary, selectWord } from '../store/useLibrary'
import { speak, canSpeak } from '../lib/speak'
import { SpeakableText } from '../components/SpeakableText'
import { SpeechCheck } from '../components/SpeechCheck'

export function TranslatePage() {
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  const [translation, setTranslation] = useState<string | null>(null)
  const [examples, setExamples] = useState<Example[]>([])
  const [loadingT, setLoadingT] = useState(false)
  const [loadingE, setLoadingE] = useState(false)

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    setTerm(q)
    setTranslation(null)
    setExamples([])
    setLoadingT(true)
    setLoadingE(true)
    translate(q, { premium: true }).then((t) => {
      setTranslation(t)
      setLoadingT(false)
    })
    fetchExamples(q, 6).then((ex) => {
      setExamples(ex)
      setLoadingE(false)
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl">Tradutor</h1>
        <p className="mt-2 text-mist/70">
          Traduza qualquer palavra ou frase e veja exemplos reais — guarde os que gostar para
          revisar depois.
        </p>
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <div className="glass flex flex-1 items-center gap-3 rounded-2xl px-4 py-1">
          <Languages size={20} className="shrink-0 text-mist/50" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="palavra ou frase em inglês…"
            className="w-full bg-transparent py-3 text-lg outline-none placeholder:text-mist/40"
          />
        </div>
        <button type="submit" className="btn-primary px-5" aria-label="Traduzir">
          <ArrowRight size={20} />
        </button>
      </form>

      <AnimatePresence mode="wait">
        {term && (
          <motion.div
            key={term}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Main translation */}
            <div className="glass-strong rounded-3xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.18em] text-mist/45">Inglês</div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-3xl text-cream">{term}</span>
                    {canSpeak && (
                      <button
                        onClick={() => speak(term)}
                        title="Ouvir"
                        className="grid h-9 w-9 place-items-center rounded-full bg-white/8 text-aurora-3 hover:bg-white/15"
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 border-t border-white/10 pt-3">
                <div className="text-xs uppercase tracking-[0.18em] text-mist/45">Português</div>
                <div className="mt-0.5 min-h-[2.25rem] font-display text-3xl text-rose-300">
                  {loadingT ? (
                    <span className="flex items-center gap-2 text-lg text-mist/50">
                      <Loader2 size={18} className="animate-spin" /> traduzindo…
                    </span>
                  ) : (
                    translation
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-center border-t border-white/10 pt-4">
                <SpeechCheck target={term} label="Praticar pronúncia" />
              </div>
            </div>

            {/* Example sentences in context */}
            <div>
              <h2 className="mb-3 font-display text-xl text-mist/80">Exemplos em contexto</h2>
              {loadingE ? (
                <div className="flex items-center gap-2 text-mist/50">
                  <Loader2 size={18} className="animate-spin" /> buscando frases reais…
                </div>
              ) : examples.length === 0 ? (
                <p className="text-mist/50">Nenhuma frase de exemplo encontrada desta vez.</p>
              ) : (
                <div className="space-y-3">
                  {examples.map((ex, i) => (
                    <ExampleRow key={i} term={term} translation={translation} example={ex} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ExampleRow({
  term,
  translation,
  example,
}: {
  term: string
  translation: string | null
  example: Example
}) {
  const saved = useLibrary(useShallow((s) => selectWord(s, term)))
  const addWord = useLibrary((s) => s.addWord)
  const removeWord = useLibrary((s) => s.removeWord)

  // This row is "active" when the word is saved with *this* phrase as its
  // context. Tapping it removes; tapping a different row switches the phrase.
  const isThis = Boolean(saved && saved.example?.text === example.text)

  const save = () => {
    if (isThis) removeWord(term)
    else addWord(term, translation ?? saved?.translation ?? '', saved?.songName ?? null, example)
  }

  return (
    <div className="glass group flex items-start gap-3 rounded-2xl p-4">
      <div className="min-w-0 flex-1">
        <p className="leading-snug text-cream">
          <SpeakableText text={example.text} highlight={term} />
        </p>
        <p className="mt-0.5 text-sm italic leading-snug text-rose-300/80">{example.translation}</p>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1">
        {canSpeak && (
          <button
            onClick={() => speak(example.text)}
            title="Ouvir a frase"
            className="grid h-8 w-8 place-items-center rounded-full bg-white/8 text-aurora-3 hover:bg-white/15"
          >
            <Volume2 size={14} />
          </button>
        )}
        <button
          onClick={save}
          title={isThis ? 'Guardada com esta frase — toque para remover' : 'Guardar com esta frase'}
          className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${
            isThis ? 'bg-gold/20 text-gold' : 'bg-white/8 text-rose-200 hover:bg-rose-400/30'
          }`}
        >
          {isThis ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
        </button>
      </div>
    </div>
  )
}
