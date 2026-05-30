import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, RefreshCw } from 'lucide-react'
import { useAppUpdate, applyUpdate } from '../hooks/useAppUpdate'

/**
 * A gentle toast that appears when a newer version of the site is deployed.
 * Tapping "Atualizar" reloads into the fresh version. (The app also refreshes
 * on its own when the tab regains focus — see useAppUpdate.)
 */
export function UpdatePrompt() {
  const { updateAvailable, newVersion } = useAppUpdate()

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed inset-x-0 bottom-24 z-[70] mx-auto w-fit max-w-[92vw] lg:bottom-6"
        >
          <div className="glass-strong flex items-center gap-4 rounded-full py-2 pl-5 pr-2 shadow-2xl">
            <Sparkles size={18} className="shrink-0 text-gold" />
            <span className="text-sm">
              <strong className="font-semibold">Nova versão</strong> disponível!
            </span>
            <button
              onClick={() => applyUpdate(newVersion ?? undefined)}
              className="btn-primary px-4 py-2 text-sm"
            >
              <RefreshCw size={15} />
              Atualizar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
