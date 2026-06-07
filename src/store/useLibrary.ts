/**
 * Alice's library + vocabulary, persisted to localStorage.
 *
 * Two collections of songs ("learning" vs "known"), a personal vocabulary of
 * words she has tapped to learn, and lightweight progress signals. Everything
 * lives on her device — no account, no server.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEY, DEFAULT_LANG, type TargetLang } from '../config'
import type { SpotifyTrack } from '../spotify/api'
import type { Example } from '../lyrics/examples'
import { type SrsState, type Rating, newCard, isNew, schedule } from '../srs/fsrs'

/** The two cards generated per word: recognize (EN→PT) and produce (PT→EN). */
export type ReviewDir = 'fwd' | 'rev'
export interface WordCards {
  fwd: SrsState
  rev: SrsState
}

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
  /** A real-world example phrase (Reverso-Context style) + its translation. */
  example?: Example | null
  songName: string | null
  addedAt: number
  /** FSRS scheduling state for the word's two cards. */
  srs?: WordCards
  /** Language this word belongs to (defaults to 'en' for older entries). */
  lang?: TargetLang
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
  /** How many brand-new cards to introduce per day in review. */
  dailyNewLimit: number
  /** New cards already introduced today (resets each calendar day). */
  newStudied: { date: string | null; count: number }
  /** Daily review goal (cards) and how many have been reviewed today. */
  dailyGoal: number
  reviewedToday: { date: string | null; count: number }
  /** Cards reviewed per calendar day (YYYY-MM-DD → count), for the activity chart. */
  history: Record<string, number>
  /** The language the user is learning (pt-BR is always the base language). */
  targetLang: TargetLang
  /** Local-only marker for the one-time translation-quality refresh. */
  translationsVersion: number

  // — song actions —
  addSong: (track: SpotifyTrack, status: SongStatus) => void
  removeSong: (id: string) => void
  setStatus: (id: string, status: SongStatus) => void
  markPracticed: (id: string) => void
  songStatus: (id: string) => SongStatus | null

  // — vocab actions —
  addWord: (
    word: string,
    translation: string,
    songName: string | null,
    example?: Example | null,
  ) => void
  removeWord: (word: string) => void
  hasWord: (word: string) => boolean
  /** Attach an example to a saved word if it doesn't already have one. */
  setWordExample: (word: string, example: Example) => void
  /** Replace a saved word's example outright (e.g. "trocar frase"). */
  replaceWordExample: (word: string, example: Example) => void
  /** Grade one of a word's two cards (1=Again … 4=Easy) and reschedule it. */
  reviewCard: (word: string, dir: ReviewDir, rating: Rating) => void
  setDailyNewLimit: (n: number) => void
  setDailyGoal: (n: number) => void
  setTargetLang: (lang: TargetLang) => void
  /** Replace a saved word's translation (and its example's) after re-translating. */
  refreshWordTranslation: (word: string, translation: string, exampleTranslation?: string) => void
  setTranslationsVersion: (v: number) => void

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

/** Advance the daily streak (idempotent within the same calendar day). */
function advanceStreak(streak: { count: number; lastDate: string | null }): {
  count: number
  lastDate: string | null
} {
  const today = todayKey()
  if (streak.lastDate === today) return streak
  const continuing = streak.lastDate === yesterdayKey()
  return { count: continuing ? streak.count + 1 : 1, lastDate: today }
}

function freshCards(): WordCards {
  return { fwd: newCard(), rev: newCard() }
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
      dailyNewLimit: 20,
      newStudied: { date: null, count: 0 },
      dailyGoal: 10,
      reviewedToday: { date: null, count: 0 },
      history: {},
      targetLang: DEFAULT_LANG,
      translationsVersion: 0,

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
          const streak = advanceStreak(s.streak)
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

      addWord: (word, translation, songName, example) => {
        const key = normWord(word)
        if (!key) return
        set((s) => {
          const existing = s.vocab[key]
          return {
            vocab: {
              ...s.vocab,
              [key]: {
                word: word.trim(),
                translation,
                // Keep an example we already have if a new one wasn't provided.
                example: example ?? existing?.example ?? null,
                songName,
                addedAt: existing?.addedAt ?? Date.now(),
                // Never reset review progress when re-saving a word.
                srs: existing?.srs ?? freshCards(),
                lang: existing?.lang ?? (s.targetLang ?? 'en'),
              },
            },
          }
        })
      },

      removeWord: (word) =>
        set((s) => {
          const next = { ...s.vocab }
          delete next[normWord(word)]
          return { vocab: next }
        }),

      hasWord: (word) => Boolean(get().vocab[normWord(word)]),

      setWordExample: (word, example) =>
        set((s) => {
          const key = normWord(word)
          const w = s.vocab[key]
          if (!w || w.example) return s
          return { vocab: { ...s.vocab, [key]: { ...w, example } } }
        }),

      replaceWordExample: (word, example) =>
        set((s) => {
          const key = normWord(word)
          const w = s.vocab[key]
          if (!w) return s
          return { vocab: { ...s.vocab, [key]: { ...w, example } } }
        }),

      reviewCard: (word, dir, rating) =>
        set((s) => {
          const key = normWord(word)
          const w = s.vocab[key]
          if (!w) return s
          const cards = w.srs ?? freshCards()
          const wasNew = isNew(cards[dir])
          const { state } = schedule(cards[dir], rating)
          const today = todayKey()
          const studied =
            s.newStudied.date === today ? s.newStudied.count : 0
          const reviewed = s.reviewedToday.date === today ? s.reviewedToday.count : 0
          return {
            streak: advanceStreak(s.streak),
            newStudied: wasNew
              ? { date: today, count: studied + 1 }
              : { date: today, count: studied },
            reviewedToday: { date: today, count: reviewed + 1 },
            history: { ...s.history, [today]: (s.history[today] ?? 0) + 1 },
            vocab: {
              ...s.vocab,
              [key]: { ...w, srs: { ...cards, [dir]: state } },
            },
          }
        }),

      setDailyNewLimit: (n) => set({ dailyNewLimit: Math.max(0, Math.round(n)) }),

      setDailyGoal: (n) => set({ dailyGoal: Math.max(1, Math.round(n)) }),

      setTargetLang: (lang) => set({ targetLang: lang }),

      refreshWordTranslation: (word, translation, exampleTranslation) =>
        set((s) => {
          const key = normWord(word)
          const w = s.vocab[key]
          if (!w) return s
          return {
            vocab: {
              ...s.vocab,
              [key]: {
                ...w,
                translation,
                example:
                  w.example && exampleTranslation
                    ? { ...w.example, translation: exampleTranslation }
                    : w.example,
              },
            },
          }
        }),

      setTranslationsVersion: (v) => set({ translationsVersion: v }),

      setOnboarded: (v) => set({ hasOnboarded: v }),
      toggleTranslations: () => set((s) => ({ showTranslations: !s.showTranslations })),
      toggleLargeLyrics: () => set((s) => ({ largeLyrics: !s.largeLyrics })),
      markWordHintSeen: () => set({ wordHintSeen: true }),
    }),
    { name: STORAGE_KEY,
      // Existing users have persisted state from before some fields existed
      // (e.g. targetLang). Merge over the defaults so those are never undefined.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LibraryState>
        return { ...current, ...p, targetLang: p.targetLang ?? current.targetLang ?? 'en' }
      },
    },
  ),
)

// — Selectors / helpers —
export function selectSongs(state: LibraryState, status: SongStatus): SavedSong[] {
  return Object.values(state.songs)
    .filter((s) => s.status === status)
    .sort((a, b) => b.addedAt - a.addedAt)
}

export function selectVocab(state: LibraryState): VocabWord[] {
  return Object.values(state.vocab)
    .filter((w) => (w.lang ?? 'en') === (state.targetLang ?? 'en'))
    .sort((a, b) => b.addedAt - a.addedAt)
}

/** Look up a saved word by its (normalized) text. */
export function selectWord(state: LibraryState, word: string): VocabWord | undefined {
  return state.vocab[normWord(word)]
}

/** The streak count, but only if it's still "alive" (practised today/yesterday). */
export function currentStreak(state: LibraryState): number {
  const { count, lastDate } = state.streak
  if (!lastDate) return 0
  return lastDate === todayKey() || lastDate === yesterdayKey() ? count : 0
}

/** Today's review-goal progress: cards reviewed vs the daily goal. */
export function selectDailyProgress(state: LibraryState): {
  done: number
  goal: number
  met: boolean
} {
  const rt = state.reviewedToday ?? { date: null, count: 0 }
  const done = rt.date === todayKey() ? rt.count : 0
  const goal = state.dailyGoal ?? 10
  return { done, goal, met: done >= goal }
}

/** Cards reviewed on each of the last `days` calendar days (oldest first). */
export function selectActivity(
  state: LibraryState,
  days = 14,
): { date: string; label: string; count: number }[] {
  return buildActivity(state.history ?? {}, days)
}

/**
 * Pure builder for the activity chart. Kept separate from the selector so
 * callers can memoize on the stable `history` reference — selecting the freshly
 * built array directly would return a new reference every render and, under
 * useSyncExternalStore, loop ("getSnapshot should be cached").
 */
export function buildActivity(
  hist: Record<string, number>,
  days = 14,
): { date: string; label: string; count: number }[] {
  const out: { date: string; label: string; count: number }[] = []
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  for (let i = 0; i < days; i++) {
    const key = todayKey(d)
    out.push({ date: key, label: String(d.getDate()), count: hist[key] ?? 0 })
    d.setDate(d.getDate() + 1)
  }
  return out
}

/** A word counts as "mastered" once both its cards are stable (~3+ weeks). */
const MASTERED_STABILITY_DAYS = 21
export function selectMasteredCount(state: LibraryState): number {
  let n = 0
  for (const word of Object.values(state.vocab)) {
    if ((word.lang ?? 'en') !== (state.targetLang ?? 'en')) continue
    const cards = word.srs
    if (
      cards?.fwd &&
      cards?.rev &&
      !isNew(cards.fwd) &&
      !isNew(cards.rev) &&
      cards.fwd.stability >= MASTERED_STABILITY_DAYS &&
      cards.rev.stability >= MASTERED_STABILITY_DAYS
    ) {
      n++
    }
  }
  return n
}

// — Spaced-repetition selectors —

export interface ReviewItem {
  key: string
  word: VocabWord
  dir: ReviewDir
  state: SrsState
}

const cardsOf = (w: VocabWord): WordCards => w.srs ?? { fwd: newCard(), rev: newCard() }

function remainingNewToday(state: LibraryState): number {
  const studied = state.newStudied.date === todayKey() ? state.newStudied.count : 0
  return Math.max(0, state.dailyNewLimit - studied)
}

/**
 * Build today's review queue: every card that's due (oldest first), followed by
 * new cards up to the remaining daily allowance. Recognition (fwd) cards lead
 * the new ones so a word is recognized before it must be produced.
 */
export function selectReviewQueue(state: LibraryState, now = Date.now()): ReviewItem[] {
  const due: ReviewItem[] = []
  const newFwd: ReviewItem[] = []
  const newRev: ReviewItem[] = []
  for (const [key, word] of Object.entries(state.vocab)) {
    if ((word.lang ?? 'en') !== (state.targetLang ?? 'en')) continue
    const cards = cardsOf(word)
    for (const dir of ['fwd', 'rev'] as const) {
      const card = cards[dir]
      if (isNew(card)) (dir === 'fwd' ? newFwd : newRev).push({ key, word, dir, state: card })
      else if (card.due <= now) due.push({ key, word, dir, state: card })
    }
  }
  due.sort((a, b) => a.state.due - b.state.due)
  newFwd.sort((a, b) => a.word.addedAt - b.word.addedAt)
  newRev.sort((a, b) => a.word.addedAt - b.word.addedAt)
  const fresh = [...newFwd, ...newRev].slice(0, remainingNewToday(state))
  return [...due, ...fresh]
}

/** Counts for badges/summaries: cards due now and new cards available today. */
export function selectReviewCounts(
  state: LibraryState,
  now = Date.now(),
): { due: number; fresh: number; total: number } {
  let due = 0
  let newAvailable = 0
  for (const word of Object.values(state.vocab)) {
    if ((word.lang ?? 'en') !== (state.targetLang ?? 'en')) continue
    const cards = cardsOf(word)
    for (const dir of ['fwd', 'rev'] as const) {
      const card = cards[dir]
      if (isNew(card)) newAvailable += 1
      else if (card.due <= now) due += 1
    }
  }
  const fresh = Math.min(newAvailable, remainingNewToday(state))
  return { due, fresh, total: due + fresh }
}
