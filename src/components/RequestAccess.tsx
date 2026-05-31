import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, KeyRound, MessageCircle, Mail, Copy, Check } from 'lucide-react'
import { useUI } from '../store/useUI'
import { OWNER, APP_NAME } from '../config'

/**
 * "Pedir acesso" — for people blocked by the Spotify app's Development-Mode
 * allow-list. They enter their Spotify email and send it to the owner in one
 * tap (WhatsApp / email / copy), who then adds them in the Spotify dashboard.
 */
export function RequestAccess() {
  const open = useUI((s) => s.requestAccessOpen)
  const close = useUI((s) => s.closeRequestAccess)
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)

  const message =
    `Oi${OWNER.name ? `, ${OWNER.name}` : ''}! Quero usar o ${APP_NAME} 🎵 — ` +
    `meu e-mail do Spotify é ${email.trim() || '(coloque seu e-mail aqui)'}. ` +
    `Pode me liberar o acesso? Obrigada(o)! 💛`

  const wppHref = OWNER.whatsapp
    ? `https://wa.me/${OWNER.whatsapp}?text=${encodeURIComponent(message)}`
    : null
  const mailHref =
    `mailto:${OWNER.email}` +
    `?subject=${encodeURIComponent(`Acesso ao ${APP_NAME}`)}` +
    `&body=${encodeURIComponent(message)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* ignore */
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-night-900/70 backdrop-blur-sm" onClick={close} />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="glass-strong pb-safe relative z-10 w-full max-w-md rounded-t-3xl p-6 sm:rounded-3xl sm:p-7"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-400/15 text-rose-300">
                  <KeyRound size={20} />
                </span>
                <h2 className="font-display text-2xl">Pedir acesso</h2>
              </div>
              <button
                onClick={close}
                aria-label="Fechar"
                className="rounded-full p-2 text-mist/60 transition-colors hover:bg-white/10 hover:text-cream"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-mist/75">
              Este app ainda libera o acesso manualmente. Informe o{' '}
              <strong>e-mail da sua conta do Spotify</strong> e envie para o{' '}
              {OWNER.name || 'responsável'} — é rapidinho liberar. 💛
            </p>

            <label className="mt-4 block">
              <span className="text-xs uppercase tracking-[0.18em] text-mist/50">
                Seu e-mail do Spotify
              </span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                className="mt-1 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-lg outline-none transition-colors placeholder:text-mist/40 focus:border-rose-400/50"
              />
              <span className="mt-1 block text-xs text-mist/45">
                Veja em: app do Spotify → Configurações → Conta.
              </span>
            </label>

            <div className="mt-5 grid gap-2">
              {wppHref && (
                <a
                  href={wppHref}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary justify-center"
                >
                  <MessageCircle size={18} /> Enviar pelo WhatsApp
                </a>
              )}
              {OWNER.email && (
                <a href={mailHref} className={wppHref ? 'btn-ghost justify-center' : 'btn-primary justify-center'}>
                  <Mail size={18} /> Enviar por e-mail
                </a>
              )}
              <button onClick={copy} className="btn-ghost justify-center">
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Mensagem copiada!' : 'Copiar mensagem'}
              </button>
            </div>

            {!wppHref && !OWNER.email && (
              <p className="mt-3 text-center text-xs text-mist/45">
                Copie a mensagem e envie para quem te indicou o app.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
