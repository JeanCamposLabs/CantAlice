/**
 * Cloud sync orchestration.
 *
 * On login we pull the user's cloud progress, merge it with what's on this
 * device (so nothing is lost when two devices have diverged), apply the merged
 * result, and push it back. Thereafter every change is debounced and pushed.
 *
 * Merge philosophy: never silently drop a saved song or word. For per-item
 * conflicts we keep whichever copy was touched most recently.
 */
import { useEffect } from 'react'
import { useLibrary, type SavedSong, type VocabWord } from '../store/useLibrary'
import { useSession } from '../store/useSession'
import { getValidAccessToken } from '../spotify/auth'
import { IS_CLOUD_CONFIGURED } from '../config'
import { cloudGet, cloudSet } from './cloud'

export interface Snapshot {
  songs: Record<string, SavedSong>
  vocab: Record<string, VocabWord>
  streak: { count: number; lastDate: string | null }
  dailyNewLimit: number
  newStudied: { date: string | null; count: number }
  showTranslations: boolean
  largeLyrics: boolean
  wordHintSeen: boolean
  hasOnboarded: boolean
  updatedAt: number
}

function getSnapshot(): Snapshot {
  const s = useLibrary.getState()
  return {
    songs: s.songs,
    vocab: s.vocab,
    streak: s.streak,
    dailyNewLimit: s.dailyNewLimit,
    newStudied: s.newStudied,
    showTranslations: s.showTranslations,
    largeLyrics: s.largeLyrics,
    wordHintSeen: s.wordHintSeen,
    hasOnboarded: s.hasOnboarded,
    updatedAt: Date.now(),
  }
}

function applySnapshot(snap: Snapshot): void {
  useLibrary.setState({
    songs: snap.songs,
    vocab: snap.vocab,
    streak: snap.streak,
    dailyNewLimit: snap.dailyNewLimit ?? 20,
    newStudied: snap.newStudied ?? { date: null, count: 0 },
    showTranslations: snap.showTranslations,
    largeLyrics: snap.largeLyrics,
    wordHintSeen: snap.wordHintSeen,
    hasOnboarded: snap.hasOnboarded,
  })
}

const songTouched = (s: SavedSong) => Math.max(s.lastPracticedAt ?? 0, s.addedAt)
// Use the most recent review so a freshly-graded card wins the merge.
const wordTouched = (w: VocabWord) =>
  Math.max(w.addedAt, w.srs?.fwd.lastReview ?? 0, w.srs?.rev.lastReview ?? 0)

/** Merge two snapshots without losing saved items. */
export function mergeSnapshots(local: Snapshot, cloud: Snapshot | null): Snapshot {
  if (!cloud) return local

  const songs: Record<string, SavedSong> = { ...cloud.songs }
  for (const [id, song] of Object.entries(local.songs)) {
    const other = songs[id]
    if (!other || songTouched(song) >= songTouched(other)) songs[id] = song
  }

  const vocab: Record<string, VocabWord> = { ...cloud.vocab }
  for (const [key, w] of Object.entries(local.vocab)) {
    const other = vocab[key]
    if (!other || wordTouched(w) >= wordTouched(other)) vocab[key] = w
  }

  // Streak: keep the entry with the later practice date (max count on a tie).
  const streak =
    (local.streak.lastDate ?? '') > (cloud.streak.lastDate ?? '')
      ? local.streak
      : (cloud.streak.lastDate ?? '') > (local.streak.lastDate ?? '')
        ? cloud.streak
        : { lastDate: local.streak.lastDate, count: Math.max(local.streak.count, cloud.streak.count) }

  // Preferences: take the more recently updated snapshot.
  const newer = local.updatedAt >= cloud.updatedAt ? local : cloud

  // New-cards-studied counter: keep the later day; max count on the same day.
  const ln = local.newStudied ?? { date: null, count: 0 }
  const cn = cloud.newStudied ?? { date: null, count: 0 }
  const newStudied =
    (ln.date ?? '') > (cn.date ?? '')
      ? ln
      : (cn.date ?? '') > (ln.date ?? '')
        ? cn
        : { date: ln.date, count: Math.max(ln.count, cn.count) }

  return {
    songs,
    vocab,
    streak,
    dailyNewLimit: newer.dailyNewLimit ?? 20,
    newStudied,
    showTranslations: newer.showTranslations,
    largeLyrics: newer.largeLyrics,
    wordHintSeen: local.wordHintSeen || cloud.wordHintSeen,
    hasOnboarded: local.hasOnboarded || cloud.hasOnboarded,
    updatedAt: Date.now(),
  }
}

// — Debounced push —
let saveTimer: ReturnType<typeof setTimeout> | undefined
let pushEnabled = false

function schedulePush(): void {
  if (!pushEnabled || !IS_CLOUD_CONFIGURED) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    const token = await getValidAccessToken()
    if (!token) return
    try {
      await cloudSet(token, getSnapshot())
    } catch {
      /* offline or transient — local copy is still saved; will retry on next change */
    }
  }, 1500)
}

/**
 * Hook (mounted once, app-wide): pulls + merges cloud progress on login, then
 * keeps the cloud in sync with local changes.
 */
export function useCloudSync(): void {
  const auth = useSession((s) => s.auth)

  useEffect(() => {
    if (!IS_CLOUD_CONFIGURED || auth !== 'loggedin') return
    let cancelled = false
    let unsub: () => void = () => {}

    ;(async () => {
      const token = await getValidAccessToken()
      if (!token || cancelled) return

      try {
        const cloud = (await cloudGet<Snapshot>(token)) ?? null
        if (cancelled) return
        const merged = mergeSnapshots(getSnapshot(), cloud)
        applySnapshot(merged)
        // Persist the merged result back to the cloud immediately.
        try {
          await cloudSet(token, getSnapshot())
        } catch {
          /* ignore */
        }
      } catch {
        /* couldn't reach cloud — carry on with local data */
      }

      if (cancelled) return
      pushEnabled = true
      unsub = useLibrary.subscribe(() => schedulePush())
    })()

    return () => {
      cancelled = true
      pushEnabled = false
      clearTimeout(saveTimer)
      unsub()
    }
  }, [auth])
}
