/**
 * Lyrics via LRClib (https://lrclib.net) — a free, open, no-API-key service
 * that returns both plain and time-synced (LRC) lyrics. CORS is enabled, so
 * it works directly from a static site.
 */
import { LRCLIB_BASE } from '../config'

export interface LyricLine {
  /** Start time in milliseconds (synced lyrics only). */
  timeMs: number
  text: string
}

export interface LyricsResult {
  synced: LyricLine[] | null
  plain: string[] | null
  instrumental: boolean
  source: 'lrclib'
}

interface LrclibResponse {
  id: number
  instrumental: boolean
  plainLyrics: string | null
  syncedLyrics: string | null
}

/** Parse a `[mm:ss.xx] text` LRC document into timed lines. */
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = []
  const re = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g

  for (const raw of lrc.split('\n')) {
    const matches = [...raw.matchAll(re)]
    if (matches.length === 0) continue
    const text = raw.replace(re, '').trim()
    for (const m of matches) {
      const min = parseInt(m[1], 10)
      const sec = parseInt(m[2], 10)
      const frac = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) : 0
      const timeMs = min * 60_000 + sec * 1000 + frac
      lines.push({ timeMs, text })
    }
  }
  lines.sort((a, b) => a.timeMs - b.timeMs)
  // Drop empty leading/trailing artefacts but keep interludes as blanks.
  return lines
}

/**
 * Fetch lyrics best-matching a track. We try the precise /get endpoint first
 * (needs duration), then fall back to a fuzzy /search.
 */
export async function fetchLyrics(opts: {
  track: string
  artist: string
  album?: string
  durationMs?: number
}): Promise<LyricsResult | null> {
  const { track, artist, album, durationMs } = opts

  // 1) Precise signature match.
  try {
    const params = new URLSearchParams({
      track_name: track,
      artist_name: artist,
    })
    if (album) params.set('album_name', album)
    if (durationMs) params.set('duration', String(Math.round(durationMs / 1000)))

    const res = await fetch(`${LRCLIB_BASE}/get?${params}`)
    if (res.ok) {
      const data = (await res.json()) as LrclibResponse
      return normalise(data)
    }
  } catch {
    /* fall through to search */
  }

  // 2) Fuzzy search — take the first hit.
  try {
    const params = new URLSearchParams({ track_name: track, artist_name: artist })
    const res = await fetch(`${LRCLIB_BASE}/search?${params}`)
    if (res.ok) {
      const list = (await res.json()) as LrclibResponse[]
      const best = list.find((l) => l.syncedLyrics) ?? list[0]
      if (best) return normalise(best)
    }
  } catch {
    /* give up gracefully */
  }

  return null
}

function normalise(data: LrclibResponse): LyricsResult {
  const synced = data.syncedLyrics ? parseLrc(data.syncedLyrics) : null
  const plain = data.plainLyrics
    ? data.plainLyrics.split('\n').map((l) => l.trim())
    : null
  return {
    synced: synced && synced.length ? synced : null,
    plain,
    instrumental: data.instrumental,
    source: 'lrclib',
  }
}

/** Given the current playback position, find the index of the active line. */
export function activeLineIndex(lines: LyricLine[], positionMs: number): number {
  if (lines.length === 0) return -1
  // Binary search for the last line whose time <= position.
  let lo = 0
  let hi = lines.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].timeMs <= positionMs) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans
}
