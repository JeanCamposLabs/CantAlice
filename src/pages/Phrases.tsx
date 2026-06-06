import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Volume2, Copy, Check, MessagesSquare } from 'lucide-react'
import { PHRASEBOOK, type Scenario, type Phrase, type DialogLine } from '../content/phrasebook'
import { SpeakableText } from '../components/SpeakableText'
import { SpeechCheck } from '../components/SpeechCheck'
import { speak, canSpeak } from '../lib/speak'

export function PhrasesPage() {
  const [open, setOpen] = useState<string | null>(PHRASEBOOK[0]?.id ?? null)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl">Frases úteis</h1>
        <p className="mt-2 max-w-2xl text-mist/70">
          Frases do dia a dia para situações reais. Ouça, pratique a pronúncia no microfone e
          treine os diálogos em voz alta — é o melhor jeito de destravar a conversação. Cada
          situação tem um botão para copiar tudo direto para o Anki.
        </p>
      </div>

      <div className="space-y-3">
        {PHRASEBOOK.map((s) => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            isOpen={open === s.id}
            onToggle={() => setOpen(open === s.id ? null : s.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ScenarioCard({
  scenario,
  isOpen,
  onToggle,
}: {
  scenario: Scenario
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="glass overflow-hidden rounded-3xl">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-white/5"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/8 text-2xl">
          {scenario.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-xl">{scenario.title}</div>
          <div className="truncate text-sm text-mist/60">{scenario.blurb}</div>
        </div>
        <ChevronDown
          size={20}
          className={`shrink-0 text-mist/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="space-y-2 border-t border-white/10 p-4">
              <div className="mb-2 flex justify-end">
                <CopyForAnki scenario={scenario} />
              </div>
              {scenario.phrases.map((p, i) => (
                <PhraseRow key={i} phrase={p} />
              ))}

              {scenario.dialog && <Dialog lines={scenario.dialog} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PhraseRow({ phrase }: { phrase: Phrase }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="leading-snug text-cream">
            <SpeakableText text={phrase.en} />
          </p>
          <p className="mt-0.5 text-sm italic leading-snug text-rose-300/80">{phrase.pt}</p>
        </div>
        {canSpeak && (
          <button
            onClick={() => speak(phrase.en)}
            title="Ouvir a frase"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/8 text-aurora-3 hover:bg-white/15"
          >
            <Volume2 size={14} />
          </button>
        )}
      </div>
      <div className="mt-1.5">
        <SpeechCheck target={phrase.en} label="Falar" />
      </div>
    </div>
  )
}

function Dialog({ lines }: { lines: DialogLine[] }) {
  return (
    <div className="mt-4 rounded-2xl bg-night-900/40 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-mist/70">
        <MessagesSquare size={16} /> Diálogo para treinar
      </div>
      <div className="space-y-2.5">
        {lines.map((l, i) => {
          const mine = l.who === 'you'
          return (
            <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`flex max-w-[85%] items-start gap-2 rounded-2xl px-3 py-2 ${
                  mine ? 'bg-rose-400/15' : 'bg-white/8'
                }`}
              >
                {!mine && canSpeak && (
                  <button
                    onClick={() => speak(l.en)}
                    title="Ouvir"
                    className="mt-0.5 shrink-0 text-aurora-3 hover:text-cream"
                  >
                    <Volume2 size={14} />
                  </button>
                )}
                <div className="min-w-0">
                  <p className="text-sm leading-snug text-cream">
                    <SpeakableText text={l.en} />
                  </p>
                  <p className="text-xs italic leading-snug text-mist/55">{l.pt}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CopyForAnki({ scenario }: { scenario: Scenario }) {
  const [done, setDone] = useState(false)

  const copy = async () => {
    // Anki import format: one card per line, English<TAB>Portuguese.
    const tsv = scenario.phrases.map((p) => `${p.en}\t${p.pt}`).join('\n')
    try {
      await navigator.clipboard.writeText(tsv)
    } catch {
      // Fallback for browsers without async clipboard access.
      const ta = document.createElement('textarea')
      ta.value = tsv
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* give up silently */
      }
      document.body.removeChild(ta)
    }
    setDone(true)
    setTimeout(() => setDone(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-mist/80 transition-colors hover:bg-white/15 hover:text-cream"
    >
      {done ? (
        <>
          <Check size={13} className="text-emerald-300" /> Copiado!
        </>
      ) : (
        <>
          <Copy size={13} /> Copiar para o Anki
        </>
      )}
    </button>
  )
}
