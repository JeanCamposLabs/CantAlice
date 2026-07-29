import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Send, Volume2, Loader2, RotateCcw, ArrowRight, Square } from 'lucide-react'
import { canSpeak, speak } from '../lib/speak'
import { canListen, listenOnce, scorePronunciation, type PronScore } from '../lib/listen'
import { playBase64Mp3, blobToBase64 } from '../lib/converse'
import { canRecord, startRecording, type Recorder } from '../lib/record'

/** What the learner wants to say, in Portuguese — typed or spoken. */
export interface MirrorIntent {
  text?: string
  audioBase64?: string
  audioMime?: string
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

type Step =
  | { kind: 'ask' }
  | { kind: 'repeat'; phrase: MirrorPhrase; score: PronScore | null; heard: string }

/**
 * "Modo espelho" — the Alice flow: she says in Portuguese what she wants to
 * say, the AI shows and speaks it in the language she's learning, she repeats
 * it, and only then does it go into the conversation.
 *
 * Owns the three-step machine and the microphone; the parent owns the network
 * calls (`onIntent`) and the conversation itself (`onSend`).
 */
export function MirrorComposer({
  langName,
  busy,
  onIntent,
  onSend,
}: {
  langName: string
  /** True while the tutor is answering — the composer waits its turn. */
  busy: boolean
  /** Translate what she wants to say. Resolves null when it didn't work out. */
  onIntent: (intent: MirrorIntent) => Promise<MirrorPhrase | null>
  /** She's ready: put this line into the conversation. False if it didn't go. */
  onSend: (phrase: MirrorPhrase) => Promise<boolean>
}) {
  const [step, setStep] = useState<Step>({ kind: 'ask' })
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  const [listening, setListening] = useState<'pt' | 'target' | null>(null)
  const [recording, setRecording] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const recorderRef = useRef<Recorder | null>(null)

  // Drop the mic if the screen goes away mid-recording.
  useEffect(() => () => recorderRef.current?.cancel(), [])

  /** Hand the line to the conversation; keep it here if the turn failed. */
  const deliver = async (phrase: MirrorPhrase) => {
    const ok = await onSend(phrase)
    setStep((s) =>
      ok ? { kind: 'ask' } : s.kind === 'repeat' ? { ...s, score: null, heard: '' } : s,
    )
  }

  // Kept in a ref so the auto-send timer below is armed by the score alone, and
  // not restarted every time the parent re-renders.
  const deliverRef = useRef(deliver)
  useEffect(() => {
    deliverRef.current = deliver
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

  /** Step 1 — listen to her Portuguese (recognition, or Whisper as fallback). */
  const listenPt = async () => {
    if (thinking || busy || listening) return
    if (!canListen) return toggleRecordPt()
    setHint(null)
    setListening('pt')
    try {
      const said = await listenOnce(PT_LOCALE)
      if (said.trim()) await askFor({ text: said })
      else setHint('Não ouvi nada. Toque e fale de novo, ou escreva abaixo.')
    } catch {
      setHint('Não consegui ouvir. Tente de novo, ou escreva abaixo.')
    } finally {
      setListening(null)
    }
  }

  /** Fallback for browsers without speech recognition: record → Whisper (pt). */
  const toggleRecordPt = async () => {
    if (thinking || busy) return
    if (recording) {
      const rec = recorderRef.current
      recorderRef.current = null
      setRecording(false)
      const clip = await rec?.stop()
      if (clip) {
        await askFor({ audioBase64: await blobToBase64(clip.blob), audioMime: clip.mime })
      }
      return
    }
    if (!canRecord) {
      setHint('Este aparelho não grava áudio. Escreva em português abaixo.')
      return
    }
    try {
      recorderRef.current = await startRecording()
      setRecording(true)
      setHint(null)
    } catch {
      setHint('Não consegui acessar o microfone. Você pode escrever abaixo.')
    }
  }

  /** Step 2 — she repeats the sentence in the language she's learning. */
  const repeatIt = async () => {
    if (step.kind !== 'repeat' || listening || thinking) return
    const target = step.phrase.say
    setHint(null)
    setListening('target')
    // Clearing the score also disarms a pending auto-send, so tapping "Repetir"
    // right after a good try can't fire the line off mid-listen.
    setStep((s) => (s.kind === 'repeat' ? { ...s, score: null, heard: '' } : s))
    try {
      const heard = await listenOnce()
      const score = scorePronunciation(target, heard)
      setStep((s) => (s.kind === 'repeat' ? { ...s, score, heard } : s))
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setHint(
        msg === 'not-allowed' || msg === 'service-not-allowed'
          ? 'Microfone bloqueado. No iPad: Ajustes → Safari → Sites → Microfone → Permitir.'
          : 'Não consegui ouvir. Toque no microfone e repita.',
      )
    } finally {
      setListening(null)
    }
  }

  const sendNow = () => {
    if (step.kind !== 'repeat' || busy) return
    void deliver(step.phrase)
  }

  // — Step 2: repeat what the AI prepared —
  if (step.kind === 'repeat') {
    const { phrase, score, heard } = step
    const perfect = score?.ratio === 1
    const good = (score?.ratio ?? 0) >= GOOD_ENOUGH

    return (
      <div className="glass space-y-3 rounded-3xl p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs italic text-mist/50">você quis dizer: “{phrase.pt}”</p>
          <button
            onClick={() => setStep({ kind: 'ask' })}
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
          <p className="font-display text-xl leading-snug text-cream sm:text-2xl">{phrase.say}</p>
        </div>

        {phrase.note && (
          <p className="rounded-xl bg-gold/10 px-3 py-1.5 text-xs text-gold/90">{phrase.note}</p>
        )}

        <AnimatePresence>
          {score && (
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
                        w.ok ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'
                      }`}
                    >
                      {w.word}
                    </span>
                  ))}
                </div>
              )}
              {heard && !perfect && <span className="text-xs text-mist/40">ouvi: “{heard}”</span>}
              {good && <span className="text-xs text-mist/45">enviando para a conversa…</span>}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-center gap-2 pt-0.5">
          {canListen && (
            <button
              onClick={repeatIt}
              disabled={listening === 'target' || busy}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                listening === 'target'
                  ? 'bg-rose-500/80 text-white'
                  : 'bg-rose-400/20 text-rose-100 hover:bg-rose-400/30'
              }`}
            >
              <Mic size={16} className={listening === 'target' ? 'animate-pulse' : ''} />
              {listening === 'target' ? 'ouvindo você…' : score ? 'Repetir' : 'Falar em ' + langName}
            </button>
          )}
          <button
            onClick={sendNow}
            disabled={busy}
            title="Enviar para a conversa"
            className="flex items-center gap-2 rounded-full bg-white/8 px-4 py-2.5 text-sm text-cream transition-colors hover:bg-white/15 disabled:opacity-50"
          >
            Enviar <ArrowRight size={15} />
          </button>
        </div>

        <p className="text-center text-xs text-mist/35">
          {canListen
            ? 'ouça, repita em voz alta e siga a conversa'
            : `leia em voz alta em ${langName} e toque em Enviar`}
        </p>
        {hint && <p className="text-center text-xs text-amber-300/80">{hint}</p>}
      </div>
    )
  }

  // — Step 1: say it in Portuguese —
  const micBusy = listening === 'pt' || recording
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={listenPt}
          disabled={thinking || busy}
          title={micBusy ? 'Ouvindo…' : 'Falar em português'}
          aria-label={micBusy ? 'Ouvindo…' : 'Falar em português'}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-colors disabled:opacity-50 ${
            micBusy ? 'bg-rose-500/80 text-white' : 'bg-white/8 text-aurora-3 hover:bg-white/15'
          }`}
        >
          {recording ? (
            <Square size={16} className="animate-pulse" />
          ) : (
            <Mic size={20} className={micBusy ? 'animate-pulse' : ''} />
          )}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendTyped()}
          placeholder={
            micBusy ? 'ouvindo… fale em português' : 'diga em português o que quer falar…'
          }
          disabled={micBusy || thinking || busy}
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
        ) : recording ? (
          'gravando… toque no quadrado quando terminar'
        ) : (
          `você fala em português · a IA mostra em ${langName} · você repete`
        )}
      </p>
      {hint && <p className="text-center text-xs text-amber-300/80">{hint}</p>}
    </div>
  )
}
