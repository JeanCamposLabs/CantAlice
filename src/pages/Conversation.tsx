import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Send, Loader2, Volume2, Lightbulb, Music2 } from 'lucide-react'
import { useSession } from '../store/useSession'
import { beginLogin } from '../spotify/auth'
import { speak, canSpeak } from '../lib/speak'
import { canListen, listenOnce } from '../lib/listen'
import { useLangName } from '../lib/useLangName'
import {
  converse,
  blobToBase64,
  playBase64Mp3,
  ConverseError,
  IS_CONVERSE_CONFIGURED,
  type ConverseResult,
  type Turn,
} from '../lib/converse'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  tip?: string
  audio?: string | null
  hidden?: boolean
}

const SCENARIOS: { id: string; label: string; context: string | null }[] = [
  { id: 'free', label: '💬 Conversa livre', context: null },
  { id: 'cafe', label: '☕ Pedir um café', context: 'ordering at a coffee shop like Starbucks; you are the friendly barista' },
  { id: 'restaurant', label: '🍽️ Restaurante', context: 'dining at a restaurant; you are the waiter' },
  { id: 'airport', label: '✈️ Aeroporto', context: 'airport check-in and boarding; you are the airline agent' },
  { id: 'shop', label: '🛍️ Loja', context: 'shopping for clothes; you are the shop assistant' },
  { id: 'smalltalk', label: '👋 Bate-papo', context: 'casual small talk with a new friend you just met' },
]

const KICKOFF = '(Begin: greet me in character and ask your first question.)'

const NO_FUNDS_MSG =
  '⚠️ Esta função é movida por IA e os créditos da API acabaram. Fale com o Juninho o quanto antes!'
const NOT_ALLOWED_MSG = 'Este recurso é exclusivo para os membros do app. 🙂'

function messageFromError(e: unknown, fallback: string): string {
  if (e instanceof ConverseError) {
    if (e.code === 'no_funds') return NO_FUNDS_MSG
    if (e.code === 'not_allowed') return NOT_ALLOWED_MSG
    if (e.code === 'not_configured')
      return 'O parceiro de conversa ainda não foi configurado pelo administrador.'
    if (e.code === 'unauthorized') return 'Sua sessão do Spotify expirou. Reconecte para continuar.'
    if (e.code === 'timeout') return 'A resposta demorou demais. Tente de novo.'
  }
  return fallback
}

export function ConversationPage() {
  const langName = useLangName()
  const auth = useSession((s) => s.auth)
  const [scenarioId, setScenarioId] = useState('free')
  const [messages, setMessages] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const historyTurns = (): Turn[] => messages.map((m) => ({ role: m.role, content: m.content }))

  // Always speak the reply in the natural cloud voice; fall back to the browser
  // voice only if the server couldn't synthesize audio.
  const voiceReply = (r: ConverseResult) => {
    if (r.audio) void playBase64Mp3(r.audio)
    else if (canSpeak) speak(r.reply)
  }

  const send = async (opts: {
    text?: string
    audioBase64?: string
    audioMime?: string
    /** Show this as the user's bubble immediately, before the reply arrives. */
    display?: string
  }) => {
    setBusy(true)
    setError(null)
    const history = historyTurns()
    if (opts.display) setMessages((prev) => [...prev, { role: 'user', content: opts.display! }])
    try {
      const r = await converse({
        scenario: scenario.context,
        history,
        wantAudio: true,
        text: opts.text,
        audioBase64: opts.audioBase64,
        audioMime: opts.audioMime,
      })
      setMessages((prev) => {
        const next = [...prev]
        // If we didn't already show the user's message (Whisper path), add it now.
        if (!opts.display) next.push({ role: 'user', content: r.transcript })
        next.push({ role: 'assistant', content: r.reply, tip: r.tip, audio: r.audio })
        return next
      })
      voiceReply(r)
    } catch (e) {
      setError(messageFromError(e, 'Algo deu errado. Tente de novo.'))
    } finally {
      setBusy(false)
    }
  }

  const startScenario = async (id: string) => {
    setScenarioId(id)
    setMessages([])
    setError(null)
    const ctx = SCENARIOS.find((s) => s.id === id)?.context ?? null
    setBusy(true)
    try {
      const r = await converse({ scenario: ctx, history: [], text: KICKOFF, wantAudio: true })
      setMessages([
        { role: 'user', content: KICKOFF, hidden: true },
        { role: 'assistant', content: r.reply, tip: r.tip, audio: r.audio },
      ])
      voiceReply(r)
    } catch (e) {
      setError(messageFromError(e, 'Não consegui iniciar agora. Tente de novo.'))
    } finally {
      setBusy(false)
    }
  }

  const sendText = () => {
    const t = text.trim()
    if (!t || busy) return
    setText('')
    void send({ text: t, display: t })
  }

  // Fast path: transcribe in the browser and send text (no upload / no Whisper).
  const listen = async () => {
    if (busy || listening) return
    setError(null)
    setListening(true)
    try {
      const said = await listenOnce()
      setListening(false)
      if (said.trim()) await send({ text: said, display: said })
      else setError('Não ouvi nada. Toque e fale de novo, ou escreva abaixo.')
    } catch {
      setListening(false)
      setError('Não consegui ouvir. Toque para tentar de novo, ou escreva abaixo.')
    }
  }

  // Fallback for browsers without speech recognition: record and let Whisper transcribe.
  const toggleRecord = async () => {
    if (busy) return
    if (listening) {
      recorderRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setListening(false)
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (blob.size > 0) {
          const audioBase64 = await blobToBase64(blob)
          void send({ audioBase64, audioMime: blob.type })
        }
      }
      mr.start()
      recorderRef.current = mr
      setListening(true)
      setError(null)
    } catch {
      setError('Não consegui acessar o microfone. Você pode digitar em vez disso.')
    }
  }

  const onMic = canListen ? listen : toggleRecord

  // — Gates —
  if (!IS_CONVERSE_CONFIGURED) {
    return (
      <Centered title="Parceiro de conversa">
        <p className="text-mist/70">Este recurso precisa do backend configurado (Supabase + chaves de IA).</p>
      </Centered>
    )
  }
  if (auth !== 'loggedin') {
    return (
      <Centered title="Parceiro de conversa">
        <p className="text-mist/70">Conecte sua conta do Spotify para conversar com o tutor de IA.</p>
        <button onClick={() => beginLogin()} className="btn-primary mt-4">
          <Music2 size={18} /> Conectar com o Spotify
        </button>
      </Centered>
    )
  }

  const visible = messages.filter((m) => !m.hidden)

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col gap-4 lg:h-[calc(100dvh-3rem)]">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">Conversar</h1>
        <p className="mt-1 text-sm text-mist/65">
          Fale ou escreva em {langName} — o tutor responde em voz e corrige com carinho.
        </p>
      </div>

      {/* Scenario chips */}
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => startScenario(s.id)}
            disabled={busy}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
              s.id === scenarioId ? 'bg-rose-400/25 text-rose-100' : 'bg-white/8 text-mist/70 hover:bg-white/15'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="glass flex-1 space-y-3 overflow-y-auto rounded-3xl p-4">
        {visible.length === 0 && !busy && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-mist/50">
            <Mic size={28} />
            <p>Escolha uma situação acima, ou toque no microfone e diga “Hi!”.</p>
          </div>
        )}
        {visible.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-mist/50">
            <Loader2 size={16} className="animate-spin" /> pensando…
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-500/15 px-4 py-2.5 text-center text-sm font-medium text-rose-100">
          {error}
        </div>
      )}

      {/* Composer */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMic}
          disabled={busy}
          title={listening ? 'Ouvindo…' : 'Falar'}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-colors disabled:opacity-50 ${
            listening ? 'bg-rose-500/80 text-white' : 'bg-white/8 text-aurora-3 hover:bg-white/15'
          }`}
        >
          <Mic size={20} className={listening ? 'animate-pulse' : ''} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendText()}
          placeholder={listening ? 'ouvindo… fale agora' : `ou escreva em ${langName}…`}
          disabled={listening || busy}
          className="flex-1 rounded-2xl border border-white/12 bg-white/5 px-4 py-3 outline-none placeholder:text-mist/35 focus:border-aurora-3/50 disabled:opacity-50"
        />
        <button
          onClick={sendText}
          disabled={busy || !text.trim()}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/8 text-cream hover:bg-white/15 disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

function Bubble({ msg }: { msg: Msg }) {
  const mine = msg.role === 'user'
  const replay = () => {
    if (msg.audio) void playBase64Mp3(msg.audio)
    else if (canSpeak) speak(msg.content)
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] ${mine ? 'items-end' : 'items-start'}`}>
        <div
          className={`flex items-start gap-2 rounded-2xl px-3.5 py-2.5 ${
            mine ? 'bg-rose-400/20 text-cream' : 'bg-white/8 text-cream'
          }`}
        >
          {!mine && (canSpeak || msg.audio) && (
            <button
              onClick={replay}
              title="Ouvir de novo"
              className="mt-0.5 shrink-0 text-aurora-3 hover:text-cream"
            >
              <Volume2 size={15} />
            </button>
          )}
          <p className="leading-snug">{msg.content}</p>
        </div>
        <AnimatePresence>
          {msg.tip && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-1 flex items-start gap-1.5 rounded-xl bg-gold/10 px-3 py-1.5 text-xs text-gold/90"
            >
              <Lightbulb size={13} className="mt-0.5 shrink-0" />
              <span>{msg.tip}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function Centered({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
      <div className="glass flex flex-col items-center gap-2 rounded-3xl p-10 text-center">{children}</div>
    </div>
  )
}
