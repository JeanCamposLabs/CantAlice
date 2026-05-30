/**
 * Detects when a newer version of the site has been deployed while the app is
 * open, so we can offer (or perform) a refresh — no more manual hard-reload.
 *
 * How it works: every build bakes in a version stamp (__APP_VERSION__) and
 * emits a matching, never-cached `version.json` at the site root. We poll that
 * file; if its version differs from the one we booted with, a new deploy is
 * live. We re-check periodically and whenever the tab regains focus.
 */
import { useEffect, useRef, useState } from 'react'

const POLL_INTERVAL_MS = 60_000

async function fetchDeployedVersion(): Promise<string | null> {
  try {
    const url = `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { version?: string }
    return data.version ?? null
  } catch {
    return null
  }
}

/** Force a reload that bypasses the cached index.html. */
export function applyUpdate(version?: string): void {
  const url = new URL(window.location.href)
  url.searchParams.set('v', version ?? String(Date.now()))
  // `replace` so the cache-busting param doesn't pile up in history.
  window.location.replace(url.toString())
}

export function useAppUpdate(): { updateAvailable: boolean; newVersion: string | null } {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [newVersion, setNewVersion] = useState<string | null>(null)
  const current = useRef<string>(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev')

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const deployed = await fetchDeployedVersion()
      if (cancelled || !deployed) return
      if (deployed !== current.current) {
        setNewVersion(deployed)
        setUpdateAvailable(true)
      }
    }

    // Initial check shortly after load, then on an interval.
    const first = setTimeout(check, 4000)
    const interval = setInterval(check, POLL_INTERVAL_MS)

    // Re-check when the user returns to the tab; if an update is already known,
    // applying it on this natural break avoids interrupting active use.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (updateAvailable) {
        applyUpdate(newVersion ?? undefined)
      } else {
        check()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      cancelled = true
      clearTimeout(first)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [updateAvailable, newVersion])

  return { updateAvailable, newVersion }
}
