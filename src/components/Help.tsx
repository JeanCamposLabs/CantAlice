import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  Search,
  MicVocal,
  Languages,
  GraduationCap,
  RefreshCw,
  LogIn,
  Crown,
  Heart,
} from 'lucide-react'
import { useUI } from '../store/useUI'
import { useSession } from '../store/useSession'
import { applyUpdate } from '../hooks/useAppUpdate'
import { beginLogin, logout } from '../spotify/auth'
import { IS_SPOTIFY_CONFIGURED } from '../config'

const TIPS = [
  {
    icon: Search,
    title: 'Busque e toque',
    text: 'Procure qualquer música em inglês e toque nela para abrir o modo de cantar.',
  },
  {
    icon: MicVocal,
    title: 'Cante junto',
    text: 'A letra se ilumina no ritmo da música, como um karaokê. (A música inteira precisa de Spotify Premium.)',
  },
  {
    icon: Languages,
    title: 'Entenda tudo',
    text: 'Veja a tradução embaixo de cada linha e toque em qualquer palavra para guardá-la no vocabulário.',
  },
  {
    icon: GraduationCap,
    title: 'Acompanhe o progresso',
    text: 'Guarde o que quer aprender e marque “Já sei” quando dominar uma música.',
  },
]

export function Help() {
  const open = useUI((s) => s.helpOpen)
  const close = useUI((s) => s.closeHelp)
  const auth = useSession((s) => s.auth)
  const isPremium = useSession((s) => s.isPremium)

  const version =
    typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__.slice(0, 7) : 'dev'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-night-900/70 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="glass-strong pb-safe relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-6 sm:rounded-3xl sm:p-8"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl">Como usar o Canta, Alice</h2>
              <button
                onClick={close}
                className="rounded-full p-2 text-mist/60 transition-colors hover:bg-white/10 hover:text-cream"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {TIPS.map((t) => (
                <div key={t.title} className="flex gap-3 rounded-2xl bg-white/5 p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-400/15 text-rose-300">
                    <t.icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t.title}</h3>
                    <p className="text-sm text-mist/70">{t.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {auth === 'loggedin' && !isPremium && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl bg-gold/10 p-3 text-sm text-gold/90">
                <Crown size={18} className="mt-0.5 shrink-0" />
                <span>
                  Com <strong>Spotify Premium</strong> você ouve a música inteira com a letra
                  sincronizada. Sem Premium, dá pra ouvir a prévia de 30s e usar a letra e a
                  tradução normalmente.
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button onClick={() => applyUpdate()} className="btn-ghost justify-center">
                <RefreshCw size={16} /> Atualizar agora
              </button>
              {IS_SPOTIFY_CONFIGURED &&
                (auth === 'loggedin' ? (
                  <button
                    onClick={() => {
                      logout()
                      beginLogin()
                    }}
                    className="btn-ghost justify-center"
                  >
                    <LogIn size={16} /> Reconectar Spotify
                  </button>
                ) : (
                  <button onClick={() => beginLogin()} className="btn-primary justify-center">
                    <LogIn size={16} /> Conectar Spotify
                  </button>
                ))}
            </div>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-mist/40">
              <Heart size={12} className="text-rose-400" /> Feito com carinho para a Alice · versão{' '}
              <code>{version}</code>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
