/**
 * Tiny in-app router. Keeps a current view (and optional track id) and mirrors
 * it to the URL hash so a page refresh restores where Alice was — without
 * needing any server-side routing on GitHub Pages.
 */
import { create } from 'zustand'

export type View = 'home' | 'search' | 'library' | 'vocab' | 'translate' | 'song'

interface NavState {
  view: View
  trackId: string | null
  go: (view: View, trackId?: string | null) => void
}

function parseHash(): { view: View; trackId: string | null } {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [view, id] = raw.split('/')
  const valid: View[] = ['home', 'search', 'library', 'vocab', 'translate', 'song']
  if (valid.includes(view as View)) {
    return { view: view as View, trackId: id ?? null }
  }
  return { view: 'home', trackId: null }
}

const initial = parseHash()

export const useNav = create<NavState>((set) => ({
  view: initial.view,
  trackId: initial.trackId,
  go: (view, trackId = null) => {
    const hash = trackId ? `#/${view}/${trackId}` : `#/${view}`
    if (window.location.hash !== hash) window.history.pushState({}, '', hash)
    window.scrollTo({ top: 0 })
    set({ view, trackId })
  },
}))

// Keep store in sync with browser back/forward.
window.addEventListener('popstate', () => {
  const { view, trackId } = parseHash()
  useNav.setState({ view, trackId })
})
window.addEventListener('hashchange', () => {
  const { view, trackId } = parseHash()
  const cur = useNav.getState()
  if (cur.view !== view || cur.trackId !== trackId) {
    useNav.setState({ view, trackId })
  }
})
