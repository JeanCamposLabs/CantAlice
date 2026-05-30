import { useEffect, useState } from 'react'
import { Music2 } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Robust album artwork.
 *
 * Spotify cover URLs occasionally fail to load in the browser — a transient
 * network race, or a privacy/ad-blocker extension filtering the image CDN.
 * Rather than showing an ugly broken-image glyph, this:
 *   1. retries the load once after a short delay (recovers transient failures),
 *   2. then falls back to an on-brand placeholder.
 *
 * `referrerPolicy="no-referrer"` is set defensively in case a CDN ever rejects
 * cross-site referrers.
 */
export function AlbumArt({
  src,
  alt,
  imgClassName = '',
  fallbackIcon,
}: {
  src: string | null | undefined
  alt: string
  imgClassName?: string
  fallbackIcon?: ReactNode
}) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>(src ? 'loading' : 'error')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setStatus(src ? 'loading' : 'error')
    setAttempt(0)
  }, [src])

  if (!src || status === 'error') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-night-600 to-night-500 text-mist/40">
        {fallbackIcon ?? <Music2 size={28} />}
      </div>
    )
  }

  return (
    <img
      key={attempt}
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onLoad={() => setStatus('ok')}
      onError={() => {
        if (attempt < 1) {
          // One delayed retry with a fresh <img> element.
          setTimeout(() => setAttempt((a) => a + 1), 500)
        } else {
          setStatus('error')
        }
      }}
      className={`h-full w-full object-cover ${imgClassName}`}
    />
  )
}
