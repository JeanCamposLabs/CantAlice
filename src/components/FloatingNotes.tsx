/**
 * Musical notes that drift gently upward across the screen — a quiet, ambient
 * touch of whimsy. Generated once and left to loop.
 */
import { useMemo } from 'react'

const GLYPHS = ['♪', '♫', '♩', '♬', '𝄞']

export function FloatingNotes({ count = 14 }: { count?: number }) {
  const notes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        glyph: GLYPHS[i % GLYPHS.length],
        left: Math.random() * 100,
        delay: Math.random() * 24,
        duration: 22 + Math.random() * 20,
        size: 14 + Math.random() * 26,
        hue: Math.random() > 0.5 ? 'text-rose-300' : 'text-aurora-1',
      })),
    [count],
  )

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden">
      {notes.map((n) => (
        <span
          key={n.id}
          className="absolute bottom-[-3rem] select-none"
          style={{
            left: `${n.left}%`,
            fontSize: `${n.size}px`,
            color:
              n.hue === 'text-rose-300'
                ? 'rgba(255,179,201,0.5)'
                : 'rgba(180,120,255,0.5)',
            animation: `float-note ${n.duration}s linear ${n.delay}s infinite`,
          }}
        >
          {n.glyph}
        </span>
      ))}
    </div>
  )
}
