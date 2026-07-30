/**
 * Pronunciation practice: a thin wrapper over the browser SpeechRecognition API
 * so Alice can *say* an English word/phrase and get told how close she was —
 * the natural other half of the tap-to-hear audio.
 *
 * Supported in Chrome/Edge/Safari (often as `webkitSpeechRecognition`); where it
 * is unavailable `canListen` is false and the UI simply hides the mic.
 */
import { langConfig } from './lang'

interface RecognitionAlternative {
  transcript: string
}
interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<RecognitionAlternative>>
}
interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: RecognitionResultEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => RecognitionLike

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const canListen = getCtor() !== null

/** Hard ceiling for a single listen, so the mic can never get stuck "on". */
const LISTEN_TIMEOUT_MS = 12_000

/**
 * Listen for a single spoken utterance and resolve with the transcript.
 * Rejects on permission/error, if nothing was heard, or on timeout.
 */
export function listenOnce(lang?: string): Promise<string> {
  const locale = lang ?? langConfig().speech
  return new Promise((resolve, reject) => {
    const Ctor = getCtor()
    if (!Ctor) return reject(new Error('unsupported'))
    const rec = new Ctor()
    rec.lang = locale
    rec.continuous = false
    rec.interimResults = false
    rec.maxAlternatives = 1

    let settled = false
    // Some mobile browsers (notably iOS / installed PWAs) start recognition but
    // then never fire result/error/end. Without this watchdog the Promise — and
    // the UI's "listening" state that depends on it — would hang forever, which
    // is why the conversation screen sometimes froze until the app was closed
    // and reopened. The timer guarantees we always settle and free the mic.
    const watchdog = setTimeout(() => {
      if (settled) return
      settled = true
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
      reject(new Error('timeout'))
    }, LISTEN_TIMEOUT_MS)

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(watchdog)
      fn()
    }

    rec.onresult = (e) =>
      finish(() => {
        resolve((e.results?.[0]?.[0]?.transcript ?? '').trim())
        // Release the microphone right away — some browsers (notably Safari)
        // keep it hot for a while after a result if we don't stop explicitly.
        try {
          rec.stop()
        } catch {
          /* already stopped */
        }
      })
    rec.onerror = (e) => finish(() => reject(new Error(e.error || 'error')))
    rec.onend = () => finish(() => reject(new Error('no-speech')))

    try {
      rec.start()
    } catch (e) {
      finish(() => reject(e as Error))
    }
  })
}

/** A listen that keeps going until the speaker says they're done. */
export interface HeldListen {
  /** Stop listening and resolve with everything heard so far. */
  stop: () => Promise<string>
  /** Give up without a result (also frees the mic). */
  cancel: () => void
}

/**
 * Listen until *stopped by the user*, not by a pause.
 *
 * `listenOnce` ends at the first silence, which cuts off anyone who is still
 * finding the words — the beginner it's meant to help. Here recognition runs
 * in continuous mode, partial results stream back through `onPartial` so the
 * screen can show it's still listening, and the phrase is only complete when
 * the speaker taps "pronto".
 */
export function listenHeld(opts: {
  lang?: string
  onPartial?: (text: string) => void
  /** Safety net so the mic can never stay on forever. */
  maxMs?: number
}): HeldListen {
  const locale = opts.lang ?? langConfig().speech
  const Ctor = getCtor()
  const finals: string[] = []
  let live = ''
  let settle: ((text: string) => void) | null = null
  let done = false

  const text = () => [...finals, live].join(' ').replace(/\s+/g, ' ').trim()

  if (!Ctor) {
    return { stop: async () => '', cancel: () => {} }
  }

  const rec = new Ctor()
  rec.lang = locale
  rec.continuous = true
  rec.interimResults = true
  rec.maxAlternatives = 1

  const finish = () => {
    if (done) return
    done = true
    clearTimeout(watchdog)
    try {
      rec.stop()
    } catch {
      /* already stopped */
    }
    settle?.(text())
  }

  const watchdog = setTimeout(finish, opts.maxMs ?? 60_000)

  rec.onresult = (e) => {
    // Recognition reports a growing list; anything final is banked, the rest is
    // still being revised and only shown as a preview.
    const results = e.results
    const banked: string[] = []
    let interim = ''
    for (let i = 0; i < results.length; i++) {
      const r = results[i] as ArrayLike<RecognitionAlternative> & { isFinal?: boolean }
      const said = (r[0]?.transcript ?? '').trim()
      if (!said) continue
      if (r.isFinal) banked.push(said)
      else interim = said
    }
    finals.length = 0
    finals.push(...banked)
    live = interim
    opts.onPartial?.(text())
  }
  // Chrome ends the session on a long silence even in continuous mode; keep
  // what was heard rather than throwing it away.
  rec.onend = () => finish()
  rec.onerror = () => finish()

  try {
    rec.start()
  } catch {
    done = true
    clearTimeout(watchdog)
  }

  return {
    stop: () =>
      new Promise<string>((resolve) => {
        if (done) {
          resolve(text())
          return
        }
        settle = resolve
        finish()
      }),
    cancel: () => {
      done = true
      clearTimeout(watchdog)
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
    },
  }
}

const words = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^a-z'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

/** Levenshtein edit distance between two short strings. */
function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let cur = new Array<number>(n + 1)
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, cur] = [cur, prev]
  }
  return prev[n]
}

/** 0..1 similarity of two words (1 = identical). */
function similarity(a: string, b: string): number {
  if (a === b) return 1
  const max = Math.max(a.length, b.length)
  return max === 0 ? 1 : 1 - editDistance(a, b) / max
}

export interface PronScore {
  /** Fraction of target words pronounced correctly (0..1). */
  ratio: number
  /** Per-word breakdown for highlighting. */
  words: { word: string; ok: boolean }[]
}

/** Score what was heard against the target phrase, word by word (fuzzy). */
export function scorePronunciation(target: string, heard: string): PronScore {
  const t = words(target)
  const h = words(heard)
  const breakdown = t.map((w) => ({
    word: w,
    ok: h.some((x) => x === w || similarity(x, w) >= 0.8),
  }))
  const ok = breakdown.filter((w) => w.ok).length
  return { ratio: t.length ? ok / t.length : 0, words: breakdown }
}
