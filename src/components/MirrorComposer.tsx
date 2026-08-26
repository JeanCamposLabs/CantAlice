import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Send, Volume2, Loader2, RotateCcw, ArrowRight, Check } from 'lucide-react'
import { canSpeak, speak } from '../lib/speak'
import { scorePronunciation, type PronScore } from '../lib/listen'
import { blobToBase64 } from '../lib/converse'
import { playBase64Mp3 } from '../lib/audio'
import { micBlockedHint } from '../lib/record'
import { useMicCapture, NOTHING_HEARD_HINT, type CaptureResult } from '../hooks/useMicCapture'

/** What the learner wants to say, in Portuguese — typed or spoken. */
export interface MirrorIntent {
  text?: string
  audioBase64?: string
  audioMime?: string
}

/** A recorded clip, for when the browser won't do the listening itself. */
export interface MirrorClip {
  audioBase64: string
  audioMime: string
}

/** The sentence to say out loud, as prepared by the AI. */
export interface MirrorPhrase {
  /** What she said in Portuguese (as understood). */
  pt: string
  /** The sentence to say, in the language being learned. */
  say: string
  /** A short pt-BR note about the sentence, or ''. */
  note: string
  /** Natural voice for `say`, when the server could synthesize it. */
  audio: string | null
}

/** Repeat this well and the line goes into the conversation on its own. */
const GOOD_ENOUGH = 0.7
const AUTO_SEND_MS = 1600

const PT_LOCALE = 'pt-BR'

/** Ceiling for one attempt — she stops when she's ready, this is just a net. */
const MAX_LISTEN_MS = 45_000

type Step =
  | { kind: 'ask' }
  | { kind: 'repeat'; phrase: MirrorPhrase; score: PronScore | null; heard: string }

/** Which half of the flow the mic is open for. */
type Capturing = 'pt' | 'target' | null

/**
 * "Modo espelho" — the Alice flow: she says in Portuguese what she wants to
 * say, the AI shows and speaks it in the language she's learning, she repeats
 * it, and only then does it go into the conversation.
 *
 * The mic is hers to close: recognition runs until she taps "pronto", because
 * stopping at the first pause cut her off mid-sentence and then marked it
 * wrong. Where the browser refuses to listen at all (notably an installed app
 * on iPhone/iPad), it records instead and has the server transcribe.
 *
 * Owns the three-step machine and the microphone; the parent owns the network
 * calls and the conversation itself.
 */
export function MirrorComposer({
  langName,
  busy,
  onIntent,
  onHear,
  onSend,
  onCapturingChange,
}: {
  langName: string
  /** True while the tutor is answering — the composer waits its turn. */
  busy: boolean
  /** Translate what she wants to say. Resolves null when it didn't work out. */
  onIntent: (intent: MirrorIntent) => Promise<MirrorPhrase | null>
  /** Transcribe a clip in the language being learned. Null when it failed. */
  onHear: (clip: MirrorClip) => Promise<string | null>
  /** She's ready: put this line into the conversation. False if it didn't go. */
  onSend: (phrase: MirrorPhrase) => Promise<boolean>
  /** Tells the page when the mic is open, so it can hold its own switches. */
  onCapturingChange?: (active: boolean) => void
}) {
  const [step, setStep] = useState<Step>({ kind: 'ask' })
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  /** Which half of the flow the open mic belongs to. */
  const [which, setWhich] = useState<Capturing>(null)
  const [hint, setHint] = useState<string | null>(null)

  // The mic engine (held recognition + recording fallback) is shared with the
  // direct-mode composer; this component only decides what a capture means.
  const mic = useMicCapture(MAX_LISTEN_MS)
  const capturing: Capturing = mic.capturing ? which : null
  const partial = mic.partial

  const sendingRef = useRef(false)
  const aliveRef = useRef(true)

  // Stop anything still in flight from turning into a request nobody asked
  // for when the screen goes away (the mic itself is released by the hook).
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  // Let the page know when the mic is open (cleared again on unmount).
  const micOpen = mic.capturing
  useEffect(() => {
    onCapturingChange?.(micOpen)
    return () => onCapturingChange?.(false)
  }, [micOpen, onCapturingChange])

  /**
   * Hand the line to the conversation; keep it here if the turn failed.
   *
   * Guarded by a ref, not by state: the step only changes once the turn comes
   * back, so tapping "Enviar" during the auto-send countdown would otherwise
   * let the timer fire a second (paid) turn while the first is still in flight.
   */
  const deliver = async (phrase: MirrorPhrase) => {
    if (sendingRef.current) return
    sendingRef.current = true
    try {
      const ok = await onSend(phrase)
      setStep((s) =>
        ok ? { kind: 'ask' } : s.kind === 'repeat' ? { ...s, score: null, heard: '' } : s,
      )
    } finally {
      sendingRef.current = false
    }
  }

  const deliverRef = useRef(deliver)
  const handleRef = useRef<(target: Exclude<Capturing, null>, r: CaptureResult) => Promise<void>>(
    async () => {},
  )
  useEffect(() => {
    deliverRef.current = deliver
    handleRef.current = handleCapture
  })

  // Repeated it well? Let the conversation move on by itself — that's the flow
  // Alice asked for ("e assim seguimos a conversa").
  useEffect(() => {
    if (step.kind !== 'repeat' || !step.score || step.score.ratio < GOOD_ENOUGH) return
    const phrase = step.phrase
    const timer = setTimeout(() => void deliverRef.current(phrase), AUTO_SEND_MS)
    return () => clearTimeout(timer)
  }, [step])

  const playPhrase = (phrase: MirrorPhrase) => {
    if (phrase.audio) void playBase64Mp3(phrase.audio)
    else if (canSpeak) speak(phrase.say)
  }

  const askFor = async (intent: MirrorIntent) => {
    setThinking(true)
    setHint(null)
    const phrase = await onIntent(intent)
    if (!aliveRef.current) return
    setThinking(false)
    if (!phrase) return
    setStep({ kind: 'repeat', phrase, score: null, heard: '' })
    playPhrase(phrase)
  }

  const sendTyped = () => {
    const t = text.trim()
    if (!t || thinking || busy) return
    setText('')
    void askFor({ text: t })
  }

  /** What a finished capture means for either half of the flow. */
  const handleCapture = async (target: Exclude<Capturing, null>, r: CaptureResult) => {
    setWhich(null)
    if (!aliveRef.current) return
    switch (r.kind) {
      case 'text':
        if (target === 'pt') await askFor({ text: r.text })
        else scoreAttempt(r.text)
        return
      case 'clip': {
        const audioBase64 = await blobToBase64(r.blob)
        if (!aliveRef.current) return
        if (target === 'pt') {
          await askFor({ audioBase64, audioMime: r.mime })
          return
        }
        setThinking(true)
        const heard = await onHear({ audioBase64, audioMime: r.mime })
        if (!aliveRef.current) return
        setThinking(false)
        if (heard === null) return
        if (!heard.trim()) {
          setHint(NOTHING_HEARD_HINT)
          return
        }
        scoreAttempt(heard)
        return
      }
      case 'empty':
        setHint(r.blocked ? micBlockedHint() : NOTHING_HEARD_HINT)
        return
      case 'noop':
        return
    }
  }

  /** Open the mic for either half of the flow. She decides when it closes. */
  const startCapture = async (target: Exclude<Capturing, null>) => {
    if (capturing || thinking || busy) return
    setHint(null)
    const res = await mic.start({
      lang: target === 'pt' ? PT_LOCALE : undefined,
      // The hold died on its own (watchdog / mic error): treat it like a
      // "Pronto", so the screen never shows a live mic that is actually dead.
      onAutoStop: (r) => void handleRef.current(target, r),
    })
    if (!aliveRef.current) return
    if (res.ok) {
      setWhich(target)
      return
    }
    if (res.reason === 'canceled') return
    if (res.reason === 'unsupported') {
      setHint(
        target === 'pt'
          ? 'Não consigo usar o microfone aqui. Escreva em português abaixo.'
          : `Não consigo usar o microfone aqui. Leia em voz alta em ${langName} e toque em Enviar.`,
      )
    } else {
      setHint(micBlockedHint())
    }
  }

  /** "Pronto" — close the mic and use what she said. */
  const finishCapture = async () => {
    const target = which
    if (!target) return
    await handleRef.current(target, await mic.stop())
  }

  /** Cancel without using what was said. */
  const abortCapture = () => {
    mic.cancel()
    setWhich(null)
  }

  const scoreAttempt = (heard: string) => {
    setStep((s) => (s.kind === 'repeat' ? { ...s, score: scorePronunciation(s.phrase.say, heard), heard } : s))
  }

  const sendNow = () => {
    if (step.kind !== 'repeat' || busy) return
    void deliver(step.phrase)
  }

  const restart = () => {
    abortCapture()
    setHint(null)
    setStep({ kind: 'ask' })
  }

  // The mic control is the same in both steps: tap to open, tap to close.
  const MicButton = ({ which, label }: { which: Exclude<Capturing, null>; label: string }) =>
    capturing === which ? (
      <button
        onClick={() => void finishCapture()}
        className="flex items-center gap-2 rounded-full bg-emerald-400/25 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-400/35"
      >
        <Check size={16} /> Pronto
      </button>
    ) : (
      <button
        onClick={() => void startCapture(which)}
        disabled={thinking || busy}
        className="flex items-center gap-2 rounded-full bg-rose-400/20 px-5 py-2.5 text-sm font-medium text-rose-100 transition-colors hover:bg-rose-400/30 disabled:opacity-50"
      >
        <Mic size={16} /> {label}
      </button>
    )

  /** Shown while the mic is open, so she can see it's still listening. */
  const LiveHint = ({ what }: { what: string }) => (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="flex items-center gap-1.5 text-xs font-medium text-rose-200">
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
        >
          ●
        </motion.span>
        ouvindo… fale sem pressa e toque em <strong>Pronto</strong> quando terminar
      </span>
      {partial ? (
        <span className="line-clamp-2 text-xs text-mist/60">{partial}</span>
      ) : (
        <span className="text-xs text-mist/35">{what}</span>
      )}
    </div>
  )

  // — Step 2: repeat what the AI prepared —
  if (step.kind === 'repeat') {
    const { phrase, score, heard } = step
    const perfect = score?.ratio === 1
    const good = (score?.ratio ?? 0) >= GOOD_ENOUGH

    return (
      <div className="glass flex max-h-[62dvh] flex-col rounded-3xl p-4">
        {/* Everything that can grow lives in here, so the buttons below can
            never be pushed off the screen (or under the browser's toolbar). */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs italic text-mist/50">você quis dizer: “{phrase.pt}”</p>
            <button
              onClick={restart}
              title="Dizer outra coisa"
              aria-label="Dizer outra coisa"
              className="shrink-0 rounded-full p-1 text-mist/45 transition-colors hover:bg-white/10 hover:text-cream"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="flex items-start gap-2.5">
            <button
              onClick={() => playPhrase(phrase)}
              title="Ouvir de novo"
              aria-label="Ouvir de novo"
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/8 text-aurora-3 transition-colors hover:bg-white/15"
            >
              <Volume2 size={17} />
            </button>
            <p className="font-display text-lg leading-snug text-cream sm:text-2xl">{phrase.say}</p>
          </div>

          {phrase.note && (
            <p className="rounded-xl bg-gold/10 px-3 py-1.5 text-xs text-gold/90">{phrase.note}</p>
          )}

          <AnimatePresence>
            {score && !capturing && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-1.5 text-center"
              >
                <span
                  className={`text-sm font-semibold ${
                    perfect ? 'text-emerald-300' : good ? 'text-emerald-200' : 'text-amber-200'
                  }`}
                >
                  {perfect ? 'Perfeito! 🎉' : good ? 'Muito bem! 👏' : 'Quase — tente de novo 🎤'}
                </span>
                {score.words.length > 1 && (
                  <div className="flex flex-wrap justify-center gap-1">
                    {score.words.map((w, i) => (
                      <span
                        key={i}
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          w.ok
                            ? 'bg-emerald-400/15 text-emerald-200'
                            : 'bg-rose-400/15 text-rose-200'
                        }`}
                      >
                        {w.word}
                      </span>
                    ))}
                  </div>
                )}
                {heard && !perfect && (
                  <span className="text-xs text-mist/40">ouvi: “{heard}”</span>
                )}
                {good && <span className="text-xs text-mist/45">enviando para a conversa…</span>}
              </motion.div>
            )}
          </AnimatePresence>

          {capturing === 'target' && <LiveHint what={`repita em ${langName}`} />}
          {thinking && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-mist/45">
              <Loader2 size={11} className="animate-spin" /> ouvindo o que você disse…
            </p>
          )}
        </div>

        {/* Pinned controls — always on screen. */}
        <div className="mt-3 flex shrink-0 items-center justify-center gap-2 pt-1">
          <MicButton which="target" label={score ? 'Repetir' : `Falar em ${langName}`} />
          <button
            onClick={sendNow}
            disabled={busy || capturing !== null}
            title="Enviar para a conversa"
            className="flex items-center gap-2 rounded-full bg-white/8 px-4 py-2.5 text-sm text-cream transition-colors hover:bg-white/15 disabled:opacity-50"
          >
            Enviar <ArrowRight size={15} />
          </button>
        </div>
        {hint && <p className="shrink-0 pt-2 text-center text-xs text-amber-300/80">{hint}</p>}
      </div>
    )
  }

  // — Step 1: say it in Portuguese —
  if (capturing === 'pt') {
    return (
      <div className="glass space-y-3 rounded-3xl p-4">
        <LiveHint what="diga em português o que quer falar" />
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={abortCapture}
            className="rounded-full bg-white/8 px-4 py-2.5 text-sm text-mist/70 transition-colors hover:bg-white/15"
          >
            Cancelar
          </button>
          <MicButton which="pt" label="Falar em português" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => void startCapture('pt')}
          disabled={thinking || busy}
          title="Falar em português"
          aria-label="Falar em português"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/8 text-aurora-3 transition-colors hover:bg-white/15 disabled:opacity-50"
        >
          <Mic size={20} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && sendTyped()}
          placeholder="diga em português o que quer falar…"
          disabled={thinking || busy}
          className="flex-1 rounded-2xl border border-white/12 bg-white/5 px-4 py-3 outline-none placeholder:text-mist/35 focus:border-aurora-3/50 disabled:opacity-50"
        />
        <button
          onClick={sendTyped}
          disabled={thinking || busy || !text.trim()}
          aria-label="Traduzir"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/8 text-cream hover:bg-white/15 disabled:opacity-40"
        >
          {thinking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
      <p className="text-center text-xs text-mist/40">
        {thinking ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 size={11} className="animate-spin" /> montando a frase em {langName}…
          </span>
        ) : (
          `você fala em português · a IA mostra em ${langName} · você repete`
        )}
      </p>
      {hint && <p className="text-center text-xs text-amber-300/80">{hint}</p>}
    </div>
  )
}
