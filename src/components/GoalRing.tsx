import { Check } from 'lucide-react'

/** Circular progress ring for the daily review goal. */
export function GoalRing({
  done,
  goal,
  met,
  size = 96,
}: {
  done: number
  goal: number
  met: boolean
  size?: number
}) {
  const r = 34
  const circ = 2 * Math.PI * r
  const pct = Math.min(1, goal > 0 ? done / goal : 0)
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ height: size, width: size }}>
      <svg viewBox="0 0 80 80" className="-rotate-90" style={{ height: size, width: size }}>
        <circle cx="40" cy="40" r={r} className="fill-none stroke-white/10" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          className={`fill-none ${met ? 'stroke-gold' : 'stroke-rose-400'}`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        {met ? (
          <Check size={size * 0.31} className="text-gold" />
        ) : (
          <>
            <span className="font-display text-cream" style={{ fontSize: size * 0.26 }}>
              {done}
            </span>
            <span className="text-mist/50" style={{ fontSize: size * 0.12 }}>
              de {goal}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
