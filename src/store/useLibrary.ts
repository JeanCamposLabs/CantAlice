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
  markWordHintSeen: () => void
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
        set((s) =>
          s.songs[id]
            ? {
                songs: {
                  ...s.songs,
                  [id]: {
                    ...s.songs[id],
                    practiceCount: s.songs[id].practiceCount + 1,
                    lastPracticedAt: Date.now(),
                  },
                },
              }
            : s,
        ),

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
