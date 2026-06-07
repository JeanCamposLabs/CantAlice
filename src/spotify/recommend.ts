/**
 * Gentle song recommendations for the home screen — "songs at your level" to
 * sing along to. We deliberately build this on top of plain track *search*
 * (which our token already allows) rather than Spotify's /recommendations or
 * /me/top endpoints: those are deprecated for newer apps and/or need extra
 * scopes that would force Alice to log in again.
 *
 * Two strands, interleaved for variety:
 *  • more songs from the artists she has already saved (she clearly likes them);
 *  • a curated set of clear-voiced, singable artists for discovery.
 */
import { searchTracks, type SpotifyTrack } from './api'
import type { SavedSong } from '../store/useLibrary'
import type { TargetLang } from '../config'
import { activeLang } from '../lib/lang'

// Artists with clear diction and simple, singable lyrics in the target language
// — friendly for a learner. Seeds discovery (and a fallback before anything is
// saved). Keyed by target language.
const CURATED_BY_LANG: Record<TargetLang, string[]> = {
  en: [
    'Adele',
    'Ed Sheeran',
    'The Beatles',
    'Coldplay',
    'Taylor Swift',
    'Bruno Mars',
    'John Legend',
    'Jason Mraz',
    'Sara Bareilles',
    'Norah Jones',
  ],
  es: [
    'Álvaro Soler',
    'Pablo Alborán',
    'Rosalía',
    'Enrique Iglesias',
    'Shakira',
    'Jesse & Joy',
    'Juanes',
    'Manu Chao',
    'Natalia Lafourcade',
    'Sebastián Yatra',
  ],
}
const CURATED_ARTISTS = (): string[] => CURATED_BY_LANG[activeLang()] ?? CURATED_BY_LANG.en

/** The lead artist of a "feat./&/," joined credit, lowercased for comparison. */
function leadArtist(artist: string): string {
  return (artist.split(/,|&|feat\.?|ft\.?/i)[0] ?? artist).trim()
}

/** Artists she's saved most, most-frequent first. */
function favouriteArtists(saved: SavedSong[], n: number): string[] {
  const freq = new Map<string, number>()
  for (const s of saved) {
    const a = leadArtist(s.artist)
    if (a) freq.set(a, (freq.get(a) ?? 0) + 1)
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([a]) => a).slice(0, n)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function recommendTracks(saved: SavedSong[], limit = 8): Promise<SpotifyTrack[]> {
  const savedIds = new Set(saved.map((s) => s.id))
  const savedArtists = new Set(saved.map((s) => leadArtist(s.artist).toLowerCase()))

  const liked = favouriteArtists(saved, 2)
  const discovery = shuffle(CURATED_ARTISTS().filter((a) => !savedArtists.has(a.toLowerCase())))
  const seeds = [...liked, ...discovery].slice(0, 4)
  if (seeds.length === 0) seeds.push(...CURATED_ARTISTS().slice(0, 3))

  const perSeed = await Promise.all(
    seeds.map((a) => searchTracks(`artist:"${a}"`, 8).catch(() => [] as SpotifyTrack[])),
  )

  // Round-robin across seeds so the row isn't dominated by one artist.
  const lists = perSeed.map((r) => r.filter((t) => !savedIds.has(t.id)))
  const seen = new Set<string>()
  const out: SpotifyTrack[] = []
  for (let i = 0; out.length < limit; i++) {
    let progressed = false
    for (const list of lists) {
      const t = list[i]
      if (!t) continue
      progressed = true
      if (!seen.has(t.id)) {
        seen.add(t.id)
        out.push(t)
        if (out.length >= limit) break
      }
    }
    if (!progressed) break
  }
  return out
}

// Memoise per saved-library signature so we don't refire searches on every
// render of the home screen; recompute only when the saved set changes.
let cache: { sig: string; promise: Promise<SpotifyTrack[]> } | null = null

export function recommendedTracks(saved: SavedSong[]): Promise<SpotifyTrack[]> {
  const sig =
    activeLang() +
    '|' +
    saved
      .map((s) => s.id)
      .sort()
      .join(',')
  if (!cache || cache.sig !== sig) {
    cache = { sig, promise: recommendTracks(saved) }
  }
  return cache.promise
}
