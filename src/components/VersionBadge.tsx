import { useState } from 'react'
import { applyUpdate } from '../hooks/useAppUpdate'

/**
 * A subtle build-version badge in the lower-right corner, so it's easy to see
 * which deploy is currently loaded. Tap to expand the full commit SHA; the
 * little ↻ forces a refresh to the latest deployed version.
 */
export function VersionBadge() {
  const full = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'
  const short = full.length > 7 ? full.slice(0, 7) : full
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="fixed bottom-20 right-3 z-30 flex items-center gap-1 lg:bottom-3">
      <button
        onClick={() => setExpanded((e) => !e)}
        title={`Versão implantada: ${full}`}
        className="rounded-full bg-white/5 px-2 py-1 font-mono text-[10px] text-mist/40 backdrop-blur transition-colors hover:text-mist/80"
      >
        v{expanded ? full : short}
      </button>
      <button
        onClick={() => applyUpdate()}
        title="Atualizar para a versão mais recente"
        className="rounded-full bg-white/5 px-1.5 py-1 text-[10px] text-mist/40 backdrop-blur transition-colors hover:text-mist/80"
      >
        ↻
      </button>
    </div>
  )
}
