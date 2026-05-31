import { useState } from 'react'
import { applyUpdate } from '../hooks/useAppUpdate'

/**
 * A subtle build-version badge in the lower-right corner, so it's easy to see
 * which deploy is currently loaded. Tap to expand the full commit SHA; the
 * little ↻ forces a refresh to the latest deployed version.
 */
export function VersionBadge() {
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'
  const buildId = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'
  const buildShort = buildId.length > 7 ? buildId.slice(0, 7) : buildId
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="fixed bottom-24 right-3 z-50 flex items-center gap-1 lg:bottom-3">
      <button
        onClick={() => setExpanded((e) => !e)}
        title={`Versão ${version} · build ${buildId}`}
        className="rounded-full bg-white/5 px-2 py-1 font-mono text-[10px] text-mist/40 backdrop-blur transition-colors hover:text-mist/80"
      >
        v{version} <span className="text-mist/30">· {expanded ? buildId : buildShort}</span>
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
