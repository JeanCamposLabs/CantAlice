import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Share, Plus, X, Sparkles } from 'lucide-react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useLang } from '../lib/useLangName'

const DISMISS_KEY = 'canta-alice:install-dismissed'

/**
 * A friendly, prominent "Add to Home Screen" prompt. On Android/Chrome it
 * triggers the native install dialog; on iOS it shows the share-sheet steps.
 * Dismissible and remembered, and hidden once the app is installed.
 */
export function InstallPrompt() {
  const { standalone, canPromptNative, promptInstall, ios } = useInstallPrompt()
  const brand = useLang().brand
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  )
  const [showIosSteps, setShowIosSteps] = useState(false)
  const [visible, setVisible] = useState(false)

  // Reveal a short moment after load so it doesn't fight the first paint.
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2500)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  // Show only when not installed, not dismissed, and we can actually help
  // (either a native prompt is available, or it's iOS with manual steps).
  const shouldShow = visible && !standalone && !dismissed && (canPromptNative || ios)

  const onInstall = async () => {
    if (canPromptNative) {
      const ok = await promptInstall()
      if (ok) dismiss()
    } else if (ios) {
      setShowIosSteps(true)
    }
  }

  return (
    <>
      <AnimatePresence>
        {shouldShow && !showIosSteps && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="pb-safe fixed inset-x-0 bottom-24 z-[75] mx-auto w-[92vw] max-w-md px-1 lg:bottom-6"
          >
            <div className="glass-strong flex items-center gap-3 rounded-3xl p-3 pl-4 shadow-2xl">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-peach to-aurora-1 text-night-900">
                <Sparkles size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Instalar o app</div>
                <div className="text-xs text-mist/70">
                  Tenha o {brand} na tela de início, em tela cheia.
                </div>
              </div>
              <button onClick={onInstall} className="btn-primary shrink-0 px-4 py-2 text-sm">
                <Download size={16} /> Instalar
              </button>
              <button
                onClick={dismiss}
                aria-label="Agora não"
                className="shrink-0 rounded-full p-1.5 text-mist/50 hover:text-cream"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <IosInstructions open={showIosSteps} onClose={() => setShowIosSteps(false)} onDone={dismiss} />
    </>
  )
}

function IosInstructions({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-night-900/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="glass-strong pb-safe relative z-10 w-full max-w-sm rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <h3 className="font-display text-2xl">Adicionar à Tela de Início</h3>
            <p className="mt-1 text-sm text-mist/70">No Safari, é rapidinho:</p>

            <ol className="mt-5 space-y-4">
              <Step n="1">
                Toque no botão <strong>Compartilhar</strong>
                <Share size={18} className="mx-1 inline align-text-bottom text-aurora-3" />
                (o quadradinho com a seta para cima), na barra do Safari.
              </Step>
              <Step n="2">
                Deslize e toque em{' '}
                <span className="inline-flex items-center gap-1 font-semibold">
                  Adicionar à Tela de Início
                  <Plus size={16} className="rounded border border-current p-0.5" />
                </span>
                .
              </Step>
              <Step n="3">
                Toque em <strong>Adicionar</strong>. Pronto — o app aparece com ícone próprio! 🎵
              </Step>
            </ol>

            <button
              onClick={() => {
                onDone()
                onClose()
              }}
              className="btn-primary mt-6 w-full justify-center"
            >
              Entendi
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Step({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-400/20 text-sm font-bold text-rose-300">
        {n}
      </span>
      <span className="text-sm leading-relaxed text-mist/85">{children}</span>
    </li>
  )
}
