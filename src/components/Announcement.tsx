import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera } from 'lucide-react'

/**
 * A tiny one-time info pop-up. Shows a short message once per device and is
 * dismissed with a single tap; the choice is remembered so it never nags again.
 * Bump the key to show a new announcement later.
 */
const SEEN_KEY = 'canta-alice:announce:screenshots'

export function Announcement() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) !== '1'
    } catch {
      return false
    }
  })

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* private mode — just close */
    }
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center"
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
            className="glass-strong pb-safe relative z-10 w-full max-w-sm rounded-t-3xl p-7 text-center sm:rounded-3xl"
          >
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-peach to-aurora-1 text-night-900">
              <Camera size={26} />
            </div>
            <h2 className="font-display text-2xl leading-snug">
              Cadê meus screenshots, Dona Alice?
            </h2>
            <button onClick={close} className="btn-primary mt-6 w-full justify-center">
              Sei lá
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
