import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUI } from '../store/useUI'

const COLORS = ['#ffd56b', '#ff8fb1', '#b478ff', '#5ad1ff', '#ffc4a3', '#ffd9e3']

/**
 * A celebratory confetti burst with a centered message. Triggered via the UI
 * store (useUI.celebrate). Auto-dismisses. Confetti is hand-rolled with
 * Framer Motion so we avoid an extra dependency.
 */
export function Celebration() {
  const message = useUI((s) => s.celebration)
  const clear = useUI((s) => s.clearCelebration)

  useEffect(() => {
    if (!message) return
    const t = setTimeout(clear, 2800)
    return () => clearTimeout(t)
  }, [message, clear])

  return (
    <AnimatePresence>
      {message && <Burst key="burst" message={message} onDone={clear} />}
    </AnimatePresence>
  )
}

function Burst({ message, onDone }: { message: string; onDone: () => void }) {
  // Generate a stable set of confetti pieces for this burst.
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 80 + Math.random() * 0.4
        const distance = 180 + Math.random() * 320
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance + 120, // bias downward (gravity feel)
          rotate: Math.random() * 720 - 360,
          color: COLORS[i % COLORS.length],
          size: 7 + Math.random() * 8,
          delay: Math.random() * 0.12,
          round: Math.random() > 0.5,
        }
      }),
    [],
  )

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center"
      onClick={onDone}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* soft glow */}
      <motion.div
        className="absolute h-72 w-72 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,143,177,0.35), transparent 70%)' }}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1.6, opacity: [0, 0.8, 0] }}
        transition={{ duration: 1.2 }}
      />

      {/* confetti */}
      <div className="absolute left-1/2 top-1/2">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className="absolute"
            style={{
              width: p.size,
              height: p.size,
              background: p.color,
              borderRadius: p.round ? '999px' : '2px',
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate }}
            transition={{ duration: 1.5 + Math.random() * 0.6, delay: p.delay, ease: 'easeOut' }}
          />
        ))}
      </div>

      {/* message card */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 22 }}
        className="glass-strong relative mx-6 rounded-3xl px-8 py-6 text-center shadow-2xl"
      >
        <div className="text-5xl">🎉</div>
        <p className="mt-2 font-display text-2xl text-glow">{message}</p>
      </motion.div>
    </motion.div>
  )
}
