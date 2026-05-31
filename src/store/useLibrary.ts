/**
 * Alice's library + vocabulary, persisted to localStorage.
 *
 * Two collections of songs ("learning" vs "known"), a personal vocabulary of
 * words she has tapped to learn, and lightweight progress signals. Everything
 * lives on her device — no account, no server.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEY } from '../config'
import type { SpotifyTrack } from '../spotify/api'

export type SongStatus = 'learning' | 'known'

export interface SavedSong {
  id: string
  uri: string
  name: string
  artist: string
  album: string
  image: string | null
  durationMs: number
  status: SongStatus
  addedAt: number
  /** Times Alice has opened this song to practise. */
  practiceCount: number
  lastPracticedAt: number | null
}

export interface VocabWord {
  word: string
  translation: string
  songName: string | null
  addedAt: number
}

interface LibraryState {
  songs: Record<string, SavedSong>
  vocab: Record<string, VocabWord>
  hasOnboarded: boolean
  /** Preference: show Portuguese translation under each lyric line by default. */
  showTranslations: boolean
  /** Whether the "tap any word" hint has been shown in the karaoke view. */
  wordHintSeen: boolean
  /** Preference: larger, higher-contrast karaoke lyrics. */
  largeLyrics: boolean
  /** Daily practice streak. */
  streak: { count: number; lastDate: string | null }

  // — song actions —
  addSong: (track: SpotifyTrack, status: SongStatus) => void
  removeSong: (id: string) => void
  setStatus: (id: string, status: SongStatus) => void
  markPracticed: (id: string) => void
  songStatus: (id: string) => SongStatus | null

  // — vocab actions —
  addWord: (word: string, translation: string, songName: string | null) => void
  removeWord: (word: string) => void
  hasWord: (word: string) => boolean

  // — preferences —
  setOnboarded: (v: boolean) => void
  toggleTranslations: () => void
  toggleLargeLyrics: () => void
  markWordHintSeen: () => void
}

/** Local date as YYYY-MM-DD (so streaks follow the user's calendar day). */
function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}
function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return todayKey(d)
}

function trackToSong(track: SpotifyTrack, status: SongStatus): SavedSong {
  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    album: track.album.name,
    image: track.album.images?.[0]?.url ?? null,
    durationMs: track.durationMs,
    status,
    addedAt: Date.now(),
    practiceCount: 0,
    lastPracticedAt: null,
  }
}

const normWord = (w: string) => w.toLowerCase().replace(/[^a-zà-ÿ'-]/gi, '')

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      songs: {},
      vocab: {},
      hasOnboarded: false,
      showTranslations: true,
      wordHintSeen: false,
      largeLyrics: false,
      streak: { count: 0, lastDate: null },

      addSong: (track, status) =>
        set((s) => ({
          songs: {
            ...s.songs,
            [track.id]: s.songs[track.id]
              ? { ...s.songs[track.id], status }
              : trackToSong(track, status),
          },
        })),

      removeSong: (id) =>
        set((s) => {
          const next = { ...s.songs }
          delete next[id]
          return { songs: next }
        }),

      setStatus: (id, status) =>
        set((s) =>
          s.songs[id]
            ? { songs: { ...s.songs, [id]: { ...s.songs[id], status } } }
            : s,
        ),

      markPracticed: (id) =>
        set((s) => {
          // Advance the daily streak (idempotent within the same day).
          const today = todayKey()
          let streak = s.streak
          if (s.streak.lastDate !== today) {
            const continuing = s.streak.lastDate === yesterdayKey()
            streak = {
              count: continuing ? s.streak.count + 1 : 1,
              lastDate: today,
            }
          }
          const song = s.songs[id]
          return {
            streak,
            songs: song
              ? {
                  ...s.songs,
                  [id]: {
                    ...song,
                    practiceCount: song.practiceCount + 1,
                    lastPracticedAt: Date.now(),
                  },
                }
              : s.songs,
          }
        }),

      songStatus: (id) => get().songs[id]?.status ?? null,

      addWord: (word, translation, songName) => {
        const key = normWord(word)
        if (!key) return
        set((s) => ({
          vocab: {
            ...s.vocab,
            [key]: {
              word: word.trim(),
              translation,
              songName,
              addedAt: Date.now(),
            },
          },
        }))
      },

      removeWord: (word) =>
        set((s) => {
          const next = { ...s.vocab }
          delete next[normWord(word)]
          return { vocab: next }
        }),

      hasWord: (word) => Boolean(get().vocab[normWord(word)]),

      setOnboarded: (v) => set({ hasOnboarded: v }),
      toggleTranslations: () => set((s) => ({ showTranslations: !s.showTranslations })),
      toggleLargeLyrics: () => set((s) => ({ largeLyrics: !s.largeLyrics })),
      markWordHintSeen: () => set({ wordHintSeen: true }),
    }),
    { name: STORAGE_KEY },
  ),
)

// — Selectors / helpers —
export function selectSongs(state: LibraryState, status: SongStatus): SavedSong[] {
  return Object.values(state.songs)
    .filter((s) => s.status === status)
    .sort((a, b) => b.addedAt - a.addedAt)
}

export function selectVocab(state: LibraryState): VocabWord[] {
  return Object.values(state.vocab).sort((a, b) => b.addedAt - a.addedAt)
}

/** The streak count, but only if it's still "alive" (practised today/yesterday). */
export function currentStreak(state: LibraryState): number {
  const { count, lastDate } = state.streak
  if (!lastDate) return 0
  return lastDate === todayKey() || lastDate === yesterdayKey() ? count : 0
}
