import { speak, canSpeak } from '../lib/speak'

// Word tokens (incl. contractions like "don't"); everything else — spaces and
// punctuation — is kept verbatim between them so the phrase reads normally.
// Unicode-aware so accented words ("está", "café") stay whole and tappable.
const WORD_RE = /(\p{L}+(?:'\p{L}+)?)/u

/**
 * Render an English phrase where every word is tappable to hear just that word
 * pronounced, while occurrences of `highlight` (stem match) stay emphasized.
 * Falls back to plain emphasized text when speech synthesis is unavailable.
 */
export function SpeakableText({
  text,
  highlight,
  className = '',
}: {
  text: string
  highlight?: string
  className?: string
}) {
  const head = highlight?.trim().split(/\s+/)[0] ?? ''
  const hl = head
    ? new RegExp(`^${head.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\p{L}*$`, 'iu')
    : null

  return (
    <span className={className}>
      {text.split(WORD_RE).map((part, i) => {
        if (!part) return null
        if (!WORD_RE.test(part)) return <span key={i}>{part}</span>
        const isTerm = hl?.test(part) ?? false
        if (!canSpeak) {
          return isTerm ? (
            <strong key={i} className="text-glow">
              {part}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          )
        }
        return (
          <button
            key={i}
            type="button"
            onClick={() => speak(part)}
            title={`Ouvir "${part}"`}
            className={`rounded transition-colors hover:bg-white/10 hover:text-aurora-3 ${
              isTerm ? 'text-glow font-semibold' : ''
            }`}
          >
            {part}
          </button>
        )
      })}
    </span>
  )
}
