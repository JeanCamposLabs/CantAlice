import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Loader2 } from 'lucide-react'
import { canListen, listenOnce, scorePronunciation, type PronScore } from '../lib/listen'

type Phase = 'idle' | 'listening' | 'done' | 'error'

/**
 * "Practise saying it" — tap the mic, say the English word/phrase, and get
 * encouraging per-word feedback. Renders nothing where speech input is
 * unsupported, so callers can drop it in unconditionally.
 */
export function SpeechCheck({ target, label = 'Praticar' }: { target: string; label?: string }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState<PronScore | null>(null)
  const [heard, setHeard] = useState('')

  if (!canListen) return null

  const run = async () => {
    setPhase('listening')
    setScore(null)
    try {
      const said = await listenOnce('en-US')
      setHeard(said)
      setScore(scorePronunciation(target, said))
      setPhase('done')
    } catch {
      setPhase('error')
    }
  }

  const perfect = score?.ratio === 1
  const close = (score?.ratio ?? 0) >= 0.5

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={run}
        disabled={phase === 'listening'}
        title="Falar para praticar a pronúncia"
        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
          phase === 'listening'
            ? 'bg-rose-500/30 text-rose-100'
            : 'bg-white/8 text-aurora-3 hover:bg-white/15'
        }`}
      >
        {phase === 'listening' ? (
          <>
            <motion.span
              animate={{ scale: [1, 1.35, 1], opacity: [1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Mic size={15} />
            </motion.span>
            Ouvindo…
          </>
        ) : (
          <>
            <Mic size={15} /> {label}
          </>
        )}
      </button>

      <AnimatePresence mode="wait">
        {phase === 'done' && score && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-1 text-center"
          >
            <span
              className={`text-sm font-semibold ${
                perfect ? 'text-emerald-300' : close ? 'text-amber-200' : 'text-rose-300/90'
              }`}
            >
              {perfect ? 'Perfeito! 🎉' : close ? 'Quase lá! 👏' : 'Tente de novo 🎤'}
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
            {!perfect && heard && (
              <span className="text-xs text-mist/50">ouvi: “{heard}”</span>
            )}
          </motion.div>
        )}
        {phase === 'error' && (
          <motion.span
            key="err"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-mist/50"
          >
            Não consegui ouvir. Toque para tentar de novo.
          </motion.span>
        )}
        {phase === 'listening' && (
          <motion.span
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-xs text-mist/45"
          >
            <Loader2 size={11} className="animate-spin" /> fale agora
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
