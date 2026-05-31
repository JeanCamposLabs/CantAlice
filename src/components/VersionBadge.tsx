import { applyUpdate } from '../hooks/useAppUpdate'

/**
 * A tiny build-version marker tucked into the very bottom-right corner. Shows
 * just the major.minor (e.g. "v1.1"); tap to refresh to the latest deploy. The
 * full version + commit build id stays in the tooltip for debugging.
 */
export function VersionBadge() {
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'
  const buildId = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'
  const short = version.split('.').slice(0, 2).join('.')

  return (
    <button
      onClick={() => applyUpdate()}
      title={`Versão ${version} · build ${buildId} — toque para atualizar`}
      className="fixed bottom-1 right-1.5 z-50 font-mono text-[10px] leading-none text-mist/30 transition-colors hover:text-mist/70"
    >
      v{short}
    </button>
  )
}
