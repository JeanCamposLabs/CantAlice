import { Music4 } from 'lucide-react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <span
        className="grid place-items-center rounded-2xl shadow-lg"
        style={{
          width: compact ? 38 : 44,
          height: compact ? 38 : 44,
          background: 'linear-gradient(135deg, #ffc4a3, #ff8fb1 55%, #b478ff)',
        }}
      >
        <Music4 size={compact ? 20 : 24} strokeWidth={2.4} className="text-night-900" />
      </span>
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-2xl tracking-tight">
            <span className="text-glow">Canta</span>
            <span className="text-cream/90">, Alice</span>
          </div>
          <div className="mt-1 text-[0.7rem] uppercase tracking-[0.22em] text-mist/70">
            Inglês cantando
          </div>
        </div>
      )}
    </div>
  )
}
