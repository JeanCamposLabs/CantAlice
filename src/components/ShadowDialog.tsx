import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, ChevronRight, Check, RotateCcw, X } from 'lucide-react'
import type { DialogLine } from '../content/phrasebook'
import { speakAndWait, canSpeak } from '../lib/speak'
import { canListen, listenOnce, scorePronunciation, type PronScore } from '../lib/listen'

type LineState =
  | { kind: 'playing' }
  | { kind: 'waiting' }
  | { kind: 'ready' }
  | { kind: 'listening' }
  | { kind: 'scored'; score: PronScore; heard: string }
  | { kind: 'denied' }

/**
 * Guided shadow-practice mode for a dialog.
 *
 * "them" lines  → TTS auto-plays the line → tap "Próxima" to continue.
 * "you" lines   → TTS plays the model pronunciation → mic button appears
 *               → user repeats → per-word score shown → "Próxima" or retry.
 *
 * Works gracefully without TTS or speech recognition: lines still advance
 * sequentially and the text is always readable.
 */
export function ShadowDialog({ lines, onClose }: { lines: DialogLine[]; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [state, setState] = useState<LineState>({ kind: canSpeak ? 'playing' : 'waiting' })
  const done = step >= lines.length
  const line = lines[step]

  useEffect(() => {
    if (done) return
    let cancelled = false
    setState({ kind: canSpeak ? 'playing' : 'waiting' })
    if (canSpeak) {
      speakAndWait(line.en).then(() => {
        if (cancelled) return
        setState(line.who === 'them' ? { kind: 'waiting' } : { kind: 'ready' })
      })
    }
    return () => {
      cancelled = true
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const advance = () => {
    setState({ kind: canSpeak ? 'playing' : 'waiting' })
    setStep((s) => s + 1)
  }

  const replay = () => {
    if (!canSpeak) return
    setState({ kind: 'playing' })
    speakAndWait(line.en).then(() => {
      setState(line.who === 'them' ? { kind: 'waiting' } : { kind: 'ready' })
    })
  }

  const listen = async () => {
    setState({ kind: 'listening' })
    try {
      const heard = await listenOnce()
      const score = scorePronunciation(line.en, heard)
      setState({ kind: 'scored', score, heard })
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setState(msg === 'not-allowed' || msg === 'service-not-allowed' ? { kind: 'denied' } : { kind: 'ready' })
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 py-6 text-center"
      >
        <span className="text-5xl">🎉</span>
        <h3 className="font-display text-2xl">Diálogo completo!</h3>
        <p className="text-sm text-mist/60">Você treinou todas as falas. Ótimo trabalho!</p>
        <div className="flex gap-2">
          <button onClick={() => { setStep(0); setState({ kind: canSpeak ? 'playing' : 'waiting' }) }} className="btn-ghost">
            <RotateCcw size={16} /> Repetir
          </button>
          <button onClick={onClose} className="btn-primary">
            <Check size={16} /> Concluir
          </button>
        </div>
      </motion.div>
    )
  }

  const isYou = line.who === 'you'
  const score = state.kind === 'scored' ? state.score : null
  const heard = state.kind === 'scored' ? state.heard : ''
  const perfect = score?.ratio === 1
  const close = (score?.ratio ?? 0) >= 0.5

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-mist/50">
        <span>Linha {step + 1} de {lines.length}</span>
        <button
          onClick={onClose}
          aria-label="Sair do treino"
          className="rounded-full p-1 hover:bg-white/10 hover:text-cream"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-rose-400/70"
          animate={{ width: `${(step / lines.length) * 100}%` }}
          transition={{ ease: 'easeOut', duration: 0.3 }}
        />
      </div>

      {/* Context: previous line faded */}
      {step > 0 && (
        <div className={`flex ${lines[step - 1].who === 'you' ? 'justify-end' : 'justify-start'} opacity-35`}>
          <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${lines[step - 1].who === 'you' ? 'bg-rose-400/15' : 'bg-white/8'}`}>
            <p className="text-cream">{lines[step - 1].en}</p>
          </div>
        </div>
      )}

      {/* Current line */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`flex ${isYou ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${isYou ? 'bg-rose-400/20' : 'bg-white/8'}`}>
            {isYou ? (
              <div className="space-y-0.5">
                <p className="text-xs italic text-mist/60">{line.pt}</p>
                {/* EN text revealed after listening so she has to recall */}
                {(state.kind === 'scored' || state.kind === 'listening') ? (
                  <p className="text-sm text-cream">{line.en}</p>
                ) : (
                  <p className="text-xs text-mist/35">diga em inglês — ouça o modelo acima</p>
                )}
              </div>
            ) : (
              <div className="space-y-0.5">
                <p className="text-sm leading-snug text-cream">{line.en}</p>
                <p className="text-xs italic text-mist/55">{line.pt}</p>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Score feedback */}
      <AnimatePresence>
        {score && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            <span className={`text-sm font-semibold ${perfect ? 'text-emerald-300' : close ? 'text-amber-200' : 'text-rose-300/90'}`}>
              {perfect ? 'Perfeito! 🎉' : close ? 'Muito bem! 👏' : 'Tente de novo 🎤'}
            </span>
            {score.words.length > 1 && (
              <div className="flex flex-wrap justify-center gap-1">
                {score.words.map((w, i) => (
                  <span key={i} className={`rounded px-1.5 py-0.5 text-xs ${w.ok ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'}`}>
                    {w.word}
                  </span>
                ))}
              </div>
            )}
            {heard && !perfect && (
              <span className="text-xs text-mist/40">ouvi: "{heard}"</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 pt-1">
        {/* Replay */}
        {canSpeak && (
          <button
            onClick={replay}
            disabled={state.kind === 'playing' || state.kind === 'listening'}
            title="Ouvir de novo"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/8 text-aurora-3 hover:bg-white/15 disabled:opacity-35"
          >
            <Volume2 size={17} />
          </button>
        )}

        {/* Mic — only for "you" lines once TTS has played */}
        {isYou && canListen && (state.kind === 'ready' || state.kind === 'scored' || state.kind === 'denied') && (
          <button
            onClick={listen}
            title="Falar"
            className="grid h-12 w-12 place-items-center rounded-full bg-white/8 text-aurora-3 transition-colors hover:bg-white/15"
          >
            <Mic size={20} />
          </button>
        )}

        {/* Listening pulse */}
        {state.kind === 'listening' && (
          <div className="grid h-12 w-12 place-items-center rounded-full bg-rose-500/80 text-white">
            <Mic size={20} className="animate-pulse" />
          </div>
        )}

        {/* Next / done */}
        {(state.kind === 'waiting' || state.kind === 'scored' || state.kind === 'denied' || (isYou && !canListen && state.kind === 'ready')) && (
          <button onClick={advance} className="btn-primary px-4 py-2">
            {step === lines.length - 1 ? (
              <><Check size={16} /> Concluir</>
            ) : (
              <><ChevronRight size={16} /> Próxima</>
            )}
          </button>
        )}
      </div>

      {/* Hint text */}
      <p className="text-center text-xs text-mist/35">
        {state.kind === 'playing' && (isYou ? 'ouça o modelo…' : 'ouvindo…')}
        {state.kind === 'ready' && isYou && 'toque no microfone e repita'}
        {state.kind === 'listening' && 'ouvindo você…'}
      </p>
      {state.kind === 'denied' && (
        <p className="text-center text-xs text-amber-300/80">
          Microfone bloqueado. No iPad: Ajustes → Safari → Sites → Microfone → Permitir.
        </p>
      )}
    </div>
  )
}
