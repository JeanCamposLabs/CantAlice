/**
 * Real-world example sentences — the "Reverso Context" idea: show a saved word
 * inside a natural phrase, not on its own. We pull example sentences from the
 * free, CORS-friendly Dictionary API (dictionaryapi.dev), pick the cleanest one
 * containing the word, and translate it to Portuguese.
 *
 * If the dictionary has no usable example we fall back to the lyric line the
 * word was tapped in (still real usage), and otherwise return null so the card
 * simply shows the word + translation.
 */
import { translate } from './translate'

const DICT_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en'

export interface Example {
  /** The example phrase in English. */
  text: string
  /** Its Portuguese translation. */
  translation: string
  /** Where it came from — for a subtle credit line. */
  source: 'dictionary' | 'song'
}

const cache = new Map<string, Example | null>()

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Split a possibly multi-sentence example into individual sentences. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

/** Choose the shortest clean sentence that actually contains the word. */
function pickExample(entries: unknown, word: string): string | null {
  if (!Array.isArray(entries)) return null
  const raw: string[] = []
  for (const entry of entries) {
    const meanings = (entry as { meanings?: unknown[] })?.meanings ?? []
    for (const m of meanings as { definitions?: { example?: string }[] }[]) {
      for (const d of m.definitions ?? []) {
        if (d.example) raw.push(d.example)
      }
    }
  }
  const all = raw.flatMap(sentences)
  // Match the word as a stem so inflected forms (love → loving) still count.
  const re = new RegExp(`\\b${escapeRe(word.toLowerCase())}`, 'i')
  const sized = (s: string) => s.length >= 8 && s.length <= 120
  const containing = all.filter((s) => re.test(s) && sized(s))
  const pool = containing.length ? containing : all.filter(sized)
  if (!pool.length) return null
  pool.sort((a, b) => a.length - b.length)
  return pool[0]
}

/**
 * Fetch an example phrase for `word` (+ its translation). `fallbackLine` is the
 * lyric line it was tapped in, used only if the dictionary has nothing.
 */
export async function fetchExample(
  word: string,
  fallbackLine?: string | null,
): Promise<Example | null> {
  const key = word.trim().toLowerCase()
  if (!key) return null
  if (cache.has(key)) return cache.get(key)!

  let text: string | null = null
  let source: Example['source'] = 'dictionary'
  try {
    const res = await fetch(`${DICT_BASE}/${encodeURIComponent(key)}`)
    if (res.ok) text = pickExample(await res.json(), key)
  } catch {
    /* offline / not found — fall through to the fallback */
  }

  if (!text && fallbackLine && fallbackLine.trim().length >= 8) {
    text = fallbackLine.replace(/\s+/g, ' ').trim()
    source = 'song'
  }

  if (!text) {
    cache.set(key, null)
    return null
  }

  const translation = await translate(text)
  const example: Example = { text, translation, source }
  cache.set(key, example)
  return example
}
